import React, { useEffect, useState } from 'react';
import { Ban, MessageCircle, Phone, Trash2, X } from 'lucide-react';
import { Appointment, AppointmentStatus } from '../types';
import { AppointmentBlock, addBlock, blockAffectsAppointment, deleteBlock, useSalon, SALON_NAME } from '../lib/salon';
import { useSiteConfig } from '../lib/siteSettings';
import { toLocalDateStr } from '../lib/dates';

const inputCls = 'px-2.5 py-2 text-xs bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]';
const fmt = (d: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${d}T12:00:00`));

const SQL_HINT = 'Esegui lo script supabase/08-novita-sito-gestionale.sql nel database (SQL Editor di Supabase).';
const errText = (e: unknown) => {
  const m = (e as Error).message || '';
  return /appointment_blocks|schema cache|relation/i.test(m) ? SQL_HINT : m;
};

/** Numero per il link WhatsApp: toglie spazi e simboli, aggiunge +39 ai numeri italiani senza prefisso. */
const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, '');
  return d.startsWith('39') && d.length > 10 ? d : `39${d.replace(/^0+/, '')}`;
};

const apologyText = (a: Appointment) =>
  `Ciao ${a.clientName.split(' ')[0]}, sono ${SALON_NAME}. Purtroppo per un imprevisto non riusciamo a confermare il tuo appuntamento di ${fmt(a.date)} alle ${a.time} (${a.serviceName}). Ti andrebbe di spostarlo? Ti proponiamo noi un nuovo orario, scusa il disagio!`;

interface Props {
  appointments: Appointment[];
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  /** cambia quando il pulsante in testata chiede di aprire il modulo */
  openSignal?: number;
}

/** "Blocca appuntamenti": dal giorno al giorno, fascia oraria facoltativa, tutto il centro o una dipendente. */
export const BlocksPanel: React.FC<Props> = ({ appointments, onStatusChange, openSignal = 0 }) => {
  const { blocks } = useSalon();
  const { allOperators } = useSiteConfig();
  const today = toLocalDateStr();
  const [formOpen, setFormOpen] = useState(false);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [timed, setTimed] = useState(false);
  const [fromTime, setFromTime] = useState('09:00');
  const [toTime, setToTime] = useState('18:30');
  const [scope, setScope] = useState('all');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<AppointmentBlock | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (openSignal > 0) setFormOpen(true);
  }, [openSignal]);

  const active = blocks.filter((b) => b.endDate >= today);
  const operatorName = (id: string | null) => (id ? allOperators.find((o) => o.id === id)?.name ?? 'Dipendente' : 'Tutto il centro');
  const affected = (b: AppointmentBlock) =>
    appointments
      .filter((a) => blockAffectsAppointment(b, a))
      .sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));

  const submit = async () => {
    if (!from || !to) return setError('Scegli il giorno di inizio e di fine.');
    if (to < from) return setError('Il giorno di fine non può precedere quello di inizio.');
    if (timed && toTime <= fromTime) return setError('L’ora di fine deve essere dopo quella di inizio.');
    setBusy(true);
    setError(null);
    const draft: Omit<AppointmentBlock, 'id'> = {
      startDate: from,
      endDate: to,
      fromTime: timed ? fromTime : null,
      toTime: timed ? toTime : null,
      operatorId: scope === 'all' ? null : scope,
      note,
    };
    try {
      await addBlock(draft);
      setJustCreated({ id: 'new', ...draft });
      setFormOpen(false);
      setNote('');
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (b: AppointmentBlock) => {
    if (!confirm('Annullare questo blocco? Gli orari tornano subito prenotabili dalle clienti.')) return;
    try {
      await deleteBlock(b.id);
      setJustCreated(null);
    } catch (e) {
      alert(errText(e));
    }
  };

  const AffectedList: React.FC<{ block: AppointmentBlock }> = ({ block }) => {
    const list = affected(block);
    if (list.length === 0) return <p className="text-xs text-[#55474A]">Nessun appuntamento già prenotato in questo periodo.</p>;
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[#261F21]">
          {list.length} {list.length === 1 ? 'appuntamento da spostare o avvisare' : 'appuntamenti da spostare o avvisare'}:
        </p>
        {list.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[#EEDFE1] text-xs">
            <div className="min-w-[180px]">
              <p className="font-bold text-[#261F21]">
                {a.clientName} <span className="font-normal text-[#736266]">· {a.serviceName}</span>
              </p>
              <p className="text-[#736266] capitalize">
                {fmt(a.date)} alle {a.time} · {a.operatorName}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <a href={`tel:${a.clientPhone}`} className="px-2.5 py-1.5 border border-[#DEC7CA] rounded-lg font-semibold flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> {a.clientPhone}
              </a>
              <a
                href={`https://wa.me/${waNumber(a.clientPhone)}?text=${encodeURIComponent(apologyText(a))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-[#25D366] text-white rounded-lg font-bold flex items-center gap-1"
              >
                <MessageCircle className="w-3.5 h-3.5" /> Avvisa
              </a>
              <button
                type="button"
                onClick={() => confirm(`Annullare l'appuntamento di ${a.clientName}?`) && onStatusChange(a.id, 'annullato')}
                className="px-2.5 py-1.5 border border-red-200 text-red-600 rounded-lg font-semibold"
              >
                Annulla
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="bg-white border border-[#EEDFE1] rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Ban className="w-5 h-5 text-[#8A3B49]" />
          <div>
            <h3 className="font-serif text-lg font-bold text-[#261F21]">Blocca appuntamenti</h3>
            <p className="text-[11px] text-[#8F7D82] max-w-xl">
              Per imprevisti o malattia: nel periodo bloccato le clienti non vedono più orari disponibili. Si può annullare in qualsiasi momento.
            </p>
          </div>
        </div>
        {!formOpen && (
          <button type="button" onClick={() => setFormOpen(true)} className="px-4 py-2.5 bg-[#8A3B49] text-white text-xs font-bold rounded-xl flex items-center gap-1.5">
            <Ban className="w-4 h-4" /> Blocca appuntamenti
          </button>
        )}
      </div>

      {formOpen && (
        <div className="p-4 rounded-2xl border border-[#C98A94] bg-[#FBF1F2] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-[#261F21]">Nuovo blocco</h4>
            <button type="button" aria-label="Chiudi" onClick={() => setFormOpen(false)} className="text-[#8F7D82]">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
              <span>Dal giorno</span>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  if (to < e.target.value) setTo(e.target.value);
                }}
                className={`${inputCls} w-full`}
              />
            </label>
            <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
              <span>Al giorno</span>
              <input type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} w-full`} />
            </label>
            <label className="sm:col-span-2 flex items-center gap-2 text-xs font-semibold text-[#261F21] cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-[#8A3B49]" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
              Solo una fascia oraria (altrimenti tutta la giornata)
            </label>
            {timed && (
              <div className="sm:col-span-2 flex items-center gap-2 text-xs">
                <input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} className={inputCls} />
                <span>–</span>
                <input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} className={inputCls} />
              </div>
            )}
            <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
              <span>Chi si blocca</span>
              <select value={scope} onChange={(e) => setScope(e.target.value)} className={`${inputCls} w-full`}>
                <option value="all">Tutto il centro</option>
                {allOperators.map((o) => (
                  <option key={o.id} value={o.id}>
                    Solo {o.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
              <span>Motivo (resta riservato)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={160} placeholder="Es. malattia" className={`${inputCls} w-full`} />
            </label>
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={submit} disabled={busy} className="px-5 py-2.5 bg-[#8A3B49] text-white text-xs font-bold rounded-xl disabled:opacity-40">
              {busy ? 'Salvataggio…' : 'Blocca il periodo'}
            </button>
            <button type="button" onClick={() => setFormOpen(false)} className="px-3 py-2 text-xs font-semibold text-[#736266]">
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Subito dopo il blocco: chi è già prenotata */}
      {justCreated && (
        <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-bold text-[#261F21]">
              Blocco attivo: {operatorName(justCreated.operatorId)} · {fmt(justCreated.startDate)}
              {justCreated.endDate !== justCreated.startDate && ` → ${fmt(justCreated.endDate)}`}
              {justCreated.fromTime && ` · ${justCreated.fromTime}–${justCreated.toTime}`}. Le clienti non vedono più orari disponibili.
            </p>
            <button type="button" aria-label="Chiudi" onClick={() => setJustCreated(null)} className="text-[#8F7D82] shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <AffectedList block={justCreated} />
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-xs font-bold text-[#261F21]">Blocchi attivi ({active.length})</h4>
        {active.length === 0 && <p className="text-xs text-[#8F7D82]">Nessun blocco attivo.</p>}
        {active.map((b) => {
          const n = affected(b).length;
          return (
            <div key={b.id} className="rounded-xl border border-[#EBCDD2] bg-[#FBF1F2] p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-[#8A3B49]">{operatorName(b.operatorId)}</span>{' '}
                  <span className="capitalize">{b.startDate === b.endDate ? fmt(b.startDate) : `${fmt(b.startDate)} → ${fmt(b.endDate)}`}</span>
                  {b.fromTime && b.toTime ? <span> · {b.fromTime}–{b.toTime}</span> : <span> · tutto il giorno</span>}
                  {b.note && <span className="text-[#736266]"> · {b.note}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => setExpanded(expanded === b.id ? null : b.id)} className="font-semibold text-[#AA853D] hover:underline">
                    {n} prenotat{n === 1 ? 'a' : 'e'}
                  </button>
                  <button type="button" onClick={() => remove(b)} className="px-2.5 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg font-semibold flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Annulla blocco
                  </button>
                </div>
              </div>
              {expanded === b.id && <AffectedList block={b} />}
            </div>
          );
        })}
      </div>
    </section>
  );
};
