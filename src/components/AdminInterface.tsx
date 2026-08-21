import { useState, useEffect, useMemo } from 'react';
import type { ResponseRecord, Script, ScriptStep, UserProfile } from '../types';
import astroIntroduccion from '../data/astro_introduccion.json';
import astroIdentidad from '../data/astro_identidad.json';
import astroEmociones from '../data/astro_emociones.json';
import astroVenus from '../data/astro_venus.json';
import astroInfancia from '../data/astro_infancia.json';
import astroDescendente from '../data/astro_descendente.json';
import astroNodoLunar from '../data/astro_nodo_lunar.json';
import astroCasaSolar from '../data/astro_casa_solar.json';
import astroCasaKarma from '../data/astro_casa_karma.json';
import astroValores from '../data/astro_valores.json';
import { Users, User, BookOpen, ChevronLeft, Loader2, CheckCircle2, Circle, UserPlus, Save, RefreshCw } from 'lucide-react';
import { SIGNS, HOUSES } from '../utils/constants';

type View = 'students' | 'student-detail' | 'module-detail' | 'create-user';

const SCRIPTS: Record<string, Script> = {
  introduccion: astroIntroduccion as Script,
  identidad: astroIdentidad as Script,
  emociones: astroEmociones as Script,
  venus: astroVenus as Script,
  infancia: astroInfancia as Script,
  descendente: astroDescendente as Script,
  nodo_lunar: astroNodoLunar as Script,
  casa_solar: astroCasaSolar as Script,
  casa_karma: astroCasaKarma as Script,
  valores: astroValores as Script,
};

const SCRIPT_LABELS: Record<string, string> = {
  introduccion: 'Introducción',
  identidad: 'Identidad',
  emociones: 'Emociones',
  venus: 'Venus',
  infancia: 'Infancia',
  descendente: 'Descendente',
  nodo_lunar: 'Nodo Lunar',
  casa_solar: 'Casa Solar',
  casa_karma: 'Casa Karma',
  valores: 'Valores',
};

interface AdminInterfaceProps {
  isRestricted?: boolean;
}

