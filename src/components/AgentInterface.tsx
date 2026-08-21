import React from 'react';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import type { Script, AgentSettings } from '../types';
import { Mic, MicOff, RefreshCw, Play, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Pause, Square, ChevronRight, Pencil, Send, FileText, BookOpen, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AgentInterfaceProps {
  script: Script;
  scriptId: string;
  settings: AgentSettings;
  isCompleted?: boolean;
  onFinish?: () => void;
  onReset?: () => void;
  onProceedNext?: () => void;
}

const AgentInterface: React.FC<AgentInterfaceProps> = ({
  script,
  settings,
  isCompleted,
  onFinish,
  onReset,
  onProceedNext,
  scriptId
}) => {
  const {
    currentStep,
    allSteps,
    status,
    transcript,
    verificationFeedback,
    error,
    startAgent,
    resetAgent,
    pauseAgent,
    resumeAgent,
    goToPreviousStep,
    updateHistoryTranscript,
    finishListening,
    startEditingResponse,
    submitEditedResponse,
    handleBranchSelection,
    advanceStep,
    playPrompt,
    startListening,
    history,
    totalSteps,
    isFinished,
    isLoadingHistory,
    browserSupportsSpeechRecognition
  } = useVoiceAgent(script, settings, scriptId);

  const [view, setView] = React.useState<'agent' | 'review'>(isCompleted || isFinished ? 'review' : 'agent');
  const [editingHistoryId, setEditingHistoryId] = React.useState<string | null>(null);
  const [historyEditValue, setHistoryEditValue] = React.useState('');
  const [editedTranscript, setEditedTranscript] = React.useState('');
  const [hasPlayedSound, setHasPlayedSound] = React.useState(false);
  const [isLectureModalOpen, setIsLectureModalOpen] = React.useState(false);
  const previousStatusRef = React.useRef(status);
  const wasActiveRef = React.useRef(false);

  const hasLecture = Boolean(script.lecture || (script.lectures && script.lectures.length > 0));

  const handleOpenLectureModal = () => {
    if (status !== 'idle' && status !== 'paused') {
      wasActiveRef.current = true;
      pauseAgent();
    } else {
      wasActiveRef.current = false;
    }
    setIsLectureModalOpen(true);
  };

  const handleCloseLectureModal = () => {
    setIsLectureModalOpen(false);
    if (wasActiveRef.current) {
      wasActiveRef.current = false;
      resumeAgent();
    }
  };

  React.useEffect(() => {
    if (status === 'editing' && previousStatusRef.current !== 'editing') {
      setEditedTranscript(transcript);
    }
    previousStatusRef.current = status;
  }, [status, transcript]);

  const handleStartEditingResponse = () => {
    setEditedTranscript(transcript);
    startEditingResponse();
  };

  const handleSubmitEditedResponse = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitEditedResponse(editedTranscript);
  };

  const handleStartEditingHistory = (stepId: string, currentTranscript: string) => {
    setEditingHistoryId(stepId);
    setHistoryEditValue(currentTranscript);
  };

  const handleSaveHistoryEdit = (stepId: string) => {
    updateHistoryTranscript(stepId, historyEditValue);
    setEditingHistoryId(null);
  };

  React.useEffect(() => {
    if (isFinished) {
      if (onFinish) onFinish();
    }
  }, [isFinished, onFinish]);

  const handleReset = () => {
    resetAgent();
    setHasPlayedSound(false);
    if (onReset) onReset();
    setView('agent');
  };

  const handlePlaySound = async () => {
    await playPrompt();
    setHasPlayedSound(true);
  };

  const currentStepNumber = history.length + 1;
  const progress = isFinished ? 100 : ((currentStepNumber - 1) / Math.max(totalSteps, 1)) * 100;

  if (isLoadingHistory) {
    return (
      <div className="p-8 text-center flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-gray-500 italic">Cargando tus respuestas...</p>
      </div>
    );
  }

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <p className="text-xl font-semibold">Browser Not Supported</p>
        <p className="text-gray-600">Your browser does not support speech recognition. Please try Chrome.</p>
      </div>
    );
  }

  if (view === 'review') {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 p-4 max-w-2xl mx-auto w-full">
        <div className="text-center space-y-4 w-full">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Revisar Respuestas</h1>
            <p className="text-gray-500">Puedes editar tus respuestas antes de continuar.</p>
          </div>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-xl p-8 border-2 border-transparent space-y-6">
          <div className="space-y-8">
            {history.length === 0 ? (
              <p className="text-center text-gray-500 italic py-8">No hay respuestas para mostrar.</p>
            ) : (
              history.map((item, index) => {
                const step = allSteps.find(s => s.id === item.stepId);
                const isEditing = editingHistoryId === item.stepId;

                return (
                  <div key={item.stepId} className="space-y-2 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                        Paso {index + 1}: {step?.id}
                      </p>
                      {!isEditing && (
                        <button
                          onClick={() => handleStartEditingHistory(item.stepId, item.transcript)}
                          className="text-blue-600 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    </div>
                    <p className="text-gray-800 font-medium italic mb-2">"{step?.prompt}"</p>

                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={historyEditValue}
                          onChange={(e) => setHistoryEditValue(e.target.value)}
                          className="w-full min-h-[80px] rounded-xl border border-blue-200 bg-blue-50/30 p-4 text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingHistoryId(null)}
                            className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSaveHistoryEdit(item.stepId)}
                            className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <p className="text-gray-700 whitespace-pre-wrap">{item.transcript}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            {onProceedNext && (
              <button
                onClick={onProceedNext}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                Siguiente módulo <ChevronRight size={20} />
              </button>
            )}
            <button
              onClick={handleReset}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} /> Reiniciar módulo
            </button>
          </div>

          {isFinished && !isCompleted && (
            <button
              onClick={() => setView('agent')}
              className="w-full text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1"
            >
              <ArrowLeft size={14} /> Volver a la pantalla final
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-8 p-4 max-w-2xl mx-auto w-full">
      <div className="space-y-4 w-full">
        <div className="flex items-center justify-between gap-4">
          <div className="text-left">
            <h1 className="text-3xl font-bold text-gray-900">Agente de Voz “Astro”</h1>
            <p className="text-gray-500">
              {isFinished ? 'Conversación completada' : 'Sigue el guion para completar el curso'}
            </p>
          </div>
          {hasLecture && (
            <button
              onClick={handleOpenLectureModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl font-semibold text-sm transition-all flex-shrink-0 shadow-sm"
            >
              <BookOpen size={18} /> Ver lectura
            </button>
          )}
        </div>

        {!isFinished && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
            <div className="flex justify-between mt-1">
               <span className="text-xs text-gray-400">Paso {currentStepNumber}</span>
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
        status === 'editing' ? "border-sky-500 shadow-sky-100" : "",
        status === 'awaiting_selection' ? "border-indigo-500 shadow-indigo-100" : "",
        status === 'sound_check' ? "border-cyan-500 shadow-cyan-100" : "",
        status === 'mic_check' ? "border-teal-500 shadow-teal-100" : ""
      )}>
        {status === 'paused' ? (
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
        ) : isFinished ? (
          <div className="text-center py-12 space-y-6">
            <CheckCircle2 className="mx-auto text-green-500" size={64} />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">¡Todo listo!</h2>
              <p className="text-gray-500 text-sm">Has completado este módulo con éxito.</p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={() => setView('review')}
                className="w-full px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <FileText size={20} /> Revisar respuestas
              </button>

              {onProceedNext && (
                <button
                  onClick={onProceedNext}
                  className="w-full px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                >
                  Continuar al siguiente módulo <ChevronRight size={20} />
                </button>
              )}

              <button
                onClick={handleReset}
                className="mt-2 text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 mx-auto"
              >
                <RefreshCw size={14} /> Empezar de nuevo
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 text-center">
            <div className="min-h-[100px] flex flex-col items-center justify-center gap-4">
              {status === 'idle' ? (
                <div className="space-y-6 w-full">
                  {script.lectures && script.lectures.length > 0 ? (
                    <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                      {script.lectures.map((item, idx) => (
                        <div key={idx} className="text-left bg-blue-50/50 rounded-2xl p-6 border border-blue-100 space-y-4">
                          <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                            <FileText className="text-blue-600" size={24} />
                            {item.title}
                          </h3>
                          <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {item.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : script.lecture ? (
                    <div className="text-left bg-blue-50/50 rounded-2xl p-6 border border-blue-100 space-y-4 max-h-[400px] overflow-y-auto">
                      <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                        <FileText className="text-blue-600" size={24} />
                        {script.lecture.title}
                      </h3>
                      <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {script.lecture.content}
                      </div>
                    </div>
                  ) : null}
                  {history.length > 0 ? (
                    <div className="bg-blue-50 text-blue-900 p-4 rounded-xl border border-blue-100 text-center space-y-2">
                      <p className="font-semibold">Tienes progreso guardado</p>
                      <p className="text-sm text-blue-700">Paso actual: {currentStepNumber} de {totalSteps}</p>
                    </div>
                  ) : currentStep?.type === 'multiple-choice' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <p className="text-xl font-medium text-gray-800 leading-relaxed">
                        {currentStep.prompt}
                      </p>
                      <div className="flex flex-col gap-3">
                        {currentStep.branches?.map((branch) => (
                          <button
                            key={branch.label}
                            onClick={() => startAgent({ stepId: currentStep.id, transcript: branch.label })}
                            className="flex items-center justify-between px-6 py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-semibold transition-all border border-indigo-200 group text-left"
                          >
                            {branch.label}
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">¿Listo para empezar?</p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-xl font-medium text-gray-800 leading-relaxed">
                    {currentStep?.prompt}
                  </p>
                  {verificationFeedback && (
                    <div className="flex items-start gap-2 bg-amber-50 text-amber-700 p-3 rounded-lg text-sm font-medium animate-in fade-in zoom-in-95 duration-300 border border-amber-100">
                      <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                      <p className="text-left">{verificationFeedback}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {status === 'awaiting_selection' && currentStep?.branches && (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Selecciona una opción para continuar:</p>
                <div className={cn(
                  "gap-3",
                  currentStep.type === 'multiple-choice' ? "flex flex-col" : "grid grid-cols-1 sm:grid-cols-2"
                )}>
                  {currentStep.branches.map((branch, index) => (
                    <button
                      key={branch.label}
                      onClick={() => handleBranchSelection(index)}
                      className="flex items-center justify-between px-6 py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-semibold transition-all border border-indigo-200 group text-left"
                    >
                      {branch.label}
                      <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {status === 'sound_check' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={handlePlaySound}
                    className="flex items-center gap-2 px-8 py-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold shadow-lg shadow-cyan-100 transition-all active:scale-95"
                  >
                    <Play fill="currentColor" size={20} /> Reproducir Sonido
                  </button>
                  {hasPlayedSound && (
                    <p className="text-sm text-gray-500">Si escuchaste el sonido, haz clic en continuar.</p>
                  )}
                </div>
                <button
                  disabled={!hasPlayedSound}
                  onClick={advanceStep}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  Continuar <ChevronRight size={20} />
                </button>
              </div>
            )}

            {currentStep?.type === 'mic-check' && (status === 'mic_check' || status === 'listening') && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={startListening}
                    disabled={status === 'listening'}
                    className="flex items-center gap-2 px-8 py-4 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl font-bold shadow-lg shadow-teal-100 transition-all active:scale-95"
                  >
                    <Mic size={20} /> Probar Micrófono
                  </button>
                  <p className="text-sm text-gray-500">Haz clic en el botón para probar tu micrófono y di algo.</p>
                </div>
                <button
                  disabled={!transcript.trim()}
                  onClick={advanceStep}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  Continuar <ChevronRight size={20} />
                </button>
              </div>
            )}

            {(status !== 'sound_check' && status !== 'mic_check' && !(status === 'idle' && currentStep?.type === 'multiple-choice' && history.length === 0)) && (
              <div className="flex items-center justify-center gap-8">
                {status !== 'idle' && status !== 'error' && (
                  <button
                    onClick={goToPreviousStep}
                    disabled={history.length === 0 || status === 'editing' || status === 'processing' || status === 'verifying' || status === 'verified'}
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
                    disabled={status !== 'idle' && status !== 'error' && (status as string) !== 'mic_check'}
                    onClick={() => (status as string) === 'mic_check' ? startListening() : startAgent()}
                    className={cn(
                      "relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                      status === 'idle' ? "bg-blue-600 hover:bg-blue-700 text-white" : "",
                      status === 'speaking' ? "bg-green-500 text-white" : "",
                      status === 'listening' ? "bg-blue-500 text-white" : "",
                      status === 'processing' ? "bg-purple-500 text-white" : "",
                      status === 'verifying' ? "bg-amber-500 text-white" : "",
                      status === 'verified' ? "bg-green-600 text-white" : "",
                      status === 'editing' ? "bg-sky-500 text-white" : "",
                      status === 'error' ? "bg-red-500 text-white" : "",
                    status === 'awaiting_selection' ? "bg-indigo-500 text-white opacity-50" : "",
                    (status as string) === 'sound_check' ? "bg-cyan-500 text-white" : "",
                    (status as string) === 'mic_check' ? "bg-teal-500 text-white" : ""
                    )}
                  >
                    {status === 'idle' && <Play size={32} fill="currentColor" />}
                    {status === 'speaking' && <MicOff size={32} />}
                  {(status === 'listening' || (status as string) === 'mic_check') && <Mic size={32} />}
                    {status === 'processing' && <Loader2 size={32} className="animate-spin" />}
                    {status === 'verifying' && <Loader2 size={32} className="animate-spin" />}
                    {status === 'verified' && <CheckCircle2 size={32} />}
                    {status === 'editing' && <Pencil size={32} />}
                    {status === 'error' && <AlertCircle size={32} />}
                    {status === 'awaiting_selection' && <ChevronRight size={32} />}
                  {(status as string) === 'sound_check' && <Play size={32} fill="currentColor" />}
                  </button>
                </div>

                {status !== 'idle' && status !== 'error' && (
                  <button
                    onClick={pauseAgent}
                    disabled={status === 'editing' || status === 'processing' || status === 'verifying' || status === 'verified'}
                    className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Pausar"
                  >
                    <Pause size={24} />
                  </button>
                )}
              </div>
            )}

            {status === 'listening' && (
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  onClick={finishListening}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Square size={16} fill="currentColor" /> Terminar de hablar
                </button>
                <button
                  onClick={handleStartEditingResponse}
                  className="px-6 py-2 bg-white border border-gray-200 hover:bg-sky-700 text-gray-600 rounded-full font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Pencil size={16} /> Editar
                </button>
              </div>
            )}

            {status === 'editing' && (
              <form onSubmit={handleSubmitEditedResponse} className="space-y-3 text-left">
                <div>
                  <label htmlFor="edited-transcript" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Edita la transcripción antes de enviarla
                  </label>
                  <textarea
                    id="edited-transcript"
                    value={editedTranscript}
                    onChange={(event) => setEditedTranscript(event.target.value)}
                    className="w-full min-h-32 rounded-xl border border-sky-200 bg-sky-50/50 p-4 text-gray-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    placeholder="Escribe o corrige tu respuesta aquí..."
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="ml-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Send size={16} /> Enviar respuesta editada
                </button>
              </form>
            )}

            {!(status === 'idle' && currentStep?.type === 'multiple-choice' && history.length === 0) && (
              <>
                <div className="min-h-[60px] p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Transcripción</p>
                  <p className="text-gray-600 italic whitespace-pre-wrap">
                    {status === 'editing'
                      ? (editedTranscript || 'Edita tu respuesta arriba')
                      : (transcript || (status === 'listening' ? 'Escuchando...' : 'Tu discurso aparecerá aquí'))}
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
                      status === 'editing' && "bg-sky-500 animate-pulse",
                      status === 'awaiting_selection' && "bg-indigo-500 animate-pulse",
                      (status as string) === 'sound_check' && "bg-cyan-500 animate-pulse",
                      (status as string) === 'mic_check' && "bg-teal-500 animate-pulse"
                    )} />
                    <span className="text-sm font-medium text-gray-500 capitalize">
                      {status === 'speaking' ? 'Hablando' :
                       status === 'listening' ? 'Escuchando' :
                       status === 'processing' ? 'Procesando' :
                       status === 'verifying' ? 'Verificando' :
                       status === 'verified' ? 'Verificado' :
                       status === 'editing' ? 'Editando respuesta' :
                       status === 'awaiting_selection' ? 'Esperando selección' :
                       (status as string) === 'sound_check' ? 'Prueba de sonido' :
                       (status as string) === 'mic_check' ? 'Prueba de micrófono' : status}...
                    </span>
                  </div>
                )}
              </>
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
              onClick={handleReset}
              className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1 mx-auto"
            >
              <RefreshCw size={14} /> Reiniciar
            </button>
         </div>
      )}

      {/* Lecture Modal */}
      {isLectureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="text-blue-600" size={22} />
                Lectura del módulo
              </h2>
              <button
                onClick={handleCloseLectureModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {script.lectures && script.lectures.length > 0 ? (
                script.lectures.map((item, idx) => (
                  <div key={idx} className="space-y-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                      <FileText className="text-blue-600" size={20} />
                      {item.title}
                    </h3>
                    <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </div>
                  </div>
                ))
              ) : script.lecture ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                    <FileText className="text-blue-600" size={20} />
                    {script.lecture.title}
                  </h3>
                  <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {script.lecture.content}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 italic">No hay lectura disponible para este módulo.</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={handleCloseLectureModal}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              >
                Cerrar y continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentInterface;
