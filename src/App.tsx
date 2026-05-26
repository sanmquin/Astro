import { useState } from 'react';
import AgentInterface from './components/AgentInterface';
import Settings from './components/Settings';
import TestModule from './components/TestModule';
import { loadSettings } from './utils/storage';
import type { AgentSettings } from './types';
import scriptData from './data/script.json';
import { Settings as SettingsIcon, Activity } from 'lucide-react';

function App() {
  const [settings, setSettings] = useState<AgentSettings>(loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);

  const handleSettingsChange = (newSettings: AgentSettings) => {
    setSettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-xl text-blue-600">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            V
          </div>
          VoiceAgent
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTestOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="System Tests"
          >
            <Activity size={24} className="text-gray-600" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Settings"
          >
            <SettingsIcon size={24} className="text-gray-600" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center">
        <AgentInterface script={scriptData} settings={settings} />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t px-6 py-4 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} Voice Agent Interface. Powered by Eleven Labs & Gemini API.
      </footer>

      {/* Modals */}
      {isSettingsOpen && (
        <Settings
          onClose={() => setIsSettingsOpen(false)}
          onSettingsChange={handleSettingsChange}
        />
      )}
      {isTestOpen && (
        <TestModule
          onClose={() => setIsTestOpen(false)}
          settings={settings}
        />
      )}
    </div>
  );
}

export default App;
