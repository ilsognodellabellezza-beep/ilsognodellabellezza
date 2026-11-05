/**
 * Promemoria email il giorno prima dell'appuntamento.
 *
 * - GET  → chiamato ogni giorno da Vercel Cron (header Authorization: Bearer CRON_SECRET)
 * - POST → lanciato a mano dal gestionale (header Authorization: Bearer <token Supabase>)
 *
 * Variabili d'ambiente su Vercel: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * RESEND_API_KEY, RESEND_FROM (opzionale), CRON_SECRET.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

declare const process: { env: Record<string, string | undefined> };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'Il Sogno della Bellezza <prenotazioni@ilsognodellabellezza.it>';
const CRON_SECRET = process.env.CRON_SECRET || '';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const escapeHtml = (v: string) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Data di domani nel fuso orario italiano (YYYY-MM-DD) */
function tomorrowInRome(): string {
  const now = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(now);
}

function formatDateIt(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function emailHtml(app: any, phone: { tel: string; label: string }): string {
  const name = escapeHtml(app.client_name);
  const service = escapeHtml(app.service_name);
  const operator = escapeHtml(app.operator_name);
  const code = escapeHtml(app.code);
  const when = `${escapeHtml(formatDateIt(app.date))} alle ore ${escapeHtml(String(app.time).slice(0, 5))}`;
  return `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #f0e6e8; border-radius: 12px; overflow: hidden;">
    <div style="background: #261F21; color: #FAF7F7; padding: 28px; text-align: center;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 1px; color: #D8B268;">IL SOGNO DELLA BELLEZZA</h1>
      <p style="margin: 6px 0 0; font-size: 13px; color: #EEDFE1;">Chiara &amp; Melania · Centro Estetico Catania</p>
    </div>
    <div style="padding: 32px 28px;">
      <h2 style="font-size: 18px; color: #261F21; margin-top: 0;">Gentile ${name},</h2>
      <p style="color: #4A4042; font-size: 15px; line-height: 1.6;">
        ti ricordiamo con piacere il tuo appuntamento di domani presso il nostro salone in <strong>Via delle Viole, 7/9 a Catania</strong>.
      </p>
      <div style="background: #FCF8F8; border: 1px solid #EEDFE1; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #736266;">DETTAGLI PRENOTAZIONE</p>
        <p style="margin: 4px 0; font-size: 16px; font-weight: bold; color: #261F21;">${service}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #3B3033;"><strong>Quando:</strong> ${when}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #3B3033;"><strong>Operatrice:</strong> ${operator}</p>
        <p style="margin: 4px 0; font-size: 14px; color: #AA853D; font-weight: bold;">Codice: ${code}</p>
      </div>
      <p style="font-size: 13px; color: #736266; line-height: 1.5;">
        Per spostare o annullare l'appuntamento avvisaci almeno 4 ore prima chiamando o scrivendo su WhatsApp al
        <a href="tel:+${phone.tel}" style="color: #AA853D; text-decoration: none; font-weight: bold;">${phone.label}</a>.
      </p>
      <div style="margin-top: 28px; text-align: center;">
        <a href="https://maps.google.com/?q=Via+delle+Viole+7+Catania" style="background: #261F21; color: #FAF7F7; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500; display: inline-block;">
          Indicazioni stradali
        </a>
      </div>
    </div>
    <div style="background: #FAF7F7; padding: 16px; text-align: center; border-top: 1px solid #EEDFE1; font-size: 12px; color: #8F7D82;">
      Il Sogno della Bellezza · Via delle Viole, 7/9 - 95124 Catania (CT) · Tel: ${phone.label}
    </div>
  </div>`;
}

async function isAuthorized(request: Request, supabase: SupabaseClient): Promise<boolean> {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  if (CRON_SECRET && token === CRON_SECRET) return true;

  // Token di sessione Supabase: consentito a chi ha accesso al gestionale (account unico)
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return false;
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle();
  return Boolean(profile);
}

async function run(request: Request): Promise<Response> {
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Supabase non configurato sul server.' }, 500);
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  if (!(await isAuthorized(request, supabase))) return json({ error: 'Non autorizzato.' }, 401);
  if (!RESEND_API_KEY) return json({ error: 'RESEND_API_KEY non configurata: impossibile inviare email.' }, 500);

  // numero di telefono/WhatsApp impostato dal gestionale (predefinito: quello storico del salone)
  const { data: contactRow } = await supabase.from('site_settings').select('value').eq('key', 'contact').maybeSingle();
  const digits = String((contactRow?.value as { whatsapp?: string } | undefined)?.whatsapp ?? '393453938087').replace(/\D/g, '');
  const national = digits.replace(/^39/, '');
  const phone = {
    tel: digits,
    label: national.length === 10 ? `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}` : digits,
  };

  const tomorrow = tomorrowInRome();
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('date', tomorrow)
    .eq('status', 'confermato')
    .eq('reminder_sent', false)
    .neq('client_email', '');

  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  let failed = 0;

  for (const app of appointments ?? []) {
    let resendId: string | null = null;
    let errorMsg: string | null = null;
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [app.client_email],
          subject: `Promemoria: il tuo appuntamento di domani (${app.service_name})`,
          html: emailHtml(app, phone),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) resendId = body.id ?? null;
      else errorMsg = body.message || `HTTP ${res.status}`;
    } catch (err) {
      errorMsg = (err as Error).message;
    }

    if (!errorMsg) {
      sent++;
      await supabase.from('appointments').update({ reminder_sent: true }).eq('id', app.id);
    } else {
      failed++;
    }

    await supabase.from('email_logs').insert({
      appointment_id: app.id,
      recipient_email: app.client_email,
      recipient_name: app.client_name,
      appointment_code: app.code,
      appointment_date: app.date,
      appointment_time: app.time,
      service_name: app.service_name,
      status: errorMsg ? 'fallita' : 'inviata',
      trigger_type: request.method === 'GET' ? 'cron_job_24h' : 'manuale_gestionale',
      resend_id: resendId,
      error: errorMsg,
    });
  }

  return json({ date: tomorrow, processed: (appointments ?? []).length, sent, failed });
}

export function GET(request: Request) {
  return run(request);
}

export function POST(request: Request) {
  return run(request);
}
