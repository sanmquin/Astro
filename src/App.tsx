import { useMemo, useState } from 'react';

type Provider = 'elevenlabs' | 'gemini';

type ScriptStep = {
  id: string;
  prompt: string;
  expectedAnswers: string[];
  retryPrompt?: string;
};

type Script = { steps: ScriptStep[] };

const defaultScript: Script = {
  steps: [
    {
      id: 'intro',
      prompt: 'What is your name?',
      expectedAnswers: ['my name is', 'i am']
    },
    {
      id: 'city',
      prompt: 'Which city are you calling from?',
      expectedAnswers: ['new york', 'san francisco', 'chicago'],
      retryPrompt: 'Please say one city name so I can continue.'
    }
  ]
};

function normalizedIncludes(input: string, expected: string) {
  return input.toLowerCase().includes(expected.toLowerCase());
}

export function App() {
  const [provider, setProvider] = useState<Provider>('elevenlabs');
  const [apiKey, setApiKey] = useState('');
  const [scriptText, setScriptText] = useState(JSON.stringify(defaultScript, null, 2));
  const [answer, setAnswer] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState('Waiting for answer');

  const script = useMemo(() => {
    try {
      return JSON.parse(scriptText) as Script;
    } catch {
      return defaultScript;
    }
  }, [scriptText]);

  const currentStep = script.steps[stepIndex];

  async function submitAnswer() {
    if (!currentStep) return;

    const valid = currentStep.expectedAnswers.some((expected) => normalizedIncludes(answer, expected));
    if (!valid) {
      setStatus(currentStep.retryPrompt ?? 'Answer did not match, please repeat.');
      return;
    }

    setStatus('Matched. Advancing...');
    await fetch('/.netlify/functions/voice-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, stepId: currentStep.id, transcript: answer })
    });

    setAnswer('');
    setStepIndex((idx) => idx + 1);
    setStatus('Waiting for answer');
  }

  return (
    <main className="container">
      <h1>Voice Agent Interface</h1>
      <p>Connect provider, load JSON script, and validate step-by-step answers.</p>

      <section>
        <h2>Settings</h2>
        <label>
          Provider
          <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)}>
            <option value="elevenlabs">ElevenLabs</option>
            <option value="gemini">Gemini</option>
          </select>
        </label>
        <label>
          API Key
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Stored in memory only" />
        </label>
      </section>

      <section>
        <h2>Script JSON</h2>
        <textarea rows={12} value={scriptText} onChange={(e) => setScriptText(e.target.value)} />
      </section>

      <section>
        <h2>Current Step</h2>
        {currentStep ? (
          <>
            <p><strong>Prompt:</strong> {currentStep.prompt}</p>
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Transcript answer" />
            <button onClick={submitAnswer}>Submit Answer</button>
          </>
        ) : (
          <p>Script completed ✅</p>
        )}
        <p><strong>Status:</strong> {status}</p>
      </section>
    </main>
  );
}
