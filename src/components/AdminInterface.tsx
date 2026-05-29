import { useState, useEffect, useMemo } from 'react';
import type { ResponseRecord, Script, ScriptStep } from '../types';
import astroIntro from '../data/astro_intro.json';
import astroReflexion from '../data/astro_reflexion.json';
import { Users, User, BookOpen, ChevronLeft, Loader2, CheckCircle2, Circle } from 'lucide-react';

type View = 'students' | 'student-detail' | 'module-detail';

const SCRIPTS: Record<string, Script> = {
  intro: astroIntro as Script,
  reflexion: astroReflexion as Script,
};

export default function AdminInterface() {
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('students');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);

  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const response = await fetch('/.netlify/functions/responses');
        if (response.ok) {
          const data = await response.json();
          setResponses(data);
        }
      } catch (err) {
        console.error('Failed to fetch responses', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResponses();
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
            <h1 className="text-xl font-bold">Panel de Administración</h1>
          </div>
          {view !== 'students' && (
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
          {view === 'students' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Estudiantes</h2>
                <div className="flex gap-2">
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
                      Ver {scriptId === 'intro' ? 'Introducción' : 'Reflexión'}
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
                    {Array.from(new Set(responses.map(r => r.userId))).map(userId => {
                      const userResponses = responses.filter(r => r.userId === userId);
                      const lastUpdate = new Date(Math.max(...userResponses.map(r => new Date(r.updatedAt).getTime()))).toLocaleDateString();

                      // Calculate overall progress
                      const totalSteps = Object.values(scriptSteps).flat().length;
                      const completedSteps = userResponses.reduce((acc, r) => acc + r.history.length, 0);
                      const progress = Math.min(Math.round((completedSteps / totalSteps) * 100), 100);

                      return (
                        <tr key={userId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4 font-medium text-gray-800">{userId.split('-')[0]}...</td>
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {view === 'student-detail' && selectedUserId && (
            <div className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <User size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Detalle del Estudiante</h2>
                  <p className="text-gray-500 font-mono text-sm">{selectedUserId}</p>
                </div>
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
                          {scriptId === 'intro' ? 'Módulo 1: Introducción' : 'Módulo 2: Reflexión'}
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

          {view === 'module-detail' && selectedScriptId && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Detalle del Módulo: {selectedScriptId === 'intro' ? 'Introducción' : 'Reflexión'}
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
                        .filter(r => r.scriptId === selectedScriptId && r.history.some(h => h.stepId === step.id))
                        .map(r => {
                          const answer = r.history.find(h => h.stepId === step.id);
                          return (
                            <div key={r.userId} className="px-6 py-4 flex gap-4 hover:bg-gray-50 transition-colors">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold">
                                  {r.userId.substring(0, 2).toUpperCase()}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-400 mb-1">
                                  Estudiante {r.userId.split('-')[0]}...
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
    </div>
  );
}
