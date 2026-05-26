export type ScriptStep = {
  id: string;
  prompt: string;
  requirement: string;
  nextStepId: string | null;
}

export type Script = {
  steps: ScriptStep[];
  initialStepId: string;
}

export type AgentSettings = {
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  geminiApiKey: string;
  useElevenLabs: boolean;
}

export type AgentStatus = 'idle' | 'speaking' | 'listening' | 'processing' | 'error';
