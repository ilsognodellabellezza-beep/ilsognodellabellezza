/**
 * Impostazioni del sito modificabili dal titolare nel gestionale:
 * orari di apertura, pause, passo degli orari, anticipo massimo di prenotazione
 * e prezzi / durate / visibilità dei servizi.
 *
 * Se le tabelle non esistono ancora (script 06-gestione-sito.sql non eseguito)
 * il sito usa i valori predefiniti qui sotto, quindi continua a funzionare.
 */
import { useEffect, useMemo, useState } from 'react';
import { Service } from '../types';
import { SERVICES } from '../data/mockData';
import { supabase } from './supabase';
import { timeToMinutes } from './dates';

export interface DayHours {
  open: boolean;
  from: string; // HH:mm
  to: string; // HH:mm (ultima ora di chiusura: il servizio deve finire entro questo orario)
  breakFrom: string; // '' = nessuna pausa
  breakTo: string;
}

export interface BookingSettings {
  slotStepMinutes: number;
  maxAdvanceDays: number;
  /** chiave = giorno della settimana JS (0 = domenica … 6 = sabato) */
  hours: Record<number, DayHours>;
}

export interface ServiceOverride {
  serviceId: string;
  price: number | null;
  promoPrice: number | null;
  durationMinutes: number | null;
  active: boolean;
}

const OPEN_DAY: DayHours = { open: true, from: '09:00', to: '18:30', breakFrom: '12:30', breakTo: '14:30' };
const CLOSED_DAY: DayHours = { open: false, from: '09:00', to: '18:30', breakFrom: '', breakTo: '' };

export const DEFAULT_SETTINGS: BookingSettings = {
  slotStepMinutes: 30,
  maxAdvanceDays: 180,
  hours: { 0: CLOSED_DAY, 1: CLOSED_DAY, 2: OPEN_DAY, 3: OPEN_DAY, 4: OPEN_DAY, 5: OPEN_DAY, 6: OPEN_DAY },
};

export const WEEKDAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
/** Ordine di visualizzazione: lunedì → domenica */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// ---------------------------------------------------------------------------
// Store in memoria + notifiche ai componenti
// ---------------------------------------------------------------------------
const store = {
  settings: DEFAULT_SETTINGS,
  overrides: [] as ServiceOverride[],
  loaded: false,
  loading: null as Promise<void> | null,
};
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function normalizeSettings(raw: unknown): BookingSettings {
  const r = (raw ?? {}) as Partial<BookingSettings>;
  const hours: Record<number, DayHours> = {};
  for (let d = 0; d < 7; d++) {
    const h = (r.hours as Record<string, Partial<DayHours>> | undefined)?.[String(d)];
    hours[d] = { ...DEFAULT_SETTINGS.hours[d], ...(h ?? {}) };
  }
  const step = Number(r.slotStepMinutes);
  const adv = Number(r.maxAdvanceDays);
  return {
    slotStepMinutes: step >= 5 && step <= 240 ? step : DEFAULT_SETTINGS.slotStepMinutes,
    maxAdvanceDays: adv >= 1 && adv <= 730 ? adv : DEFAULT_SETTINGS.maxAdvanceDays,
    hours,
  };
}

export function loadSiteConfig(force = false): Promise<void> {
  if (store.loading && !force) return store.loading;
  store.loading = (async () => {
    const [s, o] = await Promise.all([
      supabase.from('site_settings').select('value').eq('key', 'booking').maybeSingle(),
      supabase.from('service_overrides').select('*'),
    ]);
    if (s.error) console.warn('[siteSettings] impostazioni non disponibili, uso i valori predefiniti:', s.error.message);
    else if (s.data) store.settings = normalizeSettings(s.data.value);
    if (o.error) console.warn('[siteSettings] prezzi personalizzati non disponibili:', o.error.message);
    else {
      store.overrides = (o.data ?? []).map(
        (r: { service_id: string; price: number | null; promo_price: number | null; duration_minutes: number | null; active: boolean }) => ({
          serviceId: r.service_id,
          price: r.price === null ? null : Number(r.price),
          promoPrice: r.promo_price === null ? null : Number(r.promo_price),
          durationMinutes: r.duration_minutes,
          active: r.active,
        })
      );
    }
    store.loaded = true;
    notify();
  })();
  return store.loading;
}

// ---------------------------------------------------------------------------
// Servizi con le modifiche del titolare applicate
// ---------------------------------------------------------------------------
export function applyOverride(base: Service, o?: ServiceOverride): Service {
  if (!o) return base;
  return {
    ...base,
    price: o.price ?? base.price,
    promoPrice: o.promoPrice ?? undefined,
    durationMinutes: o.durationMinutes ?? base.durationMinutes,
  };
}

function buildServices(includeHidden: boolean): Service[] {
  const byId = new Map(store.overrides.map((o) => [o.serviceId, o]));
  return SERVICES.filter((s) => includeHidden || byId.get(s.id)?.active !== false).map((s) =>
    applyOverride(s, byId.get(s.id))
  );
}

