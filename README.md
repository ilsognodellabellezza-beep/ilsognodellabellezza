# Il Sogno della Bellezza

Sito e gestionale del centro estetico **Il Sogno della Bellezza** di Chiara e Melania, Via delle Viole 7/9, Catania.

- Sito pubblico: trattamenti con foto e ricerca, promozioni con scadenza automatica, team, recensioni, prenotazione online con disponibilità reale, pulsante WhatsApp
- Account clienti: registrazione, accesso, storico e annullamento prenotazioni
- Gestionale unico (un solo accesso, nessuna contabilità): agenda, clienti, promozioni, chiusure e aperture straordinarie, blocco appuntamenti, disponibilità del laser, foto, WhatsApp e QR code
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
5. `supabase/05-galleria.sql`
6. `supabase/06-gestione-sito.sql` (orari, prezzi e prenotazioni a lungo termine, modificabili dal gestionale)
7. `supabase/07-servizi-dipendenti.sql` (nuovi servizi e nuove dipendenti aggiunti dal gestionale)
8. `supabase/08-novita-sito-gestionale.sql` (account unico, promozioni, chiusure, blocchi, foto, laser, nuove categorie). **Prima di eseguirlo scarica i dati contabili** da Gestionale → Gestione sito → *Esporta archivio incassi*.

In **Authentication → Sign In / Providers → Email** disattiva *Confirm email* (a meno di configurare un SMTP personalizzato).

## Pubblicazione su Vercel

1. Importa il repository su Vercel (il framework Vite viene riconosciuto da `vercel.json`).
2. In **Settings → Environment Variables** aggiungi le variabili elencate in `.env.example`.
3. Dopo il primo deploy, in Supabase → **Authentication → URL Configuration** imposta *Site URL* sull'indirizzo del sito.

Il promemoria email parte ogni giorno alle 08:00 UTC (`vercel.json → crons`).

## Account

C'è un solo account di accesso al gestionale (nessun ruolo): si crea con `npm run create-accounts` (legge `scripts/accounts.json`, che non va mai pubblicato). Gli altri account vanno eliminati a mano dal database: le istruzioni sono in fondo a `supabase/08-novita-sito-gestionale.sql`.
