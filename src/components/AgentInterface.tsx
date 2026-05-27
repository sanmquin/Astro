import React from 'react';
import { useVoiceAgent } from '../hooks/useVoiceAgent';
import type { Script, AgentSettings } from '../types';
import { Mic, MicOff, RefreshCw, Play, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AgentInterfaceProps {
  script: Script;
  settings: AgentSettings;
}

const AgentInterface: React.FC<AgentInterfaceProps> = ({ script, settings }) => {
  const {
    currentStep,
    status,
    transcript,
    error,
    startAgent,
    resetAgent,
    isFinished,
    browserSupportsSpeechRecognition
  } = useVoiceAgent(script, settings);

  const currentStepIndex = script.steps.findIndex(s => s.id === (currentStep?.id || script.initialStepId));
  const progress = isFinished ? 100 : (currentStepIndex / script.steps.length) * 100;

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
               <span className="text-xs text-gray-400">Paso {currentStepIndex + 1} de {script.steps.length}</span>
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
        status === 'verified' ? "border-green-600 shadow-green-200" : ""
      )}>
        {isFinished ? (
          <div className="text-center py-12 space-y-4">
            <CheckCircle2 className="mx-auto text-green-500" size={64} />
            <h2 className="text-2xl font-bold">¡Todo listo!</h2>
            <button
              onClick={resetAgent}
              className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-full font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={18} /> Empezar de nuevo
            </button>
          </div>
        ) : (
          <div className="space-y-8 text-center">
            <div className="min-h-[100px] flex items-center justify-center">
              {status === 'idle' ? (
                <p className="text-gray-400 italic">¿Listo para empezar?</p>
              ) : (
                <p className="text-xl font-medium text-gray-800 leading-relaxed">
                  {currentStep?.prompt}
                </p>
              )}
            </div>

            <div className="relative h-24 flex items-center justify-center">
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
                  status === 'error' ? "bg-red-500 text-white" : ""
                )}
              >
                {status === 'idle' && <Play size={32} fill="currentColor" />}
                {status === 'speaking' && <MicOff size={32} />}
                {status === 'listening' && <Mic size={32} />}
                {status === 'processing' && <Loader2 size={32} className="animate-spin" />}
                {status === 'verifying' && <Loader2 size={32} className="animate-spin" />}
                {status === 'verified' && <CheckCircle2 size={32} />}
                {status === 'error' && <AlertCircle size={32} />}
              </button>
            </div>

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
                  status === 'verified' && "bg-green-600 animate-pulse"
                )} />
                <span className="text-sm font-medium text-gray-500 capitalize">
                  {status === 'speaking' ? 'Hablando' :
                   status === 'listening' ? 'Escuchando' :
                   status === 'processing' ? 'Procesando' :
                   status === 'verifying' ? 'Verificando' :
                   status === 'verified' ? 'Verificado' : status}...
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
