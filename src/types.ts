export type ScriptStep = {
  id: string;
  prompt: string;
  requirement: string;
  nextStepId: string | null;
  type?: 'default' | 'multiple-choice' | 'sound-check' | 'mic-check';
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
  lecture?: {
    title: string;
    content: string;
  };
  lectures?: {
    title: string;
    content: string;
  }[];
}

export type AgentSettings = {
  elevenLabsApiKey: string;
  elevenLabsVoiceId: string;
  useGeminiVerification: boolean;
  useElevenLabs: boolean;
  maxListeningTime: number;
}

export type AgentStatus = 'idle' | 'speaking' | 'listening' | 'editing' | 'paused' | 'processing' | 'verifying' | 'verified' | 'error' | 'awaiting_selection' | 'sound_check' | 'mic_check';

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
  casaCuatroSign?: string;
  descendenteSign?: string;
  nodoLunarSign?: string;
  casaSolar?: string;
  casaKarma?: string;
  isAdmin?: boolean;
};
