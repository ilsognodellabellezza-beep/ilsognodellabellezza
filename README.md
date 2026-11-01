# Il Sogno della Bellezza

Sito e gestionale del centro estetico **Il Sogno della Bellezza** di Chiara e Melania, Via delle Viole 7/9, Catania.

- Sito pubblico: trattamenti, promo laser EPILED 818NM, recensioni, prenotazione online con disponibilità reale
- Account clienti: registrazione, accesso, storico e annullamento prenotazioni
- Gestionale staff (agenda e clienti) e titolare (incassi, contabilità, recensioni, account dipendenti)
- Promemoria email automatico il giorno prima dell'appuntamento

Tecnologie: React + Vite + Tailwind, Supabase (database e accessi), Vercel (hosting e invio promemoria), Resend (email).

## Avvio in locale

```bash
npm install
cp .env.example .env   # poi inserisci le chiavi Supabase
npm run dev            # http://localhost:3000
```

## Database Supabase

Esegui nel **SQL Editor** di Supabase, in ordine:

1. `supabase/schema.sql`
2. `supabase/02-account-staff.sql`
3. `supabase/03-permessi.sql`
4. `supabase/04-account-clienti.sql`

In **Authentication → Sign In / Providers → Email** disattiva *Confirm email* (a meno di configurare un SMTP personalizzato).

## Pubblicazione su Vercel

1. Importa il repository su Vercel (il framework Vite viene riconosciuto da `vercel.json`).
2. In **Settings → Environment Variables** aggiungi le variabili elencate in `.env.example`.
3. Dopo il primo deploy, in Supabase → **Authentication → URL Configuration** imposta *Site URL* sull'indirizzo del sito.

Il promemoria email parte ogni giorno alle 08:00 UTC (`vercel.json → crons`).

## Account

- Titolare: creato con `npm run create-accounts` (legge `scripts/accounts.json`, che non va mai pubblicato).
- Dipendenti: si creano dal pannello titolare, scheda **Account Staff**.
