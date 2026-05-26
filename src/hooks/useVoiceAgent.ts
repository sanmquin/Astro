import 'regenerator-runtime/runtime';
import { useState, useEffect, useCallback } from 'react';
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

  const [sessionSettings, setSessionSettings] = useState<AgentSettings>(settings);
  const [prevSettings, setPrevSettings] = useState<AgentSettings>(settings);

  // Sync session settings with parent settings when they change
  if (settings !== prevSettings) {
    setPrevSettings(settings);
    setSessionSettings(settings);
  }

  const processStep = useCallback(async (step: ScriptStep, currentSessionSettings: AgentSettings) => {
    try {
      setStatus('speaking');
      let usedSettings = currentSessionSettings;
      try {
        await speak(step.prompt, usedSettings);
      } catch (ttsErr) {
        console.error('TTS failed in processStep, switching to browser', ttsErr);
        usedSettings = { ...usedSettings, useElevenLabs: false };
        setSessionSettings(usedSettings);
        await speak(step.prompt, usedSettings);
      }

      resetTranscript();
      setStatus('listening');
      await SpeechRecognition.startListening({ continuous: false, language: 'en-US' });
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
      await speak("I didn't hear anything. Could you please repeat that?", sessionSettings);
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
        const feedback = result.feedback || "I didn't quite catch that. Could you please repeat?";
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
      processStep(initialStep, sessionSettings);
    }
  };

  const resetAgent = () => {
    setCurrentStepId(script.initialStepId);
    setStatus('idle');
    setError(null);
    resetTranscript();
  };

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
