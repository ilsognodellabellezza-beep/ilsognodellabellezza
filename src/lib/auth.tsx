import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { UserRole } from '../types';

/** Le titolari accedono con nome utente: internamente diventa un indirizzo di questo dominio (nessuna email viene inviata). */
export const USERNAME_DOMAIN = 'utenti.ilsognodellabellezza.it';

export function loginToEmail(login: string): string {
  const v = login.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@${USERNAME_DOMAIN}`;
}

export interface StaffProfile {
  id: string;
  fullName: string;
  role: UserRole;
  operatorId: string | null;
  email: string;
  username: string | null;
  mustChangePassword: boolean;
}

/** Cliente registrata dal sito (account senza profilo staff) */
export interface CustomerAccount {
  id: string;
  email: string;
  fullName: string;
  phone: string;
}

export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Email o password non corretti.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Esiste già un account con questa email: accedi invece di registrarti.';
  if (m.includes('email not confirmed')) return "Devi prima confermare l'email: controlla la tua casella di posta.";
  if (m.includes('password should be') || m.includes('weak password')) return 'La password deve avere almeno 8 caratteri.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Troppi tentativi: riprova tra qualche minuto.';
  if (m.includes('invalid') && m.includes('email')) return 'Indirizzo email non valido.';
  return 'Operazione non riuscita. Riprova tra qualche minuto.';
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: StaffProfile | null;
  customer: CustomerAccount | null;
  customerSignIn: (email: string, password: string) => Promise<string | null>;
  customerSignUp: (input: { fullName: string; phone: string; email: string; password: string }) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  updateCustomer: (input: { fullName: string; phone: string }) => Promise<string | null>;
  signIn: (login: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(session: Session | null): Promise<StaffProfile | null> {
  if (!session) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, operator_id, username, must_change_password')
    .eq('id', session.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role,
    operatorId: data.operator_id,
    email: session.user.email ?? '',
    username: data.username ?? null,
    mustChangePassword: Boolean(data.must_change_password),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const p = await loadProfile(data.session);
      if (!active) return;
      setSession(data.session);
      setProfile(p);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
      setCheckingProfile(true);
      // Non chiamare Supabase dentro il callback in modo sincrono (deadlock noto)
      setTimeout(async () => {
        const p = await loadProfile(newSession);
        if (active) {
          setProfile(p);
          setCheckingProfile(false);
        }
      }, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (login: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginToEmail(login),
      password,
    });
    if (error) {
      return error.message.includes('Invalid login')
        ? 'Nome utente/email o password non corretti.'
        : `Accesso non riuscito: ${error.message}`;
    }
    const p = await loadProfile(data.session);
    if (!p) {
      await supabase.auth.signOut();
      return 'Questo account non è abilitato al gestionale.';
    }
    setSession(data.session);
    setProfile(p);
    return null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  // ----- Clienti -----
  const customerSignIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return error ? translateAuthError(error.message) : null;
  };

  const customerSignUp = async (input: { fullName: string; phone: string; email: string; password: string }) => {
    if (input.password.length < 8) return { error: 'La password deve avere almeno 8 caratteri.', needsConfirmation: false };
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: { full_name: input.fullName.trim(), phone: input.phone.trim() },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { error: translateAuthError(error.message), needsConfirmation: false };
    // Supabase restituisce un utente senza identità se l'email è già registrata
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { error: 'Esiste già un account con questa email: accedi invece di registrarti.', needsConfirmation: false };
    }
    return { error: null, needsConfirmation: !data.session };
  };

  const updateCustomer = async (input: { fullName: string; phone: string }) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: input.fullName.trim(), phone: input.phone.trim() },
    });
    if (error) return translateAuthError(error.message);
    if (data.user) setSession((s) => (s ? { ...s, user: data.user } : s));
    return null;
  };

  const customer: CustomerAccount | null =
    session && !profile && !loading && !checkingProfile
      ? {
          id: session.user.id,
          email: session.user.email ?? '',
          fullName: (session.user.user_metadata?.full_name as string) ?? '',
          phone: (session.user.user_metadata?.phone as string) ?? '',
        }
      : null;

  const changePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return error.message.includes('different from the old')
        ? 'La nuova password deve essere diversa da quella attuale.'
        : `Impossibile salvare la password: ${error.message}`;
    }
    const { error: flagError } = await supabase.rpc('mark_password_changed');
    if (flagError) return `Password salvata, ma errore nel profilo: ${flagError.message}`;
    setProfile((p) => (p ? { ...p, mustChangePassword: false } : p));
    return null;
  };

  return (
    <AuthContext.Provider value={{ loading, session, profile, customer, customerSignIn, customerSignUp, updateCustomer, signIn, signOut, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>');
  return ctx;
}
