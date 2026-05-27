import 'regenerator-runtime/runtime';
import { useState, useEffect, useCallback, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import type { Script, ScriptStep, AgentSettings, AgentStatus } from '../types';
import { speak, primeTTS, stopSpeaking } from '../services/tts';
import { evaluateResponse } from '../services/gemini';

export const useVoiceAgent = (script: Script, settings: AgentSettings) => {
  const [currentStepId, setCurrentStepId] = useState<string>(script.initialStepId);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const listeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    transcript,
    resetTranscript,
    listening,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const currentStep = script.steps.find(s => s.id === currentStepId);

  const [sessionSettings, setSessionSettings] = useState<AgentSettings>(settings);
  const [prevSettings, setPrevSettings] = useState<AgentSettings>(settings);

  // Sync session settings with parent settings when they change
  if (settings !== prevSettings) {
    setPrevSettings(settings);
    setSessionSettings(settings);
  }

  const processStep = useCallback(async (step: ScriptStep, currentSessionSettings: AgentSettings) => {
    try {
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }

      setStatus('speaking');
      let usedSettings = currentSessionSettings;
      try {
        await speak(step.prompt, usedSettings);
      } catch (ttsErr) {
        console.error('TTS failed in processStep, switching to browser', ttsErr);
        if (usedSettings.useElevenLabs) {
          window.alert(`Eleven Labs Error: ${ttsErr instanceof Error ? ttsErr.message : String(ttsErr)}`);
        }
        usedSettings = { ...usedSettings, useElevenLabs: false };
        setSessionSettings(usedSettings);
        await speak(step.prompt, usedSettings);
      }

      // Check status again as it might have been paused during speaking
      setStatus((prevStatus) => {
        if (prevStatus === 'paused') return 'paused';

        if (step.nextStepId === null) {
          // Final interaction, do not wait for user input
          setCurrentStepId('FINISHED');
          return 'idle';
        } else {
          resetTranscript();
          SpeechRecognition.startListening({ continuous: true, language: 'es-MX' });

          // Set safety timeout for listening
          listeningTimeoutRef.current = setTimeout(() => {
            SpeechRecognition.stopListening();
          }, currentSessionSettings.maxListeningTime * 1000);

          return 'listening';
        }
      });
    } catch (err) {
      console.error('Error in processStep:', err);
      setError('Failed to play prompt or start listening.');
      setStatus('error');
    }
  }, [resetTranscript]);

  const handleUserResponse = useCallback(async (userTranscript: string) => {
    if (!currentStep || status !== 'listening') return;

    if (!userTranscript.trim()) {
      setStatus('speaking');
      await speak("No pude escucharte. ¿Podrías repetir eso?", sessionSettings);
      processStep(currentStep, sessionSettings);
      return;
    }

    setStatus('processing');
    try {
      const result = await evaluateResponse(userTranscript, currentStep, sessionSettings.geminiApiKey);

      if (result.success) {
        setStatus('verifying');
        await new Promise(resolve => setTimeout(resolve, 2000));

        setStatus('verified');
        await new Promise(resolve => setTimeout(resolve, 1000));

        setHistory(prev => [...prev, currentStep.id]);

        if (currentStep.nextStepId) {
          const nextStep = script.steps.find(s => s.id === currentStep.nextStepId);
          setCurrentStepId(currentStep.nextStepId);
          if (nextStep) {
            processStep(nextStep, sessionSettings);
          }
        } else {
          setCurrentStepId('FINISHED');
          setStatus('idle');
        }
      } else {
        // Repeat the current step, maybe with feedback
        const feedback = result.feedback || "No entendí muy bien. ¿Podrías repetir?";
        setStatus('speaking');
        await speak(feedback, sessionSettings);
        processStep(currentStep, sessionSettings);
      }
    } catch (err) {
      console.error('Error in handleUserResponse:', err);
      setError('Failed to process your response.');
      setStatus('error');
    }
  }, [currentStep, sessionSettings, status, processStep, script.steps]);

  // Effect to advance when listening stops
  useEffect(() => {
    if (!listening && status === 'listening') {
      // Clear safety timeout if listening stopped manually or via timeout
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }

      // Small delay to ensure transcript is fully captured
      const timeoutId = setTimeout(() => {
        handleUserResponse(transcript);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [listening, status, transcript, handleUserResponse]);

  // Initial start
  const startAgent = () => {
    // Prime TTS on user gesture to unlock audio
    primeTTS().catch(err => console.warn('Failed to prime TTS:', err));

    resetTranscript();
    setHistory([]);
    setCurrentStepId(script.initialStepId);
    const initialStep = script.steps.find(s => s.id === script.initialStepId);
    if (initialStep) {
      processStep(initialStep, sessionSettings);
    }
  };

  const resetAgent = () => {
    setCurrentStepId(script.initialStepId);
    setStatus('idle');
    setError(null);
    setHistory([]);
    resetTranscript();
    stopSpeaking();
    SpeechRecognition.stopListening();
  };

  const pauseAgent = () => {
    setStatus('paused');
    stopSpeaking();
    SpeechRecognition.stopListening();
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }
  };

  const resumeAgent = () => {
    if (currentStep) {
      processStep(currentStep, sessionSettings);
    }
  };

  const goToPreviousStep = () => {
    if (history.length > 0) {
      const newHistory = [...history];
      const prevStepId = newHistory.pop();
      setHistory(newHistory);
      if (prevStepId) {
        setCurrentStepId(prevStepId);
        const prevStep = script.steps.find(s => s.id === prevStepId);
        if (prevStep) {
          processStep(prevStep, sessionSettings);
        }
      }
    }
  };

  const finishListening = () => {
    SpeechRecognition.stopListening();
  };

  return {
    currentStep,
    status,
    transcript,
    error,
    startAgent,
    resetAgent,
    pauseAgent,
    resumeAgent,
    goToPreviousStep,
    finishListening,
    history,
    isFinished: currentStepId === 'FINISHED',
    browserSupportsSpeechRecognition
  };
};
