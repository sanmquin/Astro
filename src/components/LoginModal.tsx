import React, { useState } from 'react';
import { User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import type { UserProfile } from '../types';
import { getSessionId } from '../utils/storage';

interface LoginModalProps {
  onLogin: (user: UserProfile | 'admin') => void;
}

export default function LoginModal({ onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    if (username.toLowerCase() === 'admin') {
      onLogin('admin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sessionId = getSessionId();
      const response = await fetch('/.netlify/functions/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username: username.trim(), sessionId }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data);
      } else {
        setError(data.error || 'Ocurrió un error al verificar el usuario.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-blue-600 p-8 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30">
            <User size={40} />
          </div>
          <h2 className="text-2xl font-bold">Bienvenido</h2>
          <p className="text-blue-100 mt-2">Ingresa tu nombre de usuario para comenzar</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Usuario</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. JuanPerez"
                  className="w-full pl-4 pr-12 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all text-lg"
                  required
                  autoFocus
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <User size={20} />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm animate-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  Continuar
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-400 text-xs leading-relaxed">
            Esta es una plataforma de acompañamiento astrológico.<br />
            Si no tienes una cuenta, solicita acceso.
          </p>
        </div>
      </div>
    </div>
  );
}
