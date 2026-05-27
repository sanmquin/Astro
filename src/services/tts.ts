import type { AgentSettings } from '../types';

let sharedAudio: HTMLAudioElement | null = null;

const getSharedAudio = (): HTMLAudioElement => {
  if (!sharedAudio) {
    sharedAudio = new Audio();
  }
  return sharedAudio;
};

export const primeTTS = async (): Promise<void> => {
  const audio = getSharedAudio();
  // Short silent WAV file to unlock audio
  audio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";
  try {
    await audio.play();
  } catch (err) {
    console.warn('Failed to prime TTS:', err);
  }
};

export const speak = async (text: string, settings: AgentSettings): Promise<void> => {
  if (settings.useElevenLabs && settings.elevenLabsApiKey) {
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
      let errorMessage = `Eleven Labs API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail?.message || errorData.message || errorMessage;
      } catch {
        // Ignore JSON parse error
      }
      throw new Error(errorMessage);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = getSharedAudio();

    // Stop any current playback
    audio.pause();
    audio.src = audioUrl;

    return new Promise((resolve, reject) => {
      const onEnded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Audio playback failed'));
      };
      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        URL.revokeObjectURL(audioUrl);
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      audio.play().catch(err => {
        cleanup();
        reject(err);
      });
    });
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
    utterance.lang = 'es-MX';
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
  const audio = getSharedAudio();

  audio.pause();
  audio.src = audioUrl;

  return new Promise((resolve, reject) => {
    const onEnded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Failed to play Eleven Labs audio'));
    };
    const cleanup = () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      URL.revokeObjectURL(audioUrl);
    };

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    audio.play().catch(err => {
      cleanup();
      reject(err);
    });
  });
};
