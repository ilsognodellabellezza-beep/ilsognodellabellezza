import { createClient } from '@supabase/supabase-js';

/**
 * Indirizzo e chiave PUBBLICA del progetto Supabase.
 * La chiave "publishable" è pensata per stare nel sito: i dati sono protetti dalle regole RLS del database.
 * Se presenti, le variabili d'ambiente VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY hanno la precedenza.
 * La chiave segreta (sb_secret_…) NON va mai messa qui.
 */
const DEFAULT_URL = 'https://fxfxnuwyznzgwumgcmde.supabase.co';
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_1k0dXFbUJl4cN08UVSX_3g_LVnV2OLa';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
