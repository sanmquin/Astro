import 'regenerator-runtime/runtime';
import { useState, useEffect, useCallback, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import type { Script, ScriptStep, AgentSettings, AgentStatus } from '../types';
import { speak } from '../services/tts';
import { evaluateResponse } from '../services/gemini';

export const useVoiceAgent = (script: Script, settings: AgentSettings) => {
  const [currentStepId, setCurrentStepId] = useState<string>(script.initialStepId);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const {
    transcript,
    resetTranscript,
    listening,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const currentStep = script.steps.find(s => s.id === currentStepId);

  const processStep = useCallback(async (step: ScriptStep) => {
    try {
      setStatus('speaking');
      await speak(step.prompt, settings);

      setStatus('listening');
      resetTranscript();
      await SpeechRecognition.startListening({ continuous: false, language: 'en-US' });
    } catch (err) {
      console.error('Error in processStep:', err);
      setError('Failed to play prompt or start listening.');
      setStatus('error');
    }
  }, [settings, resetTranscript]);

  const handleUserResponse = useCallback(async (userTranscript: string) => {
    if (!currentStep || status !== 'listening') return;

    if (!userTranscript.trim()) {
      setStatus('speaking');
      await speak("I didn't hear anything. Could you please repeat that?", settings);
      processStep(currentStep);
      return;
    }

    setStatus('processing');
    try {
      const result = await evaluateResponse(userTranscript, currentStep, settings.geminiApiKey);

      if (result.success) {
        if (currentStep.nextStepId) {
          setCurrentStepId(currentStep.nextStepId);
        } else {
          setCurrentStepId('FINISHED');
          setStatus('idle');
        }
      } else {
        // Repeat the current step, maybe with feedback
        const feedback = result.feedback || "I didn't quite catch that. Could you please repeat?";
        setStatus('speaking');
        await speak(feedback, settings);
        processStep(currentStep);
      }
    } catch (err) {
      console.error('Error in handleUserResponse:', err);
      setError('Failed to process your response.');
      setStatus('error');
    }
  }, [currentStep, settings, status, processStep]);

  // Effect to advance when listening stops
  useEffect(() => {
    if (!listening && status === 'listening') {
      // Small delay to ensure transcript is fully captured
      const timeoutId = setTimeout(() => {
        handleUserResponse(transcript);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [listening, status, transcript, handleUserResponse]);

  // Initial start
  const startAgent = () => {
    resetTranscript();
    setCurrentStepId(script.initialStepId);
    const initialStep = script.steps.find(s => s.id === script.initialStepId);
    if (initialStep) {
      processStep(initialStep);
    }
  };

  const resetAgent = () => {
    setCurrentStepId(script.initialStepId);
    setStatus('idle');
    setError(null);
    resetTranscript();
  };

  // Separate effect to handle step transitions
  const lastStepId = useRef(currentStepId);
  useEffect(() => {
    if (currentStepId !== lastStepId.current && currentStepId !== 'FINISHED' && status !== 'idle' && status !== 'error') {
      lastStepId.current = currentStepId;
      if (currentStep) {
        processStep(currentStep);
      }
    }
  }, [currentStepId, currentStep, processStep, status]);

  return {
    currentStep,
    status,
    transcript,
    error,
    startAgent,
    resetAgent,
    isFinished: currentStepId === 'FINISHED',
    browserSupportsSpeechRecognition
  };
};
