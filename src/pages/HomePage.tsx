import React from 'react';
import {
  Star,
  Sparkles,
  MapPin,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Zap,
  Heart,
  ChevronRight
} from 'lucide-react';
import { PageId } from '../types/navigation';
import { useSiteConfig, formatOpeningSummary } from '../lib/siteSettings';
import { useSalon, whatsappUrl, formatPhone } from '../lib/salon';
import { PromoCard } from './PromoPage';

interface HomePageProps {
  onNavigate: (page: PageId, serviceId?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { settings } = useSiteConfig();
  const { activePromotions, contact } = useSalon();
  return (
    <div className="space-y-16 lg:space-y-24 pb-16">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-12 lg:py-16 bg-radial from-[#FFFDFD] via-[#FAF5F5] to-[#F5ECEE] border-b border-[#EEDFE1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Colonna Testo */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Trust proof */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#736266]">
                <div className="flex items-center gap-1 text-[#C5A059]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#C5A059]" />
                  ))}
                </div>
                <span className="font-semibold text-[#261F21]">5.0 / 5</span>
                <span aria-hidden="true">·</span>
                <span>Oltre 170 recensioni verificate</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 text-[#736266]">
                  <MapPin className="w-3 h-3 text-[#AA853D]" />
                  Via delle Viole 7/9, Catania
                </span>
              </div>

              {/* Titolo Principale */}
              <div className="space-y-2">
                <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#261F21] leading-[1.15]">
                  Il Sogno della Bellezza
                </h1>
                <p className="font-serif italic text-xl sm:text-2xl text-[#AA853D]">
                  L’estetica avanzata di Chiara e Melania
                </p>
              </div>

              <p className="text-base sm:text-lg text-[#55474A] max-w-2xl leading-relaxed">
                Un'oasi di benessere su misura a Catania. Esperte in tecnologia laser a diodo
                <strong> EPILED 818NM</strong> indolore, laminazione ciglia signature, trattamenti viso
                avanzati e massaggi rigeneranti formulati esclusivamente per la donna.
              </p>

              {/* Pillole Punti di Forza */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div
                  onClick={() => onNavigate('trattamenti')}
                  className="p-3.5 rounded-xl bg-white/80 border border-[#EEDFE1] shadow-2xs hover:border-[#AA853D] cursor-pointer transition-colors"
                >
                  <span className="block text-xs font-bold text-[#AA853D]">Laser EPILED 818NM</span>
                  <span className="text-xs text-[#55474A]">Manipolo criogenico a -5°C</span>
                </div>

                <div
                  onClick={() => onNavigate('trattamenti')}
                  className="p-3.5 rounded-xl bg-white/80 border border-[#EEDFE1] shadow-2xs hover:border-[#AA853D] cursor-pointer transition-colors"
                >
                  <span className="block text-xs font-bold text-[#AA853D]">Master Lash & Brow</span>
                  <span className="text-xs text-[#55474A]">Ciglia & sopracciglia perfette</span>
                </div>

                <div
                  onClick={() => onNavigate('trattamenti')}
                  className="p-3.5 rounded-xl bg-white/80 border border-[#EEDFE1] shadow-2xs hover:border-[#AA853D] cursor-pointer transition-colors"
                >
                  <span className="block text-xs font-bold text-[#AA853D]">Massaggi Benessere</span>
                  <span className="text-xs text-[#55474A]">Riservati solo alle donne</span>
                </div>
              </div>

              {/* Bottoni Navigazione Primari */}
              <div className="flex flex-wrap items-center gap-4 pt-3">
                <button
                  onClick={() => onNavigate('prenota')}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#261F21] hover:bg-[#191415] text-[#FAF7F7] text-sm font-semibold rounded-lg shadow-md transition-all hover:scale-[1.02]"
                >
                  <Calendar className="w-4 h-4 text-[#D8B268]" />
                  <span>Prenota un Trattamento</span>
                </button>

                {activePromotions.length > 0 && (
                  <button
                    onClick={() => onNavigate('promo')}
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-white hover:bg-[#F7EFEF] border border-[#DEC7CA] text-[#261F21] text-sm font-medium rounded-lg shadow-2xs transition-colors hover:border-[#AA853D]"
                  >
                    <span>Scopri le Promo</span>
                    <span className="text-xs font-bold text-[#AA853D]">{activePromotions.length === 1 ? '1 attiva' : activePromotions.length + ' attive'}</span>
                  </button>
                )}
              </div>

              {/* Orari e Telefono Rapidi */}
              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-[#736266]">
                <span>⏰ {formatOpeningSummary(settings)}</span>
                <a href={`tel:+${contact.whatsapp}`} className="font-semibold text-[#261F21] hover:text-[#AA853D]">
                  📞 {formatPhone(contact.whatsapp)}
                </a>
              </div>

            </div>

            {/* Colonna Foto Ufficiale Chiara & Melania */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="relative w-full max-w-md lg:max-w-none">
                <div className="absolute -inset-2 bg-gradient-to-tr from-[#C5A059]/20 via-[#F7EFEF] to-[#C5A059]/30 rounded-2xl filter blur-xs" />
                <div className="relative overflow-hidden rounded-2xl bg-white border border-[#EEDFE1] shadow-xl">
                  <img
                    src="/assets/aistudio/WhatsApp_Image_2026-10-29_at_19.55.07__1__0a7db009.jpeg"
                    alt="Chiara e Melania del centro estetico Il Sogno della Bellezza a Catania"
                    className="w-full h-[450px] sm:h-[500px] object-cover object-top"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-[#191415]/90 via-[#191415]/60 to-transparent text-[#FAF7F7]">
                    <p className="font-serif font-bold text-base text-[#D8B268]">Chiara & Melania</p>
                    <p className="text-xs text-[#DEC7CA]">Fondatrici & Master del centro a Catania</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. PROMO ATTIVE (la sezione sparisce da sola quando non ce ne sono) */}
      {activePromotions.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#AA853D]">Offerte a tempo</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#261F21] mt-1">Promozioni in corso</h2>
            </div>
            <button onClick={() => onNavigate('promo')} className="text-sm font-semibold text-[#AA853D] hover:underline flex items-center gap-1">
              Vedi tutte <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...activePromotions]
              .sort((a, b) => a.endsOn.localeCompare(b.endsOn))
              .slice(0, 3)
              .map((p) => (
                <PromoCard key={p.id} promo={p} onNavigate={onNavigate} compact />
              ))}
          </div>
        </section>
      )}

      {/* 3. PERCORSI & SEZIONI DEL SALONE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[#AA853D]">
              Esplora i Trattamenti
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#261F21] mt-1">
              Menu Servizi Completo
            </h2>
          </div>
          <button
            onClick={() => onNavigate('trattamenti')}
            className="text-xs sm:text-sm font-semibold text-[#AA853D] hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Vedi Tutti i Trattamenti e Listino</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Sguardo e Ciglia */}
          <div
            onClick={() => onNavigate('trattamenti')}
            className="p-6 bg-white rounded-2xl border border-[#EEDFE1] shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-3"
          >
            <span className="text-[11px] font-semibold text-[#AA853D] uppercase tracking-wider">
              Signature Service
            </span>
            <h3 className="font-serif text-xl font-bold text-[#261F21] group-hover:text-[#AA853D] transition-colors">
              Laminazione Ciglia & Botox
            </h3>
            <p className="text-xs text-[#55474A] leading-relaxed">
              Il trattamento firma di Melania: curva, colora e nutre le ciglia naturali con cheratina pura.
              Effetto sguardo aperto e magnetico fino a 8 settimane.
            </p>
            <div className="pt-2 flex items-center justify-between text-xs font-semibold">
              <span className="text-[#261F21]">Da €49,00</span>
              <span className="text-[#AA853D] flex items-center gap-1">
                Scheda Trattamento <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 2: Massaggi (Solo Donna) */}
          <div
            onClick={() => onNavigate('trattamenti')}
            className="p-6 bg-white rounded-2xl border border-[#EEDFE1] shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-3"
          >
            <span className="text-[11px] font-bold text-[#8A3B49] bg-[#FAF0F2] px-2 py-0.5 rounded uppercase tracking-wider inline-block">
              Riservato Solo Donna
            </span>
            <h3 className="font-serif text-xl font-bold text-[#261F21] group-hover:text-[#AA853D] transition-colors">
              Massaggi Corpo & Drenanti
            </h3>
            <p className="text-xs text-[#55474A] leading-relaxed">
              Rituali linfodrenanti metodo Rigenera, decontratturanti con oli caldi e modellanti anticellulite.
              Eseguiti con la massima riservatezza per sole donne.
            </p>
            <div className="pt-2 flex items-center justify-between text-xs font-semibold">
              <span className="text-[#261F21]">Da €45,00</span>
              <span className="text-[#AA853D] flex items-center gap-1">
                Scheda Trattamento <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Card 3: Viso Avanzato & Glow */}
          <div
            onClick={() => onNavigate('trattamenti')}
            className="p-6 bg-white rounded-2xl border border-[#EEDFE1] shadow-2xs hover:shadow-md transition-all cursor-pointer group space-y-3"
          >
            <span className="text-[11px] font-semibold text-[#AA853D] uppercase tracking-wider">
              Estetica Avanzata
            </span>
            <h3 className="font-serif text-xl font-bold text-[#261F21] group-hover:text-[#AA853D] transition-colors">
              Pulizia Viso Idra-Glow Ultrasuoni
            </h3>
            <p className="text-xs text-[#55474A] leading-relaxed">
              Purificazione profonda indolore con spatola a ultrasuoni e sieri rigeneranti all'acido ialuronico.
              Pelle luminosa e idratata senza alcun segno post-trattamento.
            </p>
            <div className="pt-2 flex items-center justify-between text-xs font-semibold">
              <span className="text-[#261F21]">Da €50,00</span>
              <span className="text-[#AA853D] flex items-center gap-1">
                Scheda Trattamento <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SOCIAL PROOF & RECENSIONI (Porta alla pagina Recensioni) */}
      <section className="bg-[#FAF5F5] border-y border-[#EEDFE1] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-1 text-[#C5A059]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#C5A059]" />
              ))}
              <span className="font-bold text-sm text-[#261F21] ml-2">5.0 / 5</span>
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#261F21]">
              Oltre 170 recensioni verificate a Catania
            </h3>
            <p className="text-xs sm:text-sm text-[#55474A]">
              Leggi le testimonianze di chi ha provato i nostri trattamenti laser, ciglia e benessere.
            </p>
          </div>

          <button
            onClick={() => onNavigate('recensioni')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#261F21] hover:bg-[#191415] text-[#FAF7F7] text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors shrink-0"
          >
            <span>Leggi Tutte le Recensioni</span>
            <ArrowRight className="w-4 h-4 text-[#D8B268]" />
          </button>
        </div>
      </section>

      {/* 5. BIGLIETTO CONTATTI RAPIDO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 rounded-2xl bg-white border border-[#EEDFE1] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#AA853D]">
              Vieni a Trovarci
            </span>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#261F21]">
              Via delle Viole, 7/9 — 95124 Catania
            </h3>
            <p className="text-xs sm:text-sm text-[#55474A]">
              Orari: {formatOpeningSummary(settings)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('chi-siamo')}
              className="px-5 py-2.5 bg-[#FAF7F7] hover:bg-[#F7EFEF] border border-[#DEC7CA] text-xs font-semibold text-[#261F21] rounded-lg transition-colors"
            >
              Mappa & Chi Siamo
            </button>
            <a
              href={whatsappUrl(undefined, contact.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-[#25D366] text-white hover:bg-[#20ba59] text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>WhatsApp: {formatPhone(contact.whatsapp)}</span>
            </a>
          </div>
        </div>
      </section>

    </div>
  );
};
