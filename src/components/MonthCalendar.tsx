import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toLocalDateStr } from '../lib/dates';

interface MonthCalendarProps {
  /** primo giorno del mese mostrato */
  month: Date;
  onMonthChange: (firstOfMonth: Date) => void;
  /** primo / ultimo giorno prenotabile (YYYY-MM-DD) */
  minDate: string;
  maxDate: string;
  /** il salone è aperto in quel giorno? */
  isOpenDay: (dateStr: string) => boolean;
  /** giorno festivo (rosso): non prenotabile, salvo apertura straordinaria */
  isRedDay?: (dateStr: string) => boolean;
  /** 'libero' | 'occupato' | undefined (non ancora verificato) */
  getStatus: (dateStr: string) => 'libero' | 'occupato' | undefined;
  /** data -> orario già scelto */
  picks: Record<string, string>;
  selectedDate: string;
  onSelect: (dateStr: string) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

/** Calendario mensile: si può sfogliare per mesi e prenotare qualsiasi giorno futuro entro il limite. */
export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  month,
  onMonthChange,
  minDate,
  maxDate,
  isOpenDay,
  isRedDay,
  getStatus,
  picks,
  selectedDate,
  onSelect,
}) => {
  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const leading = (new Date(year, m, 1).getDay() + 6) % 7; // lunedì = 0
  const monthLabel = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(month);

  const prevLast = toLocalDateStr(new Date(year, m, 0));
  const nextFirst = toLocalDateStr(new Date(year, m + 1, 1));
  const canPrev = prevLast >= minDate;
  const canNext = nextFirst <= maxDate;

  const cells: (string | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toLocalDateStr(new Date(year, m, i + 1))),
  ];

  return (
    <div className="rounded-2xl border border-[#EEDFE1] bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          aria-label="Mese precedente"
          disabled={!canPrev}
          onClick={() => onMonthChange(new Date(year, m - 1, 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#261F21] bg-[#FAF5F5] disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-serif font-bold text-base text-[#261F21] capitalize">{monthLabel}</span>
        <button
          type="button"
          aria-label="Mese successivo"
          disabled={!canNext}
          onClick={() => onMonthChange(new Date(year, m + 1, 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#261F21] bg-[#FAF5F5] disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-[10px] font-bold uppercase tracking-wider text-[#8F7D82] pb-1">
            {w}
          </span>
        ))}

        {cells.map((dateStr, i) => {
          if (!dateStr) return <span key={`b${i}`} />;
          const day = Number(dateStr.slice(8));
          const inRange = dateStr >= minDate && dateStr <= maxDate;
          const open = isOpenDay(dateStr);
          const status = inRange && open ? getStatus(dateStr) : undefined;
          const picked = picks[dateStr];
          const active = selectedDate === dateStr;
          const disabled = !inRange || !open || status === 'occupato';

          let cls = 'bg-white border-[#EEDFE1] text-[#261F21]';
          const red = !open && Boolean(isRedDay?.(dateStr));
          if (red) cls = 'bg-red-50/60 border-transparent text-red-500 cursor-not-allowed';
          else if (!inRange || !open) cls = 'bg-transparent border-transparent text-[#C9B8BC] cursor-not-allowed';
          else if (picked) cls = 'bg-emerald-600 text-white border-emerald-700 shadow-md';
          else if (status === 'occupato') cls = 'bg-red-50 text-red-600 border-red-300 cursor-not-allowed line-through';
          else if (status === 'libero') cls = 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100';

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(dateStr)}
              aria-label={`${day} ${monthLabel}: ${
                !open ? (red ? 'festivo, salone chiuso' : 'non disponibile') : !inRange ? 'non prenotabile' : status === 'occupato' ? 'occupato' : picked ? `scelto ore ${picked}` : 'disponibile'
              }`}
              className={`min-h-[44px] sm:min-h-[52px] rounded-xl border-2 flex flex-col items-center justify-center transition-all ${cls} ${
                active ? 'ring-2 ring-emerald-400' : ''
              }`}
            >
              <span className="text-sm font-bold leading-none">{day}</span>
              {picked && <span className="text-[9px] font-mono mt-0.5 text-emerald-100">{picked}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
