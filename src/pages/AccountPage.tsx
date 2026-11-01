import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  LogIn,
  UserPlus,
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  Clock,
  LogOut,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { loadMyAppointments, cancelMyBooking } from '../lib/storage';
import { toLocalDateStr } from '../lib/dates';
import { Appointment } from '../types';
import { PageId } from '../types/navigation';

interface AccountPageProps {
  onNavigate: (page: PageId) => void;
}

const inputCls =
  'w-full pl-10 pr-3.5 py-3 text-sm bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]';

const Field: React.FC<{
  id: string;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ id, label, icon, children }) => (
  <div className="space-y-1">
    <label htmlFor={id} className="text-xs font-semibold text-[#261F21]">{label}</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8F7D82]">{icon}</span>
      {children}
    </div>
  </div>
);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${date}T12:00:00`)
  );

const STATUS_LABEL: Record<Appointment['status'], string> = {
  confermato: 'Confermato',
  in_corso: 'In corso',
  completato: 'Completato',
  annullato: 'Annullato',
};

// ---------------------------------------------------------------------------
// Accesso / registrazione
// ---------------------------------------------------------------------------
const AuthForms: React.FC = () => {
  const { customerSignIn, customerSignUp } = useAuth();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);
    if (mode === 'login') {
      const err = await customerSignIn(email, password);
      if (err) setError(err);
    } else {
      const { error: err, needsConfirmation } = await customerSignUp({ fullName, phone, email, password });
      if (err) setError(err);
      else if (needsConfirmation)
        setInfo(`Ti abbiamo inviato un'email a ${email}: apri il link per attivare l'account, poi accedi.`);
    }
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-md bg-white border border-[#EEDFE1] rounded-3xl shadow-xl overflow-hidden">
      <div className="bg-[#261F21] px-8 pt-8 pb-6 text-center space-y-3">
        <img src="/brand/logo-cm-light.png" alt="" className="h-14 w-auto mx-auto" />
        <h1 className="font-serif text-2xl font-bold text-[#FAF7F7]">Il tuo account</h1>
        <p className="text-xs text-[#DEC7CA]">
          Prenota più velocemente e tieni sotto controllo i tuoi appuntamenti.
        </p>
        <div className="mt-2 grid grid-cols-2 p-1 bg-white/10 rounded-xl text-xs font-semibold" role="tablist">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
                setInfo(null);
              }}
              className={`py-2 rounded-lg transition-colors ${
                mode === m ? 'bg-[#FAF7F7] text-[#261F21]' : 'text-[#DEC7CA] hover:text-white'
              }`}
            >
              {m === 'login' ? 'Accedi' : 'Registrati'}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-4">
        <AnimatePresence initial={false}>
          {mode === 'register' && (
            <motion.div
              key="extra"
              initial={reduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 overflow-hidden"
            >
              <Field id="acc-name" label="Nome e cognome" icon={<User className="w-4 h-4" />}>
                <input
                  id="acc-name"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field id="acc-phone" label="Telefono" icon={<Phone className="w-4 h-4" />}>
                <input
                  id="acc-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

        <Field id="acc-email" label="Email" icon={<Mail className="w-4 h-4" />}>
          <input
            id="acc-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field id="acc-password" label="Password" icon={<Lock className="w-4 h-4" />}>
          <input
            id="acc-password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
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
        </Field>
        {mode === 'register' && <p className="text-[11px] text-[#8F7D82] -mt-2">Almeno 8 caratteri.</p>}

        {error && (
          <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
        )}
        {info && (
          <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">{info}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-[#261F21] hover:bg-[#191415] disabled:opacity-60 text-[#FAF7F7] text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === 'login' ? (
            <LogIn className="w-4 h-4 text-[#D8B268]" />
          ) : (
            <UserPlus className="w-4 h-4 text-[#D8B268]" />
          )}
          <span>{mode === 'login' ? 'Accedi' : 'Crea il mio account'}</span>
        </button>
        <p className="text-[11px] text-center text-[#8F7D82]">Resterai collegata su questo dispositivo finché non esci.</p>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Area personale
// ---------------------------------------------------------------------------
const CustomerArea: React.FC<{ onNavigate: (page: PageId) => void }> = ({ onNavigate }) => {
  const { customer, updateCustomer, signOut } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(customer?.fullName ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const reload = () => {
    if (!customer) return;
    loadMyAppointments(customer.id)
      .then((a) => {
        setAppointments(a);
        setError(null);
      })
      .catch(() => setError('Impossibile caricare le prenotazioni. Riprova più tardi.'))
      .finally(() => setLoading(false));
  };

  useEffect(reload, [customer?.id]);

  if (!customer) return null;

  const today = toLocalDateStr();
  const upcoming = appointments
    .filter((a) => a.date >= today && a.status !== 'annullato' && a.status !== 'completato')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const past = appointments.filter((a) => !upcoming.includes(a));

  const handleCancel = async (a: Appointment) => {
    if (!confirm(`Annullare l'appuntamento "${a.serviceName}" del ${formatDate(a.date)} alle ${a.time}?`)) return;
    try {
      await cancelMyBooking(a.id);
      reload();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const err = await updateCustomer({ fullName, phone });
    setSaving(false);
    if (err) alert(err);
    else setEditing(false);
  };

  const AppointmentRow: React.FC<{ a: Appointment; canCancel: boolean }> = ({ a, canCancel }) => (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1 min-w-0">
        <p className="font-serif font-bold text-[#261F21]">{a.serviceName}</p>
        <p className="text-xs text-[#55474A] flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1 capitalize">
            <Calendar className="w-3.5 h-3.5 text-[#AA853D]" /> {formatDate(a.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#AA853D]" /> {a.time}
          </span>
          <span>con {a.operatorName}</span>
        </p>
        <p className="text-[11px] text-[#8F7D82] font-mono">{a.code}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            a.status === 'annullato'
              ? 'bg-red-50 text-red-700'
              : a.status === 'completato'
              ? 'bg-gray-100 text-gray-600'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {STATUS_LABEL[a.status]}
        </span>
        {canCancel && a.status === 'confermato' && a.date > today && (
          <button
            onClick={() => handleCancel(a)}
            className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1"
          >
            <XCircle className="w-3.5 h-3.5" /> Annulla
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="p-6 sm:p-8 bg-[#261F21] text-[#FAF7F7] rounded-3xl border border-[#AA853D]/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-[#DEC7CA]">Bentornata</p>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{customer.fullName || customer.email}</h1>
          <p className="text-xs text-[#DEC7CA] mt-1">{customer.email}{customer.phone && ` · ${customer.phone}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('prenota')}
            className="px-4 py-2 bg-[#D8B268] hover:bg-[#AA853D] text-[#191415] text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" /> Nuova prenotazione
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded-xl border border-white/20"
          >
            Modifica dati
          </button>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded-xl border border-white/20 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Esci
          </button>
        </div>
      </div>

      {editing && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-[#EEDFE1] grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field id="edit-name" label="Nome e cognome" icon={<User className="w-4 h-4" />}>
            <input id="edit-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
          </Field>
          <Field id="edit-phone" label="Telefono" icon={<Phone className="w-4 h-4" />}>
            <input id="edit-phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-xs text-[#55474A]">Annulla</button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#261F21] text-[#FAF7F7] text-xs font-semibold rounded-xl disabled:opacity-60">
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
      )}

      <section className="bg-white rounded-3xl border border-[#EEDFE1] shadow-2xs overflow-hidden">
        <h2 className="px-6 pt-6 pb-3 font-serif text-lg font-bold text-[#261F21] flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Prossimi appuntamenti
        </h2>
        {loading ? (
          <div className="py-10 flex justify-center text-[#8F7D82]"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : upcoming.length === 0 ? (
          <div className="px-6 pb-6 text-sm text-[#55474A]">
            Nessun appuntamento in programma.{' '}
            <button onClick={() => onNavigate('prenota')} className="text-[#AA853D] font-semibold hover:underline">
              Prenota ora
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#F7EFEF] border-t border-[#F7EFEF]">
            {upcoming.map((a) => <AppointmentRow key={a.id} a={a} canCancel />)}
          </div>
        )}
        {upcoming.length > 0 && (
          <p className="px-6 py-3 text-[11px] text-[#8F7D82] border-t border-[#F7EFEF]">
            Puoi annullare online fino al giorno prima. Per il giorno stesso chiamaci al 345 393 8087.
          </p>
        )}
      </section>

      {past.length > 0 && (
        <section className="bg-white rounded-3xl border border-[#EEDFE1] shadow-2xs overflow-hidden">
          <h2 className="px-6 pt-6 pb-3 font-serif text-lg font-bold text-[#261F21]">Storico</h2>
          <div className="divide-y divide-[#F7EFEF] border-t border-[#F7EFEF]">
            {past.map((a) => <AppointmentRow key={a.id} a={a} canCancel={false} />)}
          </div>
        </section>
      )}
    </div>
  );
};

export const AccountPage: React.FC<AccountPageProps> = ({ onNavigate }) => {
  const { loading, customer, profile, signOut } = useAuth();

  return (
    <div className="py-12 lg:py-20 bg-[#FAF7F7] min-h-[70vh] flex items-start justify-center px-4">
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-[#8F7D82] mt-20" />
      ) : profile ? (
        <div className="max-w-md text-center space-y-4 bg-white border border-[#EEDFE1] rounded-3xl p-8 shadow-lg">
          <ShieldCheck className="w-10 h-10 text-[#AA853D] mx-auto" />
          <p className="text-sm text-[#55474A]">
            Su questo dispositivo è aperto un accesso dello staff. Esci per accedere con un account cliente.
          </p>
          <button
            onClick={signOut}
            className="px-5 py-2.5 bg-[#261F21] text-[#FAF7F7] text-xs font-semibold rounded-xl"
          >
            Esci
          </button>
        </div>
      ) : customer ? (
        <CustomerArea onNavigate={onNavigate} />
      ) : (
        <AuthForms />
      )}
    </div>
  );
};
