import React, { useEffect, useState } from 'react';
import { UserPlus, KeyRound, Trash2, ShieldCheck, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { OPERATORS } from '../data/mockData';
import {
  StaffAccount,
  listStaffAccounts,
  createStaffAccount,
  setStaffPassword,
  deleteStaffAccount,
} from '../lib/staffAccounts';

const inputCls =
  'w-full px-3 py-2.5 text-xs sm:text-sm border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D] bg-white';

export const StaffAccountsPanel: React.FC<{ currentUserId?: string }> = ({ currentUserId }) => {
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Form nuovo dipendente
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Cambio password
  const [resetFor, setResetFor] = useState<StaffAccount | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const reload = async () => {
    try {
      setAccounts(await listStaffAccounts());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 5000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    if (password.length < 8) return setError('La password deve avere almeno 8 caratteri.');
    setCreating(true);
    setError(null);
    try {
      await createStaffAccount({ fullName: fullName.trim(), email: email.trim(), password, operatorId });
      flash(`Account creato per ${fullName.trim()}. Comunicale email e password.`);
      setFullName('');
      setEmail('');
      setPassword('');
      setOperatorId('');
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetFor || resetting) return;
    if (resetPassword.length < 8) return setError('La password deve avere almeno 8 caratteri.');
    setResetting(true);
    setError(null);
    try {
      await setStaffPassword(resetFor.id, resetPassword);
      flash(`Password aggiornata per ${resetFor.fullName}.`);
      setResetFor(null);
      setResetPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (acc: StaffAccount) => {
    if (!confirm(`Eliminare l'account di ${acc.fullName}? Non potrà più accedere al gestionale.`)) return;
    try {
      await deleteStaffAccount(acc.id);
      flash(`Account di ${acc.fullName} eliminato.`);
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Elenco account */}
      <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#AA853D] font-bold">Accessi</span>
          <h3 className="font-serif text-xl font-bold text-[#261F21]">Account del gestionale</h3>
          <p className="text-xs text-[#55474A]">
            Le dipendenti vedono agenda e clienti, non incassi né contabilità.
          </p>
        </div>

        {notice && (
          <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">{notice}</p>
        )}
        {error && (
          <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
        )}

        {loading ? (
          <div className="py-8 flex justify-center text-[#8F7D82]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-[#F7EFEF] border border-[#EEDFE1] rounded-2xl text-xs">
            {accounts.map((acc) => (
              <div key={acc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {acc.role === 'titolare' ? (
                    <ShieldCheck className="w-5 h-5 text-[#AA853D] shrink-0" />
                  ) : (
                    <User className="w-5 h-5 text-[#736266] shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-[#261F21]">
                      {acc.fullName}
                      {acc.id === currentUserId && <span className="font-normal text-[#8F7D82]"> (tu)</span>}
                    </p>
                    <p className="text-[11px] text-[#736266] break-all">
                      {acc.role === 'titolare' ? 'Titolare' : 'Dipendente'} ·{' '}
                      {acc.username ? `nome utente: ${acc.username}` : acc.email}
                    </p>
                  </div>
                </div>
                {acc.role === 'dipendente' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setResetFor(acc);
                        setResetPassword('');
                      }}
                      className="px-3 py-1.5 border border-[#DEC7CA] rounded-lg text-[#261F21] font-semibold flex items-center gap-1"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Cambia password
                    </button>
                    <button
                      onClick={() => handleDelete(acc)}
                      aria-label={`Elimina account di ${acc.fullName}`}
                      className="p-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {resetFor && (
          <form onSubmit={handleReset} className="p-4 rounded-2xl bg-[#FAF5F5] border border-[#DEC7CA] space-y-3">
            <p className="text-xs font-bold text-[#261F21]">Nuova password per {resetFor.fullName}</p>
            <input
              type="text"
              autoComplete="new-password"
              minLength={8}
              required
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Almeno 8 caratteri"
              className={inputCls}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetFor(null)} className="px-4 py-2 text-xs text-[#55474A]">
                Annulla
              </button>
              <button
                type="submit"
                disabled={resetting}
                className="px-4 py-2 bg-[#261F21] text-[#FAF7F7] text-xs font-semibold rounded-xl disabled:opacity-60"
              >
                {resetting ? 'Salvataggio…' : 'Salva password'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Nuovo dipendente */}
      <form
        onSubmit={handleCreate}
        className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-4 h-fit"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[#AA853D]" />
          <h3 className="font-serif text-lg font-bold text-[#261F21]">Nuovo account dipendente</h3>
        </div>

        <div className="space-y-1">
          <label htmlFor="staff-name" className="text-xs font-medium text-[#261F21]">Nome e cognome *</label>
          <input id="staff-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
        </div>

        <div className="space-y-1">
          <label htmlFor="staff-email" className="text-xs font-medium text-[#261F21]">Email (per accedere) *</label>
          <input
            id="staff-email"
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="staff-password" className="text-xs font-medium text-[#261F21]">Password *</label>
          <div className="relative">
            <input
              id="staff-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F7D82]"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-[#8F7D82]">Almeno 8 caratteri.</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="staff-operator" className="text-xs font-medium text-[#261F21]">Collegata all'operatrice</label>
          <select id="staff-operator" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} className={inputCls}>
            <option value="">Nessuna</option>
            {OPERATORS.map((op) => (
              <option key={op.id} value={op.id}>
                {op.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="w-full py-3 bg-[#261F21] hover:bg-[#191415] disabled:opacity-60 text-[#FAF7F7] text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 text-[#D8B268]" />}
          <span>{creating ? 'Creazione…' : 'Crea account'}</span>
        </button>
      </form>
    </div>
  );
};
