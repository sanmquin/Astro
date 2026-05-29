import 'regenerator-runtime/runtime';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import type { Script, ScriptStep, AgentSettings, AgentStatus } from '../types';
import { speak, primeTTS, stopSpeaking } from '../services/tts';
import { evaluateResponse } from '../services/gemini';
import { getUserId } from '../utils/storage';

export const useVoiceAgent = (script: Script, settings: AgentSettings, scriptId: string) => {
  // Flatten steps for easy lookup by ID
  const allSteps = useMemo(() => {
    const steps: ScriptStep[] = [];
    const addSteps = (s: ScriptStep[]) => {
      s.forEach(step => {
        steps.push(step);
        if (step.branches) {
          step.branches.forEach(branch => addSteps(branch.steps));
        }
      });
    };
    addSteps(script.steps);
    return steps;
  }, [script]);

  const [currentStepId, setCurrentStepId] = useState<string>(script.initialStepId);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ stepId: string; transcript: string }[]>([]);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const isInitialLoadRef = useRef(true);

  const listeningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenPromptRef = useRef<string | null>(null);
  const isEditingResponseRef = useRef(false);

  const {
    transcript,
    resetTranscript,
    listening,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const currentStep = useMemo(() => allSteps.find(s => s.id === currentStepId), [allSteps, currentStepId]);

  const [sessionSettings, setSessionSettings] = useState<AgentSettings>(settings);
  const [prevSettings, setPrevSettings] = useState<AgentSettings>(settings);

  // Sync session settings with parent settings when they change
  if (settings !== prevSettings) {
    setPrevSettings(settings);
    setSessionSettings(settings);
  }

  const userId = useMemo(() => getUserId(), []);

  const getNextStepId = useCallback((step: ScriptStep): string | null => {
    if (step.nextStepId) return step.nextStepId;

    // If no nextStepId, we might be at the end of a branch
    // Find if this step is inside a branch
    const findParent = (steps: ScriptStep[]): ScriptStep | null => {
      for (const s of steps) {
        if (s.branches) {
          for (const branch of s.branches) {
            if (branch.steps.some(bs => bs.id === step.id)) return s;
            const nestedParent = findParent(branch.steps);
            if (nestedParent) return nestedParent;
          }
        }
      }
      return null;
    };

    const parent = findParent(script.steps);
    if (parent && parent.nextStepId) {
      return parent.nextStepId;
    }

    return null;
  }, [script.steps]);

  const saveHistory = useCallback(async (newHistory: { stepId: string; transcript: string }[]) => {
    try {
      await fetch('/.netlify/functions/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, scriptId, history: newHistory }),
      });
    } catch (err) {
      console.error('Failed to save history', err);
    }
  }, [userId, scriptId]);

  // Effect to save history when it changes
  useEffect(() => {
    if (isInitialLoadRef.current) {
      return;
    }
    saveHistory(history);
  }, [history, saveHistory]);

  // Fetch initial history
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await fetch(`/.netlify/functions/responses?userId=${userId}&scriptId=${scriptId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.history && data.history.length > 0) {
            setHistory(data.history);

            // Calculate next step based on loaded history
            const lastHistoryItem = data.history[data.history.length - 1];
            const lastStep = allSteps.find(s => s.id === lastHistoryItem.stepId);

            if (lastStep) {
              let nextStepId: string | null = null;
              // Check if it was a branch selection
              if (lastStep.branches) {
                const selectedBranch = lastStep.branches.find(b => b.label === lastHistoryItem.transcript);
                if (selectedBranch) {
                  nextStepId = selectedBranch.steps[0].id;
                }
              }

              if (!nextStepId) {
                nextStepId = getNextStepId(lastStep);
              }

              if (nextStepId) {
                setCurrentStepId(nextStepId);
              } else {
                setCurrentStepId('FINISHED');
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setIsLoadingHistory(false);
        isInitialLoadRef.current = false;
      }
    };
    fetchHistory();
  }, [userId, scriptId, allSteps, getNextStepId]);

  const processStep = useCallback(async (step: ScriptStep, currentSessionSettings: AgentSettings, forceSpeak: boolean = false) => {
    try {
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }

      setStatus('speaking');
      let usedSettings = currentSessionSettings;

      if (forceSpeak || step.prompt !== lastSpokenPromptRef.current) {
        try {
          await speak(step.prompt, usedSettings);
          lastSpokenPromptRef.current = step.prompt;
        } catch (ttsErr) {
          console.error('TTS failed in processStep, switching to browser', ttsErr);
          if (usedSettings.useElevenLabs) {
            window.alert(`Eleven Labs Error: ${ttsErr instanceof Error ? ttsErr.message : String(ttsErr)}`);
          }
          usedSettings = { ...usedSettings, useElevenLabs: false };
          setSessionSettings(usedSettings);
          await speak(step.prompt, usedSettings);
          lastSpokenPromptRef.current = step.prompt;
        }
      }

      // Check status again as it might have been paused during speaking
      setStatus((prevStatus) => {
        if (prevStatus === 'paused') return 'paused';

        const nextId = getNextStepId(step);
        if (nextId === null && (!step.branches || step.branches.length === 0)) {
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
  }, [resetTranscript, getNextStepId]);

  const handleUserResponse = useCallback(async (userTranscript: string) => {
    if (!currentStep) return;

    if (!userTranscript.trim()) {
      setStatus('speaking');
      await speak("No pude escucharte. ¿Podrías repetir eso?", sessionSettings);
      processStep(currentStep, sessionSettings, false);
      return;
    }

    // Use 'verifying' as the status during actual Gemini request if enabled
    setStatus(sessionSettings.useGeminiVerification ? 'verifying' : 'processing');
    setVerificationFeedback(null);
    try {
      const result = await evaluateResponse(userTranscript, currentStep, sessionSettings.useGeminiVerification);

      if (result.success) {
        if (!sessionSettings.useGeminiVerification) {
          // If Gemini was not used, we still show the verifying/verified states for a bit for consistency
          setStatus('verifying');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setStatus('verified');
        await new Promise(resolve => setTimeout(resolve, 800));

        const newHistoryItem = { stepId: currentStep.id, transcript: userTranscript };
        setHistory(prev => [...prev, newHistoryItem]);

        let nextStepId: string | null = null;

        if (currentStep.branches && currentStep.branches.length > 0) {
          if (result.selectedBranchIndex !== undefined && currentStep.branches[result.selectedBranchIndex]) {
            nextStepId = currentStep.branches[result.selectedBranchIndex].steps[0].id;
          } else {
            setStatus('awaiting_selection');
            return;
          }
        } else {
          nextStepId = getNextStepId(currentStep);
        }

        if (nextStepId) {
          const nextStep = allSteps.find(s => s.id === nextStepId);
          setCurrentStepId(nextStepId);
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
        setVerificationFeedback(feedback);
        setStatus('speaking');
        await speak(feedback, sessionSettings);
        processStep(currentStep, sessionSettings, false);
      }
    } catch (err) {
      console.error('Error in handleUserResponse:', err);
      setError('Failed to process your response.');
      setStatus('error');
    }
  }, [currentStep, sessionSettings, processStep, allSteps, getNextStepId]);

  // Effect to advance when listening stops
  useEffect(() => {
    if (!listening && status === 'listening' && !isEditingResponseRef.current) {
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
    setVerificationFeedback(null);
    lastSpokenPromptRef.current = null;
    isEditingResponseRef.current = false;
    setCurrentStepId(script.initialStepId);
    const initialStep = allSteps.find(s => s.id === script.initialStepId);
    if (initialStep) {
      processStep(initialStep, sessionSettings);
    }
  };

  const resetAgent = () => {
    setCurrentStepId(script.initialStepId);
    setStatus('idle');
    setError(null);
    setHistory([]);
    setVerificationFeedback(null);
    lastSpokenPromptRef.current = null;
    isEditingResponseRef.current = false;
    resetTranscript();
    stopSpeaking();
    SpeechRecognition.stopListening();
  };

  const pauseAgent = () => {
    isEditingResponseRef.current = false;
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
      const prevItem = newHistory.pop();
      setHistory(newHistory);
      setVerificationFeedback(null);
      if (prevItem) {
        setCurrentStepId(prevItem.stepId);
        const prevStep = allSteps.find(s => s.id === prevItem.stepId);
        if (prevStep) {
          processStep(prevStep, sessionSettings);
        }
      }
    }
  };

  const updateHistoryTranscript = (stepId: string, newTranscript: string) => {
    setHistory(prev => prev.map(item =>
      item.stepId === stepId ? { ...item, transcript: newTranscript } : item
    ));
  };

  const handleBranchSelection = (branchIndex: number) => {
    if (currentStep && currentStep.branches) {
      // In branch selection, we don't have a transcript yet for the current step
      // But we should probably record that we were here.
      // However, the current logic adds to history only when handleUserResponse succeeds.
      // For branches, it's a bit different.
      const newHistoryItem = { stepId: currentStep.id, transcript: currentStep.branches![branchIndex].label };
      setHistory(prev => [...prev, newHistoryItem]);
      const nextStepId = currentStep.branches[branchIndex].steps[0].id;
      const nextStep = allSteps.find(s => s.id === nextStepId);
      setCurrentStepId(nextStepId);
      if (nextStep) {
        processStep(nextStep, sessionSettings);
      }
    }
  };

  const finishListening = () => {
    SpeechRecognition.stopListening();
  };

  const startEditingResponse = () => {
    if (status !== 'listening') return;

    isEditingResponseRef.current = true;
    setStatus('editing');
    SpeechRecognition.stopListening();
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }
  };

  const submitEditedResponse = (editedTranscript: string) => {
    if (status !== 'editing') return;

    isEditingResponseRef.current = false;
    handleUserResponse(editedTranscript);
  };

  return {
    currentStep,
    allSteps,
    status,
    transcript,
    verificationFeedback,
    error,
    startAgent,
    resetAgent,
    pauseAgent,
    resumeAgent,
    goToPreviousStep,
    updateHistoryTranscript,
    finishListening,
    startEditingResponse,
    submitEditedResponse,
    handleBranchSelection,
    history,
    totalSteps: allSteps.length,
    isFinished: currentStepId === 'FINISHED',
    isLoadingHistory,
    browserSupportsSpeechRecognition
  };
};
