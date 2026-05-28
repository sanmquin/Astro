import { useState } from 'react';
import AgentInterface from './components/AgentInterface';
import Settings from './components/Settings';
import TestModule from './components/TestModule';
import { loadSettings } from './utils/storage';
import type { AgentSettings, Script } from './types';
import astroIntro from './data/astro_intro.json';
import astroReflexion from './data/astro_reflexion.json';
import { Settings as SettingsIcon, Activity, FileText } from 'lucide-react';

function App() {
  const [settings, setSettings] = useState<AgentSettings>(loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [currentScript, setCurrentScript] = useState<Script>(astroIntro as Script);
  const [completedScripts, setCompletedScripts] = useState<Record<string, boolean>>({});

  const handleSettingsChange = (newSettings: AgentSettings) => {
    setSettings(newSettings);
  };

  const [scriptId, setScriptId] = useState('intro');

  const handleScriptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setScriptId(id);
    if (id === 'reflexion') {
      setCurrentScript(astroReflexion as Script);
    } else {
      setCurrentScript(astroIntro as Script);
    }
  };

  const handleNextModule = () => {
    if (scriptId === 'intro') {
      setScriptId('reflexion');
      setCurrentScript(astroReflexion as Script);
    }
  };

  const handleResetModule = (id: string) => {
    setCompletedScripts(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div className="hidden sm:flex items-center gap-2 font-bold text-xl text-blue-600">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            V
          </div>
          VoiceAgent
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <FileText size={18} className="text-gray-500" />
            <select
              onChange={handleScriptChange}
              className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
              value={scriptId}
            >
              <option value="intro">Astro: Introducción</option>
              <option value="reflexion" disabled={!completedScripts['intro']}>Astro: Reflexión</option>
            </select>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center">
        <AgentInterface
          key={scriptId}
          script={currentScript}
          settings={settings}
          isCompleted={completedScripts[scriptId]}
          onFinish={() => {
            setCompletedScripts(prev => ({ ...prev, [scriptId]: true }));
          }}
          onReset={() => handleResetModule(scriptId)}
          onNextModule={scriptId === 'intro' ? handleNextModule : undefined}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t px-6 py-4 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} Interfaz de Agente de Voz. Impulsado por Eleven Labs y Gemini API.
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
