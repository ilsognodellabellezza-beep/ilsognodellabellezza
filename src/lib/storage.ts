/**
 * Accesso dati su Supabase.
 * I dati letti vengono tenuti in una cache in memoria: le pagine leggono con le funzioni
 * sincrone get*() e si aggiornano ascoltando l'evento 'ilsogno_storage_change',
 * emesso dopo ogni caricamento/modifica.
 */
import { Appointment, Client, FinancialSummary, Review } from '../types';
import { INITIAL_REVIEWS } from '../data/mockData';
import { supabase } from './supabase';
import { toLocalDateStr } from './dates';

export const STORAGE_EVENT = 'ilsogno_storage_change';

export interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  appointmentCode: string;
  date: string;
  time: string;
  serviceName: string;
  sentAt: string;
  status: 'inviata' | 'fallita';
  triggerType: 'cron_job_24h' | 'manuale_gestionale';
  error?: string;
}

export interface PendingReview extends Review {
  approved: boolean;
}

const cache = {
  appointments: [] as Appointment[],
  clients: [] as Client[],
  emailLogs: [] as EmailLog[],
  dbReviews: [] as PendingReview[],
};

function emitChange() {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function fail(context: string, error: { message: string } | null) {
  if (error) {
    console.error(`[Supabase] ${context}:`, error.message);
    throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// Mapping righe DB ↔ tipi dell'app
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
const hhmm = (t: string) => (t || '').slice(0, 5);

function mapAppointment(r: any): Appointment {
  return {
    id: r.id,
    code: r.code,
    clientName: r.client_name,
    clientPhone: r.client_phone,
    clientEmail: r.client_email,
    serviceId: r.service_id,
    serviceName: r.service_name,
    servicePrice: Number(r.service_price),
    operatorId: r.operator_id,
    operatorName: r.operator_name,
    date: r.date,
    time: hhmm(r.time),
    durationMinutes: r.duration_minutes,
    status: r.status,
    notes: r.notes ?? undefined,
    reminderSent: r.reminder_sent,
    createdAt: r.created_at,
    paymentMethod: r.payment_method,
  };
}

function mapClient(r: any): Client {
  return {
    id: r.id,
    fullName: r.full_name,
    phone: r.phone,
    email: r.email,
    notes: r.notes ?? undefined,
    allergies: r.allergies ?? undefined,
    totalVisits: r.total_visits,
    totalSpent: Number(r.total_spent),
    lastVisitDate: r.last_visit_date ?? undefined,
    preferredOperatorId: r.preferred_operator_id ?? undefined,
  };
}

function mapEmailLog(r: any): EmailLog {
  return {
    id: r.id,
    recipientEmail: r.recipient_email,
    recipientName: r.recipient_name,
    appointmentCode: r.appointment_code,
    date: r.appointment_date,
    time: hhmm(r.appointment_time),
    serviceName: r.service_name ?? '',
    sentAt: r.sent_at,
    status: r.status,
    triggerType: r.trigger_type,
    error: r.error ?? undefined,
  };
}

function formatReviewDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Oggi';
  if (days === 1) return 'Ieri';
  if (days < 30) return `${days} giorni fa`;
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

function mapReview(r: any): PendingReview {
  return {
    id: r.id,
    author: r.author,
    rating: r.rating,
    date: formatReviewDate(r.created_at),
    treatmentName: r.treatment_name,
    comment: r.comment,
    verified: r.approved,
    source: 'Verificata',
    approved: r.approved,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Caricamento (gestionale: richiede utente autenticato)
// ---------------------------------------------------------------------------
export async function loadManagementData(options: { includeOwnerData: boolean }): Promise<void> {
  const [apps, clients] = await Promise.all([
    supabase.from('appointments').select('*').order('date', { ascending: false }).order('time', { ascending: true }),
    supabase.from('clients').select('*').order('full_name'),
  ]);
  fail('lettura appuntamenti', apps.error);
  fail('lettura clienti', clients.error);
  cache.appointments = (apps.data ?? []).map(mapAppointment);
  cache.clients = (clients.data ?? []).map(mapClient);

  if (options.includeOwnerData) {
    const [logs, reviews] = await Promise.all([
      supabase.from('email_logs').select('*').order('sent_at', { ascending: false }).limit(200),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
    ]);
    fail('lettura log email', logs.error);
    fail('lettura recensioni', reviews.error);
    cache.emailLogs = (logs.data ?? []).map(mapEmailLog);
    cache.dbReviews = (reviews.data ?? []).map(mapReview);
  }
  emitChange();
}

export function clearCache() {
  cache.appointments = [];
  cache.clients = [];
  cache.emailLogs = [];
  cache.dbReviews = [];
}

export const getStoredAppointments = (): Appointment[] => cache.appointments;
export const getStoredClients = (): Client[] => cache.clients;
export const getStoredEmailLogs = (): EmailLog[] => cache.emailLogs;
export const getAllDbReviews = (): PendingReview[] => cache.dbReviews;

export function searchClients(query: string): Client[] {
  const q = query.trim().toLowerCase();
  if (!q) return cache.clients;
  const qDigits = q.replace(/\s+/g, '');
  return cache.clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(q) ||
      c.phone.replace(/\s+/g, '').includes(qDigits) ||
      c.email.toLowerCase().includes(q)
  );
}

// ---------------------------------------------------------------------------
// Prenotazioni
// ---------------------------------------------------------------------------
export type NewAppointmentInput = Omit<
  Appointment,
  'id' | 'code' | 'createdAt' | 'status' | 'reminderSent' | 'paymentMethod'
> & Partial<Pick<Appointment, 'status' | 'reminderSent' | 'paymentMethod'>>;

export class SlotTakenError extends Error {
  constructor() {
    super("L'orario scelto è appena stato occupato. Scegli un altro orario.");
  }
}

/** Crea una prenotazione (sito pubblico o gestionale). Restituisce il codice. */
export async function saveAppointment(input: NewAppointmentInput): Promise<{ id: string; code: string }> {
  const { data, error } = await supabase.rpc('create_booking', {
    p_client_name: input.clientName,
    p_client_phone: input.clientPhone,
    p_client_email: input.clientEmail,
    p_service_id: input.serviceId,
    p_service_name: input.serviceName,
    p_service_price: input.servicePrice,
    p_operator_id: input.operatorId,
    p_operator_name: input.operatorName,
    p_date: input.date,
    p_time: input.time,
    p_duration_minutes: input.durationMinutes,
    p_notes: input.notes ?? null,
  });
  if (error) {
    if (error.message.includes('SLOT_OCCUPATO')) throw new SlotTakenError();
    fail('creazione prenotazione', error);
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { id: row.id, code: row.code };
}

export interface BookedSlot {
  operatorId: string;
  startTime: string;
  durationMinutes: number;
}

/** Orari occupati di un giorno (pubblico, senza dati personali). */
export async function getBookedSlots(date: string): Promise<BookedSlot[]> {
  const { data, error } = await supabase.rpc('get_booked_slots', { p_date: date });
  fail('lettura disponibilità', error);
  return (data ?? []).map((r: { operator_id: string; start_time: string; duration_minutes: number }) => ({
    operatorId: r.operator_id,
    startTime: hhmm(r.start_time),
    durationMinutes: r.duration_minutes,
  }));
}

export async function updateAppointmentStatus(
  id: string,
  status: Appointment['status'],
  paymentMethod?: Appointment['paymentMethod']
): Promise<void> {
  const patch: Record<string, string> = { status };
  if (paymentMethod) patch.payment_method = paymentMethod;
  const { error } = await supabase.from('appointments').update(patch).eq('id', id);
  fail('aggiornamento appuntamento', error);
  cache.appointments = cache.appointments.map((a) =>
    a.id === id ? { ...a, status, ...(paymentMethod ? { paymentMethod } : {}) } : a
  );
  emitChange();
}

// ---------------------------------------------------------------------------
// Recensioni
// ---------------------------------------------------------------------------
/** Recensioni pubbliche: storiche (Google/Fresha) + quelle approvate dal sito. */
export async function loadPublicReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('approved', true)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase] lettura recensioni:', error.message);
    return INITIAL_REVIEWS;
  }
  return [...(data ?? []).map(mapReview), ...INITIAL_REVIEWS];
}

/** Invia una recensione: resta nascosta finché il titolare non la approva. */
export async function addReview(review: Pick<Review, 'author' | 'rating' | 'treatmentName' | 'comment'>): Promise<void> {
  const { error } = await supabase.from('reviews').insert({
    author: review.author,
    rating: review.rating,
    treatment_name: review.treatmentName,
    comment: review.comment,
  });
  fail('invio recensione', error);
}

export async function setReviewApproved(id: string, approved: boolean): Promise<void> {
  const { error } = await supabase.from('reviews').update({ approved }).eq('id', id);
  fail('moderazione recensione', error);
  cache.dbReviews = cache.dbReviews.map((r) => (r.id === id ? { ...r, approved, verified: approved } : r));
  emitChange();
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  fail('eliminazione recensione', error);
  cache.dbReviews = cache.dbReviews.filter((r) => r.id !== id);
  emitChange();
}

// ---------------------------------------------------------------------------
// Promemoria email (endpoint Vercel /api/cron/reminder-emails)
// ---------------------------------------------------------------------------
export async function triggerReminderEmails(): Promise<{ processed: number; sent: number; failed: number }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch('/api/cron/reminder-emails', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Errore ${res.status}: endpoint promemoria non disponibile (attivo solo su Vercel).`);
  }
  return body;
}

// ---------------------------------------------------------------------------
// Contabilità
// ---------------------------------------------------------------------------
export function computeFinancialSummary(): FinancialSummary {
  const appointments = cache.appointments;
  const todayStr = toLocalDateStr();
  const currentMonthStr = todayStr.substring(0, 7);
  const currentYearStr = todayStr.substring(0, 4);

  let todayRevenue = 0;
  let monthRevenue = 0;
  let yearRevenue = 0;
  let completedCount = 0;
  let validCount = 0;
  let validTotal = 0;
  const serviceStats: Record<string, { revenue: number; count: number }> = {};

  appointments.forEach((app) => {
    if (app.status === 'annullato') return;
    const price = app.servicePrice || 0;
    validCount++;
    validTotal += price;

    if (app.date === todayStr) todayRevenue += price;
    if (app.date.startsWith(currentMonthStr)) monthRevenue += price;
    if (app.date.startsWith(currentYearStr)) yearRevenue += price;
    if (app.status === 'completato') completedCount++;

    if (!serviceStats[app.serviceName]) serviceStats[app.serviceName] = { revenue: 0, count: 0 };
    serviceStats[app.serviceName].revenue += price;
    serviceStats[app.serviceName].count += 1;
  });

  const topServices = Object.entries(serviceStats)
    .map(([name, stat]) => ({ name, revenue: stat.revenue, count: stat.count }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    todayRevenue,
    monthRevenue,
    yearRevenue,
    completedAppointmentsCount: completedCount,
    averageTicket: validCount > 0 ? Math.round(validTotal / validCount) : 0,
    topServices,
  };
}

// ---------------------------------------------------------------------------
// Area clienti
// ---------------------------------------------------------------------------
/** Prenotazioni della cliente collegata (le regole del database mostrano solo le sue). */
export async function loadMyAppointments(userId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_user_id', userId)
    .order('date', { ascending: false })
    .order('time', { ascending: false });
  fail('lettura prenotazioni cliente', error);
  return (data ?? []).map(mapAppointment);
}

export async function cancelMyBooking(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_my_booking', { p_id: id });
  if (error) throw new Error(error.message.includes('Chiamaci') ? error.message : 'Annullamento non riuscito. Chiamaci al 345 393 8087.');
}

// ---------------------------------------------------------------------------
// Galleria foto (pubblica in lettura, caricabile dallo staff)
// ---------------------------------------------------------------------------
export interface GalleryPhoto {
  id: string;
  path: string;
  url: string;
  caption: string;
  createdAt: string;
}

const GALLERY_BUCKET = 'galleria';

export async function listGalleryPhotos(): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase.from('gallery_photos').select('*').order('created_at', { ascending: false });
  fail('lettura galleria', error);
  return (data ?? []).map((r: { id: string; path: string; caption: string | null; created_at: string }) => ({
    id: r.id,
    path: r.path,
    url: supabase.storage.from(GALLERY_BUCKET).getPublicUrl(r.path).data.publicUrl,
    caption: r.caption ?? '',
    createdAt: r.created_at,
  }));
}

/** Riduce la foto (max 1600px, JPEG) così il caricamento da telefono è leggero. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Foto non leggibile'))), 'image/jpeg', 0.82)
  );
}

export async function uploadGalleryPhoto(file: File, caption: string): Promise<void> {
  const blob = await compressImage(file);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const up = await supabase.storage.from(GALLERY_BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
  fail('caricamento foto', up.error);
  const ins = await supabase.from('gallery_photos').insert({ path, caption: caption.trim() || null });
  if (ins.error) {
    await supabase.storage.from(GALLERY_BUCKET).remove([path]);
    fail('salvataggio foto', ins.error);
  }
}

export async function deleteGalleryPhoto(photo: GalleryPhoto): Promise<void> {
  const del = await supabase.from('gallery_photos').delete().eq('id', photo.id);
  fail('eliminazione foto', del.error);
  await supabase.storage.from(GALLERY_BUCKET).remove([photo.path]);
}