export const getOverrides = () => store.overrides;

/** Hook: impostazioni + servizi aggiornati. Carica una volta sola e si aggiorna dopo ogni salvataggio. */
export function useSiteConfig() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    loadSiteConfig().catch((e) => console.warn('[siteSettings]', e));
    return () => {
      listeners.delete(l);
    };
  }, []);
  const overrides = store.overrides;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const services = useMemo(() => buildServices(false), [overrides]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allServices = useMemo(() => buildServices(true), [overrides]);
  return {
    settings: store.settings,
    /** servizi prenotabili (esclusi quelli nascosti dal titolare) */
    services,
    /** tutti i servizi, anche quelli nascosti (per il gestionale) */
    allServices,
    overrides: store.overrides,
    loaded: store.loaded,
  };
}

// ---------------------------------------------------------------------------
// Salvataggio (solo titolare: lo impongono le regole del database)
// ---------------------------------------------------------------------------
export async function saveBookingSettings(settings: BookingSettings): Promise<void> {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: 'booking', value: settings, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  store.settings = normalizeSettings(settings);
  notify();
}

export async function saveServiceOverride(o: ServiceOverride): Promise<void> {
  const { error } = await supabase.from('service_overrides').upsert({
    service_id: o.serviceId,
    price: o.price,
    promo_price: o.promoPrice,
    duration_minutes: o.durationMinutes,
    active: o.active,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  store.overrides = [...store.overrides.filter((x) => x.serviceId !== o.serviceId), o];
  notify();
}

export async function resetServiceOverride(serviceId: string): Promise<void> {
  const { error } = await supabase.from('service_overrides').delete().eq('service_id', serviceId);
  if (error) throw new Error(error.message);
  store.overrides = store.overrides.filter((x) => x.serviceId !== serviceId);
  notify();
}

// ---------------------------------------------------------------------------
// Calcolo orari
// ---------------------------------------------------------------------------
export const minutesToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Giorno della settimana (0 = domenica) di una data YYYY-MM-DD, senza slittamenti di fuso. */
export const weekdayOf = (dateStr: string) => new Date(`${dateStr}T12:00:00`).getDay();

export function isOpenOn(settings: BookingSettings, dateStr: string): boolean {
  return settings.hours[weekdayOf(dateStr)]?.open ?? false;
}

/**
 * Orari di inizio possibili in una data per un servizio della durata indicata:
 * un servizio deve FINIRE entro l'orario di chiusura e non può sovrapporsi alla pausa.
 * Es. chiusura 18:30: un servizio da 30 min può iniziare alle 18:00, uno da 60 min alle 17:30.
 */
export function slotsForDay(settings: BookingSettings, dateStr: string, durationMinutes: number): string[] {
  const h = settings.hours[weekdayOf(dateStr)];
  if (!h || !h.open) return [];
  const from = timeToMinutes(h.from);
  const to = timeToMinutes(h.to);
  const hasBreak = Boolean(h.breakFrom && h.breakTo);
  const bFrom = hasBreak ? timeToMinutes(h.breakFrom) : 0;
  const bTo = hasBreak ? timeToMinutes(h.breakTo) : 0;
  const out: string[] = [];
  for (let start = from; start + durationMinutes <= to; start += settings.slotStepMinutes) {
    if (hasBreak && start < bTo && bFrom < start + durationMinutes) continue;
    out.push(minutesToTime(start));
  }
  return out;
}

/** Testo sintetico degli orari, es. "Martedì – Sabato: 09:00 – 18:30 (Domenica e Lunedì chiuso)". */
export function formatOpeningSummary(settings: BookingSettings): string {
  const openDays = WEEKDAY_ORDER.filter((d) => settings.hours[d].open);
  const closedDays = WEEKDAY_ORDER.filter((d) => !settings.hours[d].open);
  if (openDays.length === 0) return 'Salone chiuso';
  const range = (d: number) => `${settings.hours[d].from} – ${settings.hours[d].to}`;
  const sameHours = openDays.every((d) => range(d) === range(openDays[0]));
  const contiguous = openDays.every((d, i) => i === 0 || WEEKDAY_ORDER.indexOf(d) === WEEKDAY_ORDER.indexOf(openDays[i - 1]) + 1);
  const daysLabel =
    openDays.length === 1
      ? WEEKDAY_NAMES[openDays[0]]
      : contiguous
      ? `${WEEKDAY_NAMES[openDays[0]]} – ${WEEKDAY_NAMES[openDays[openDays.length - 1]]}`
      : openDays.map((d) => WEEKDAY_NAMES[d]).join(', ');
  const hoursLabel = sameHours ? range(openDays[0]) : 'orari variabili';
  const closed = closedDays.length ? ` (${closedDays.map((d) => WEEKDAY_NAMES[d]).join(' e ')} chiuso)` : '';
  return `${daysLabel}: ${hoursLabel}${closed}`;
}
