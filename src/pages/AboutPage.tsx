import React from 'react';
import {
  MapPin,
  Phone,
  Clock,
  Mail,
  Instagram,
  ExternalLink,
  MessageCircle,
  Award,
  Sparkles,
  Heart
} from 'lucide-react';
import { PageId } from '../types/navigation';
import { useSiteConfig, WEEKDAY_NAMES, WEEKDAY_ORDER } from '../lib/siteSettings';
import { useSalon, whatsappUrl, formatPhone, operatorPhotoUrl } from '../lib/salon';
import { OperatorAvatar } from '../components/ServicePhoto';

interface AboutPageProps {
  onNavigate: (page: PageId) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const { settings, operators } = useSiteConfig();
  const { contact } = useSalon();
  return (
    <div className="py-12 lg:py-16 bg-[#FAF7F7] min-h-screen space-y-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header di Pagina */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-[#AA853D] font-bold">
            La Nostra Storia & Identità
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#261F21]">
            Chiara & Melania
          </h1>
          <p className="text-sm sm:text-base text-[#55474A]">
            Passione, maestria artigianale e continua ricerca scientifica nel cuore di Catania.
          </p>
        </div>

        {/* Presentazione Principale */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-6 space-y-5">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#261F21]">
              Madre e Figlia: Due Generazioni di Bellezza
            </h2>
            <p className="text-sm sm:text-base text-[#55474A] leading-relaxed">
              <strong>Il Sogno della Bellezza</strong> nasce dal desiderio profondo di creare un luogo intimo
              e riservato, dove ogni donna possa riscoprire la propria armonia naturale.
              Guidato dall'intesa perfetta tra <strong>Melania</strong> (master lash & brow artist con oltre 15 anni di esperienza e docente di corsi professionali)
              e <strong>Chiara</strong> (esperta in protocolli d'estetica avanzata viso, dermocosmesi e tecnologie laser medicali),
              il centro è oggi un punto di riferimento indiscusso a Catania.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white border border-[#EEDFE1] space-y-1">
                <span className="text-xs font-bold text-[#AA853D]">Formazione Continua</span>
                <p className="text-xs text-[#55474A]">
                  Melania e Chiara tengono corsi professionali di laminazione ed extension per le future operatrici del settore.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#EEDFE1] space-y-1">
                <span className="text-xs font-bold text-[#AA853D]">Filosofia Su Misura</span>
                <p className="text-xs text-[#55474A]">
                  Nessun trattamento standard: check-up personalizzato prima di ogni percorso laser, viso o corpo.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onNavigate('prenota')}
                className="px-7 py-3.5 bg-[#261F21] text-[#FAF7F7] hover:bg-[#191415] text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-all hover:scale-[1.02]"
              >
                Prenota un Appuntamento con Loro
              </button>
            </div>
          </div>

          {/* Biglietto da Visita & Stile Grafico Ufficiale */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-[#FFFDFD] border border-[#EEDFE1] shadow-xl text-center space-y-6 relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-[#261F21] text-[#D8B268] flex items-center justify-center font-serif text-2xl font-bold mx-auto border-2 border-[#AA853D]/50 shadow-md">
                CM
              </div>

              <div>
                <span className="text-xs tracking-widest uppercase font-semibold text-[#AA853D] block">
                  Chiara e Melania
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#261F21] mt-1">
                  IL SOGNO DELLA BELLEZZA
                </h3>
                <div className="w-16 h-0.5 bg-[#D8B268] mx-auto mt-3" />
              </div>

              <div className="text-xs text-[#55474A] space-y-2 font-sans">
                <p className="font-bold text-sm text-[#261F21]">VIA DELLE VIOLE, 7/9 - CATANIA</p>
                <p className="font-medium">Tel: {formatPhone(contact.whatsapp)} · info@ilsognodellabellezza.it</p>
                <p className="text-[11px] text-[#8F7D82]">www.ilsognodellabellezza.it</p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <a
                  href={whatsappUrl(undefined, contact.whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-[#25D366] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-[#20ba59]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={`tel:+${contact.whatsapp}`}
                  className="px-4 py-2 bg-[#261F21] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:bg-[#191415]"
                >
                  <Phone className="w-4 h-4 text-[#D8B268]" />
                  <span>Chiama Salone</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Il nostro team */}
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#AA853D]">Le persone del salone</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#261F21]">Il nostro team</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {operators.map((op) => (
              <div key={op.id} className="bg-white rounded-3xl border border-[#EEDFE1] overflow-hidden text-center shadow-2xs">
                <div className="aspect-square bg-[#F7EFEF] flex items-center justify-center">
                  {operatorPhotoUrl(op.id) ? (
                    <img src={operatorPhotoUrl(op.id)!} alt={op.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  ) : (
                    <OperatorAvatar operatorId={op.id} name={op.name} className="w-24 h-24 text-3xl" />
                  )}
                </div>
                <div className="p-3 sm:p-4 space-y-0.5">
                  <h3 className="font-serif text-base sm:text-lg font-bold text-[#261F21]">{op.name}</h3>
                  <p className="text-xs font-semibold text-[#AA853D]">{op.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Informazioni Salone & Orari */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          
          <div className="bg-white p-8 rounded-3xl border border-[#EEDFE1] space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-[#AA853D]">
              <Clock className="w-5 h-5" />
              <h3 className="font-serif text-lg font-bold text-[#261F21]">
                Orari di Apertura Salone
              </h3>
            </div>

            <div className="text-xs sm:text-sm text-[#55474A] space-y-2.5">
              {WEEKDAY_ORDER.map((d) => {
                const h = settings.hours[d];
                return (
                  <div key={d} className="flex justify-between py-1 border-b border-[#FAF5F5] last:border-0">
                    <span>{WEEKDAY_NAMES[d]}:</span>
                    {h.open ? (
                      <strong className="text-[#261F21]">
                        {h.breakFrom && h.breakTo ? `${h.from} – ${h.breakFrom} / ${h.breakTo} – ${h.to}` : `${h.from} – ${h.to}`}
                      </strong>
                    ) : (
                      <span className="font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded">Chiuso</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#EEDFE1] space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-[#AA853D]">
              <MapPin className="w-5 h-5" />
              <h3 className="font-serif text-lg font-bold text-[#261F21]">
                Come Raggiungerci a Catania
              </h3>
            </div>

            <div className="text-xs sm:text-sm text-[#55474A] space-y-3">
              <p>
                Il centro estetico si trova in <strong>Via delle Viole, 7/9 (o 3/5) a Catania (CAP 95124)</strong>,
                in una zona residenziale facilmente raggiungibile sia dal centro che dalla tangenziale.
              </p>
              <p>
                Ampia facilità di sosta nelle vie adiacenti per garantire una visita in completo relax.
              </p>

              <div className="pt-2">
                <a
                  href="https://maps.google.com/?q=Via+delle+Viole+7+Catania"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FAF7F7] hover:bg-[#F7EFEF] border border-[#DEC7CA] rounded-xl text-xs font-semibold text-[#261F21] transition-colors"
                >
                  <span>Apri Indicazioni Stradali Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#AA853D]" />
                </a>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
