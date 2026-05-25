import { useEffect, useMemo, useRef, useState } from 'react'
import './index.css'
import { evaluateStep, getScript, type Provider } from './agent'

type GeminiSettings = {
  apiKey: string
  model: string
}

type ElevenLabsSettings = {
  apiKey: string
  voiceId: string
  model: string
}

type SavedSettings = {
  provider: Provider
  gemini: GeminiSettings
  elevenLabs: ElevenLabsSettings
}

type AgentApiResponse = {
  text: string
  audioDataUrl?: string
  usedFallback?: boolean
  provider: Provider
}

type ConversationEntry = {
  id: number
  text: string
}

type SpeechRecognitionAlternative = {
  transcript: string
}

type SpeechRecognitionResult = {
  isFinal: boolean
  0: SpeechRecognitionAlternative
}

type SpeechRecognitionEvent = {
  results: ArrayLike<SpeechRecognitionResult>
}

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition

type ExtendedWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

const storageKey = 'astro-voice-agent-settings'
const defaultSettings: SavedSettings = {
  provider: 'gemini',
  gemini: {
    apiKey: '',
    model: 'gemini-1.5-flash',
  },
  elevenLabs: {
    apiKey: '',
    voiceId: '',
    model: 'eleven_multilingual_v2',
  },
}

const script = getScript()

const loadSettings = (): SavedSettings => {
  const saved = window.localStorage.getItem(storageKey)

  if (!saved) {
    return defaultSettings
  }

  try {
    const parsed = JSON.parse(saved) as Partial<SavedSettings>
    return {
      provider: parsed.provider === 'elevenlabs' ? 'elevenlabs' : 'gemini',
      gemini: {
        ...defaultSettings.gemini,
        ...parsed.gemini,
      },
      elevenLabs: {
        ...defaultSettings.elevenLabs,
        ...parsed.elevenLabs,
      },
    }
  } catch {
    return defaultSettings
  }
}

