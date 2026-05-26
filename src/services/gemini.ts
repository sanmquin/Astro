import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ScriptStep } from '../types';

export const evaluateResponse = async (
  transcript: string,
  step: ScriptStep,
  apiKey: string
): Promise<{ success: boolean; feedback?: string }> => {
  if (!apiKey) {
    // If no API key, just assume success for demo purposes if transcript is not empty
    return { success: transcript.trim().length > 0 };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an AI assistant evaluating a user's response to a specific prompt in a script.

      Script Prompt: "${step.prompt}"
      Requirement: "${step.requirement}"
      User Transcript: "${transcript}"

      Determine if the user's response satisfies the requirement.
      Respond ONLY with a JSON object in the following format:
      {
        "success": boolean,
        "feedback": "A short message to say if they fail (optional)"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean potential markdown code blocks from the response
    const jsonString = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Gemini evaluation failed', error);
    return { success: transcript.trim().length > 0 };
  }
};
