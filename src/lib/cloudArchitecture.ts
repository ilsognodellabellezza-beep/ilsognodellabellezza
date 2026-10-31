/**
 * Cloud architecture blueprints for Supabase + Vercel + Resend Cron Jobs
 * Directly copyable from the Titolare Dashboard.
 */

export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- DATABASE SCHEMA PER "IL SOGNO DELLA BELLEZZA" (SUPABASE)
-- Esegui questo script nel Supabase SQL Editor
-- ========================================================

-- 1. Tabella Operatori (Staff & Titolari)
CREATE TABLE IF NOT EXISTS public.operators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    specialization TEXT NOT NULL,
    type TEXT NOT NULL,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserimento operatori iniziali
INSERT INTO public.operators (id, name, role, specialization, type, bio)
VALUES
  ('chiara', 'Chiara', 'Titolare & Master Estetica', 'Viso Avanzato, Laser EPILED & Trattamenti Anti-Age', 'titolare', 'Fondatrice e master estetica avanzata'),
  ('melania', 'Melania', 'Titolare & Master Lash/Brow', 'Laminazione, Extension Ciglia & Make-Up', 'lash-master', 'Docente corsi laminazione ed extension ciglia'),
  ('alessia', 'Alessia', 'Operatrice Estetica & Laser', 'Epilazione Laser 818NM & Massaggi Donna', 'laser-specialist', 'Specialista corpo e laser diodo')
ON CONFLICT (id) DO NOTHING;

-- 2. Tabella Servizi & Trattamenti
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    promo_price NUMERIC(10, 2),
    duration_minutes INTEGER NOT NULL,
    description TEXT,
    only_women BOOLEAN DEFAULT FALSE,
    is_popular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabella Clienti (CRM)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    notes TEXT,
    allergies TEXT,
    total_visits INTEGER DEFAULT 1,
    total_spent NUMERIC(10, 2) DEFAULT 0,
    last_visit_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabella Appuntamenti
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    client_email TEXT NOT NULL,
    service_id TEXT REFERENCES public.services(id) ON DELETE SET NULL,
    service_name TEXT NOT NULL,
    service_price NUMERIC(10, 2) NOT NULL,
    operator_id TEXT REFERENCES public.operators(id) ON DELETE SET NULL,
    operator_name TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'confermato', -- confermato, in_corso, completato, annullato
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    payment_method TEXT DEFAULT 'non_saldato',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance e query del cron job (giorno prima)
CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON public.appointments(date, status);
CREATE INDEX IF NOT EXISTS idx_appointments_reminder ON public.appointments(reminder_sent, date);

-- 5. Tabella Log Notifiche Email Resend
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    appointment_code TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status TEXT NOT NULL, -- inviata, fallita
    resend_id TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Abilita RLS (Row Level Security)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
`;

export const VERCEL_JSON_CONFIG = `{
  "crons": [
    {
      "path": "/api/cron/reminder-emails",
      "schedule": "0 8 * * *"
    }
  ]
}`;

export const RESEND_CRON_API_CODE = `// api/cron/reminder-emails.ts (Next.js / Vercel Serverless Function)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verifica authorization header da Vercel Cron
  if (req.headers.authorization !== \`Bearer \${process.env.CRON_SECRET}\`) {
    // In dev o test manuale dal gestionale
  }

  // Calcola data di domani (1 giorno prima)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Trova appuntamenti di domani con promemoria non ancora inviato
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('date', tomorrowStr)
    .eq('status', 'confermato')
    .eq('reminder_sent', false);

  if (error || !appointments) {
    return res.status(500).json({ error: error?.message || 'Errore query' });
  }

  const results = [];

  for (const app of appointments) {
    try {
      // Invia email elegante con Resend
      const { data, error: sendError } = await resend.emails.send({
        from: 'Il Sogno della Bellezza <prenotazioni@ilsognodellabellezza.it>',
        to: [app.client_email],
        subject: \`Promemoria Appuntamento Domani: \${app.service_name}\`,
        html: \`
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #f0e6e8; border-radius: 12px; overflow: hidden;">
            <div style="background: #261F21; color: #FAF7F7; padding: 28px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 1px; color: #D8B268;">IL SOGNO DELLA BELLEZZA</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #EEDFE1;">Chiara & Melania · Centro Estetico Catania</p>
            </div>
            
            <div style="padding: 32px 28px;">
              <h2 style="font-size: 18px; color: #261F21; margin-top: 0;">Gentile \${app.client_name},</h2>
              <p style="color: #4A4042; font-size: 15px; line-height: 1.6;">
                Ti ricordiamo con piacere il tuo appuntamento di domani presso il nostro salone in <strong>Via delle Viole, 7/9 a Catania</strong>.
              </p>

              <div style="background: #FCF8F8; border: 1px solid #EEDFE1; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #736266;">DETTAGLI PRENOTAZIONE</p>
                <p style="margin: 4px 0; font-size: 16px; font-weight: bold; color: #261F21;">\${app.service_name}</p>
                <p style="margin: 4px 0; font-size: 14px; color: #3B3033;"><strong>Data:</strong> \${app.date} alle ore \${app.time}</p>
                <p style="margin: 4px 0; font-size: 14px; color: #3B3033;"><strong>Operatrice:</strong> \${app.operator_name}</p>
                <p style="margin: 4px 0; font-size: 14px; color: #AA853D; font-weight: bold;">Codice: \${app.code}</p>
              </div>

              <p style="font-size: 13px; color: #736266; line-height: 1.5;">
                In caso di imprevisti o per modificare l'orario, ti preghiamo di avvisarci con almeno 4 ore di anticipo chiamando o scrivendo su WhatsApp al <a href="tel:3453938087" style="color: #AA853D; text-decoration: none; font-weight: bold;">345 393 8087</a>.
              </p>

              <div style="margin-top: 28px; text-align: center;">
                <a href="https://maps.google.com/?q=Via+delle+Viole+7+Catania" style="background: #261F21; color: #FAF7F7; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500; display: inline-block;">
                  Indicazioni Stradali Google Maps
                </a>
              </div>
            </div>

            <div style="background: #FAF7F7; padding: 16px; text-align: center; border-top: 1px solid #EEDFE1; font-size: 12px; color: #8F7D82;">
              Il Sogno della Bellezza · Via delle Viole, 7/9 - 95124 Catania (CT) · Tel: 345 393 8087
            </div>
          </div>
        \`
      });

      if (!sendError) {
        await supabase
          .from('appointments')
          .update({ reminder_sent: true })
          .eq('id', app.id);

        await supabase.from('email_logs').insert({
          recipient_email: app.client_email,
          recipient_name: app.client_name,
          appointment_code: app.code,
          appointment_date: app.date,
          appointment_time: app.time,
          status: 'inviata',
          resend_id: data?.id
        });
        results.push({ id: app.id, success: true });
      }
    } catch (err: any) {
      results.push({ id: app.id, success: false, error: err.message });
    }
  }

  return res.status(200).json({ processed: results.length, details: results });
}
`;
