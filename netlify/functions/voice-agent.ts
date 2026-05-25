import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { provider, stepId, transcript } = JSON.parse(event.body ?? '{}');

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      provider,
      stepId,
      transcript,
      message: 'Received. Connect this function to ElevenLabs or Gemini SDK calls.'
    })
  };
};
