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
            model_id: 'eleven_monolingual_v1',
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
        audio.play();
      });
    } catch (error) {
      console.error('Eleven Labs TTS failed, falling back to Web Speech API', error);
      return webSpeechSpeak(text);
    }
  } else {
    return webSpeechSpeak(text);
  }
};

const webSpeechSpeak = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => {
      resolve();
    };
    window.speechSynthesis.speak(utterance);
  });
};
