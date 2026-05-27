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
      Eres un asistente de IA que evalúa la respuesta de un usuario a un mensaje específico en un guion.

      Mensaje del Guion: "${step.prompt}"
      Requisito: "${step.requirement}"
      Transcripción del Usuario: "${transcript}"

      Determina si la respuesta del usuario satisface el requisito.
      Responde ÚNICAMENTE con un objeto JSON en el siguiente formato:
      {
        "success": boolean,
        "feedback": "Un mensaje corto si fallan (opcional)"
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
