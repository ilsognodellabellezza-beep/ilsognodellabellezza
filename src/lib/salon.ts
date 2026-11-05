/**
 * Dati del salone che il titolare gestisce dal gestionale e che valgono subito sul sito:
 * chiusure e aperture straordinarie, blocchi appuntamenti, giorni del laser (in affitto),
 * contatto WhatsApp, foto di trattamenti e dipendenti, promozioni.
 *
 * Se lo script supabase/08-novita-sito-gestionale.sql non è ancora stato eseguito il sito
 * continua a funzionare con i valori predefiniti.
 */
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { compressImage } from './storage';
import { toLocalDateStr, timeToMinutes, isItalianHoliday } from './dates';
import type { BookingSettings, DayHours } from './siteSettings';
import type { Service } from '../types';

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------
export interface Closure {
  id: string;
  kind: 'chiusura' | 'apertura';
  startDate: string;
  endDate: string;
  fromTime: string | null;
  toTime: string | null;
  note: string;
}

export interface AppointmentBlock {
  id: string;
  startDate: string;
  endDate: string;
  fromTime: string | null;
  toTime: string | null;
  /** null = tutto il centro */
  operatorId: string | null;
  note: string;
}

export interface LaserDay {
  open: boolean;
  from: string;
  to: string;
}
export interface LaserException extends LaserDay {
  date: string;
}
export interface LaserSettings {
  /** chiave = giorno della settimana JS (0 = domenica) */
  weekly: Record<number, LaserDay>;
  exceptions: LaserException[];
}

export interface ContactSettings {
  /** numero in formato internazionale senza + (es. 393453938087) */
  whatsapp: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  photoPath: string | null;
  promoPrice: number;
  originalPrice: number | null;
  serviceId: string | null;
  startsOn: string;
  endsOn: string;
  archived: boolean;
}

export const DEFAULT_CONTACT: ContactSettings = { whatsapp: '393453938087' };
export const SALON_NAME = 'Il Sogno della Bellezza';

// ---------------------------------------------------------------------------
// Store + notifiche
// ---------------------------------------------------------------------------
const store = {
  closures: [] as Closure[],
  blocks: [] as AppointmentBlock[],
  laser: null as LaserSettings | null,
  contact: DEFAULT_CONTACT,
  servicePhotos: {} as Record<string, string>,
  operatorPhotos: {} as Record<string, string>,
  promotions: [] as Promotion[],
  loaded: false,
  loading: null as Promise<void> | null,
};
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapClosure = (r: any): Closure => ({
  id: r.id,
  kind: r.kind,
  startDate: r.start_date,
  endDate: r.end_date,
  fromTime: hhmm(r.from_time),
  toTime: hhmm(r.to_time),
  note: r.note ?? '',
});
const mapBlock = (r: any): AppointmentBlock => ({
  id: r.id,
  startDate: r.start_date,
  endDate: r.end_date,
  fromTime: hhmm(r.from_time),
  toTime: hhmm(r.to_time),
  operatorId: r.operator_id ?? null,
  note: r.note ?? '',
});
const mapPromo = (r: any): Promotion => ({
  id: r.id,
  title: r.title,
  description: r.description ?? '',
  photoPath: r.photo_path ?? null,
  promoPrice: Number(r.promo_price),
  originalPrice: r.original_price === null || r.original_price === undefined ? null : Number(r.original_price),
  serviceId: r.service_id ?? null,
  startsOn: r.starts_on,
  endsOn: r.ends_on,
  archived: Boolean(r.archived),
});
/* eslint-enable @typescript-eslint/no-explicit-any */

function normalizeLaser(raw: unknown): LaserSettings | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<LaserSettings>;
  const weekly: Record<number, LaserDay> = {};
  for (let d = 0; d < 7; d++) {
    const w = (r.weekly as Record<string, Partial<LaserDay>> | undefined)?.[String(d)];
    weekly[d] = { open: Boolean(w?.open), from: w?.from || '09:00', to: w?.to || '18:30' };
  }
  const exceptions = (r.exceptions ?? [])
    .filter((e) => e && typeof e.date === 'string')
    .map((e) => ({ date: e.date, open: Boolean(e.open), from: e.from || '09:00', to: e.to || '18:30' }));
  return { weekly, exceptions };
}

