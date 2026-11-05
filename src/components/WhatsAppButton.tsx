import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useSalon, whatsappUrl, DEFAULT_WA_MESSAGE } from '../lib/salon';

/** Pulsante fisso "Scrivici su WhatsApp" su tutte le pagine del sito, con messaggio precompilato. */
export const WhatsAppButton: React.FC = () => {
  const { contact } = useSalon();
  return (
    <a
      href={whatsappUrl(DEFAULT_WA_MESSAGE, contact.whatsapp)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Scrivici su WhatsApp"
      className="fixed right-4 z-30 inline-flex items-center gap-2 pl-3.5 pr-3.5 sm:pr-5 h-12 rounded-full bg-[#25D366] text-white text-sm font-bold shadow-lg shadow-black/25 hover:bg-[#1EBE5A] active:scale-95 transition-all bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-6"
    >
      <MessageCircle className="w-6 h-6 shrink-0" />
      <span className="hidden sm:inline">Scrivici su WhatsApp</span>
    </a>
  );
};
