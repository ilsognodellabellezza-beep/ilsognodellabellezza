import React, { useMemo, useState } from 'react';
import { CheckCircle, MessageCircle, Undo2 } from 'lucide-react';
import { Appointment } from '../types';
import { addDays, toLocalDateStr } from '../lib/dates';
import { SALON_NAME, formatPhone, useSalon, whatsappUrl } from '../lib/salon';
import { setWhatsappReminderSent } from '../lib/storage';

/** Numero della cliente in formato internazionale per wa.me (default Italia). */
export function clientWhatsappNumber(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.length === 10 && d.startsWith('3')) d = `39${d}`; // cellulare italiano senza prefisso
  else if (d.length === 9 && d.startsWith('0')) d = `39${d}`;
  return d.length >= 9 && d.length <= 15 ? d : null;
}

const formatDay = (date: string) =>
  new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`));

export function reminderMessage(a: Appointment, salonPhone: string): string {
  const firstName = a.clientName.trim().split(/\s+/)[0] || '';
  return [
    `Ciao ${firstName}! 💕`,
    `Ti ricordiamo il tuo appuntamento di domani presso ${SALON_NAME}:`,
    `📅 ${formatDay(a.date)} alle ore ${a.time}`,
    `✨ ${a.serviceName} con ${a.operatorName}`,
    `📍 Via delle Viole, 7/9 - Catania`,
    ``,
    `Se hai bisogno di spostare o annullare, avvisaci almeno 4 ore prima rispondendo a questo messaggio o chiamando il ${salonPhone}.`,
    `A domani!`,
  ].join('\n');
}

/** Elenco degli appuntamenti di domani con un tasto per avvisare ogni cliente su WhatsApp. */
export const WhatsappReminders: React.FC<{ appointments: Appointment[] }> = ({ appointments }) => {
  const { contact } = useSalon();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tomorrow = toLocalDateStr(addDays(new Date(), 1));
  const list = useMemo(
    () =>
      appointments
        .filter((a) => a.date === tomorrow && a.status === 'confermato')
        .sort((x, y) => x.time.localeCompare(y.time)),
    [appointments, tomorrow]
  );
  const pending = list.filter((a) => !a.whatsappReminderSent).length;

  if (list.length === 0) return null;

  const mark = async (id: string, sent: boolean) => {
    setBusyId(id);
    setError(null);
    try {
      await setWhatsappReminderSent(id, sent);
    } catch (e) {
      const m = (e as Error).message || '';
      setError(
        /whatsapp_reminder_sent|schema cache/i.test(m)
          ? 'Esegui lo script supabase/09-titoli-dipendenti-prezzo-da.sql nel database (SQL Editor di Supabase).'
          : m
      );
    } finally {
      setBusyId(null);
    }
  };

  const send = (a: Appointment) => {
    const number = clientWhatsappNumber(a.clientPhone);
    if (!number) return;
    window.open(whatsappUrl(reminderMessage(a, formatPhone(contact.whatsapp)), number), '_blank', 'noopener');
    void mark(a.id, true);
  };

  return (
    <section className="bg-white border border-[#EEDFE1] rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-emerald-600" />
          <h3 className="font-serif text-base font-bold text-[#261F21]">Promemoria WhatsApp per domani</h3>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${pending ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {pending ? `${pending} da avvisare` : 'Tutte avvisate'}
        </span>
      </div>
      <p className="text-[11px] text-[#8F7D82]">
        Tocca “Avvisa” per aprire WhatsApp con il messaggio già pronto ({formatDay(tomorrow)}): devi solo premere invio. Il tasto passa a “Avvisata” appena lo usi.
      </p>
      <ul className="divide-y divide-[#F7EFEF]">
        {list.map((a) => {
          const number = clientWhatsappNumber(a.clientPhone);
          return (
            <li key={a.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <div className="font-bold text-[#261F21]">
                  {a.time} · {a.clientName}
                </div>
                <div className="text-[11px] text-[#736266]">
                  {a.serviceName} · {a.operatorName} · {a.clientPhone}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {a.whatsappReminderSent && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" /> Avvisata
                  </span>
                )}
                {!number ? (
                  <span className="text-[11px] text-red-700 font-semibold">Numero non valido</span>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => send(a)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold disabled:opacity-50 ${
                      a.whatsappReminderSent ? 'border border-[#DEC7CA] text-[#736266] bg-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {a.whatsappReminderSent ? 'Reinvia' : 'Avvisa'}
                  </button>
                )}
                {a.whatsappReminderSent && (
                  <button
                    type="button"
                    title="Segna come da avvisare"
                    disabled={busyId === a.id}
                    onClick={() => mark(a.id, false)}
                    className="p-1.5 text-[#8F7D82] hover:text-[#261F21] disabled:opacity-50"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-[11px] font-semibold text-red-700">{error}</p>}
    </section>
  );
};
