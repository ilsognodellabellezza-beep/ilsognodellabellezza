import React from 'react';
import { Check, MoreVertical, PlusSquare, Share, Smartphone } from 'lucide-react';
import { SALON_NAME } from '../lib/salon';
import { PageId } from '../types/navigation';

interface Props {
  onNavigate: (page: PageId) => void;
}

const Step: React.FC<{ n: number; icon: React.ReactNode; children: React.ReactNode }> = ({ n, icon, children }) => (
  <li className="flex items-start gap-3">
    <span className="w-7 h-7 shrink-0 rounded-full bg-[#261F21] text-[#D8B268] text-xs font-bold flex items-center justify-center">{n}</span>
    <span className="text-sm text-[#261F21] leading-relaxed pt-0.5">
      {children} <span className="inline-block align-middle text-[#AA853D]">{icon}</span>
    </span>
  </li>
);

/** Guida per aggiungere il sito alla schermata Home del telefono. Non è nel menu: si apre dal QR code. */
export const InstallAppPage: React.FC<Props> = ({ onNavigate }) => (
  <div className="py-10 lg:py-16 bg-[#FAF7F7] min-h-[80vh]">
    <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-8">
      <div className="text-center space-y-3">
        <span className="mx-auto w-14 h-14 rounded-2xl bg-[#261F21] text-[#D8B268] flex items-center justify-center">
          <Smartphone className="w-7 h-7" />
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#261F21]">Tieni {SALON_NAME} sul telefono</h1>
        <p className="text-sm text-[#55474A]">
          Non serve scaricare nulla dallo store: in pochi secondi aggiungi il sito alla schermata Home e lo apri come un’app, con la sua icona.
        </p>
      </div>

      <section className="bg-white border border-[#EEDFE1] rounded-3xl p-5 sm:p-6 space-y-4">
        <h2 className="font-serif text-xl font-bold text-[#261F21]">iPhone (Safari)</h2>
        <ol className="space-y-3">
          <Step n={1} icon={null}>Apri questa pagina con <strong>Safari</strong> (non da altre app).</Step>
          <Step n={2} icon={<Share className="w-4 h-4" />}>Tocca il pulsante <strong>Condividi</strong>, il quadrato con la freccia in basso.</Step>
          <Step n={3} icon={<PlusSquare className="w-4 h-4" />}>Scorri e scegli <strong>“Aggiungi alla schermata Home”</strong>.</Step>
          <Step n={4} icon={null}>Tocca <strong>Aggiungi</strong> in alto a destra: l’icona è sulla Home.</Step>
        </ol>
      </section>

      <section className="bg-white border border-[#EEDFE1] rounded-3xl p-5 sm:p-6 space-y-4">
        <h2 className="font-serif text-xl font-bold text-[#261F21]">Android (Chrome)</h2>
        <ol className="space-y-3">
          <Step n={1} icon={null}>Apri questa pagina con <strong>Chrome</strong>.</Step>
          <Step n={2} icon={<MoreVertical className="w-4 h-4" />}>Tocca i <strong>tre puntini</strong> in alto a destra.</Step>
          <Step n={3} icon={<PlusSquare className="w-4 h-4" />}>Scegli <strong>“Installa app”</strong> oppure <strong>“Aggiungi a schermata Home”</strong>.</Step>
          <Step n={4} icon={null}>Conferma con <strong>Installa</strong> o <strong>Aggiungi</strong>.</Step>
        </ol>
      </section>

      <p className="text-xs text-[#736266] flex items-start gap-2 justify-center text-center">
        <Check className="w-4 h-4 text-[#AA853D] shrink-0" />
        Si aggiorna da sola: vedrai sempre promo e orari più recenti.
      </p>

      <div className="text-center">
        <button onClick={() => onNavigate('prenota')} className="px-6 py-3 bg-[#261F21] text-[#FAF7F7] text-sm font-semibold rounded-xl">
          Prenota un appuntamento
        </button>
      </div>
    </div>
  </div>
);
