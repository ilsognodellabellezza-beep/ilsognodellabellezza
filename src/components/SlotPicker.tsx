import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { getBookedSlots, BookedSlot } from '../lib/storage';
import { timeToMinutes } from '../lib/dates';
import { useSiteConfig, slotsForDay } from '../lib/siteSettings';

interface SlotPickerProps {
  date: string;
  time: string;
  onDateChange: (d: string) => void;
  onTimeChange: (t: string) => void;
  operatorId: string;
  durationMinutes: number;
  /** cambia quando serve ricaricare le prenotazioni (es. dopo un salvataggio) */
  refreshKey?: number;
}

const inputCls =
  'w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]';

/** Data + orario con verifica di disponibilità dell'operatrice (verde = libero, rosso = occupato). */
export const SlotPicker: React.FC<SlotPickerProps> = ({
  date,
  time,
  onDateChange,
  onTimeChange,
  operatorId,
  durationMinutes,
  refreshKey = 0,
}) => {
  const { settings } = useSiteConfig();
  const baseSlots = date ? slotsForDay(settings, date, durationMinutes) : [];
  const [booked, setBooked] = useState<BookedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!date) return;
    let active = true;
    setLoading(true);
    setFailed(false);
    getBookedSlots(date)
      .then((s) => active && setBooked(s))
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [date, refreshKey]);

  const isFree = (t: string) => {
    const start = timeToMinutes(t);
    const end = start + durationMinutes;
    return !booked.some((b) => {
      if (b.operatorId !== operatorId) return false;
      const bs = timeToMinutes(b.startTime);
      return bs < end && start < bs + b.durationMinutes;
    });
  };

  const status = !date || !time || loading || failed ? null : isFree(time) ? 'libero' : 'occupato';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#261F21]">Data</label>
          <input type="date" required value={date} onChange={(e) => onDateChange(e.target.value)} className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#261F21]">Orario</label>
          <input type="time" required value={time} onChange={(e) => onTimeChange(e.target.value)} className={inputCls} />
        </div>
      </div>

      {status && (
        <p
          className={`flex items-center gap-1.5 text-xs font-semibold rounded-xl p-2.5 border ${
            status === 'libero'
              ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
              : 'text-red-700 bg-red-50 border-red-300'
          }`}
        >
          {status === 'libero' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {status === 'libero' ? `Disponibile alle ${time}` : `Occupato alle ${time}: l'operatrice ha già un appuntamento`}
        </p>
      )}
      {failed && <p className="text-[11px] text-red-700">Impossibile verificare la disponibilità.</p>}

      <div>
        <p className="text-[11px] text-[#8F7D82] mb-1.5">
          {loading ? 'Verifica disponibilità…' : 'Fasce del giorno (tocca per scegliere):'}
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {baseSlots.length === 0 && date && <p className="col-span-5 text-[11px] text-[#8F7D82]">Salone chiuso in questo giorno (puoi comunque inserire un orario a mano).</p>}
          {baseSlots.map((t) => {
            const free = !loading && !failed && isFree(t);
            const busy = !loading && !failed && !free;
            const selected = t === time;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onTimeChange(t)}
                className={`py-2 text-[11px] font-mono font-semibold rounded-lg border-2 ${
                  selected
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : busy
                    ? 'bg-red-50 text-red-600 border-red-300 line-through'
                    : free
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-white text-[#8F7D82] border-[#EEDFE1]'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
