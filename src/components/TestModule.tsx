import React, { useState } from 'react';
import type { AgentSettings, ScriptStep } from '../types';
import { testElevenLabs, webSpeechSpeak } from '../services/tts';
import { evaluateResponse } from '../services/gemini';
import { X, Activity, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface TestModuleProps {
  onClose: () => void;
  settings: AgentSettings;
}

type TestStatus = 'idle' | 'running' | 'success' | 'error';

interface TestItemProps {
  title: string;
  status: TestStatus;
  error: string | null;
  onRun: () => void;
}

const TestItem: React.FC<TestItemProps> = ({
  title,
  status,
  error,
  onRun
}) => (
  <div className="p-4 border rounded-lg space-y-3">
    <div className="flex justify-between items-center">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <div className="flex items-center gap-2">
        {status === 'running' && <Loader2 className="animate-spin text-blue-500" size={18} />}
        {status === 'success' && <CheckCircle2 className="text-green-500" size={18} />}
        {status === 'error' && <AlertCircle className="text-red-500" size={18} />}
        <button
          onClick={onRun}
          disabled={status === 'running'}
          className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
        >
          {status === 'idle' ? 'Run Test' : 'Retry'}
        </button>
      </div>
    </div>
    {error && (
      <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 break-words">
        <p className="font-bold mb-1">Error Details:</p>
        {error}
      </div>
    )}
  </div>
);

const TestModule: React.FC<TestModuleProps> = ({ onClose, settings }) => {
  const [agentStatus, setAgentStatus] = useState<TestStatus>('idle');
  const [userStatus, setUserStatus] = useState<TestStatus>('idle');
  const [geminiStatus, setGeminiStatus] = useState<TestStatus>('idle');
  const [agentError, setAgentError] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  const runAgentTest = async () => {
    setAgentStatus('running');
    setAgentError(null);
    try {
      await testElevenLabs(settings);
      setAgentStatus('success');
    } catch (error) {
      setAgentStatus('error');
      setAgentError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const runUserTest = async () => {
    setUserStatus('running');
    setUserError(null);
    try {
      await webSpeechSpeak("This is a test of the user text to speech system.");
      setUserStatus('success');
    } catch (error) {
      setUserStatus('error');
      setUserError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const runGeminiTest = async () => {
    setGeminiStatus('running');
    setGeminiError(null);
    try {
      if (!settings.useGeminiVerification) {
        throw new Error('Gemini Verification is disabled in settings');
      }
      const dummyStep: ScriptStep = {
        id: 'test',
        prompt: 'Say hello',
        requirement: 'User must say hello',
        nextStepId: null
      };
      const result = await evaluateResponse('hello', dummyStep, settings.useGeminiVerification);
      if (result.success) {
        setGeminiStatus('success');
      } else {
        throw new Error(result.feedback || 'Gemini evaluation failed');
      }
    } catch (error) {
      setGeminiStatus('error');
      setGeminiError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity size={20} className="text-blue-600" /> System Tests
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <TestItem
            title="Agent Text to Speech (Eleven Labs)"
            status={agentStatus}
            error={agentError}
            onRun={runAgentTest}
          />
          <TestItem
            title="User Text to Speech (Web Speech)"
            status={userStatus}
            error={userError}
            onRun={runUserTest}
          />
          <TestItem
            title="Gemini Verification"
            status={geminiStatus}
            error={geminiError}
            onRun={runGeminiTest}
          />
        </div>

        <div className="p-4 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestModule;
