import { useState } from 'react';
import AgentInterface from './components/AgentInterface';
import Settings from './components/Settings';
import TestModule from './components/TestModule';
import { loadSettings } from './utils/storage';
import type { AgentSettings, Script } from './types';
import defaultScript from './data/script.json';
import conditionalScript from './data/conditional_script.json';
import treeScript from './data/tree_script.json';
import { Settings as SettingsIcon, Activity, FileText } from 'lucide-react';

function App() {
  const [settings, setSettings] = useState<AgentSettings>(loadSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [currentScript, setCurrentScript] = useState<Script>(defaultScript as Script);

  const handleSettingsChange = (newSettings: AgentSettings) => {
    setSettings(newSettings);
  };

  const [scriptId, setScriptId] = useState('default');

  const handleScriptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setScriptId(id);
    if (id === 'conditional') {
      setCurrentScript(conditionalScript as Script);
    } else if (id === 'tree') {
      setCurrentScript(treeScript as Script);
    } else {
      setCurrentScript(defaultScript as Script);
    }
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <FileText size={18} className="text-gray-500" />
            <select
              onChange={handleScriptChange}
              className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
              defaultValue="default"
            >
              <option value="default">Guion Estándar</option>
              <option value="conditional">Guion Condicional</option>
              <option value="tree">Guion de Árbol</option>
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
        <AgentInterface key={scriptId} script={currentScript} settings={settings} />
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
