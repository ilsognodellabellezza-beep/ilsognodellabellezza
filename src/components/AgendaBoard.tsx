import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ListOrdered, Phone, Plus, X, Eye } from 'lucide-react';
import { Appointment, AppointmentStatus } from '../types';
import { addDays, timeToMinutes, toLocalDateStr } from '../lib/dates';
import { isOpenOn, minutesToTime, useSiteConfig, weekdayOf } from '../lib/siteSettings';

/** Colori delle colonne, come nell'agenda di carta (azzurro, giallo, verde, rosso, …). */
const COLUMN_COLORS = [
  { line: '#4A8FD4', tint: '#E4F0FB', text: '#245C94' },
  { line: '#E3B93C', tint: '#FBF3D9', text: '#8A6A0F' },
  { line: '#4FA66B', tint: '#E1F3E7', text: '#25673C' },
  { line: '#D9534F', tint: '#FBE4E3', text: '#99302D' },
  { line: '#8E6BC1', tint: '#EDE6F7', text: '#573B86' },
  { line: '#2FA3A3', tint: '#DDF1F1', text: '#1A6666' },
];

const ROW = 34; // altezza in px di ogni mezz'ora
const DEFAULT_START = 8 * 60;
const DEFAULT_END = 21 * 60;

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confermato: 'Confermato',
  in_corso: 'In corso',
  completato: 'Completato',
  annullato: 'Annullato',
};

