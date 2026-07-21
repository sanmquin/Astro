import { useState, useEffect, useMemo } from 'react';
import AgentInterface from './components/AgentInterface';
import AdminInterface from './components/AdminInterface';
import Settings from './components/Settings';
import TestModule from './components/TestModule';
import LoginModal from './components/LoginModal';
import { loadSettings, getUsername, setUsername as saveUsername, clearUsername } from './utils/storage';
import type { AgentSettings, Script, UserProfile } from './types';
import astroIntroduccion from './data/astro_introduccion.json';
import astroIdentidad from './data/astro_identidad.json';
import astroEmociones from './data/astro_emociones.json';
import astroVenus from './data/astro_venus.json';
import { getLectureForScript } from './data/lectures';
import { Settings as SettingsIcon, Activity, FileText, LayoutDashboard, LogOut } from 'lucide-react';

const SCRIPTS: Record<string, Script> = {
  introduccion: astroIntroduccion as Script,
  identidad: astroIdentidad as Script,
  emociones: astroEmociones as Script,
  venus: astroVenus as Script,
};

const isScriptHistoryCompleted = (scriptId: string, history: { stepId: string }[] | undefined) => {
  if (!history || history.length === 0) return false;

  if (scriptId === 'introduccion') {
    return history.some(h => h.stepId === '[3] Mic Check');
  }
  if (scriptId === 'identidad') {
    return history.some(h => h.stepId === '[7] Siguiente paso');
  }
  if (scriptId === 'emociones') {
    return history.some(h => h.stepId === '[7] Siguiente paso');
  }
  if (scriptId === 'venus') {
    return history.some(h => h.stepId === '[7] Siguiente leccion');
  }
  return false;
};

