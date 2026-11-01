/**
 * Crea (o aggiorna) gli account del gestionale su Supabase.
 *
 * Uso:   node scripts/create-accounts.mjs scripts/accounts.json
 *
 * accounts.json (NON va pubblicato, è già escluso da .gitignore):
 * [
 *   { "username": "titolare", "fullName": "Chiara e Melania", "role": "titolare", "operatorId": null },
 *   { "email": "alessia@...", "fullName": "Alessia", "role": "dipendente", "operatorId": "alessia" }
 * ]
 * Con "username" l'accesso avviene con nome utente; la password generata è un CODICE DI
 * ATTIVAZIONE monouso: al primo accesso il sito obbliga a sceglierne una nuova.
 * Se "password" non è indicata viene generata casualmente.
 * Le credenziali finali vengono scritte in scripts/credenziali-account.txt
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const env = {};
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function generatePassword(length = 14) {
  // niente caratteri ambigui (0/O, 1/l/I)
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%&*?'];
  const all = sets.join('');
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Mancano VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY nel file .env');
  process.exit(1);
}

const file = process.argv[2] || 'scripts/accounts.json';
const accounts = JSON.parse(readFileSync(file, 'utf8'));
const USERNAME_DOMAIN = 'utenti.ilsognodellabellezza.it'; // deve coincidere con src/lib/auth.tsx
const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// Utenti già esistenti
const existing = new Map();
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  data.users.forEach((u) => existing.set(u.email?.toLowerCase(), u));
  if (data.users.length < 200) break;
}

const lines = [];
for (const acc of accounts) {
  const username = acc.username ? acc.username.trim().toLowerCase() : null;
  if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) throw new Error(`Nome utente non valido: ${username}`);
  const email = username ? `${username}@${USERNAME_DOMAIN}` : acc.email.trim().toLowerCase();
  const password = acc.password || generatePassword();
  if (!['titolare', 'dipendente'].includes(acc.role)) throw new Error(`Ruolo non valido per ${email}`);

  let user = existing.get(email);
  if (user) {
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) throw error;
    console.log(`↻ aggiornato  ${email} (${acc.role})`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: acc.fullName },
    });
    if (error) throw error;
    user = data.user;
    console.log(`✓ creato      ${email} (${acc.role})`);
  }

  const { error: pErr } = await supabase.from('profiles').upsert({
    id: user.id,
    full_name: acc.fullName,
    role: acc.role,
    operator_id: acc.operatorId ?? null,
    username,
    email: username ? null : email,
    must_change_password: acc.mustChangePassword ?? false,
  });
  if (pErr) throw new Error(`Profilo ${email}: ${pErr.message} — hai eseguito supabase/schema.sql?`);

  const login = username ? `nome utente: ${username}` : `email: ${email}`;
  const pwLabel = `password: ${password}`;
  lines.push(`${acc.role.toUpperCase().padEnd(10)}  ${acc.fullName.padEnd(12)}  ${login.padEnd(44)}  ${pwLabel}`);
}

const out = new URL('./credenziali-account.txt', import.meta.url);
writeFileSync(
  out,
  `CREDENZIALI GESTIONALE — Il Sogno della Bellezza (${new Date().toLocaleString('it-IT')})\n` +
    `Accesso: sito → Gestionale → Account Dipendente / Account Titolare\n\n` +
    lines.join('\n') +
    '\n'
);
console.log(`\nCredenziali salvate in ${out.pathname}`);
