import React from 'react';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import type { Script, AgentSettings } from '../types';
import { Mic, MicOff, RefreshCw, Play, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Pause, Square, ChevronRight, FileText, Pencil } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AgentInterfaceProps {
  script: Script;
  settings: AgentSettings;
  onFinish?: () => void;
  onReset?: () => void;
  isCompleted?: boolean;
  onNextModule?: () => void;
}

const AgentInterface: React.FC<AgentInterfaceProps> = ({ script, settings, onFinish, onReset, isCompleted, onNextModule }) => {
  const {
    currentStep,
    status,
    transcript,
    error,
    feedback,
    startAgent,
    resetAgent,
    pauseAgent,
    resumeAgent,
    goToPreviousStep,
    finishListening,
    handleBranchSelection,
    history,
    totalSteps,
    isFinished: isAgentFinished,
    browserSupportsSpeechRecognition,
    isEditing,
    startEditing,
    cancelEditing,
    saveEditing,
    updateAnswer,
    allSteps
  } = useVoiceAgent(script, settings);

  const [showReview, setShowReview] = React.useState(isCompleted || false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [currentEditValue, setCurrentEditValue] = React.useState('');

  const isFinished = isAgentFinished || isCompleted;

  React.useEffect(() => {
    if (isAgentFinished && onFinish) {
      onFinish();
    }
  }, [isAgentFinished, onFinish]);

  const currentStepNumber = history.length + 1;
  const progress = isFinished ? 100 : ((currentStepNumber - 1) / Math.max(totalSteps, 1)) * 100;

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <p className="text-xl font-semibold">Browser Not Supported</p>
        <p className="text-gray-600">Your browser does not support speech recognition. Please try Chrome.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-8 p-4 max-w-2xl mx-auto w-full">
      <div className="text-center space-y-4 w-full">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agente de Voz</h1>
          <p className="text-gray-500">
            {isFinished ? 'Conversación completada' : 'Sigue el guion para completar la tarea'}
          </p>
        </div>

        {!isFinished && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
            <div className="flex justify-between mt-1">
               <span className="text-xs text-gray-400">Paso {currentStepNumber} (estimado)</span>
               <span className="text-xs text-gray-400">{Math.round(progress)}% Completado</span>
            </div>
          </div>
        )}
      </div>

      <div className={cn(
        "w-full bg-white rounded-2xl shadow-xl p-8 border-2 transition-all duration-300",
        status === 'listening' ? "border-blue-500 shadow-blue-100" : "border-transparent",
        status === 'speaking' ? "border-green-500 shadow-green-100" : "",
        status === 'processing' ? "border-purple-500 shadow-purple-100" : "",
        status === 'verifying' ? "border-amber-500 shadow-amber-100" : "",
        status === 'verified' ? "border-green-600 shadow-green-200" : "",
        status === 'awaiting_selection' ? "border-indigo-500 shadow-indigo-100" : ""
      )}>
        {status === 'paused' && !isEditing ? (
          <div className="text-center py-12 space-y-4">
            <Pause className="mx-auto text-amber-500" size={64} />
            <h2 className="text-2xl font-bold">Pausado</h2>
            <p className="text-gray-500">La conversación está en pausa.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={resumeAgent}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors flex items-center gap-2"
              >
                <Play size={18} fill="currentColor" /> Continuar
              </button>
              <button
                onClick={resetAgent}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-full font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw size={18} /> Reiniciar
              </button>
            </div>
          </div>
        ) : isEditing ? (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                <Pencil size={20} className="text-blue-500" /> Editar respuesta
              </h2>
              <p className="text-gray-500 text-sm">La interacción se reanudará al guardar.</p>
            </div>
            <textarea
              className="w-full h-32 p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              value={currentEditValue}
              onChange={(e) => setCurrentEditValue(e.target.value)}
              placeholder="Escribe tu respuesta aquí..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  saveEditing(currentEditValue);
                  setCurrentEditValue('');
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-blue-200"
              >
                Guardar y continuar
              </button>
              <button
                onClick={() => {
                  cancelEditing();
                  setCurrentEditValue('');
                }}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : isFinished && showReview ? (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center justify-between sticky top-0 bg-white pb-4 z-10">
              <h2 className="text-2xl font-bold">Resumen de respuestas</h2>
              <button
                onClick={() => setShowReview(false)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Volver
              </button>
            </div>
            <div className="space-y-4">
              {history.map((item, index) => {
                const step = allSteps.find(s => s.id === item.stepId);
                return (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">Pregunta {index + 1}</p>
                    <p className="text-gray-800 font-medium">{step?.prompt}</p>
                    <div className="pl-4 border-l-2 border-blue-200">
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Tu respuesta</p>
                      {editingIndex === index ? (
                        <div className="space-y-2 mt-2">
                          <textarea
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                updateAnswer(item.stepId, editValue);
                                setEditingIndex(null);
                              }}
                              className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-lg"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="px-3 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded-lg"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start gap-4">
                          <p className="text-gray-600 italic">"{item.transcript}"</p>
                          <button
                            onClick={() => {
                              setEditingIndex(index);
                              setEditValue(item.transcript);
                            }}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => {
                resetAgent();
                setShowReview(false);
                if (onReset) onReset();
              }}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} /> Reiniciar módulo
            </button>
          </div>
        ) : isFinished ? (
          <div className="text-center py-12 space-y-6">
            <CheckCircle2 className="mx-auto text-green-500" size={64} />
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">¡Buen trabajo!</h2>
              <p className="text-gray-500 text-lg">Has completado este módulo con éxito.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-4">
              <button
                onClick={() => setShowReview(true)}
                className="w-full py-4 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-sm"
              >
                <FileText size={20} /> Revisar respuestas
              </button>

              {onNextModule && (
                <button
                  onClick={onNextModule}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-blue-200"
                >
                  Siguiente módulo <ChevronRight size={20} />
                </button>
              )}

              <button
                onClick={() => {
                  resetAgent();
                  if (onReset) onReset();
                }}
                className="mt-2 text-gray-400 hover:text-gray-600 text-sm flex items-center justify-center gap-1 mx-auto"
              >
                <RefreshCw size={14} /> Empezar de nuevo
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 text-center">
            <div className="min-h-[100px] flex flex-col items-center justify-center gap-4">
              {status === 'idle' ? (
                <p className="text-gray-400 italic">¿Listo para empezar?</p>
              ) : (
                <>
                  <p className="text-xl font-medium text-gray-800 leading-relaxed">
                    {currentStep?.prompt}
                  </p>
                  {feedback && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="font-semibold flex items-center gap-1">
                        <AlertCircle size={14} /> Nota:
                      </p>
                      <p>{feedback}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {status === 'awaiting_selection' && currentStep?.branches && (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Selecciona una opción para continuar:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentStep.branches.map((branch, index) => (
                    <button
                      key={branch.label}
                      onClick={() => handleBranchSelection(index)}
                      className="flex items-center justify-between px-6 py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-semibold transition-all border border-indigo-200 group"
                    >
                      {branch.label}
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-8">
              {status !== 'idle' && status !== 'error' && (
                <button
                  onClick={goToPreviousStep}
                  disabled={history.length === 0 || status === 'processing' || status === 'verifying' || status === 'verified'}
                  className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Atrás"
                >
                  <ArrowLeft size={24} />
                </button>
              )}

              <div className="relative h-24 w-24 flex items-center justify-center">
                {status === 'listening' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-ping absolute h-20 w-20 rounded-full bg-blue-400 opacity-20"></div>
                    <div className="animate-ping absolute h-16 w-16 rounded-full bg-blue-400 opacity-40" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                )}

                <button
                  disabled={status !== 'idle' && status !== 'error'}
                  onClick={startAgent}
                  className={cn(
                    "relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                    status === 'idle' ? "bg-blue-600 hover:bg-blue-700 text-white" : "",
                    status === 'speaking' ? "bg-green-500 text-white" : "",
                    status === 'listening' ? "bg-blue-500 text-white" : "",
                    status === 'processing' ? "bg-purple-500 text-white" : "",
                    status === 'verifying' ? "bg-amber-500 text-white" : "",
                    status === 'verified' ? "bg-green-600 text-white" : "",
                    status === 'error' ? "bg-red-500 text-white" : "",
                    status === 'awaiting_selection' ? "bg-indigo-500 text-white opacity-50" : ""
                  )}
                >
                  {status === 'idle' && <Play size={32} fill="currentColor" />}
                  {status === 'speaking' && <MicOff size={32} />}
                  {status === 'listening' && <Mic size={32} />}
                  {status === 'processing' && <Loader2 size={32} className="animate-spin" />}
                  {status === 'verifying' && <Loader2 size={32} className="animate-spin" />}
                  {status === 'verified' && <CheckCircle2 size={32} />}
                  {status === 'error' && <AlertCircle size={32} />}
                  {status === 'awaiting_selection' && <ChevronRight size={32} />}
                </button>
              </div>

              {status !== 'idle' && status !== 'error' && (
                <button
                  onClick={pauseAgent}
                  disabled={status === 'processing' || status === 'verifying' || status === 'verified'}
                  className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Pausar"
                >
                  <Pause size={24} />
                </button>
              )}
            </div>

            {status === 'listening' && (
              <div className="flex justify-center gap-3">
                <button
                  onClick={finishListening}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-100"
                >
                  <Square size={16} fill="currentColor" /> Terminar de hablar
                </button>
                <button
                  onClick={() => {
                    setCurrentEditValue(transcript);
                    startEditing();
                  }}
                  className="px-6 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-full font-medium transition-colors flex items-center gap-2"
                >
                  <Pencil size={16} /> Editar
                </button>
              </div>
            )}

            <div className="min-h-[60px] p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Transcripción</p>
              <p className="text-gray-600 italic">
                {transcript || (status === 'listening' ? 'Escuchando...' : 'Tu discurso aparecerá aquí')}
              </p>
            </div>

            {status !== 'idle' && (
              <div className="flex justify-center items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  status === 'speaking' && "bg-green-500 animate-pulse",
                  status === 'listening' && "bg-blue-500 animate-pulse",
                  status === 'processing' && "bg-purple-500 animate-pulse",
                  status === 'verifying' && "bg-amber-500 animate-pulse",
                  status === 'verified' && "bg-green-600 animate-pulse",
                  status === 'awaiting_selection' && "bg-indigo-500 animate-pulse"
                )} />
                <span className="text-sm font-medium text-gray-500 capitalize">
                  {status === 'speaking' ? 'Hablando' :
                   status === 'listening' ? 'Escuchando' :
                   status === 'processing' ? 'Procesando' :
                   status === 'verifying' ? 'Verificando' :
                   status === 'verified' ? 'Verificado' :
                   status === 'awaiting_selection' ? 'Esperando selección' : status}...
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="w-full bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3 text-red-700">
          <AlertCircle className="flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-sm">Error</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={resetAgent}
              className="mt-2 text-xs font-bold underline uppercase"
            >
              Reiniciar Agente
            </button>
          </div>
        </div>
      )}

      {!isFinished && (
         <div className="w-full text-center">
            <button
              onClick={resetAgent}
              className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1 mx-auto"
            >
              <RefreshCw size={14} /> Reiniciar
            </button>
         </div>
      )}
    </div>
  );
};

export default AgentInterface;
