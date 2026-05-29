import type { ScriptStep } from '../types';

export const evaluateResponse = async (
  transcript: string,
  step: ScriptStep,
  useGeminiVerification: boolean
): Promise<{ success: boolean; feedback?: string; selectedBranchIndex?: number }> => {
  if (!useGeminiVerification) {
    // If verification is disabled, just assume success if transcript is not empty
    return { success: transcript.trim().length > 0 };
  }

  try {
    const response = await fetch('/.netlify/functions/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript, step }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to evaluate response');
    }

    return await response.json();
  } catch (error) {
    console.error('Gemini evaluation failed', error);
    // Fallback to simple check on error
    return { success: transcript.trim().length > 0 };
  }
};
