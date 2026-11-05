/**
 * Impostazioni del sito modificabili dal titolare nel gestionale:
 * orari di apertura, pause, passo degli orari, anticipo massimo di prenotazione
 * e prezzi / durate / visibilità dei servizi.
 *
 * Se le tabelle non esistono ancora (script 06-gestione-sito.sql non eseguito)
 * il sito usa i valori predefiniti qui sotto, quindi continua a funzionare.
 */
import { useEffect, useMemo, useState } from 'react';
import { Service, Operator, TreatmentCategory } from '../types';
import { SERVICES, OPERATORS } from '../data/mockData';
import { supabase } from './supabase';
import { timeToMinutes } from './dates';
import { dayStatus } from './salon';

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
  customServices: [] as Service[],
  customOperators: [] as Operator[],
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
    const [s, o, cs, co] = await Promise.all([
      supabase.from('site_settings').select('value').eq('key', 'booking').maybeSingle(),
      supabase.from('service_overrides').select('*'),
      supabase.from('custom_services').select('*').order('created_at'),
      supabase.from('custom_operators').select('*').order('created_at'),
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
    if (cs.error) console.warn('[siteSettings] servizi personalizzati non disponibili:', cs.error.message);
    else store.customServices = (cs.data ?? []).map(mapCustomService);
    if (co.error) console.warn('[siteSettings] dipendenti personalizzati non disponibili:', co.error.message);
    else store.customOperators = (co.data ?? []).map(mapCustomOperator);
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

export const CATEGORY_LABELS: Record<TreatmentCategory, string> = {
  viso: 'Trattamenti viso',
  corpo: 'Trattamento corpo (solo donna)',
  mani: 'Trattamento mani',
  pedicure: 'Trattamento pedicure',
  makeup: 'Make up',
  sguardo: 'Ciglia & Sopracciglia',
  laser: 'Epilazione Laser',
};

/** Ordine del menu trattamenti (sito e prenotazione) */
export const CATEGORY_ORDER: TreatmentCategory[] = ['viso', 'corpo', 'mani', 'pedicure', 'makeup', 'sguardo', 'laser'];
export const CATEGORY_LIST = CATEGORY_ORDER.map((id) => ({ id, label: CATEGORY_LABELS[id] }));

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCustomService(r: any): Service {
  const category = r.category as TreatmentCategory;
  return {
    id: r.id,
    name: r.name,
    category,
    categoryLabel: CATEGORY_LABELS[category] ?? 'Altri trattamenti',
    price: Number(r.price),
    promoPrice: r.promo_price === null ? undefined : Number(r.promo_price),
    durationMinutes: r.duration_minutes,
    description: r.description ?? '',
    benefits: [],
    onlyWomen: r.only_women,
    isPopular: r.is_popular,
    operatorTypes: [],
    operatorIds: r.operator_ids ?? [],
    custom: true,
    active: r.active,
  };
}

function mapCustomOperator(r: any): Operator {
  return {
    id: r.id,
    name: r.name,
    role: r.role || 'Operatrice',
    specialization: r.specialization ?? '',
    type: 'estetica-base',
    bio: '',
    custom: true,
    serviceIds: r.service_ids ?? [],
    active: r.active,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function buildServices(includeHidden: boolean): Service[] {
  const byId = new Map(store.overrides.map((o) => [o.serviceId, o]));
  const base = SERVICES.filter((s) => includeHidden || byId.get(s.id)?.active !== false).map((s) =>
    applyOverride(s, byId.get(s.id))
  );
  const custom = store.customServices.filter((s) => includeHidden || s.active !== false);
  return [...base, ...custom];
}

function buildOperators(includeHidden: boolean): Operator[] {
  return [...OPERATORS, ...store.customOperators.filter((o) => includeHidden || o.active !== false)];
}

/** Operatrici abilitate a un servizio: per tipo (storiche), per elenco servizi della dipendente o per elenco del servizio. */
export function operatorsForService(service: Service | null, operators: Operator[]): Operator[] {
  if (!service) return operators;
  const q = operators.filter(
    (op) =>
      service.operatorIds?.includes(op.id) ||
      op.serviceIds?.includes(service.id) ||
      (!op.custom && service.operatorTypes.includes(op.type))
  );
  return q.length > 0 ? q : operators;
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
  const customServices = store.customServices;
  const customOperators = store.customOperators;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const services = useMemo(() => buildServices(false), [overrides, customServices]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allServices = useMemo(() => buildServices(true), [overrides, customServices]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const operators = useMemo(() => buildOperators(false), [customOperators]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allOperators = useMemo(() => buildOperators(true), [customOperators]);
  return {
    settings: store.settings,
    /** servizi prenotabili (esclusi quelli nascosti dal titolare) */
    services,
    /** tutti i servizi, anche quelli nascosti (per il gestionale) */
    allServices,
    /** dipendenti attive (storiche + aggiunte dal titolare) */
    operators,
    allOperators,
    customServices,
    customOperators,
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

export interface NewServiceInput {
  name: string;
  category: TreatmentCategory;
  price: number;
  promoPrice: number | null;
  durationMinutes: number;
  description: string;
  onlyWomen: boolean;
  isPopular: boolean;
  operatorIds: string[];
  active: boolean;
}

const newId = (prefix: string, name: string) =>
  prefix + '-' + name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) + '-' + Math.random().toString(36).slice(2, 6);

export async function saveCustomService(input: NewServiceInput, id?: string): Promise<void> {
  const rowId = id ?? newId('svc', input.name);
  const { data, error } = await supabase
    .from('custom_services')
    .upsert({
      id: rowId,
      name: input.name.trim(),
      category: input.category,
      price: input.price,
      promo_price: input.promoPrice,
      duration_minutes: input.durationMinutes,
      description: input.description.trim(),
      only_women: input.onlyWomen,
      is_popular: input.isPopular,
      operator_ids: input.operatorIds,
      active: input.active,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const svc = mapCustomService(data);
  const exists = store.customServices.some((x) => x.id === rowId);
  store.customServices = exists ? store.customServices.map((x) => (x.id === rowId ? svc : x)) : [...store.customServices, svc];
  notify();
}

export async function deleteCustomService(id: string): Promise<void> {
  const { error } = await supabase.from('custom_services').delete().eq('id', id);
  if (error) throw new Error(error.message);
  store.customServices = store.customServices.filter((x) => x.id !== id);
  notify();
}

export interface NewOperatorInput {
  name: string;
  role: string;
  specialization: string;
  serviceIds: string[];
  active: boolean;
}

export async function saveCustomOperator(input: NewOperatorInput, id?: string): Promise<void> {
  const rowId = id ?? newId('op', input.name);
  const { data, error } = await supabase
    .from('custom_operators')
    .upsert({
      id: rowId,
      name: input.name.trim(),
      role: input.role.trim(),
      specialization: input.specialization.trim(),
      service_ids: input.serviceIds,
      active: input.active,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const op = mapCustomOperator(data);
  const exists = store.customOperators.some((x) => x.id === rowId);
  store.customOperators = exists ? store.customOperators.map((x) => (x.id === rowId ? op : x)) : [...store.customOperators, op];
  notify();
}

export async function deleteCustomOperator(id: string): Promise<void> {
  const { error } = await supabase.from('custom_operators').delete().eq('id', id);
  if (error) throw new Error(error.message);
  store.customOperators = store.customOperators.filter((x) => x.id !== id);
  notify();
}

// ---------------------------------------------------------------------------
// Calcolo orari
// ---------------------------------------------------------------------------
export const minutesToTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Giorno della settimana (0 = domenica) di una data YYYY-MM-DD, senza slittamenti di fuso. */
export const weekdayOf = (dateStr: string) => new Date(`${dateStr}T12:00:00`).getDay();

/** Il salone è aperto in questo giorno? Considera giorni della settimana, chiusure, festivi e aperture straordinarie. */
export function isOpenOn(settings: BookingSettings, dateStr: string): boolean {
  return dayStatus(settings, dateStr).open;
}

/**
 * Orari di inizio possibili in una data per un servizio della durata indicata:
 * un servizio deve FINIRE entro l'orario di chiusura e non può sovrapporsi alla pausa.
 * Es. chiusura 18:30: un servizio da 30 min può iniziare alle 18:00, uno da 60 min alle 17:30.
 */
export function slotsForDay(settings: BookingSettings, dateStr: string, durationMinutes: number): string[] {
  const h = dayStatus(settings, dateStr).hours;
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