function App() {
  const [settings, setSettings] = useState<AgentSettings>(loadSettings());
  const [currentUser, setCurrentUser] = useState<UserProfile | 'admin' | null>(null);
  const [isLoginChecked, setIsLoginChecked] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isRestrictedAdmin, setIsRestrictedAdmin] = useState(false);
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [scriptId, setScriptId] = useState('introduccion');
  const [currentScript, setCurrentScript] = useState<Script>(SCRIPTS[scriptId]);
  const [completedScripts, setCompletedScripts] = useState<Record<string, boolean>>({});

  const loadUserProgress = async (username: string) => {
    // 1. Fast path: load from localStorage
    const savedCompleted = localStorage.getItem(`completed_scripts_${username}`);
    const savedScriptId = localStorage.getItem(`current_script_id_${username}`);

    if (savedCompleted) {
      try {
        const initialCompleted = JSON.parse(savedCompleted);
        setCompletedScripts(initialCompleted);
      } catch (e) {
        console.error('Failed to parse savedCompleted', e);
      }
    }

    let initialScriptId = 'introduccion';
    if (savedScriptId && SCRIPTS[savedScriptId]) {
      initialScriptId = savedScriptId;
    }
    setScriptId(initialScriptId);
    setCurrentScript(SCRIPTS[initialScriptId]);

    // 2. Slow path / sync: load from database
    try {
      const response = await fetch(`/.netlify/functions/responses?userId=${encodeURIComponent(username)}`);
      if (response.ok) {
        const records = await response.json();
        if (Array.isArray(records)) {
          const apiCompleted: Record<string, boolean> = {};
          const sequence = ['introduccion', 'identidad', 'emociones', 'venus'];
          sequence.forEach(id => {
            const record = records.find(r => r.scriptId === id);
            if (record && record.history) {
              apiCompleted[id] = isScriptHistoryCompleted(id, record.history);
            } else {
              apiCompleted[id] = false;
            }
          });

          setCompletedScripts(apiCompleted);
          localStorage.setItem(`completed_scripts_${username}`, JSON.stringify(apiCompleted));

          // If the user hasn't explicitly set a script, or if the current script is invalid,
          // we can default to the furthest uncompleted script in the sequence.
          if (!savedScriptId) {
            let furthestScriptId = 'introduccion';
            for (let i = 0; i < sequence.length; i++) {
              const currentId = sequence[i];
              if (apiCompleted[currentId]) {
                if (i < sequence.length - 1) {
                  furthestScriptId = sequence[i + 1];
                } else {
                  furthestScriptId = currentId;
                }
              } else {
                furthestScriptId = currentId;
                break;
              }
            }
            setScriptId(furthestScriptId);
            setCurrentScript(SCRIPTS[furthestScriptId]);
            localStorage.setItem(`current_script_id_${username}`, furthestScriptId);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch user progress from DB', err);
    }
  };

  useEffect(() => {
    const checkLogin = async () => {
      const username = getUsername();
      if (username) {
        if (username === 'admin') {
          setCurrentUser('admin');
          setIsAdminOpen(true);
          setIsRestrictedAdmin(true);
        } else {
          try {
            const response = await fetch(`/.netlify/functions/users?username=${encodeURIComponent(username)}`);
            if (response.ok) {
              const userData = await response.json();
              setCurrentUser(userData);
              await loadUserProgress(username);
            } else {
              clearUsername();
            }
          } catch (err) {
            console.error('Failed to restore session', err);
          }
        }
      }
      setIsLoginChecked(true);
    };
    checkLogin();
  }, []);

  const handleLogin = (user: UserProfile | 'admin') => {
    setCurrentUser(user);
    if (user === 'admin') {
      saveUsername('admin');
      setIsAdminOpen(true);
      setIsRestrictedAdmin(true);
    } else {
      saveUsername(user.username);
      setIsAdminOpen(false);
      setIsRestrictedAdmin(false);
      loadUserProgress(user.username);
    }
  };

  const handleLogout = () => {
    clearUsername();
    setCurrentUser(null);
    setIsAdminOpen(false);
    setIsRestrictedAdmin(false);
    setScriptId('introduccion');
    setCurrentScript(SCRIPTS['introduccion']);
    setCompletedScripts({});
  };

  const handleSettingsChange = (newSettings: AgentSettings) => {
    setSettings(newSettings);
  };

  const handleScriptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setScriptId(id);
    setCurrentScript(SCRIPTS[id]);
    const username = currentUser && currentUser !== 'admin' ? currentUser.username : '';
    if (username) {
      localStorage.setItem(`current_script_id_${username}`, id);
    }
  };

  const handleProceedNext = () => {
    const sequence = ['introduccion', 'identidad', 'emociones', 'venus'];
    const currentIndex = sequence.indexOf(scriptId);
    if (currentIndex !== -1 && currentIndex < sequence.length - 1) {
      const nextId = sequence[currentIndex + 1];
      setScriptId(nextId);
      setCurrentScript(SCRIPTS[nextId]);
      const username = currentUser && currentUser !== 'admin' ? currentUser.username : '';
      if (username) {
        localStorage.setItem(`current_script_id_${username}`, nextId);
      }
    }
  };

  const handleReset = () => {
    setCompletedScripts(prev => {
      const updated = {
        ...prev,
        [scriptId]: false
      };
      const username = currentUser && currentUser !== 'admin' ? currentUser.username : '';
      if (username) {
        localStorage.setItem(`completed_scripts_${username}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  const scriptWithDynamicLecture = useMemo(() => {
    const lecture = getLectureForScript(scriptId, currentUser === 'admin' ? null : currentUser);
    if (lecture) {
      return {
        ...currentScript,
        lecture
      };
    }
    return currentScript;
  }, [currentScript, scriptId, currentUser]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <div className="hidden sm:flex items-center gap-2 font-bold text-xl text-blue-600">
          <span className="text-2xl" role="img" aria-label="libra">♎️</span>
          Casa Siete
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <FileText size={18} className="text-gray-500" />
            <select
              onChange={handleScriptChange}
              className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
              value={scriptId}
            >
              <option value="introduccion">Astro: Introducción</option>
              <option value="identidad" disabled={!completedScripts['introduccion']}>Astro: Identidad</option>
              <option value="emociones" disabled={!completedScripts['identidad']}>Astro: Emociones</option>
              <option value="venus" disabled={!completedScripts['emociones']}>Astro: Venus</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {!isRestrictedAdmin && (
              <button
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                  isAdminOpen
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Admin Dashboard"
              >
                <LayoutDashboard size={20} />
                {isAdminOpen ? 'Agente' : 'Admin'}
              </button>
            )}
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
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center">
        {isAdminOpen ? (
          <AdminInterface isRestricted={isRestrictedAdmin} />
        ) : (
          <AgentInterface
            key={scriptId}
            script={scriptWithDynamicLecture}
            scriptId={scriptId}
            settings={settings}
            isCompleted={completedScripts[scriptId]}
            onFinish={() => {
              setCompletedScripts(prev => {
                const updated = {
                  ...prev,
                  [scriptId]: true
                };
                const username = currentUser && currentUser !== 'admin' ? currentUser.username : '';
                if (username) {
                  localStorage.setItem(`completed_scripts_${username}`, JSON.stringify(updated));
                }
                return updated;
              });
            }}
            onReset={handleReset}
            onProceedNext={scriptId !== 'venus' ? handleProceedNext : undefined}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t px-6 py-4 text-center text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} Interfaz de Agente de Voz. Impulsado por Eleven Labs y Gemini API.
      </footer>

      {/* Modals */}
      {!currentUser && isLoginChecked && (
        <LoginModal onLogin={handleLogin} />
      )}

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
