import type { AgentSettings } from '../types';

export const speak = async (text: string, settings: AgentSettings): Promise<void> => {
  if (settings.useElevenLabs && settings.elevenLabsApiKey) {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${settings.elevenLabsVoiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': settings.elevenLabsApiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Eleven Labs API request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          console.error('Audio playback error, falling back to Web Speech API');
          webSpeechSpeak(text).then(resolve).catch(() => resolve());
        };
        audio.play().catch(err => {
          console.error('Audio play failed, falling back to Web Speech API', err);
          URL.revokeObjectURL(audioUrl);
          webSpeechSpeak(text).then(resolve).catch(() => resolve());
        });
      });
    } catch (error) {
      console.error('Eleven Labs TTS failed, falling back to Web Speech API', error);
      return webSpeechSpeak(text);
    }
  } else {
    return webSpeechSpeak(text);
  }
};

export const webSpeechSpeak = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Web Speech API not supported in this browser'));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      resolve();
    };
    utterance.onerror = (event) => {
      reject(new Error(`Web Speech API error: ${event.error}`));
    };
    window.speechSynthesis.speak(utterance);
  });
};

export const testElevenLabs = async (settings: AgentSettings): Promise<void> => {
  if (!settings.elevenLabsApiKey) {
    throw new Error('Eleven Labs API Key is missing');
  }
  if (!settings.elevenLabsVoiceId) {
    throw new Error('Eleven Labs Voice ID is missing');
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${settings.elevenLabsVoiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': settings.elevenLabsApiKey,
      },
      body: JSON.stringify({
        text: "This is a test of the Eleven Labs voice agent.",
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    }
  );

  if (!response.ok) {
    let errorMessage = `Eleven Labs API request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail?.message || errorMessage;
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(errorMessage);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      reject(new Error('Failed to play Eleven Labs audio'));
    };
    audio.play().catch(reject);
  });
};
