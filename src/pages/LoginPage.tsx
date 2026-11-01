import React, { useState } from 'react';
import { Lock, User, LogIn, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

interface LoginPageProps {
  area: 'dipendenti' | 'titolare';
}

export const LoginPage: React.FC<LoginPageProps> = ({ area }) => {
  const { signIn } = useAuth();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await signIn(login, password);
    setSubmitting(false);
    if (err) setError(err);
  };

  return (
    <div className="py-16 lg:py-24 bg-[#FAF7F7] min-h-[70vh] flex items-start justify-center px-4">
      <div className="w-full max-w-md bg-white border border-[#EEDFE1] rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-[#261F21] px-8 py-8 text-center space-y-3">
          <img src="/brand/logo-cm-light.png" alt="" className="h-16 w-auto mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-[#FAF7F7]">
            {area === 'titolare' ? 'Area Titolare' : 'Gestionale Staff'}
          </h1>
          <p className="text-xs text-[#DEC7CA]">
            Accesso riservato al personale del salone.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {!isSupabaseConfigured && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Servizio momentaneamente non disponibile. Riprova più tardi.</span>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="login-email" className="text-xs font-semibold text-[#261F21]">
              {area === 'titolare' ? 'Nome utente' : 'Email o nome utente'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8F7D82] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-email"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="login-password" className="text-xs font-semibold text-[#261F21]">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8F7D82] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-3 text-sm bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#261F21] hover:bg-[#191415] disabled:opacity-60 text-[#FAF7F7] text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 text-[#D8B268]" />}
            <span>{submitting ? 'Accesso in corso…' : 'Accedi'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