function App() {
  const [settingsOpen, setSettingsOpen] = useState(true)
  const [settings, setSettings] = useState<SavedSettings>(() => loadSettings())
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [conversation, setConversation] = useState<ConversationEntry[]>([{ id: 1, text: script[0].prompt }])
  const [status, setStatus] = useState('Ready to begin.')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const conversationIdRef = useRef(2)

  const currentStep = script[currentStepIndex]
  const promptText = isComplete ? 'Script complete. Reset the flow to run it again.' : currentStep.prompt
  const stepTitle = isComplete ? 'complete' : currentStep.id
  const speechRecognitionAvailable = useMemo(() => {
    const speechWindow = window as ExtendedWindow
    return Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      audioRef.current?.pause()
    }
  }, [])

  const speakText = async (response: AgentApiResponse) => {
    if (response.audioDataUrl) {
      audioRef.current?.pause()
      const audio = new Audio(response.audioDataUrl)
      audioRef.current = audio
      await audio.play()
      return
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(response.text)
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utterance)
    }
  }

  const requestAgentVoice = async (message: string): Promise<AgentApiResponse> => {
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        provider: settings.provider,
        settings,
      }),
    })

    if (!response.ok) {
      throw new Error('The voice-agent API request failed.')
    }

    return response.json() as Promise<AgentApiResponse>
  }

  const updateSettings = <Section extends keyof SavedSettings>(section: Section, value: SavedSettings[Section]) => {
    setSettings((previous) => ({
      ...previous,
      [section]: value,
    }))
  }

  const startListening = () => {
    const speechWindow = window as ExtendedWindow
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition

    if (!Recognition) {
      setStatus('Speech recognition is not available in this browser.')
      return
    }

    const recognition = new Recognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim()

      if (transcript) {
        setAnswer(transcript)
        setStatus('Captured your answer from the microphone.')
      }
    }
    recognition.onend = () => {
      setIsListening(false)
    }
    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
    setStatus('Listening for your response...')
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  const submitAnswer = async () => {
    if (!answer.trim()) {
      setStatus('Enter or speak an answer before continuing.')
      return
    }

    setIsSubmitting(true)
    const evaluation = evaluateStep(currentStepIndex, answer)
    const nextConversation = [
      ...conversation,
      { id: conversationIdRef.current++, text: `You: ${answer.trim()}` },
      { id: conversationIdRef.current++, text: `Agent: ${evaluation.feedback}` },
    ]

    setConversation(nextConversation)
    setStatus(evaluation.accepted ? 'Answer accepted.' : 'Answer did not match the current step.')

    try {
      const response = await requestAgentVoice(evaluation.feedback)
      await speakText(response)
      if (evaluation.isComplete) {
        setStatus('Script complete.')
      } else {
        setStatus(response.usedFallback ? 'Used the built-in voice fallback.' : 'Delivered provider response.')
      }
    } catch {
      const fallbackResponse: AgentApiResponse = {
        text: evaluation.feedback,
        provider: settings.provider,
        usedFallback: true,
      }
      await speakText(fallbackResponse)
      setStatus(evaluation.isComplete ? 'Script complete.' : 'Used the in-browser fallback because the API was unavailable.')
    } finally {
      if (evaluation.accepted && !evaluation.isComplete) {
        setCurrentStepIndex(evaluation.nextStepIndex)
      }

      if (evaluation.isComplete) {
        setCurrentStepIndex(script.length - 1)
      }

      setAnswer('')
      setIsSubmitting(false)
    }
  }

  const resetFlow = () => {
    setCurrentStepIndex(0)
    setAnswer('')
    setIsComplete(false)
    conversationIdRef.current = 2
    setConversation([{ id: 1, text: script[0].prompt }])
    setStatus('Script reset. Ready to begin again.')
  }

  return (
    <main className="app-shell">
      <section className="panel hero-panel">
        <div>
          <p className="eyebrow">React + TypeScript + Netlify</p>
          <h1>Astro Voice Agent</h1>
          <p className="lead">
            A scripted voice-agent interface that can use Gemini or ElevenLabs through Netlify.
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={() => setSettingsOpen((open) => !open)}>
          {settingsOpen ? 'Hide settings' : 'Show settings'}
        </button>
      </section>

      {settingsOpen ? (
        <section className="panel settings-panel">
          <div className="settings-grid">
            <label>
              Provider
              <select
                value={settings.provider}
                onChange={(event) => updateSettings('provider', event.target.value as Provider)}
              >
                <option value="gemini">Gemini</option>
                <option value="elevenlabs">ElevenLabs</option>
              </select>
            </label>

            <label>
              Gemini API key
              <input
                type="password"
                value={settings.gemini.apiKey}
                onChange={(event) => updateSettings('gemini', { ...settings.gemini, apiKey: event.target.value })}
                placeholder="Optional if GEMINI_API_KEY is set in Netlify"
              />
            </label>

            <label>
              Gemini model
              <input
                type="text"
                value={settings.gemini.model}
                onChange={(event) => updateSettings('gemini', { ...settings.gemini, model: event.target.value })}
              />
            </label>

            <label>
              ElevenLabs API key
              <input
                type="password"
                value={settings.elevenLabs.apiKey}
                onChange={(event) =>
                  updateSettings('elevenLabs', { ...settings.elevenLabs, apiKey: event.target.value })
                }
                placeholder="Optional if ELEVENLABS_API_KEY is set in Netlify"
              />
            </label>

            <label>
              ElevenLabs voice ID
              <input
                type="text"
                value={settings.elevenLabs.voiceId}
                onChange={(event) =>
                  updateSettings('elevenLabs', { ...settings.elevenLabs, voiceId: event.target.value })
                }
                placeholder="Voice used for spoken prompts"
              />
            </label>

            <label>
              ElevenLabs model
              <input
                type="text"
                value={settings.elevenLabs.model}
                onChange={(event) =>
                  updateSettings('elevenLabs', { ...settings.elevenLabs, model: event.target.value })
                }
              />
            </label>
          </div>
        </section>
      ) : null}

      <section className="panel flow-panel">
        <div className="step-header">
          <div>
            <p className="eyebrow">Current script step</p>
            <h2>{stepTitle}</h2>
          </div>
          <span className="step-counter">
            {currentStepIndex + 1} / {script.length}
          </span>
        </div>

        <blockquote>{promptText}</blockquote>

        <label className="answer-field">
          Your answer
          <textarea
            rows={4}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Type an answer or use the microphone"
            disabled={isComplete}
          />
        </label>

        <div className="button-row">
          <button type="button" onClick={submitAnswer} disabled={isSubmitting || isComplete}>
            {isSubmitting ? 'Submitting...' : 'Submit answer'}
          </button>
          <button type="button" className="secondary-button" onClick={resetFlow}>
            Reset script
          </button>
          {speechRecognitionAvailable ? (
            <button
              type="button"
              className="secondary-button"
              onClick={isListening ? stopListening : startListening}
              disabled={isComplete}
            >
              {isListening ? 'Stop listening' : 'Use microphone'}
            </button>
          ) : null}
        </div>

        <p className="status-line">{status}</p>
      </section>

      <section className="panel transcript-panel">
        <div className="step-header">
          <div>
            <p className="eyebrow">Conversation</p>
            <h2>Transcript</h2>
          </div>
        </div>
        <ul>
          {conversation.map((line) => (
            <li key={line.id}>{line.text}</li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