const fmtLong = (d: string) =>
  new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${d}T12:00:00`));

interface AgendaBoardProps {
  appointments: Appointment[];
  /** il titolare vede i prezzi, i dipendenti no */
  showPrices?: boolean;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  /** clic su una fascia libera: apre il nuovo appuntamento precompilato */
  onAddAt: (date: string, time: string, operatorId: string) => void;
  onPreviewEmail?: (a: Appointment) => void;
}

/** Agenda giornaliera a colonne, una per operatrice, righe da 30 minuti: come l'agenda cartacea del salone. */
export const AgendaBoard: React.FC<AgendaBoardProps> = ({ appointments, showPrices, onStatusChange, onAddAt, onPreviewEmail }) => {
  const { operators, settings } = useSiteConfig();
  const [date, setDate] = useState(toLocalDateStr());
  const [showCancelled, setShowCancelled] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const dayApps = useMemo(() => appointments.filter((a) => a.date === date), [appointments, date]);
  const cancelledCount = dayApps.filter((a) => a.status === 'annullato').length;
  const visible = dayApps.filter((a) => showCancelled || a.status !== 'annullato');

  // Colonne: tutte le operatrici attive + eventuali operatrici non più presenti ma con appuntamenti quel giorno
  const columns = useMemo(() => {
    const cols = operators.map((o) => ({ id: o.id, name: o.name }));
    visible.forEach((a) => {
      if (!cols.some((c) => c.id === a.operatorId)) cols.push({ id: a.operatorId, name: a.operatorName });
    });
    return cols;
  }, [operators, visible]);

  // Fascia oraria mostrata: 8–21 come l'agenda di carta, allargata se serve
  const { startMin, endMin } = useMemo(() => {
    let s = DEFAULT_START;
    let e = DEFAULT_END;
    visible.forEach((a) => {
      const st = timeToMinutes(a.time);
      s = Math.min(s, Math.floor(st / 30) * 30);
      e = Math.max(e, Math.ceil((st + a.durationMinutes) / 30) * 30);
    });
    return { startMin: s, endMin: e };
  }, [visible]);

  const slots: number[] = [];
  for (let m = startMin; m < endMin; m += 30) slots.push(m);

  // Fuori orario di apertura (o in pausa) le righe sono più scure
  const dayHours = settings.hours[weekdayOf(date)];
  const isClosedSlot = (m: number) => {
    if (!dayHours.open) return true;
    const from = timeToMinutes(dayHours.from);
    const to = timeToMinutes(dayHours.to);
    if (m < from || m + 30 > to) return true;
    if (dayHours.breakFrom && dayHours.breakTo) {
      const bf = timeToMinutes(dayHours.breakFrom);
      const bt = timeToMinutes(dayHours.breakTo);
      if (m < bt && bf < m + 30) return true;
    }
    return false;
  };

  const opened = openId ? appointments.find((a) => a.id === openId) ?? null : null;
  const today = toLocalDateStr();

  return (
    <div className="space-y-3">
      {/* Navigazione giorno */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-[#EEDFE1] shadow-2xs">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Giorno precedente" onClick={() => setDate(toLocalDateStr(addDays(new Date(`${date}T12:00:00`), -1)))} className="w-10 h-10 rounded-xl bg-[#FAF5F5] flex items-center justify-center text-[#261F21]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Giorno successivo" onClick={() => setDate(toLocalDateStr(addDays(new Date(`${date}T12:00:00`), 1)))} className="w-10 h-10 rounded-xl bg-[#FAF5F5] flex items-center justify-center text-[#261F21]">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setDate(today)} disabled={date === today} className="px-3 h-10 rounded-xl bg-[#261F21] text-[#D8B268] text-xs font-bold disabled:opacity-40">
            Oggi
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Vai alla data"
            className="h-10 px-2 text-xs border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
          />
        </div>
        <div className="text-right">
          <h3 className="font-serif text-base sm:text-lg font-bold text-[#261F21] capitalize">{fmtLong(date)}</h3>
          <p className="text-[11px] text-[#8F7D82]">
            {visible.length} {visible.length === 1 ? 'appuntamento' : 'appuntamenti'}
            {!isOpenOn(settings, date) && ' · salone chiuso'}
            {cancelledCount > 0 && (
              <>
                {' · '}
                <button type="button" onClick={() => setShowCancelled((v) => !v)} className="text-[#AA853D] font-semibold hover:underline">
                  {showCancelled ? 'nascondi' : 'mostra'} {cancelledCount} annullat{cancelledCount === 1 ? 'o' : 'i'}
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Griglia */}
      <div className="bg-white rounded-2xl border border-[#EEDFE1] shadow-2xs overflow-x-auto">
        <div className="flex min-w-max sm:min-w-full">
          {/* Colonna orari */}
          <div className="sticky left-0 z-20 bg-white border-r border-[#EEDFE1] w-12 shrink-0">
            <div className="h-12 border-b border-[#EEDFE1]" />
            {slots.map((m) => (
              <div key={m} style={{ height: ROW }} className="flex items-start justify-end pr-1.5 pt-0.5">
                {m % 60 === 0 ? (
                  <span className="text-[13px] font-bold text-[#261F21] leading-none">{m / 60}</span>
                ) : (
                  <span className="text-[10px] text-[#8F7D82] leading-none">30</span>
                )}
              </div>
            ))}
          </div>

          {/* Colonne operatrici */}
          {columns.map((col, ci) => {
            const color = COLUMN_COLORS[ci % COLUMN_COLORS.length];
            const colApps = visible.filter((a) => a.operatorId === col.id);
            return (
              <div key={col.id} className="flex-1 min-w-[132px] sm:min-w-[150px] border-r border-[#EEDFE1] last:border-r-0">
                <div
                  style={{ borderBottom: `3px solid ${color.line}`, background: color.tint, color: color.text }}
                  className="h-12 flex items-center justify-center px-2 font-serif font-bold text-sm text-center leading-tight"
                >
                  {col.name}
                </div>
                <div className="relative">
                  {slots.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onAddAt(date, minutesToTime(m), col.id)}
                      aria-label={`Nuovo appuntamento ${col.name} alle ${minutesToTime(m)}`}
                      style={{ height: ROW }}
                      className={`group relative block w-full border-b border-[#EEE6E6] text-left ${
                        isClosedSlot(m) ? 'bg-[#E9E2E2]' : i % 2 === 1 ? 'bg-[#F3F1F1]' : 'bg-white'
                      } hover:bg-[#FBF3D9]`}
                    >
                      <Plus className="w-3.5 h-3.5 absolute right-1 top-1/2 -translate-y-1/2 text-[#AA853D] opacity-0 group-hover:opacity-100" />
                    </button>
                  ))}

                  {colApps.map((a) => {
                    const st = timeToMinutes(a.time);
                    const top = ((st - startMin) / 30) * ROW;
                    const height = Math.max((a.durationMinutes / 30) * ROW, ROW * 0.9);
                    const cancelled = a.status === 'annullato';
                    const bg = cancelled
                      ? '#EFE9E9'
                      : a.status === 'completato'
                      ? '#DDF3E6'
                      : a.status === 'in_corso'
                      ? '#FDEFC9'
                      : color.tint;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setOpenId(a.id)}
                        style={{ top: top + 1, height: height - 2, background: bg, borderLeft: `4px solid ${cancelled ? '#B8A9AC' : color.line}` }}
                        className="absolute left-0.5 right-0.5 z-10 rounded-md px-1.5 py-1 text-left overflow-hidden shadow-xs border border-black/5 hover:brightness-95"
                      >
                        <span className={`block text-[11px] font-bold leading-tight text-[#261F21] truncate ${cancelled ? 'line-through' : ''}`}>
                          {a.clientName}
                        </span>
                        <span className="block text-[10px] leading-tight text-[#55474A] truncate">
                          {a.time}–{minutesToTime(st + a.durationMinutes)}
                        </span>
                        {height >= ROW * 1.9 && <span className="block text-[10px] leading-tight text-[#736266] truncate">{a.serviceName}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[11px] text-[#8F7D82]">
        Tocca una fascia libera per inserire un appuntamento, tocca un appuntamento per vederlo o cambiarne lo stato. Le righe più scure sono fuori dall'orario di apertura.
      </p>

      {/* Dettaglio appuntamento */}
      {opened && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpenId(null)}>
          <div
            role="dialog"
            aria-label="Dettaglio appuntamento"
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92dvh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono text-[11px] font-bold text-[#AA853D]">{opened.code}</span>
                <h4 className="font-serif text-xl font-bold text-[#261F21]">{opened.clientName}</h4>
              </div>
              <button type="button" aria-label="Chiudi" onClick={() => setOpenId(null)} className="w-9 h-9 rounded-full bg-[#FAF5F5] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#55474A] space-y-1.5">
              <p className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#AA853D]" />
                <span className="capitalize">{fmtLong(opened.date)}</span> · <strong>{opened.time}–{minutesToTime(timeToMinutes(opened.time) + opened.durationMinutes)}</strong> ({opened.durationMinutes} min)
              </p>
              <p><strong className="text-[#261F21]">{opened.serviceName}</strong> con <strong className="text-[#261F21]">{opened.operatorName}</strong></p>
              {showPrices && <p>Importo: <strong className="font-serif text-[#261F21]">€{opened.servicePrice.toFixed(2)}</strong></p>}
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#AA853D]" />
                <a href={`tel:${opened.clientPhone}`} className="font-bold text-[#261F21] hover:underline">{opened.clientPhone}</a>
              </p>
              {opened.clientEmail && <p className="truncate">Email: {opened.clientEmail}</p>}
              {opened.notes && <p className="p-2.5 bg-[#FAF5F5] rounded-xl italic">"{opened.notes}"</p>}
            </div>

            <label className="block space-y-1 text-xs font-semibold text-[#261F21]">
              <span>Stato</span>
              <select
                value={opened.status}
                onChange={(e) => onStatusChange(opened.id, e.target.value as AppointmentStatus)}
                className="w-full px-3 py-2.5 text-sm border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
              >
                {(Object.keys(STATUS_LABEL) as AppointmentStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>

            {onPreviewEmail && !opened.reminderSent && (
              <button type="button" onClick={() => onPreviewEmail(opened)} className="text-xs font-semibold text-[#AA853D] flex items-center gap-1.5 hover:underline">
                <Eye className="w-3.5 h-3.5" /> Anteprima promemoria email
              </button>
            )}
            {opened.reminderSent && <p className="text-[11px] text-emerald-700 font-semibold">Promemoria email già inviato.</p>}
          </div>
        </div>
      )}
    </div>
  );
};

/** Contenitore della scheda Agenda: scelta tra vista giornaliera (come l'agenda di carta) ed elenco. */
export const AgendaTab: React.FC<
  AgendaBoardProps & {
    /** vista a elenco con filtri e ricerca */
    listView: React.ReactNode;
  }
> = ({ listView, ...board }) => {
  const [view, setView] = useState<'giorno' | 'elenco'>('giorno');
  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1 bg-white p-1 rounded-xl border border-[#EEDFE1] text-xs font-bold">
        <button
          type="button"
          onClick={() => setView('giorno')}
          className={`px-4 py-2 rounded-lg flex items-center gap-1.5 ${view === 'giorno' ? 'bg-[#261F21] text-[#D8B268]' : 'text-[#736266]'}`}
        >
          <CalendarDays className="w-4 h-4" /> Agenda del giorno
        </button>
        <button
          type="button"
          onClick={() => setView('elenco')}
          className={`px-4 py-2 rounded-lg flex items-center gap-1.5 ${view === 'elenco' ? 'bg-[#261F21] text-[#D8B268]' : 'text-[#736266]'}`}
        >
          <ListOrdered className="w-4 h-4" /> Elenco e ricerca
        </button>
      </div>
      {view === 'giorno' ? <AgendaBoard {...board} /> : listView}
    </div>
  );
};