export function loadSalonData(force = false): Promise<void> {
  if (store.loading && !force) return store.loading;
  store.loading = (async () => {
    const [cl, bl, blAdmin, st, sp, op, pr] = await Promise.all([
      supabase.from('closures').select('*').order('start_date'),
      supabase.rpc('get_blocks'),
      supabase.from('appointment_blocks').select('*').order('start_date'),
      supabase.from('site_settings').select('key, value').in('key', ['laser', 'contact']),
      supabase.from('service_photos').select('*'),
      supabase.from('operator_photos').select('*'),
      supabase.from('promotions').select('*').order('starts_on', { ascending: false }),
    ]);
    if (cl.error) console.warn('[salon] chiusure non disponibili:', cl.error.message);
    else store.closures = (cl.data ?? []).map(mapClosure);
    // lo staff legge la tabella completa (con le note); il pubblico solo l'elenco dei blocchi
    if (!blAdmin.error && (blAdmin.data ?? []).length > 0) store.blocks = blAdmin.data.map(mapBlock);
    else if (!bl.error) store.blocks = (bl.data ?? []).map(mapBlock);
    else console.warn('[salon] blocchi non disponibili:', bl.error?.message);
    if (!st.error) {
      const byKey = Object.fromEntries((st.data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
      store.laser = normalizeLaser(byKey.laser);
      const c = byKey.contact as Partial<ContactSettings> | undefined;
      store.contact = { whatsapp: (c?.whatsapp || DEFAULT_CONTACT.whatsapp).replace(/\D/g, '') };
    }
    if (!sp.error) store.servicePhotos = Object.fromEntries((sp.data ?? []).map((r: { service_id: string; path: string }) => [r.service_id, r.path]));
    if (!op.error) store.operatorPhotos = Object.fromEntries((op.data ?? []).map((r: { operator_id: string; path: string }) => [r.operator_id, r.path]));
    if (pr.error) console.warn('[salon] promo non disponibili:', pr.error.message);
    else store.promotions = (pr.data ?? []).map(mapPromo);
    store.loaded = true;
    notify();
  })();
  return store.loading;
}

/** Hook: tutti i dati del salone, sempre aggiornati dopo ogni salvataggio. */
export function useSalon() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    loadSalonData().catch((e) => console.warn('[salon]', e));
    return () => {
      listeners.delete(l);
    };
  }, []);
  return {
    closures: store.closures,
    blocks: store.blocks,
    laser: store.laser,
    contact: store.contact,
    promotions: store.promotions,
    activePromotions: activePromotions(store.promotions),
    loaded: store.loaded,
  };
}

// ---------------------------------------------------------------------------
// Apertura dei giorni: chiusure, festivi (rossi) e aperture straordinarie
// ---------------------------------------------------------------------------
export type DayClosedReason = 'chiusura' | 'festivo' | 'giorno-chiuso';

export interface DayStatus {
  open: boolean;
  reason: DayClosedReason | null;
  /** apertura straordinaria impostata dalla titolare */
  extraordinary: boolean;
  /** orari effettivi del giorno, se aperto */
  hours: DayHours | null;
}

const inRange = (d: string, a: string, b: string) => d >= a && d <= b;

export function dayStatus(settings: BookingSettings, dateStr: string): DayStatus {
  const wd = settings.hours[new Date(`${dateStr}T12:00:00`).getDay()];
  const exc = store.closures.filter((c) => c.kind === 'apertura' && inRange(dateStr, c.startDate, c.endDate)).pop();
  if (exc && wd) {
    const custom = Boolean(exc.fromTime && exc.toTime);
    return {
      open: true,
      reason: null,
      extraordinary: true,
      hours: {
        open: true,
        from: exc.fromTime ?? wd.from,
        to: exc.toTime ?? wd.to,
        breakFrom: custom ? '' : wd.breakFrom,
        breakTo: custom ? '' : wd.breakTo,
      },
    };
  }
  if (store.closures.some((c) => c.kind === 'chiusura' && inRange(dateStr, c.startDate, c.endDate))) {
    return { open: false, reason: 'chiusura', extraordinary: false, hours: null };
  }
  if (isItalianHoliday(dateStr)) return { open: false, reason: 'festivo', extraordinary: false, hours: null };
  if (!wd?.open) return { open: false, reason: 'giorno-chiuso', extraordinary: false, hours: null };
  return { open: true, reason: null, extraordinary: false, hours: wd };
}

