import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('your-project'));

if (!isSupabaseConfigured) {
  console.error(
    '[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY mancanti: copia .env.example in .env e inserisci le chiavi del progetto.'
  );
}

export const supabase = createClient(
  url || 'https://invalid.supabase.co',
  anonKey || 'missing-key',
  { auth: { persistSession: true, autoRefreshToken: true } }
);
