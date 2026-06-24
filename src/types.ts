export type ScriptStep = {
  id: string;
  prompt: string;
  requirement: string;
  nextStepId: string | null;
  branches?: ScriptBranch[];
}

export type ScriptBranch = {
  label: string;
  requirement: string;
  steps: ScriptStep[];
}

export type Script = {
  steps: ScriptStep[];
  initialStepId: string;
}

export type AgentSettings = {
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  useGeminiVerification: boolean;
  useElevenLabs: boolean;
  maxListeningTime: number;
}

export type AgentStatus = 'idle' | 'speaking' | 'listening' | 'editing' | 'paused' | 'processing' | 'verifying' | 'verified' | 'error' | 'awaiting_selection';

export type ResponseRecord = {
  userId: string;
  scriptId: string;
  history: {
    stepId: string;
    transcript: string;
  }[];
  updatedAt: string;
};

export type UserProfile = {
  username: string;
  sunSign: string;
  moonSign: string;
  venusSign: string;
};
