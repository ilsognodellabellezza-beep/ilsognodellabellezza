import React, { useState } from 'react';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/auth';

/** Mostrata al primo accesso: la titolare sceglie la propria password. */
export const SetPasswordPage: React.FC = () => {
  const { profile, changePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('La password deve avere almeno 8 caratteri.');
    if (password !== confirm) return setError('Le due password non coincidono.');
    setSaving(true);
    const err = await changePassword(password);
    setSaving(false);
    if (err) setError(err);
  };

  return (
    <div className="py-16 lg:py-24 bg-[#FAF7F7] min-h-[70vh] flex items-start justify-center px-4">
      <div className="w-full max-w-md bg-white border border-[#EEDFE1] rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-[#261F21] px-8 py-8 text-center space-y-3">
          <KeyRound className="w-10 h-10 text-[#D8B268] mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-[#FAF7F7]">Benvenuta, {profile?.fullName}</h1>
          <p className="text-xs text-[#DEC7CA]">
            È il tuo primo accesso: scegli la password che userai d'ora in poi.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {profile?.username && (
            <p className="text-xs text-[#55474A] bg-[#FAF5F5] border border-[#EEDFE1] rounded-xl p-3">
              Il tuo nome utente è <strong className="text-[#261F21]">{profile.username}</strong>
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="new-password" className="text-xs font-semibold text-[#261F21]">Nuova password</label>
            <div className="relative">
              <input
                id="new-password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 pr-10 py-3 text-sm bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? 'Nascondi password' : 'Mostra password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F7D82]"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[#8F7D82]">Almeno 8 caratteri.</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="confirm-password" className="text-xs font-semibold text-[#261F21]">Ripeti la password</label>
            <input
              id="confirm-password"
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3.5 py-3 text-sm bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#261F21] hover:bg-[#191415] disabled:opacity-60 text-[#FAF7F7] text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{saving ? 'Salvataggio…' : 'Salva password ed entra'}</span>
          </button>
          <button type="button" onClick={signOut} className="w-full text-xs text-[#8F7D82] hover:text-[#261F21]">
            Esci
          </button>
        </form>
      </div>
    </div>
  );
};
