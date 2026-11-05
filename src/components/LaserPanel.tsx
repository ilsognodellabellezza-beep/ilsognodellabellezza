import React, { useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { LaserDay, LaserException, LaserSettings, saveLaserSettings, useSalon } from '../lib/salon';
import { BookingSettings, WEEKDAY_NAMES, WEEKDAY_ORDER, useSiteConfig } from '../lib/siteSettings';
import { toLocalDateStr } from '../lib/dates';

const inputCls = 'px-2.5 py-2 text-xs bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]';
const fmt = (d: string) => new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${d}T12:00:00`));

const SQL_HINT = 'Esegui lo script supabase/08-novita-sito-gestionale.sql nel database (SQL Editor di Supabase).';

const defaultsFrom = (s: BookingSettings): LaserSettings => ({
  weekly: Object.fromEntries(
    Array.from({ length: 7 }, (_, d) => [d, { open: s.hours[d].open, from: s.hours[d].from, to: s.hours[d].to } as LaserDay])
  ),
  exceptions: [],
});

/** Il laser è in affitto: qui si decide in quali giorni e a che ora è prenotabile. */
export const LaserPanel: React.FC = () => {
  const { laser, loaded } = useSalon();
  const { settings } = useSiteConfig();
  // il modulo parte dai dati salvati (o, se mai configurato, dai giorni di apertura del salone)
  return <LaserEditor key={loaded ? 'ready' : 'loading'} initial={laser ?? defaultsFrom(settings)} configured={laser !== null} />;
};

const LaserEditor: React.FC<{ initial: LaserSettings; configured: boolean }> = ({ initial, configured }) => {
  const [weekly, setWeekly] = useState<Record<number, LaserDay>>(initial.weekly);
  const [exceptions, setExceptions] = useState<LaserException[]>(initial.exceptions);
  const [newDate, setNewDate] = useState(toLocalDateStr());
  const [newOpen, setNewOpen] = useState(true);
  const [newFrom, setNewFrom] = useState('09:00');
  const [newTo, setNewTo] = useState('18:30');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const setDay = (d: number, patch: Partial<LaserDay>) => setWeekly((w) => ({ ...w, [d]: { ...w[d], ...patch } }));

  const addException = () => {
    if (!newDate) return;
    setExceptions((list) => [...list.filter((e) => e.date !== newDate), { date: newDate, open: newOpen, from: newFrom, to: newTo }].sort((a, b) => a.date.localeCompare(b.date)));
  };

  const save = async () => {
    for (const d of WEEKDAY_ORDER) {
      if (weekly[d].open && weekly[d].to <= weekly[d].from) return setMsg({ ok: false, text: `${WEEKDAY_NAMES[d]}: l'orario di fine deve essere dopo l'inizio.` });
    }
    setBusy(true);
    setMsg(null);
    try {
      await saveLaserSettings({ weekly, exceptions });
      setMsg({ ok: true, text: 'Salvato: vale subito sul sito.' });
    } catch (e) {
      const m = (e as Error).message;
      setMsg({ ok: false, text: /schema cache|relation|site_settings/i.test(m) ? SQL_HINT : m });
    } finally {
      setBusy(false);
    }
  };

  const today = toLocalDateStr();
  const futureExceptions = exceptions.filter((e) => e.date >= today);

  return (
    <section className="bg-white border border-[#EEDFE1] rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-[#AA853D]" />
        <h3 className="font-serif text-lg font-bold text-[#261F21]">Disponibilità del laser</h3>
      </div>
      <p className="text-[11px] text-[#8F7D82]">
        Il laser è in affitto e ha giorni predefiniti: fuori da questi giorni e orari non è selezionabile nella prenotazione. Puoi cambiarli in qualsiasi momento, anche per singole date.
        {!configured && ' Finché non salvi, il laser segue gli orari normali del salone.'}
      </p>

      <div className="space-y-2">
        {WEEKDAY_ORDER.map((d) => (
          <div key={d} className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border ${weekly[d].open ? 'border-[#EEDFE1] bg-white' : 'border-[#EEDFE1] bg-[#FAF5F5]'}`}>
            <label className="flex items-center gap-2 w-36 text-xs font-bold text-[#261F21] cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-[#AA853D]" checked={weekly[d].open} onChange={(e) => setDay(d, { open: e.target.checked })} />
              {WEEKDAY_NAMES[d]}
            </label>
            {weekly[d].open ? (
              <div className="flex items-center gap-2 text-xs">
                <input type="time" value={weekly[d].from} onChange={(e) => setDay(d, { from: e.target.value })} className={inputCls} />
                <span>–</span>
                <input type="time" value={weekly[d].to} onChange={(e) => setDay(d, { to: e.target.value })} className={inputCls} />
              </div>
            ) : (
              <span className="text-xs text-[#8F7D82]">Laser non disponibile</span>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold text-[#261F21]">Date particolari (valgono al posto dei giorni sopra)</h4>
        <div className="flex flex-wrap items-end gap-3 p-3 rounded-xl bg-[#FCF8F8] border border-[#EEDFE1]">
          <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
            <span>Data</span>
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={`${inputCls} block`} />
          </label>
          <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
            <span>Laser</span>
            <select value={newOpen ? 'si' : 'no'} onChange={(e) => setNewOpen(e.target.value === 'si')} className={`${inputCls} block`}>
              <option value="si">Disponibile</option>
              <option value="no">Non disponibile</option>
            </select>
          </label>
          {newOpen && (
            <div className="flex items-center gap-2 text-xs pb-0.5">
              <input type="time" value={newFrom} onChange={(e) => setNewFrom(e.target.value)} className={inputCls} />
              <span>–</span>
              <input type="time" value={newTo} onChange={(e) => setNewTo(e.target.value)} className={inputCls} />
            </div>
          )}
          <button type="button" onClick={addException} className="px-3.5 py-2 bg-[#261F21] text-[#D8B268] text-xs font-bold rounded-lg flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Aggiungi data
          </button>
        </div>
        {futureExceptions.length === 0 && <p className="text-xs text-[#8F7D82]">Nessuna data particolare in programma.</p>}
        {futureExceptions.map((e) => (
          <div key={e.date} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#EEDFE1] text-xs">
            <span>
              <span className="font-bold capitalize">{fmt(e.date)}</span> ·{' '}
              {e.open ? <span className="text-emerald-700 font-semibold">laser {e.from}–{e.to}</span> : <span className="text-[#8A3B49] font-semibold">laser non disponibile</span>}
            </span>
            <button type="button" aria-label="Elimina" onClick={() => setExceptions((l) => l.filter((x) => x.date !== e.date))} className="p-1.5 border border-red-200 text-red-600 rounded-lg">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="px-5 py-2.5 bg-[#261F21] text-[#D8B268] text-xs font-bold rounded-xl disabled:opacity-40">
          {busy ? 'Salvataggio…' : 'Salva disponibilità laser'}
        </button>
        {msg && (
          <span role="status" className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </section>
  );
};
