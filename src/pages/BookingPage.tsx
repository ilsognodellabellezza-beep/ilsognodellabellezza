import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronRight,
  ArrowLeft,
  Phone,
  Mail,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Service, Operator, TreatmentCategory } from '../types';
import { OPERATORS } from '../data/mockData';
import { saveAppointment, getBookedSlotsRange, BookedSlot, SlotTakenError } from '../lib/storage';
import { toLocalDateStr, timeToMinutes, addDays } from '../lib/dates';
import { useSiteConfig, isOpenOn, slotsForDay, formatOpeningSummary } from '../lib/siteSettings';
import { useAuth } from '../lib/auth';
import { AddToCalendar } from '../components/AddToCalendar';
import { MonthCalendar } from '../components/MonthCalendar';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { PageId } from '../types/navigation';

interface BookingPageProps {
  preselectedServiceId?: string;
  onNavigate: (page: PageId) => void;
}

export const BookingPage: React.FC<BookingPageProps> = ({ preselectedServiceId, onNavigate }) => {
  const [step, setStepRaw] = useState<1 | 2 | 3 | 4 | 5>(1);
  const reduceMotion = useReducedMotion();
  const wizardRef = React.useRef<HTMLDivElement>(null);
  const advanceTimer = React.useRef<number | undefined>(undefined);

  const setStep = (next: 1 | 2 | 3 | 4 | 5) => {
    window.clearTimeout(advanceTimer.current);
    setStepRaw(next);
    const top = wizardRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0 || top > window.innerHeight * 0.5) {
      wizardRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  // Dopo una scelta passa da solo al passo successivo (piccola pausa per vedere la selezione)
  const advanceTo = (next: 2 | 3 | 4) => {
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => setStep(next), 320);
  };

  React.useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  // Cliente registrata: dati precompilati
  const { customer } = useAuth();

  // Orari di apertura e prezzi impostati dal titolare nel gestionale
  const { settings, services: SERVICES } = useSiteConfig();

  // Form states
  // Si memorizza l'id: il servizio mostrato segue sempre prezzi e durate aggiornati
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const selectedService = useMemo(
    () => SERVICES.find((s) => s.id === selectedServiceId) ?? null,
    [SERVICES, selectedServiceId]
  );
  const setSelectedService = (s: Service | null) => setSelectedServiceId(s?.id ?? null);
  const [selectedOperator, setSelectedOperator] = useState<Operator | 'any'>('any');
  const [operatorFilterType, setOperatorFilterType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  // Più giorni: per ogni giorno scelto si memorizza l'orario (data -> ora)
  const [picks, setPicks] = useState<Record<string, string>>({});
  const selectedTime = picks[selectedDate] ?? '';
  const pickedList = Object.entries(picks).sort(([a], [b]) => a.localeCompare(b));
  const fmtDay = (d: string) =>
    new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${d}T12:00:00`));
  
  // Client details
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [acknowledgedWomenOnly, setAcknowledgedWomenOnly] = useState(false);

  // Search & Filter for Services
  const [serviceCategory, setServiceCategory] = useState<TreatmentCategory | 'all'>('all');
  const [serviceSearch, setServiceSearch] = useState('');

  // Confirmed booking state
  const [confirmedBookings, setConfirmedBookings] = useState<{ code: string; date: string; time: string; operatorName: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Orari occupati per ogni giorno mostrato (dal database, senza dati personali)
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, BookedSlot[]>>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsVersion, setSlotsVersion] = useState(0);

  useEffect(() => {
    if (customer) {
      setClientName((v) => v || customer.fullName);
      setClientPhone((v) => v || customer.phone);
      setClientEmail((v) => v || customer.email);
    }
  }, [customer]);

  // Handle preselected service
  useEffect(() => {
    if (preselectedServiceId) {
      setSelectedServiceId(preselectedServiceId);
    }
  }, [preselectedServiceId]);

  // Si può prenotare da domani fino a "anticipo massimo" giorni (impostabile dal titolare, di base 6 mesi)
  const minDate = useMemo(() => toLocalDateStr(addDays(new Date(), 1)), []);
  const maxDate = useMemo(() => toLocalDateStr(addDays(new Date(), settings.maxAdvanceDays)), [settings.maxAdvanceDays]);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const t = addDays(new Date(), 1);
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  // Carica la disponibilità del mese mostrato (un solo viaggio al database per mese)
  useEffect(() => {
    let active = true;
    const first = toLocalDateStr(visibleMonth);
    const last = toLocalDateStr(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0));
    const from = first < minDate ? minDate : first;
    if (from > last) return;
    setSlotsLoading(true);
    setSlotsError(null);
    getBookedSlotsRange(from, last)
      .then((byDay) => {
        if (!active) return;
        // anche i giorni senza prenotazioni risultano "caricati"
        const filled: Record<string, BookedSlot[]> = {};
        for (let d = new Date(`${from}T12:00:00`); toLocalDateStr(d) <= last; d.setDate(d.getDate() + 1)) {
          filled[toLocalDateStr(d)] = byDay[toLocalDateStr(d)] ?? [];
        }
        setBookingsByDate((prev) => ({ ...prev, ...filled }));
      })
      .catch(() => active && setSlotsError('Impossibile verificare la disponibilità. Riprova o chiamaci al 345 393 8087.'))
      .finally(() => active && setSlotsLoading(false));
    return () => {
      active = false;
    };
  }, [visibleMonth, minDate, slotsVersion]);

  // Operatrici abilitate al servizio scelto
  const qualifiedOperators = useMemo(() => {
    if (!selectedService) return OPERATORS;
    const q = OPERATORS.filter((op) => selectedService.operatorTypes.includes(op.type));
    return q.length > 0 ? q : OPERATORS;
  }, [selectedService]);

  const isOperatorFree = (bookings: BookedSlot[], operatorId: string, time: string, duration: number) => {
    const start = timeToMinutes(time);
    const end = start + duration;
    return !bookings.some((b) => {
      if (b.operatorId !== operatorId) return false;
      const bStart = timeToMinutes(b.startTime);
      return bStart < end && start < bStart + b.durationMinutes;
    });
  };

  // Fasce di un giorno: il servizio deve finire entro la chiusura (es. chiusura 18:30 → un'ora al massimo alle 17:30)
  // e l'operatrice scelta (o almeno una abilitata) deve essere libera per tutta la durata
  const slotsForDate = (date: string) => {
    const bookings = bookingsByDate[date] ?? [];
    const duration = selectedService?.durationMinutes ?? 30;
    const candidates = selectedOperator === 'any' ? qualifiedOperators : [selectedOperator];
    return slotsForDay(settings, date, duration).map((time) => ({
      time,
      isAvailable: candidates.some((op) => isOperatorFree(bookings, op.id, time, duration)),
    }));
  };

  // Stato di un giorno: libero (verde) se c'è almeno una fascia disponibile, altrimenti occupato (rosso)
  const getDateStatus = (dateStr: string): 'libero' | 'occupato' | undefined => {
    if (!(dateStr in bookingsByDate)) return undefined;
    return slotsForDate(dateStr).some((sl) => sl.isAvailable) ? 'libero' : 'occupato';
  };

  const availableSlots = useMemo(() => {
    if (!selectedDate || !(selectedDate in bookingsByDate)) return [];
    return slotsForDate(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedOperator, selectedService, bookingsByDate, settings, qualifiedOperators]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return SERVICES.filter((s) => {
      const matchesCategory = serviceCategory === 'all' || s.category === serviceCategory;
      const matchesSearch =
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.description.toLowerCase().includes(serviceSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [serviceCategory, serviceSearch]);

  // Filtered operators
  const filteredOperators = useMemo(() => {
    if (operatorFilterType === 'all') return OPERATORS;
    return OPERATORS.filter((op) => op.type === operatorFilterType);
  }, [operatorFilterType]);

  const handleConfirmBooking = async () => {
    if (!selectedService || pickedList.length === 0 || !clientName || !clientPhone || !clientEmail || submitting) {
      return;
    }

    if (selectedService.onlyWomen && !acknowledgedWomenOnly) {
      setBookingError('Per confermare questo massaggio, è necessario confermare che il trattamento è per una cliente donna.');
      return;
    }

    const duration = selectedService.durationMinutes;
    const price = selectedService.promoPrice || selectedService.price;

    setSubmitting(true);
    setBookingError(null);
    const done: { code: string; date: string; time: string; operatorName: string }[] = [];
    try {
      for (const [date, time] of pickedList) {
        const assignedOperator =
          selectedOperator !== 'any'
            ? selectedOperator
            : qualifiedOperators.find((op) => isOperatorFree(bookingsByDate[date] ?? [], op.id, time, duration)) ?? qualifiedOperators[0];
        try {
          const newApp = await saveAppointment({
            clientName: clientName.trim(),
            clientPhone: clientPhone.trim(),
            clientEmail: clientEmail.trim(),
            serviceId: selectedService.id,
            serviceName: selectedService.name,
            servicePrice: price,
            operatorId: assignedOperator.id,
            operatorName: assignedOperator.name,
            date,
            time,
            durationMinutes: duration,
            notes: clientNotes,
          });
          done.push({ code: newApp.code, date, time, operatorName: assignedOperator.name });
        } catch (err) {
          // le date già registrate restano valide: si tolgono dalla scelta
          if (done.length > 0) {
            setPicks((prev) => {
              const next = { ...prev };
              done.forEach((d) => delete next[d.date]);
              return next;
            });
          }
          if (err instanceof SlotTakenError) {
            setBookingError(
              (done.length > 0 ? `Registrate ${done.length} prenotazioni su ${pickedList.length} (codici: ${done.map((d) => d.code).join(', ')}). ` : '') +
                `L'orario del ${fmtDay(date)} alle ${time} è stato appena occupato: scegline un altro.`
            );
            setPicks((prev) => {
              const next = { ...prev };
              delete next[date];
              return next;
            });
            setSlotsVersion((v) => v + 1);
            setStep(3);
          } else {
            setBookingError(
              (done.length > 0 ? `Registrate ${done.length} prenotazioni su ${pickedList.length} (codici: ${done.map((d) => d.code).join(', ')}). ` : '') +
                'Non siamo riusciti a registrare le altre. Riprova o chiamaci al 345 393 8087.'
            );
          }
          return;
        }
      }
      setConfirmedBookings(done);
      setStep(5);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedOperator('any');
    setSelectedDate('');
    setPicks({});
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setClientNotes('');
    setAcknowledgedWomenOnly(false);
    setConfirmedBookings([]);
  };

  return (
    <div className="py-10 lg:py-16 bg-[#FAF7F7] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header di Pagina */}
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#AA853D] font-bold">
            Prenotazione Online
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#261F21]">
            Prenota il tuo Trattamento Online
          </h1>
          <p className="text-xs sm:text-sm text-[#55474A] max-w-xl mx-auto">
            Scegli il servizio, l'operatrice preferita, data e ora.
            Conferma immediata, nessun pagamento anticipato e un promemoria via email il giorno prima.
          </p>
        </div>

        {/* Wizard Container a Pagina Intera */}
        <div ref={wizardRef} className="scroll-mt-24 bg-white border border-[#EEDFE1] rounded-3xl shadow-xl overflow-hidden flex flex-col">
          
          {/* Passaggi della prenotazione */}
          {step < 5 && (
            <div className="bg-[#FAF5F5] border-b border-[#EEDFE1] px-4 sm:px-8 py-4">
              <div className="flex items-center justify-between max-w-xl mx-auto text-xs sm:text-sm font-semibold">
                
                <button
                  onClick={() => setStep(1)}
                  className={`flex items-center gap-2 ${
                    step === 1 ? 'text-[#AA853D] font-bold' : step > 1 ? 'text-[#261F21]' : 'text-[#8F7D82]'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step === 1 ? 'bg-[#261F21] text-[#D8B268]' : step > 1 ? 'bg-[#EEDFE1] text-[#261F21]' : 'bg-gray-200 text-gray-500'
                  }`}>
                    1
                  </span>
                  <span>1. Servizio</span>
                </button>

                <ChevronRight className="w-4 h-4 text-[#DEC7CA]" />

                <button
                  onClick={() => selectedService && setStep(2)}
                  disabled={!selectedService}
                  className={`flex items-center gap-2 ${
                    step === 2 ? 'text-[#AA853D] font-bold' : step > 2 ? 'text-[#261F21]' : 'text-[#8F7D82]'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step === 2 ? 'bg-[#261F21] text-[#D8B268]' : step > 2 ? 'bg-[#EEDFE1] text-[#261F21]' : 'bg-gray-200 text-gray-500'
                  }`}>
                    2
                  </span>
                  <span>2. Operatrice</span>
                </button>

                <ChevronRight className="w-4 h-4 text-[#DEC7CA]" />

                <button
                  onClick={() => selectedService && setStep(3)}
                  disabled={!selectedService}
                  className={`flex items-center gap-2 ${
                    step === 3 ? 'text-[#AA853D] font-bold' : step > 3 ? 'text-[#261F21]' : 'text-[#8F7D82]'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step === 3 ? 'bg-[#261F21] text-[#D8B268]' : step > 3 ? 'bg-[#EEDFE1] text-[#261F21]' : 'bg-gray-200 text-gray-500'
                  }`}>
                    3
                  </span>
                  <span>3. Data e Ora</span>
                </button>

                <ChevronRight className="w-4 h-4 text-[#DEC7CA]" />

                <button
                  onClick={() => selectedService && pickedList.length > 0 && setStep(4)}
                  disabled={!selectedService || pickedList.length === 0}
                  className={`flex items-center gap-2 ${
                    step === 4 ? 'text-[#AA853D] font-bold' : 'text-[#8F7D82]'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step === 4 ? 'bg-[#261F21] text-[#D8B268]' : 'bg-gray-200 text-gray-500'
                  }`}>
                    4
                  </span>
                  <span>4. Dati</span>
                </button>

              </div>
            </div>
          )}

          {/* Contenuto Dinamico per Step */}
          <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            className="p-6 sm:p-10"
            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            
            {/* STEP 1: SCELTA TRATTAMENTO */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#261F21]">
                    Seleziona il Trattamento Desiderato
                  </h3>
                  <p className="text-xs text-[#55474A]">
                    Scegli tra epilazione laser a diodo, massaggi donna, cura dello sguardo, viso o mani.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#8F7D82] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Cerca servizio (es. Laser, Massaggio, Ciglia, Viso)..."
                      className="w-full pl-9.5 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5 p-1 bg-[#FAF5F5] rounded-xl text-xs">
                    {[
                      { id: 'all', label: 'Tutti i Servizi' },
                      { id: 'laser', label: 'Laser EPILED 818NM' },
                      { id: 'massaggi', label: 'Massaggi (Solo Donna)' },
                      { id: 'sguardo', label: 'Ciglia & Sopracciglia' },
                      { id: 'viso', label: 'Viso Avanzato' },
                      { id: 'mani-piedi', label: 'Mani & Piedi' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setServiceCategory(cat.id as any)}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          serviceCategory === cat.id
                            ? 'bg-[#261F21] text-[#D8B268] shadow-xs'
                            : 'text-[#55474A] hover:text-[#261F21]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[440px] overflow-y-auto pr-1">
                  {filteredServices.map((service) => {
                    const isSelected = selectedService?.id === service.id;

                    return (
                      <div
                        key={service.id}
                        onClick={() => {
                          setSelectedService(service);
                          setPicks({});
                          advanceTo(2);
                        }}
                        className={`p-4 sm:p-5 rounded-2xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#FCF8F8] border-[#AA853D] shadow-md ring-1 ring-[#AA853D]'
                            : 'bg-white hover:bg-[#FAF7F7] border-[#EEDFE1]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-semibold text-[#AA853D] uppercase tracking-wide">
                                {service.categoryLabel}
                              </span>
                              {service.onlyWomen && (
                                <span className="text-[10px] font-bold text-[#8A3B49] bg-[#FAF0F2] px-2 py-0.5 rounded">
                                  Riservato Solo Donna
                                </span>
                              )}
                              {service.isPopular && !service.onlyWomen && (
                                <span className="text-[10px] font-semibold text-[#191415] bg-[#D8B268] px-2 py-0.5 rounded">
                                  Più Richiesto
                                </span>
                              )}
                            </div>
                            <h4 className="font-serif font-bold text-base text-[#261F21]">
                              {service.name}
                            </h4>
                            <p className="text-xs text-[#55474A] line-clamp-2">
                              {service.description}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            {service.promoPrice ? (
                              <div>
                                <span className="text-lg font-serif font-bold text-[#AA853D]">
                                  €{service.promoPrice.toFixed(2)}
                                </span>
                                <span className="block text-xs text-[#8F7D82] line-through">
                                  €{service.price.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-lg font-serif font-bold text-[#261F21]">
                                €{service.price.toFixed(2)}
                              </span>
                            )}
                            <span className="block text-[11px] text-[#8F7D82] mt-0.5">
                              {service.durationMinutes} min
                            </span>
                          </div>
                        </div>

                        {service.onlyWomen && isSelected && (
                          <div className="mt-3 p-3 rounded-xl bg-[#FAF0F2] border border-[#DEC7CA] text-xs text-[#5C242E] flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-[#8A3B49] shrink-0 mt-0.5" />
                            <span>
                              <strong>Specifica Massaggi Salone:</strong> Questo trattamento corpo viene eseguito
                              da operatrici qualificate ed è dedicato unicamente al pubblico femminile.
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-[11px] text-center text-[#8F7D82]">Tocca un trattamento per continuare.</p>
              </div>
            )}

            {/* STEP 2: SCELTA OPERATORE */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#261F21]">
                      Scegli l’Operatrice di Riferimento
                    </h3>
                    <p className="text-xs text-[#55474A]">
                      Filtra per tipologia di operatore o seleziona la tua estetista di fiducia.
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-[#736266] hover:text-[#261F21] flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Cambia Servizio
                  </button>
                </div>

                {/* Filtro per Tipologia di Operatore */}
                <div className="p-4 bg-[#FAF5F5] rounded-2xl space-y-2">
                  <span className="text-[11px] font-semibold text-[#736266] uppercase tracking-wider block">
                    Filtra disponibilità per specializzazione:
                  </span>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[
                      { id: 'all', label: 'Tutte le Specialiste' },
                      { id: 'titolare', label: 'Titolare (Chiara)' },
                      { id: 'lash-master', label: 'Master Ciglia/Sopracciglia (Melania)' },
                      { id: 'laser-specialist', label: 'Laser & Body Therapist (Alessia)' },
                    ].map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setOperatorFilterType(filter.id)}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          operatorFilterType === filter.id
                            ? 'bg-[#261F21] text-[#D8B268]'
                            : 'bg-white text-[#55474A] hover:text-[#261F21]'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opzione: Prima operatrice disponibile */}
                <div
                  onClick={() => {
                    setSelectedOperator('any');
                    setPicks({});
                    advanceTo(3);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedOperator === 'any'
                      ? 'bg-[#FCF8F8] border-[#AA853D] ring-1 ring-[#AA853D]'
                      : 'bg-white hover:bg-[#FAF7F7] border-[#EEDFE1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#FAF0F2] text-[#AA853D] flex items-center justify-center font-bold">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-[#261F21]">
                          Prima Operatrice Disponibile
                        </h4>
                        <p className="text-xs text-[#55474A]">
                          Ti assegniamo la prima operatrice libera per il trattamento scelto.
                        </p>
                      </div>
                    </div>
                    {selectedOperator === 'any' && (
                      <CheckCircle2 className="w-5 h-5 text-[#AA853D]" />
                    )}
                  </div>
                </div>

                {/* Lista Operatrici Filtrate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredOperators.map((op) => {
                    const isSelected = selectedOperator !== 'any' && selectedOperator.id === op.id;

                    return (
                      <div
                        key={op.id}
                        onClick={() => {
                          setSelectedOperator(op);
                          setPicks({});
                          advanceTo(3);
                        }}
                        className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#FCF8F8] border-[#AA853D] shadow-md ring-1 ring-[#AA853D]'
                            : 'bg-white hover:bg-[#FAF7F7] border-[#EEDFE1]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="w-11 h-11 rounded-full bg-[#261F21] text-[#D8B268] flex items-center justify-center font-serif font-bold text-base border border-[#AA853D]/40">
                            {op.name.substring(0, 2).toUpperCase()}
                          </div>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-[#AA853D]" />}
                        </div>
                        <div className="mt-3 space-y-1">
                          <h4 className="font-serif font-bold text-base text-[#261F21]">
                            {op.name}
                          </h4>
                          <p className="text-xs font-semibold text-[#AA853D]">{op.role}</p>
                          <p className="text-xs text-[#55474A]">{op.specialization}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-xs font-medium text-[#55474A] hover:text-[#261F21]"
                  >
                    Indietro
                  </button>
                  <span className="text-[11px] text-[#8F7D82]">Scegli un'operatrice per continuare</span>
                </div>
              </div>
            )}

            {/* STEP 3: DATA E ORA */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#261F21]">
                      Seleziona Data e Orario
                    </h3>
                    <p className="text-xs text-[#55474A]">
                      Orari: {formatOpeningSummary(settings)}. Puoi prenotare qualsiasi giorno futuro, anche tra qualche mese, e scegliere più giorni insieme.
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="text-xs text-[#736266] hover:text-[#261F21] flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Cambia Operatrice
                  </button>
                </div>

                {/* Selezione Giorni: calendario mensile, qualsiasi giorno futuro */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-[#261F21] block">
                      Scegli uno o più giorni, anche tra mesi (tocca per aggiungere):
                    </label>
                    <div className="flex items-center gap-3 text-[11px] text-[#55474A]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-emerald-400 border border-emerald-600" /> Libero
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-400 border border-red-600" /> Occupato
                      </span>
                    </div>
                  </div>
                  {slotsError && (
                    <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                      {slotsError}
                    </p>
                  )}
                  <MonthCalendar
                    month={visibleMonth}
                    onMonthChange={setVisibleMonth}
                    minDate={minDate}
                    maxDate={maxDate}
                    isOpenDay={(d) => isOpenOn(settings, d)}
                    getStatus={getDateStatus}
                    picks={picks}
                    selectedDate={selectedDate}
                    onSelect={(dateStr) => {
                      if (selectedDate === dateStr && picks[dateStr]) {
                        // secondo tocco su un giorno già scelto: lo toglie
                        setPicks((prev) => {
                          const next = { ...prev };
                          delete next[dateStr];
                          return next;
                        });
                        setSelectedDate('');
                      } else {
                        setSelectedDate(dateStr);
                      }
                    }}
                  />
                  {slotsLoading && <p className="text-[11px] text-[#8F7D82]">Verifica disponibilità in corso…</p>}
                </div>

                {/* Selezione Slot Orario */}
                {selectedDate ? (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#261F21]">
                        Fasce orarie per {fmtDay(selectedDate)}:
                      </label>
                      <span className="text-[11px] text-[#8F7D82]">
                        Durata servizio: {selectedService?.durationMinutes} min
                      </span>
                    </div>

                    {slotsLoading && (
                      <p className="text-xs text-[#8F7D82]">Verifica disponibilità in corso…</p>
                    )}
                    {bookingError && step === 3 && (
                      <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                        {bookingError}
                      </p>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                      {availableSlots.map(({ time, isAvailable }) => {
                        const isSelected = selectedTime === time;

                        return (
                          <button
                            key={time}
                            disabled={!isAvailable}
                            onClick={() => setPicks((prev) => ({ ...prev, [selectedDate]: time }))}
                            aria-label={`${time} ${isAvailable ? 'libero' : 'occupato'}`}
                            className={`py-2.5 px-3 text-xs font-mono font-semibold rounded-xl border-2 transition-all ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                                : isAvailable
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-600 border-red-300 cursor-not-allowed line-through'
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-[#8F7D82] bg-[#FAF5F5] rounded-2xl border border-dashed border-[#DEC7CA]">
                    Seleziona una data per visualizzare gli orari disponibili.
                  </div>
                )}

                {pickedList.length > 0 && (
                  <div className="p-4 rounded-2xl bg-[#FCF8F8] border border-[#EEDFE1] space-y-2">
                    <p className="text-xs font-semibold text-[#261F21]">
                      Giorni scelti ({pickedList.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pickedList.map(([d, t]) => (
                        <span key={d} className="inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-full bg-white border border-[#DEC7CA] text-xs font-semibold text-[#261F21] capitalize">
                          {fmtDay(d)} · {t}
                          <button
                            type="button"
                            aria-label={`Togli ${fmtDay(d)}`}
                            onClick={() =>
                              setPicks((prev) => {
                                const next = { ...prev };
                                delete next[d];
                                return next;
                              })
                            }
                            className="w-7 h-7 rounded-full bg-[#F7EFEF] text-[#736266] flex items-center justify-center"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    {pickedList.length > 0 && (
                      <p className="text-[11px] text-[#8F7D82]">Puoi toccare altri giorni per prenotare più appuntamenti insieme.</p>
                    )}
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-xs font-medium text-[#55474A] hover:text-[#261F21]"
                  >
                    Indietro
                  </button>
                  <button
                    disabled={pickedList.length === 0}
                    onClick={() => setStep(4)}
                    className="px-6 py-3 bg-[#261F21] text-[#FAF7F7] disabled:opacity-40 text-xs sm:text-sm font-semibold rounded-xl shadow-md"
                  >
                    {pickedList.length > 1 ? `Continua con ${pickedList.length} giorni` : 'Continua'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: DATI CLIENTE E CERCA CLIENTI */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#261F21]">
                      Riepilogo e Dati di Contatto
                    </h3>
                    <p className="text-xs text-[#55474A]">
                      Ti invieremo un promemoria via email il giorno prima del tuo appuntamento.
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(3)}
                    className="text-xs text-[#736266] hover:text-[#261F21] flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Cambia Orario
                  </button>
                </div>

                {/* Box Riepilogo Trattamento */}
                <div className="p-5 rounded-2xl bg-[#FCF8F8] border border-[#EEDFE1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#AA853D] uppercase tracking-wider">
                      {selectedService?.categoryLabel}
                    </span>
                    <span className="font-serif font-bold text-lg text-[#261F21]">
                      €{(selectedService?.promoPrice || selectedService?.price)?.toFixed(2)}
                    </span>
                  </div>
                  <h4 className="font-serif font-bold text-base text-[#261F21]">
                    {selectedService?.name}
                  </h4>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#55474A] pt-1">
                    {pickedList.map(([d, t]) => (
                      <span key={d} className="capitalize">📅 <strong>{fmtDay(d)}</strong> · ⏰ <strong>{t}</strong></span>
                    ))}
                    <span>
                      👤 Operatrice:{' '}
                      <strong>
                        {selectedOperator === 'any' ? 'Assegnata dal salone' : selectedOperator.name}
                      </strong>
                    </span>
                  </div>
                </div>

                {!customer && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF5F5] border border-[#EEDFE1] text-xs text-[#55474A] flex flex-wrap items-center justify-between gap-2">
                    <span>Hai un account? Accedi e i tuoi dati si compilano da soli.</span>
                    <button
                      type="button"
                      onClick={() => onNavigate('account')}
                      className="font-semibold text-[#AA853D] hover:underline"
                    >
                      Accedi o registrati
                    </button>
                  </div>
                )}

                {/* Form Dati Cliente */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#261F21]">Nome e Cognome *</label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Es. Roberta Scaccianoce"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#261F21]">Telefono Cellulare *</label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Es. 345 393 8087"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-[#261F21]">
                      Indirizzo Email (per il promemoria del giorno prima) *
                    </label>
                    <input
                      type="email"
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="Es. nome@gmail.com"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-[#261F21]">
                      Note o preferenze particolari (opzionale)
                    </label>
                    <textarea
                      rows={2}
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      placeholder="Segnala eventuali allergie a cosmetici o richieste particolari..."
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                    />
                  </div>
                </div>

                {/* Consenso Obbligatorio se Massaggio (Solo Donna) */}
                {selectedService?.onlyWomen && (
                  <div className="p-4 rounded-2xl bg-[#FAF0F2] border border-[#DEC7CA] space-y-2">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="women-only-booking-page"
                        checked={acknowledgedWomenOnly}
                        onChange={(e) => setAcknowledgedWomenOnly(e.target.checked)}
                        className="mt-1 w-4 h-4 text-[#8A3B49] rounded border-gray-300 focus:ring-[#8A3B49]"
                      />
                      <label htmlFor="women-only-booking-page" className="text-xs text-[#5C242E] leading-relaxed cursor-pointer">
                        <strong>Dichiarazione Policy Centro:</strong> Confermo che la cliente beneficiaria del massaggio è di sesso femminile.
                        Prendo atto che il servizio massaggi de <em>Il Sogno della Bellezza</em> a Catania è riservato esclusivamente al pubblico femminile.
                      </label>
                    </div>
                  </div>
                )}

                {bookingError && (
                  <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                    {bookingError}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => setStep(3)}
                    className="px-4 py-2 text-xs font-medium text-[#55474A] hover:text-[#261F21]"
                  >
                    Indietro
                  </button>
                  <button
                    disabled={
                      submitting ||
                      !clientName ||
                      !clientPhone ||
                      !clientEmail ||
                      (selectedService?.onlyWomen && !acknowledgedWomenOnly)
                    }
                    onClick={handleConfirmBooking}
                    className="px-8 py-3.5 bg-[#261F21] text-[#FAF7F7] disabled:opacity-50 hover:bg-[#191415] text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-all hover:scale-[1.01] flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#D8B268]" />
                    <span>{submitting ? 'Invio in corso…' : pickedList.length > 1 ? `Conferma ${pickedList.length} prenotazioni` : 'Conferma Prenotazione'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: CONFERMA RICEVUTA */}
            {step === 5 && (
              <div className="text-center py-8 space-y-6">
                <div className="w-16 h-16 rounded-full bg-[#FAF0F2] text-[#AA853D] flex items-center justify-center mx-auto border border-[#DEC7CA]">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#AA853D]">
                    {confirmedBookings.length > 1 ? 'Codici' : 'Codice'} Prenotazione: {confirmedBookings.map((b) => b.code).join(' · ')}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#261F21]">
                    {confirmedBookings.length > 1 ? `${confirmedBookings.length} Appuntamenti Confermati!` : 'Appuntamento Confermato con Successo!'}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#55474A] max-w-md mx-auto">
                    Grazie {clientName}, ti aspettiamo in <strong>Via delle Viole, 7/9 a Catania</strong>.
                  </p>
                </div>

                <div className="max-w-md mx-auto p-5 bg-[#FAF7F7] border border-[#EEDFE1] rounded-2xl text-left space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-[#F7EFEF] pb-2">
                    <span className="text-[#8F7D82]">Trattamento:</span>
                    <span className="font-bold text-[#261F21]">{selectedService?.name}</span>
                  </div>
                  {confirmedBookings.map((b) => (
                    <div key={b.code} className="flex justify-between gap-3 border-b border-[#F7EFEF] pb-2">
                      <span className="font-bold text-[#261F21] capitalize">
                        {new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${b.date}T12:00:00`))}{' '}
                        ore {b.time}
                      </span>
                      <span className="font-bold text-[#AA853D] text-right">{b.operatorName}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1">
                    <span className="text-[#8F7D82]">Importo da saldare in salone{confirmedBookings.length > 1 ? ' (totale)' : ''}:</span>
                    <span className="font-serif font-bold text-sm text-[#261F21]">
                      €{(((selectedService?.promoPrice || selectedService?.price) ?? 0) * confirmedBookings.length).toFixed(2)}
                    </span>
                  </div>
                </div>

                {selectedService && (
                  <div className="space-y-2">
                    {confirmedBookings.map((b) => (
                      <AddToCalendar
                        key={b.code}
                        title={`${selectedService.name} – Il Sogno della Bellezza`}
                        date={b.date}
                        time={b.time}
                        durationMinutes={selectedService.durationMinutes}
                        description={`Codice prenotazione: ${b.code}\nOperatrice: ${b.operatorName}\nPer modifiche: 345 393 8087`}
                      />
                    ))}
                  </div>
                )}

                <div className="max-w-md mx-auto p-3.5 bg-[#FAF0F2] rounded-xl text-xs text-[#5C242E] flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4 text-[#8A3B49]" />
                  <span>
                    Il giorno prima di ogni appuntamento riceverai un promemoria su <strong>{clientEmail}</strong>.
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                  <button
                    onClick={() => {
                      resetForm();
                      onNavigate('home');
                    }}
                    className="px-6 py-2.5 bg-[#261F21] text-[#FAF7F7] hover:bg-[#191415] text-xs font-semibold rounded-xl shadow-xs transition-colors"
                  >
                    Torna alla Home
                  </button>
                </div>
              </div>
            )}

          </motion.div>
          </AnimatePresence>

        </div>

      </div>
    </div>
  );
};
