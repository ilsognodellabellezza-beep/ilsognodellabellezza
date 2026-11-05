/** Data locale in formato YYYY-MM-DD (evita lo slittamento di giorno di toISOString, che usa UTC). */
export function toLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** "HH:mm" o "HH:mm:ss" → minuti dalla mezzanotte */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Pasqua (calendario gregoriano) */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12);
}

const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': 'Capodanno',
  '01-06': 'Epifania',
  '04-25': 'Festa della Liberazione',
  '05-01': 'Festa del Lavoro',
  '06-02': 'Festa della Repubblica',
  '08-15': 'Ferragosto',
  '11-01': 'Ognissanti',
  '12-08': 'Immacolata',
  '12-25': 'Natale',
  '12-26': 'Santo Stefano',
};

/** Nome del giorno festivo (i "giorni rossi" del calendario italiano), oppure null. */
export function holidayName(dateStr: string): string | null {
  const fixed = FIXED_HOLIDAYS[dateStr.slice(5)];
  if (fixed) return fixed;
  const easter = easterSunday(Number(dateStr.slice(0, 4)));
  if (dateStr === toLocalDateStr(easter)) return 'Pasqua';
  if (dateStr === toLocalDateStr(addDays(easter, 1))) return 'Lunedì dell’Angelo';
  return null;
}

export const isItalianHoliday = (dateStr: string) => holidayName(dateStr) !== null;

/** Giorni di calendario da `from` a `to` inclusi (massimo 400, per sicurezza) */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = new Date(`${from}T12:00:00`); toLocalDateStr(d) <= to && out.length < 400; d.setDate(d.getDate() + 1)) {
    out.push(toLocalDateStr(d));
  }
  return out;
}
