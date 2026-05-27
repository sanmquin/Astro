import type { AgentSettings } from '../types';

const SETTINGS_KEY = 'agent_settings';

const DEFAULT_SETTINGS: AgentSettings = {
  elevenLabsApiKey: '',
  elevenLabsVoiceId: 'IKne3meq5aSn9XLyUdCD',
  geminiApiKey: '',
  useElevenLabs: false,
  maxListeningTime: 120, // 2 minutes default
};

export const loadSettings = (): AgentSettings => {
  const saved = localStorage.getItem(SETTINGS_KEY);
  let settings = DEFAULT_SETTINGS;

  if (saved) {
    try {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to parse settings', e);
    }
  }

  // Ensure Eleven Labs is only enabled by default if an API key is present
  if (!settings.elevenLabsApiKey) {
    settings.useElevenLabs = false;
  } else if (saved === null) {
    // If it's the first time and we somehow have an API key (e.g. from env or something,
    // though here it's just from DEFAULT_SETTINGS which is empty),
    // but the logic "Only make Eleven Labs the default, when there is an API key, provided"
    // suggests that if key is present, it should be the default.
    settings.useElevenLabs = true;
  }

  return settings;
};

export const saveSettings = (settings: AgentSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
