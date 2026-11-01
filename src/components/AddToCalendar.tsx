import React from 'react';
import { CalendarPlus, Download } from 'lucide-react';

interface AddToCalendarProps {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  description?: string;
}

const LOCATION = 'Il Sogno della Bellezza, Via delle Viole 7/9, 95124 Catania';

/** Data/ora locale → formato calendario "YYYYMMDDTHHmmss" (fuso Europe/Rome) */
function toCalStamp(date: string, minutesFromMidnight: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setMinutes(minutesFromMidnight);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

const icsEscape = (v: string) => v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export const AddToCalendar: React.FC<AddToCalendarProps> = ({ title, date, time, durationMinutes, description = '' }) => {
  const [h, m] = time.split(':').map(Number);
  const startMin = h * 60 + m;
  const start = toCalStamp(date, startMin);
  const end = toCalStamp(date, startMin + durationMinutes);

  const googleUrl =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${start}/${end}` +
    `&ctz=Europe/Rome` +
    `&details=${encodeURIComponent(description)}` +
    `&location=${encodeURIComponent(LOCATION)}`;

  // File .ics: funziona con Calendario iPhone/Mac, Outlook e Android
  const downloadIcs = () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Il Sogno della Bellezza//Prenotazioni//IT',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${start}-${Math.random().toString(36).slice(2)}@ilsognodellabellezza.it`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;TZID=Europe/Rome:${start}`,
      `DTEND;TZID=Europe/Rome:${end}`,
      `SUMMARY:${icsEscape(title)}`,
      `DESCRIPTION:${icsEscape(description)}`,
      `LOCATION:${icsEscape(LOCATION)}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsEscape(title)}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appuntamento-il-sogno-della-bellezza.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-md mx-auto space-y-2">
      <p className="text-xs font-semibold text-[#261F21]">Aggiungi al tuo calendario</p>
      <div className="flex flex-wrap justify-center gap-2">
        <a
          href={googleUrl}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2.5 bg-white border border-[#DEC7CA] hover:border-[#AA853D] text-[#261F21] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
        >
          <CalendarPlus className="w-4 h-4 text-[#AA853D]" />
          Google Calendar
        </a>
        <button
          type="button"
          onClick={downloadIcs}
          className="px-4 py-2.5 bg-white border border-[#DEC7CA] hover:border-[#AA853D] text-[#261F21] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-4 h-4 text-[#AA853D]" />
          iPhone / Outlook / Altro
        </button>
      </div>
    </div>
  );
};