// ---------------------------------------------------------------------------
// Blocchi appuntamenti
// ---------------------------------------------------------------------------
/** Il blocco copre questo orario? (operatorId null = controlla solo i blocchi di tutto il centro) */
export function isBlockedSlot(dateStr: string, time: string, durationMinutes: number, operatorId: string | null): boolean {
  const start = timeToMinutes(time);
  const end = start + durationMinutes;
  return store.blocks.some((b) => {
    if (!inRange(dateStr, b.startDate, b.endDate)) return false;
    if (b.operatorId !== null && b.operatorId !== operatorId) return false;
    if (!b.fromTime || !b.toTime) return true;
    return start < timeToMinutes(b.toTime) && timeToMinutes(b.fromTime) < end;
  });
}

/** L'appuntamento cade dentro il blocco? (serve per elencare le clienti da spostare o avvisare) */
export function blockAffectsAppointment(
  b: Pick<AppointmentBlock, 'startDate' | 'endDate' | 'fromTime' | 'toTime' | 'operatorId'>,
  a: { date: string; time: string; durationMinutes: number; operatorId: string; status: string }
): boolean {
  if (a.status === 'annullato') return false;
  if (!inRange(a.date, b.startDate, b.endDate)) return false;
  if (b.operatorId !== null && b.operatorId !== a.operatorId) return false;
  if (!b.fromTime || !b.toTime) return true;
  const s = timeToMinutes(a.time);
  return s < timeToMinutes(b.toTime) && timeToMinutes(b.fromTime) < s + a.durationMinutes;
}

// ---------------------------------------------------------------------------
// Laser (in affitto): prenotabile solo nei giorni e negli orari impostati
// ---------------------------------------------------------------------------
export const isLaserService = (s: Pick<Service, 'id' | 'category'> | null | undefined) =>
  Boolean(s && (s.category === 'laser' || s.id.startsWith('laser-')));

function laserDayFor(dateStr: string): LaserDay | null {
  if (!store.laser) return null;
  const exc = store.laser.exceptions.find((e) => e.date === dateStr);
  if (exc) return exc;
  return store.laser.weekly[new Date(`${dateStr}T12:00:00`).getDay()] ?? null;
}

/** Il laser è prenotabile in questo giorno? (se non è mai stato configurato: sempre) */
export function laserOpenOn(dateStr: string): boolean {
  if (!store.laser) return true;
  return Boolean(laserDayFor(dateStr)?.open);
}

export function laserAllowsSlot(dateStr: string, time: string, durationMinutes: number): boolean {
  if (!store.laser) return true;
  const d = laserDayFor(dateStr);
  if (!d || !d.open) return false;
  return timeToMinutes(time) >= timeToMinutes(d.from) && timeToMinutes(time) + durationMinutes <= timeToMinutes(d.to);
}

// ---------------------------------------------------------------------------
// Promozioni
// ---------------------------------------------------------------------------
export function isPromoActive(p: Promotion, today = toLocalDateStr()): boolean {
  return !p.archived && p.startsOn <= today && today <= p.endsOn;
}
export const activePromotions = (all: Promotion[]) => all.filter((p) => isPromoActive(p));

