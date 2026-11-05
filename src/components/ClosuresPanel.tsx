import React, { useMemo, useState } from 'react';
import { CalendarOff, CalendarPlus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { addClosure, deleteClosure, useSalon, dayStatus, Closure } from '../lib/salon';
import { useSiteConfig } from '../lib/siteSettings';
import { holidayName, toLocalDateStr } from '../lib/dates';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const inputCls = 'px-2.5 py-2 text-xs bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]';
const fmt = (d: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${d}T12:00:00`));

const SQL_HINT = 'Esegui lo script supabase/08-novita-sito-gestionale.sql nel database (SQL Editor di Supabase).';
const errText = (e: unknown) => {
  const m = (e as Error).message || '';
  return /closures|schema cache|relation/i.test(m) ? SQL_HINT : m;
};

/**
 * Calendario delle chiusure e delle aperture straordinarie.
 * Tocca un giorno per sceglierlo, tocca un secondo giorno per fare un intervallo.
 * Le impostazioni valgono subito per il sito e per la prenotazione.
 */
export const ClosuresPanel: React.FC = () => {
  const { closures } = useSalon();
  const { settings } = useSiteConfig();
  const [month, setMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [mode, setMode] = useState<'chiusura' | 'apertura'>('chiusura');
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [customHours, setCustomHours] = useState(false);
  const [fromTime, setFromTime] = useState('09:00');
  const [toTime, setToTime] = useState('18:30');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = toLocalDateStr();
  const year = month.getFullYear();
  const m = month.getMonth();
  const monthLabel = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(month);
  const leading = (new Date(year, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toLocalDateStr(new Date(year, m, i + 1))),
  ];

  const lo = start && end ? (start < end ? start : end) : start;
  const hi = start && end ? (start < end ? end : start) : start;

  const pick = (d: string) => {
    if (!start || (start && end)) {
      setStart(d);
      setEnd(null);
    } else {
      setEnd(d);
    }
  };

  const reset = () => {
    setStart(null);
    setEnd(null);
    setNote('');
    setCustomHours(false);
    setError(null);
  };

  const submit = async () => {
    if (!lo || !hi) return setError('Seleziona nel calendario il giorno (o i due giorni dell’intervallo).');
    setBusy(true);
    setError(null);
    try {
      await addClosure({
        kind: mode,
        startDate: lo,
        endDate: hi,
        fromTime: mode === 'apertura' && customHours ? fromTime : null,
        toTime: mode === 'apertura' && customHours ? toTime : null,
        note,
      });
      reset();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: Closure) => {
    if (!confirm(c.kind === 'chiusura' ? 'Togliere questa chiusura? I giorni tornano prenotabili.' : 'Togliere questa apertura straordinaria?')) return;
    try {
      await deleteClosure(c.id);
    } catch (e) {
      alert(errText(e));
    }
  };

  const upcoming = useMemo(() => closures.filter((c) => c.endDate >= today), [closures, today]);
  const past = useMemo(() => closures.filter((c) => c.endDate < today).slice(-5), [closures, today]);

  return (
    <section className="bg-white border border-[#EEDFE1] rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarOff className="w-5 h-5 text-[#AA853D]" />
        <h3 className="font-serif text-lg font-bold text-[#261F21]">Chiusure e aperture straordinarie</h3>
      </div>
      <p className="text-[11px] text-[#8F7D82]">
        Segna i giorni di chiusura (es. 24 dicembre), singoli o a intervalli, oppure un’apertura straordinaria (es. un festivo in cui lavori). I giorni festivi, in rosso, sono chiusi in automatico: per lavorare in un festivo aggiungi un’apertura straordinaria. Vale subito per sito e prenotazione.
      </p>

      <div className="inline-flex p-1 bg-[#FAF5F5] rounded-xl text-xs font-bold">
        <button
          type="button"
          onClick={() => setMode('chiusura')}
          className={`px-4 py-2 rounded-lg ${mode === 'chiusura' ? 'bg-[#8A3B49] text-white' : 'text-[#736266]'}`}
        >
          Giorno di chiusura
        </button>
        <button
          type="button"
          onClick={() => setMode('apertura')}
          className={`px-4 py-2 rounded-lg ${mode === 'apertura' ? 'bg-emerald-700 text-white' : 'text-[#736266]'}`}
        >
          Apertura straordinaria
        </button>
      </div>

      <div className="rounded-2xl border border-[#EEDFE1] p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <button type="button" aria-label="Mese precedente" onClick={() => setMonth(new Date(year, m - 1, 1))} className="w-9 h-9 rounded-full bg-[#FAF5F5] flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-serif font-bold text-base capitalize text-[#261F21]">{monthLabel}</span>
          <button type="button" aria-label="Mese successivo" onClick={() => setMonth(new Date(year, m + 1, 1))} className="w-9 h-9 rounded-full bg-[#FAF5F5] flex items-center justify-center">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
            <span key={w} className="text-[10px] font-bold uppercase tracking-wider text-[#8F7D82] pb-1">
              {w}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} />;
            const st = dayStatus(settings, d);
            const holiday = holidayName(d);
            const selected = lo && hi && d >= lo && d <= hi;
            let cls = 'bg-white border-[#EEDFE1] text-[#261F21]';
            let tag = '';
            if (st.extraordinary) {
              cls = 'bg-emerald-50 border-emerald-300 text-emerald-800';
              tag = 'aperto';
            } else if (st.reason === 'chiusura') {
              cls = 'bg-[#F4DFE2] border-[#C98A94] text-[#8A3B49]';
              tag = 'chiuso';
            } else if (st.reason === 'festivo') {
              cls = 'bg-red-50 border-red-200 text-red-500';
            } else if (st.reason === 'giorno-chiuso') {
              cls = 'bg-[#F3F1F1] border-[#EEDFE1] text-[#A89A9E]';
            }
            if (selected) cls = mode === 'chiusura' ? 'bg-[#8A3B49] border-[#8A3B49] text-white' : 'bg-emerald-700 border-emerald-800 text-white';
            return (
              <button
                key={d}
                type="button"
                onClick={() => pick(d)}
                title={holiday ?? undefined}
                aria-label={`${d}${holiday ? ` ${holiday}` : ''}`}
                className={`min-h-[44px] sm:min-h-[52px] rounded-xl border-2 flex flex-col items-center justify-center text-sm font-bold transition-colors ${cls} ${d === today ? 'ring-2 ring-[#D8B268]' : ''}`}
              >
                {Number(d.slice(8))}
                {tag && !selected && <span className="text-[9px] font-semibold leading-none">{tag}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-3 text-[11px] text-[#55474A]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#F4DFE2] border border-[#C98A94]" /> Chiusura</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-300" /> Apertura straordinaria</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 border border-red-200" /> Festivo</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#F3F1F1] border border-[#EEDFE1]" /> Giorno di riposo settimanale</span>
        </div>
      </div>

      {/* Conferma della selezione */}
      <div className="p-4 rounded-2xl bg-[#FCF8F8] border border-[#EEDFE1] space-y-3">
        <p className="text-xs font-semibold text-[#261F21]">
          {lo && hi ? (
            lo === hi ? (
              <>Selezionato: <span className="capitalize">{fmt(lo)}</span></>
            ) : (
              <>Selezionato: dal <span className="capitalize">{fmt(lo)}</span> al <span className="capitalize">{fmt(hi)}</span></>
            )
          ) : start ? (
            'Tocca un secondo giorno per fare un intervallo, oppure conferma il giorno singolo.'
          ) : (
            'Tocca un giorno nel calendario.'
          )}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1 text-[11px] font-medium text-[#55474A] sm:col-span-2">
            <span>Nota (facoltativa)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === 'chiusura' ? 'Es. Vigilia di Natale' : 'Es. Apro il lunedì'} className={`${inputCls} w-full`} maxLength={160} />
          </label>
          {mode === 'apertura' && (
            <>
              <label className="sm:col-span-2 flex items-center gap-2 text-xs font-semibold text-[#261F21] cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#AA853D]" checked={customHours} onChange={(e) => setCustomHours(e.target.checked)} />
                Orario diverso dal solito per quel giorno
              </label>
              {customHours && (
                <div className="flex items-center gap-2 text-xs">
                  <input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} className={inputCls} />
                  <span>–</span>
                  <input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} className={inputCls} />
                </div>
              )}
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={busy || !lo}
            className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl disabled:opacity-40 flex items-center gap-1.5 ${mode === 'chiusura' ? 'bg-[#8A3B49]' : 'bg-emerald-700'}`}
          >
            <CalendarPlus className="w-4 h-4" />
            {busy ? 'Salvataggio…' : mode === 'chiusura' ? 'Segna come chiuso' : 'Segna come aperto'}
          </button>
          {lo && (
            <button type="button" onClick={reset} className="px-3 py-2 text-xs font-semibold text-[#736266]">
              Annulla selezione
            </button>
          )}
        </div>
      </div>

      {/* Elenco */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-[#261F21]">Impostate ({upcoming.length})</h4>
        {upcoming.length === 0 && <p className="text-xs text-[#8F7D82]">Nessuna chiusura o apertura straordinaria in programma.</p>}
        {[...upcoming, ...past].map((c) => (
          <div key={c.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs ${c.endDate < today ? 'opacity-60' : ''} ${c.kind === 'chiusura' ? 'bg-[#FBF1F2] border-[#EBCDD2]' : 'bg-emerald-50 border-emerald-200'}`}>
            <div>
              <span className={`font-bold ${c.kind === 'chiusura' ? 'text-[#8A3B49]' : 'text-emerald-800'}`}>{c.kind === 'chiusura' ? 'Chiuso' : 'Aperto'}</span>{' '}
              <span className="capitalize">{c.startDate === c.endDate ? fmt(c.startDate) : `${fmt(c.startDate)} → ${fmt(c.endDate)}`}</span>
              {c.fromTime && c.toTime && <span> · {c.fromTime}–{c.toTime}</span>}
              {c.note && <span className="text-[#736266]"> · {c.note}</span>}
            </div>
            <button type="button" aria-label="Elimina" onClick={() => remove(c)} className="p-1.5 border border-red-200 text-red-600 rounded-lg shrink-0 bg-white">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
