import type { AgentSettings } from '../types';

const SETTINGS_KEY = 'agent_settings';

const DEFAULT_SETTINGS: AgentSettings = {
  elevenLabsApiKey: '',
  elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
  geminiApiKey: '',
  useElevenLabs: false,
};

export const loadSettings = (): AgentSettings => {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to parse settings', e);
    }
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AgentSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};