/** Giorni rimanenti alla scadenza (0 = scade oggi) */
export function daysLeft(endsOn: string, today = toLocalDateStr()): number {
  return Math.round((new Date(`${endsOn}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000);
}

export function countdownLabel(endsOn: string): string {
  const n = daysLeft(endsOn);
  if (n <= 0) return 'Scade oggi';
  if (n === 1) return 'Scade domani';
  return `Scade tra ${n} giorni`;
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------
export const getContact = () => store.contact;

export function whatsappUrl(text?: string, number: string = store.contact.whatsapp): string {
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/** 393453938087 → "345 393 8087" */
export function formatPhone(number: string = store.contact.whatsapp): string {
  const n = number.replace(/^39/, '');
  return n.length === 10 ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : number;
}

export const DEFAULT_WA_MESSAGE = `Ciao! Vorrei informazioni su un trattamento de ${SALON_NAME}.`;

// ---------------------------------------------------------------------------
// Foto
// ---------------------------------------------------------------------------
const PHOTO_BUCKET = 'foto';
const publicUrl = (path: string) => supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

export const servicePhotoUrl = (serviceId: string): string | null =>
  store.servicePhotos[serviceId] ? publicUrl(store.servicePhotos[serviceId]) : null;
export const operatorPhotoUrl = (operatorId: string): string | null =>
  store.operatorPhotos[operatorId] ? publicUrl(store.operatorPhotos[operatorId]) : null;
export const promoPhotoUrl = (p: Pick<Promotion, 'photoPath'>): string | null => (p.photoPath ? publicUrl(p.photoPath) : null);

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

async function uploadPhoto(folder: string, file: File): Promise<string> {
  const blob = await compressImage(file, 1000);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const up = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
  fail(up.error);
  return path;
}

async function removePhoto(path: string | null | undefined) {
  if (path) await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

export async function setServicePhoto(serviceId: string, file: File): Promise<void> {
  const old = store.servicePhotos[serviceId];
  const path = await uploadPhoto('trattamenti', file);
  const { error } = await supabase.from('service_photos').upsert({ service_id: serviceId, path, updated_at: new Date().toISOString() });
  if (error) {
    await removePhoto(path);
    throw new Error(error.message);
  }
  store.servicePhotos = { ...store.servicePhotos, [serviceId]: path };
  await removePhoto(old);
  notify();
}

export async function removeServicePhoto(serviceId: string): Promise<void> {
  const old = store.servicePhotos[serviceId];
  const { error } = await supabase.from('service_photos').delete().eq('service_id', serviceId);
  fail(error);
  const next = { ...store.servicePhotos };
  delete next[serviceId];
  store.servicePhotos = next;
  await removePhoto(old);
  notify();
}

export async function setOperatorPhoto(operatorId: string, file: File): Promise<void> {
  const old = store.operatorPhotos[operatorId];
  const path = await uploadPhoto('team', file);
  const { error } = await supabase.from('operator_photos').upsert({ operator_id: operatorId, path, updated_at: new Date().toISOString() });
  if (error) {
    await removePhoto(path);
    throw new Error(error.message);
  }
  store.operatorPhotos = { ...store.operatorPhotos, [operatorId]: path };
  await removePhoto(old);
  notify();
}

export async function removeOperatorPhoto(operatorId: string): Promise<void> {
  const old = store.operatorPhotos[operatorId];
  const { error } = await supabase.from('operator_photos').delete().eq('operator_id', operatorId);
  fail(error);
  const next = { ...store.operatorPhotos };
  delete next[operatorId];
  store.operatorPhotos = next;
  await removePhoto(old);
  notify();
}

// ---------------------------------------------------------------------------
// Salvataggi (solo gestionale)
// ---------------------------------------------------------------------------
export async function addClosure(c: Omit<Closure, 'id'>): Promise<void> {
  const { data, error } = await supabase
    .from('closures')
    .insert({ kind: c.kind, start_date: c.startDate, end_date: c.endDate, from_time: c.fromTime, to_time: c.toTime, note: c.note.trim() })
    .select()
    .single();
  fail(error);
  store.closures = [...store.closures, mapClosure(data)].sort((a, b) => a.startDate.localeCompare(b.startDate));
  notify();
}

export async function deleteClosure(id: string): Promise<void> {
  const { error } = await supabase.from('closures').delete().eq('id', id);
  fail(error);
  store.closures = store.closures.filter((c) => c.id !== id);
  notify();
}

export async function addBlock(b: Omit<AppointmentBlock, 'id'>): Promise<void> {
  const { data, error } = await supabase
    .from('appointment_blocks')
    .insert({
      start_date: b.startDate,
      end_date: b.endDate,
      from_time: b.fromTime,
      to_time: b.toTime,
      operator_id: b.operatorId,
      note: b.note.trim(),
    })
    .select()
    .single();
  fail(error);
  store.blocks = [...store.blocks, mapBlock(data)].sort((a, c) => a.startDate.localeCompare(c.startDate));
  notify();
}

export async function deleteBlock(id: string): Promise<void> {
  const { error } = await supabase.from('appointment_blocks').delete().eq('id', id);
  fail(error);
  store.blocks = store.blocks.filter((b) => b.id !== id);
  notify();
}

async function saveSetting(key: string, value: unknown) {
  const { error } = await supabase.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() });
  fail(error);
}

export async function saveLaserSettings(laser: LaserSettings): Promise<void> {
  await saveSetting('laser', laser);
  store.laser = normalizeLaser(laser);
  notify();
}

export async function saveContact(whatsapp: string): Promise<void> {
  const digits = whatsapp.replace(/\D/g, '');
  if (digits.length < 9) throw new Error('Numero WhatsApp non valido.');
  // un numero italiano senza prefisso (3xx…) riceve +39
  const full = digits.startsWith('39') || digits.length > 11 ? digits : `39${digits}`;
  await saveSetting('contact', { whatsapp: full });
  store.contact = { whatsapp: full };
  notify();
}

export interface PromoInput {
  title: string;
  description: string;
  promoPrice: number;
  originalPrice: number | null;
  serviceId: string | null;
  startsOn: string;
  endsOn: string;
  photoPath: string | null;
}

export async function savePromotion(input: PromoInput, id?: string, photo?: File | null): Promise<Promotion> {
  if (!input.startsOn || !input.endsOn) throw new Error('Data di inizio e di fine sono obbligatorie.');
  if (input.endsOn < input.startsOn) throw new Error('La data di fine non può precedere quella di inizio.');
  const oldPath = id ? store.promotions.find((p) => p.id === id)?.photoPath ?? null : null;
  let photoPath = input.photoPath;
  if (photo) photoPath = await uploadPhoto('promo', photo);
  const row = {
    title: input.title.trim(),
    description: input.description.trim(),
    photo_path: photoPath,
    promo_price: input.promoPrice,
    original_price: input.originalPrice,
    service_id: input.serviceId,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
  };
  const q = id ? supabase.from('promotions').update(row).eq('id', id) : supabase.from('promotions').insert(row);
  const { data, error } = await q.select().single();
  if (error) {
    if (photo) await removePhoto(photoPath);
    throw new Error(error.message);
  }
  const promo = mapPromo(data);
  store.promotions = id ? store.promotions.map((p) => (p.id === id ? promo : p)) : [promo, ...store.promotions];
  if (photo && oldPath && oldPath !== photoPath) await removePhoto(oldPath);
  notify();
  return promo;
}

export async function setPromoArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await supabase.from('promotions').update({ archived }).eq('id', id);
  fail(error);
  store.promotions = store.promotions.map((p) => (p.id === id ? { ...p, archived } : p));
  notify();
}

export async function deletePromotion(id: string): Promise<void> {
  const old = store.promotions.find((p) => p.id === id)?.photoPath;
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  fail(error);
  store.promotions = store.promotions.filter((p) => p.id !== id);
  await removePhoto(old);
  notify();
}

// ---------------------------------------------------------------------------
// Messaggio broadcast WhatsApp
// ---------------------------------------------------------------------------
const fmtDate = (d: string) =>
  new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' }).format(new Date(`${d}T12:00:00`));

export function promoBroadcastText(p: Promotion, siteUrl = window.location.origin): string {
  const price = `€${p.promoPrice.toFixed(2).replace('.', ',')}`;
  const was = p.originalPrice ? ` (invece di €${p.originalPrice.toFixed(2).replace('.', ',')})` : '';
  return [
    `✨ ${SALON_NAME} – ${p.title}`,
    `Solo ${price}${was}`,
    `Valida fino al ${fmtDate(p.endsOn)}.`,
    `Scopri di più e prenota: ${siteUrl}/#promo`,
  ].join('\n');
}

/** Apre WhatsApp con il testo pronto: la titolare sceglie la lista broadcast e conferma l'invio. */
export const broadcastShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