export default function AdminInterface({ isRestricted = false }: AdminInterfaceProps) {
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>(isRestricted ? 'create-user' : 'students');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [responsesRes, profilesRes] = await Promise.all([
          fetch('/.netlify/functions/responses'),
          fetch('/.netlify/functions/users')
        ]);

        if (responsesRes.ok) {
          const data = await responsesRes.json();
          setResponses(data);
        }

        if (profilesRes.ok) {
          const data = await profilesRes.json();
          setProfiles(data);
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const flattenSteps = (script: Script) => {
    const steps: ScriptStep[] = [];
    const addSteps = (s: ScriptStep[]) => {
      s.forEach(step => {
        steps.push(step);
        if (step.branches) {
          step.branches.forEach(branch => addSteps(branch.steps));
        }
      });
    };
    addSteps(script.steps);
    return steps;
  };

  const scriptSteps = useMemo(() => {
    const map: Record<string, ScriptStep[]> = {};
    Object.entries(SCRIPTS).forEach(([id, script]) => {
      map[id] = flattenSteps(script);
    });
    return map;
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-gray-600 font-medium">Cargando datos del administrador...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Admin Header */}
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Users size={24} />
            <h1 className="text-xl font-bold">
              {isRestricted ? 'Crear Usuarios' : 'Panel de Administración'}
            </h1>
          </div>
          {!isRestricted && view !== 'students' && (
            <button
              onClick={() => setView('students')}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-lg transition-colors text-sm font-medium"
            >
              <ChevronLeft size={16} />
              Volver a la lista
            </button>
          )}
        </div>

        <div className="p-6">
          {view === 'create-user' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Crear Nuevo Usuario</h2>
                  <p className="text-gray-500">Ingresa los detalles del perfil astrológico</p>
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const allowedLessons: ('Intro' | 'Karma' | 'Valores')[] = [];
                  if (formData.get('lesson_intro') === 'on') allowedLessons.push('Intro');
                  if (formData.get('lesson_karma') === 'on') allowedLessons.push('Karma');
                  if (formData.get('lesson_valores') === 'on') allowedLessons.push('Valores');

                  const data = {
                    username: formData.get('username') as string,
                    sunSign: formData.get('sunSign') as string,
                    moonSign: formData.get('moonSign') as string,
                    venusSign: formData.get('venusSign') as string,
                    casaCuatroSign: formData.get('casaCuatroSign') as string,
                    descendenteSign: formData.get('descendenteSign') as string,
                    nodoLunarSign: formData.get('nodoLunarSign') as string,
                    casaSolar: formData.get('casaSolar') as string,
                    casaKarma: formData.get('casaKarma') as string,
                    isAdmin: formData.get('isAdmin') === 'on',
                    allowedLessons: allowedLessons.length > 0 ? allowedLessons : ['Intro'],
                  };

                  try {
                    const response = await fetch('/.netlify/functions/users', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data),
                    });

                    if (response.ok) {
                      alert('Usuario creado exitosamente');
                      (e.target as HTMLFormElement).reset();
                      // Refresh profiles if not restricted
                      if (!isRestricted) {
                        const res = await fetch('/.netlify/functions/users');
                        if (res.ok) setProfiles(await res.json());
                      }
                    }
                  } catch (err) {
                    console.error('Failed to create user', err);
                    alert('Error al crear usuario');
                  }
                }}
                className="space-y-6 bg-gray-50 p-8 rounded-2xl border border-gray-100"
              >
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-bold text-gray-700 uppercase tracking-wider">Nombre de Usuario</label>
                  <input
                    id="username"
                    name="username"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Ej. JuanPerez"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="sunSign" className="text-sm font-bold text-gray-700 uppercase tracking-wider">Signo Solar</label>
                    <select
                      id="sunSign"
                      name="sunSign"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="casaCuatroSign" className="text-sm font-bold text-gray-700 uppercase tracking-wider">Casa Cuatro</label>
                    <select
                      id="casaCuatroSign"
                      name="casaCuatroSign"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="descendenteSign" className="text-sm font-bold text-gray-700 uppercase tracking-wider">Descendente</label>
                    <select
                      id="descendenteSign"
                      name="descendenteSign"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="nodoLunarSign" className="text-sm font-bold text-gray-700 uppercase tracking-wider">Nodo Lunar</label>
                    <select
                      id="nodoLunarSign"
                      name="nodoLunarSign"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="moonSign" className="text-sm font-bold text-gray-700 uppercase tracking-wider">Signo Lunar</label>
                    <select
                      id="moonSign"
                      name="moonSign"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="venusSign" className="text-sm font-bold text-gray-700 uppercase tracking-wider">Signo Venus</label>
                    <select
                      id="venusSign"
                      name="venusSign"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="casaSolar" className="text-sm font-bold text-gray-700 uppercase tracking-wider">Casa Solar</label>
                    <select
                      id="casaSolar"
                      name="casaSolar"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {HOUSES.map(house => <option key={house} value={house}>{house}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="casaKarma" className="text-sm font-bold text-gray-700 uppercase tracking-wider">Casa Karma</label>
                    <select
                      id="casaKarma"
                      name="casaKarma"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {HOUSES.map(house => <option key={house} value={house}>{house}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider block">Lecciones Permitidas</label>
                  <div className="flex flex-wrap gap-6 pt-1">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="lesson_intro"
                        defaultChecked={true}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      Intro
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="lesson_karma"
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      Karma
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="lesson_valores"
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      Valores
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isAdmin"
                    name="isAdmin"
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="isAdmin" className="text-sm font-medium text-gray-700 cursor-pointer">
                    ¿Es Administrador?
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Guardar Usuario
                </button>
              </form>
            </div>
          )}

          {!isRestricted && view === 'students' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Estudiantes</h2>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setView('create-user')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <UserPlus size={16} />
                    Crear Usuario
                  </button>
                  {Object.keys(SCRIPTS).map(scriptId => (
                    <button
                      key={scriptId}
                      onClick={() => {
                        setSelectedScriptId(scriptId);
                        setView('module-detail');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                    >
                      <BookOpen size={16} />
                      Ver {SCRIPT_LABELS[scriptId] || scriptId}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-100">
                      <th className="py-4 px-4 font-semibold text-gray-600">ID Estudiante</th>
                      <th className="py-4 px-4 font-semibold text-gray-600">Última Actividad</th>
                      <th className="py-4 px-4 font-semibold text-gray-600">Progreso</th>
                      <th className="py-4 px-4 font-semibold text-gray-600 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map(profile => {
                      const userId = profile.username;
                      const userResponses = responses.filter(r => r.userId === userId);
                      const lastUpdate = userResponses.length > 0
                        ? new Date(Math.max(...userResponses.map(r => new Date(r.updatedAt).getTime()))).toLocaleDateString()
                        : 'Sin actividad';

                      // Calculate overall progress
                      const totalSteps = Object.values(scriptSteps).flat().length;
                      const completedSteps = userResponses.reduce((acc, r) => acc + r.history.length, 0);
                      const progress = Math.min(Math.round((completedSteps / totalSteps) * 100), 100);

                      return (
                        <tr key={userId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-bold text-gray-800">{profile.username}</div>
                              <div className="text-xs text-gray-400">
                                ☉ {profile.sunSign} • ☾ {profile.moonSign} • ♀ {profile.venusSign}
                                {profile.casaCuatroSign && ` • 🏠 ${profile.casaCuatroSign}`}
                                {profile.descendenteSign && ` • ☍ ${profile.descendenteSign}`}
                                {profile.nodoLunarSign && ` • ☊ ${profile.nodoLunarSign}`}
                                {profile.casaSolar && ` • ☀️ ${profile.casaSolar}`}
                                {profile.casaKarma && ` • ☯ ${profile.casaKarma}`}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-500">{lastUpdate}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-grow bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-blue-600 h-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-gray-600">{progress}%</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingProfile(profile)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
                              >
                                <Save size={16} />
                                Editar
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUserId(userId);
                                  setView('student-detail');
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                              >
                                <User size={16} />
                                Detalle
                              </button>
                              {/* Option to reset user progress disabled for now */}
                              <button
                                disabled
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed text-sm font-medium"
                                title="La opción de reiniciar progreso está deshabilitada temporalmente"
                              >
                                <RefreshCw size={16} />
                                Reiniciar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!isRestricted && view === 'student-detail' && selectedUserId && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                    <User size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Detalle del Estudiante</h2>
                    <p className="text-gray-500 font-mono text-sm">{selectedUserId}</p>
                  </div>
                </div>
                {/* Option to reset user progress disabled for now */}
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-400 cursor-not-allowed rounded-lg transition-colors text-sm font-medium"
                  title="La opción de reiniciar progreso está deshabilitada temporalmente"
                >
                  <RefreshCw size={16} />
                  Reiniciar Progreso
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {Object.entries(SCRIPTS).map(([scriptId]) => {
                  const record = responses.find(r => r.userId === selectedUserId && r.scriptId === scriptId);
                  const totalSteps = scriptSteps[scriptId].length;
                  const completedCount = record?.history.length || 0;
                  const progress = Math.round((completedCount / totalSteps) * 100);

                  return (
                    <div key={scriptId} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-gray-800">
                          Módulo: {SCRIPT_LABELS[scriptId] || scriptId}
                        </h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          progress === 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {progress}% completado
                        </span>
                      </div>

                      <div className="space-y-3">
                        {scriptSteps[scriptId].map((step) => {
                          const isAnswered = record?.history.some(h => h.stepId === step.id);
                          return (
                            <div key={step.id} className="flex items-start gap-3">
                              {isAnswered ? (
                                <CheckCircle2 size={18} className="text-green-500 mt-0.5" />
                              ) : (
                                <Circle size={18} className="text-gray-300 mt-0.5" />
                              )}
                              <div className="flex-grow">
                                <p className={`text-sm ${isAnswered ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                                  {step.prompt.substring(0, 60)}...
                                </p>
                                {isAnswered && (
                                  <p className="text-xs text-gray-500 mt-1 italic">
                                    "{record?.history.find(h => h.stepId === step.id)?.transcript}"
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isRestricted && view === 'module-detail' && selectedScriptId && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Detalle del Módulo: {SCRIPT_LABELS[selectedScriptId] || selectedScriptId}
                    </h2>
                    <p className="text-gray-500">Respuestas agrupadas por pregunta</p>
                  </div>
                </div>
              </div>

              <div className="space-y-10">
                {scriptSteps[selectedScriptId].map((step, idx) => (
                  <div key={step.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-3">
                        <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm">
                          {idx + 1}
                        </span>
                        {step.prompt}
                      </h3>
                      <p className="text-xs text-gray-400 mt-2 uppercase tracking-wider font-semibold">
                        Requerimiento: {step.requirement}
                      </p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {responses
                        .filter(r =>
                          r.scriptId === selectedScriptId &&
                          r.history.some(h => h.stepId === step.id) &&
                          profiles.some(p => p.username === r.userId)
                        )
                        .map(r => {
                          const answer = r.history.find(h => h.stepId === step.id);
                          const profile = profiles.find(p => p.username === r.userId);
                          return (
                            <div key={r.userId} className="px-6 py-4 flex gap-4 hover:bg-gray-50 transition-colors">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                                  {(profile?.username || r.userId).substring(0, 2).toUpperCase()}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-400 mb-1">
                                  {profile?.username || r.userId}
                                </p>
                                <p className="text-gray-700 leading-relaxed">
                                  {answer?.transcript}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      {responses.filter(r => r.scriptId === selectedScriptId && r.history.some(h => h.stepId === step.id)).length === 0 && (
                        <div className="px-6 py-8 text-center text-gray-400 italic">
                          Aún no hay respuestas para esta pregunta.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {editingProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800">
              Editar Perfil: {editingProfile.username}
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const allowedLessons: ('Intro' | 'Karma' | 'Valores')[] = [];
                if (formData.get('edit_lesson_intro') === 'on') allowedLessons.push('Intro');
                if (formData.get('edit_lesson_karma') === 'on') allowedLessons.push('Karma');
                if (formData.get('edit_lesson_valores') === 'on') allowedLessons.push('Valores');

                const updatedData = {
                  username: editingProfile.username,
                  sunSign: formData.get('sunSign') as string,
                  moonSign: formData.get('moonSign') as string,
                  venusSign: formData.get('venusSign') as string,
                  casaCuatroSign: formData.get('casaCuatroSign') as string,
                  descendenteSign: formData.get('descendenteSign') as string,
                  nodoLunarSign: formData.get('nodoLunarSign') as string,
                  casaSolar: formData.get('casaSolar') as string,
                  casaKarma: formData.get('casaKarma') as string,
                  isAdmin: formData.get('isAdmin') === 'on',
                  allowedLessons: allowedLessons.length > 0 ? allowedLessons : ['Intro'],
                };

                try {
                  const res = await fetch('/.netlify/functions/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData),
                  });
                  if (res.ok) {
                    alert('Perfil actualizado con éxito');
                    setEditingProfile(null);
                    const refreshRes = await fetch('/.netlify/functions/users');
                    if (refreshRes.ok) setProfiles(await refreshRes.json());
                  } else {
                    alert('Error al actualizar perfil');
                  }
                } catch (err) {
                  console.error('Failed to update profile', err);
                  alert('Error al actualizar perfil');
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Signo Solar</label>
                  <select
                    name="sunSign"
                    defaultValue={editingProfile.sunSign}
                    required
                    className="w-full p-2.5 rounded-lg border border-gray-200"
                  >
                    {SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Signo Lunar</label>
                  <select
                    name="moonSign"
                    defaultValue={editingProfile.moonSign}
                    required
                    className="w-full p-2.5 rounded-lg border border-gray-200"
                  >
                    {SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Signo Venus</label>
                  <select
                    name="venusSign"
                    defaultValue={editingProfile.venusSign}
                    required
                    className="w-full p-2.5 rounded-lg border border-gray-200"
                  >
                    {SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Casa Cuatro</label>
                  <select
                    name="casaCuatroSign"
                    defaultValue={editingProfile.casaCuatroSign || ''}
                    required
                    className="w-full p-2.5 rounded-lg border border-gray-200"
                  >
                    {SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Descendente</label>
                  <select
                    name="descendenteSign"
                    defaultValue={editingProfile.descendenteSign || ''}
                    required
                    className="w-full p-2.5 rounded-lg border border-gray-200"
                  >
                    {SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nodo Lunar</label>
                  <select
                    name="nodoLunarSign"
                    defaultValue={editingProfile.nodoLunarSign || ''}
                    required
                    className="w-full p-2.5 rounded-lg border border-gray-200"
                  >
                    {SIGNS.map(sign => <option key={sign} value={sign}>{sign}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Casa Solar</label>
                  <select
                    name="casaSolar"
                    defaultValue={editingProfile.casaSolar || ''}
                    required
                    className="w-full p-2.5 rounded-lg border border-gray-200"
                  >
                    {HOUSES.map(house => <option key={house} value={house}>{house}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Casa Karma</label>
                  <select
                    name="casaKarma"
                    defaultValue={editingProfile.casaKarma || ''}
                    required
                    className="w-full p-2.5 rounded-lg border border-gray-200"
                  >
                    {HOUSES.map(house => <option key={house} value={house}>{house}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-200">
                <label className="text-xs font-bold text-gray-700 uppercase block">Lecciones Permitidas</label>
                <div className="flex flex-wrap gap-6 pt-1">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      name="edit_lesson_intro"
                      defaultChecked={!editingProfile.allowedLessons || editingProfile.allowedLessons.includes('Intro')}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    Intro
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      name="edit_lesson_karma"
                      defaultChecked={editingProfile.allowedLessons?.includes('Karma')}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    Karma
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      name="edit_lesson_valores"
                      defaultChecked={editingProfile.allowedLessons?.includes('Valores')}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    Valores
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="editIsAdmin"
                  name="isAdmin"
                  defaultChecked={editingProfile.isAdmin}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="editIsAdmin" className="text-sm font-medium text-gray-700 cursor-pointer">
                  ¿Es Administrador?
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
