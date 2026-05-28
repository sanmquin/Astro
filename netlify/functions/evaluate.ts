import { GoogleGenerativeAI } from '@google/generative-ai';

export const handler = async (event: { httpMethod: string; body: string }) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { transcript, step } = JSON.parse(event.body);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Gemini API key not configured on server' }),
      };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // User specifically requested Gemini 3.1 Flash Lite
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });

    let branchesPrompt = '';
    if (step.branches && step.branches.length > 0) {
      branchesPrompt = `
      Este paso tiene las siguientes ramas de bifurcación:
      ${step.branches.map((b: { label: string; requirement: string }, i: number) => `${i}. "${b.label}": ${b.requirement}`).join('\n')}

      Si la respuesta del usuario coincide con alguna de estas ramas, incluye "selectedBranchIndex" con el índice correspondiente (0, 1, etc.) en tu respuesta JSON.
      Si no coincide claramente con ninguna, no incluyas "selectedBranchIndex".
      `;
    }

    const prompt = `
      Eres un asistente de IA que evalúa la respuesta de un usuario a un mensaje específico en un guion.

      Mensaje del Guion: "${step.prompt}"
      Requisito: "${step.requirement}"
      Transcripción del Usuario: "${transcript}"
      ${branchesPrompt}

      Determina si la respuesta del usuario satisface el requisito.
      Responde ÚNICAMENTE con un objeto JSON en el siguiente formato:
      {
        "success": boolean,
        "feedback": "Un mensaje corto si fallan (opcional)",
        "selectedBranchIndex": number (opcional)
      }
    `;

    console.log('Gemini Prompt:', prompt);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log('Gemini Response:', text);

    const jsonString = text.replace(/```json|```/g, '').trim();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
    };
  } catch (error) {
    console.error('Gemini evaluation failed', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }),
    };
  }
};
