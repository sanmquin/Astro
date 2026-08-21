import React, { useState } from 'react';
import { User, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Sparkles, Copy, Check, ChevronLeft, Lock } from 'lucide-react';
import type { UserProfile } from '../types';
import { getSessionId } from '../utils/storage';

interface LoginModalProps {
  onLogin: (user: UserProfile | 'admin') => void;
}

type Step = 'username' | 'enter-password' | 'set-password';

function generateSecurePassword(length = 12): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));

  for (let i = 4; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

export default function LoginModal({ onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<Step>('username');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) return;

    if (cleanUsername.toLowerCase() === 'admin') {
      onLogin('admin');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username: cleanUsername }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresPassword) {
          if (data.hasPassword) {
            setStep('enter-password');
          } else {
            setStep('set-password');
          }
        } else {
          onLogin(data);
        }
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    if (step === 'set-password') {
      if (password.length < 4) {
        setError('La contraseña debe tener al menos 4 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const sessionId = getSessionId();
      const response = await fetch('/.netlify/functions/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username: username.trim(), password, sessionId }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data);
      } else {
        setError(data.error || 'Contraseña o usuario incorrectos.');
      }
    } catch (err) {
      console.error('Password login error:', err);
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword(12);
    setPassword(newPassword);
    setConfirmPassword(newPassword);
    setShowPassword(true);
    setShowConfirmPassword(true);
    setError(null);
  };

  const handleCopyPassword = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBackToUsername = () => {
    setStep('username');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-blue-600 p-8 text-center text-white relative">
          {step !== 'username' && (
            <button
              onClick={handleBackToUsername}
              className="absolute left-4 top-4 text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
              title="Cambiar usuario"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30">
            {step === 'username' ? <User size={40} /> : <Lock size={40} />}
          </div>

          <h2 className="text-2xl font-bold">
            {step === 'username' && 'Bienvenido'}
            {step === 'enter-password' && 'Ingresar Contraseña'}
            {step === 'set-password' && 'Crear Contraseña'}
          </h2>

          <p className="text-blue-100 mt-2 text-sm">
            {step === 'username' && 'Ingresa tu nombre de usuario para comenzar'}
            {step === 'enter-password' && `Hola, ${username}. Ingresa tu contraseña.`}
            {step === 'set-password' && `Hola, ${username}. Genera o crea una contraseña para continuar.`}
          </p>
        </div>

        {/* Body */}
        <div className="p-8">
          {step === 'username' && (
            <form onSubmit={handleUsernameSubmit} className="space-y-6">
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
          )}

          {step === 'enter-password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    className="w-full pl-4 pr-12 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all text-lg"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
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
                disabled={loading || !password}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <>
                    Iniciar Sesión
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleBackToUsername}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  ¿No eres {username}? Cambiar de usuario
                </button>
              </div>
            </form>
          )}

          {step === 'set-password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-blue-800 text-xs leading-relaxed">
                <p className="font-semibold text-sm mb-1">🔑 Primer inicio de sesión</p>
                Por seguridad, debes definir una contraseña para tu cuenta. Puedes escribir una o presionar el botón para generar una de forma segura.
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Sparkles size={14} />
                  Generar Contraseña Segura
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all text-base"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Confirmar Contraseña</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all text-base"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {password && (
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                  <span className="text-gray-600 truncate mr-2 font-mono">{password}</span>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check size={14} className="text-green-600" />
                        <span className="text-green-600">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm animate-in slide-in-from-top-2">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <>
                    Guardar Contraseña e Iniciar Sesión
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleBackToUsername}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  ¿No eres {username}? Cambiar de usuario
                </button>
              </div>
            </form>
          )}

          <p className="mt-6 text-center text-gray-400 text-xs leading-relaxed">
            Esta es una plataforma de acompañamiento astrológico.<br />
            Si no tienes una cuenta, solicita acceso.
          </p>
        </div>
      </div>
    </div>
  );
}
