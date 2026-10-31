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
  X,
  Phone,
  Mail,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Service, Operator, TreatmentCategory, Client } from '../types';
import { SERVICES, OPERATORS } from '../data/mockData';
import { saveAppointment, getStoredAppointments, searchClients } from '../lib/storage';

interface BookingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedServiceId?: string;
  onBookingSuccess?: () => void;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({
  isOpen,
  onClose,
  preselectedServiceId,
  onBookingSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form states
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<Operator | 'any'>('any');
  const [operatorFilterType, setOperatorFilterType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Client details
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [matchingClients, setMatchingClients] = useState<Client[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [acknowledgedWomenOnly, setAcknowledgedWomenOnly] = useState(false);

  // Search & Filter for Services
  const [serviceCategory, setServiceCategory] = useState<TreatmentCategory | 'all'>('all');
  const [serviceSearch, setServiceSearch] = useState('');

  // Confirmed booking state
  const [confirmedBookingCode, setConfirmedBookingCode] = useState<string>('');

  // Handle preselected service
  useEffect(() => {
    if (preselectedServiceId) {
      const found = SERVICES.find((s) => s.id === preselectedServiceId);
      if (found) {
        setSelectedService(found);
      }
    }
  }, [preselectedServiceId]);

  // Client search helper
  useEffect(() => {
    if (clientSearchTerm.trim().length >= 2) {
      setMatchingClients(searchClients(clientSearchTerm));
    } else {
      setMatchingClients([]);
    }
  }, [clientSearchTerm]);

  // Compute next 14 open days (Martedì - Sabato, escludendo Domenica e Lunedì)
  const availableDates = useMemo(() => {
    const dates: { dateStr: string; label: string; dayName: string }[] = [];
    const today = new Date();
    let current = new Date(today);

    while (dates.length < 10) {
      current.setDate(current.getDate() + 1);
      const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday

      if (dayOfWeek !== 0 && dayOfWeek !== 1) {
        const dateStr = current.toISOString().split('T')[0];
        const dayName = new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(current);
        const dayNumber = current.getDate();
        const monthName = new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(current);

        dates.push({
          dateStr,
          label: `${dayNumber} ${monthName}`,
          dayName: dayName.toUpperCase(),
        });
      }
    }
    return dates;
  }, []);

  // Compute available time slots for the selected date and operator
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const existingAppointments = getStoredAppointments();
    const baseSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '14:30', '15:00', '15:30', '16:00', '16:30',
      '17:00', '17:30', '18:00'
    ];

    // Filter occupied slots
    return baseSlots.map((time) => {
      const isOccupied = existingAppointments.some((app) => {
        if (app.date !== selectedDate || app.status === 'annullato') return false;
        if (app.time !== time) return false;
        if (selectedOperator !== 'any' && app.operatorId !== selectedOperator.id) return false;
        return true;
      });

      return {
        time,
        isAvailable: !isOccupied,
      };
    });
  }, [selectedDate, selectedOperator]);

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

  const handleSelectClient = (client: Client) => {
    setClientName(client.fullName);
    setClientPhone(client.phone);
    setClientEmail(client.email);
    setClientSearchTerm('');
    setMatchingClients([]);
  };

  const handleConfirmBooking = () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientPhone || !clientEmail) {
      return;
    }

    if (selectedService.onlyWomen && !acknowledgedWomenOnly) {
      alert('Per confermare questo massaggio, è necessario confermare che il trattamento è per una cliente donna.');
      return;
    }

    // Determine assigned operator
    let assignedOperator = selectedOperator !== 'any' ? selectedOperator : OPERATORS[0];
    if (selectedOperator === 'any') {
      // Find operator qualified for this service
      const qualified = OPERATORS.find((op) => selectedService.operatorTypes.includes(op.type));
      if (qualified) assignedOperator = qualified;
    }

    const price = selectedService.promoPrice || selectedService.price;

    const newApp = saveAppointment({
      clientName,
      clientPhone,
      clientEmail,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      servicePrice: price,
      operatorId: assignedOperator.id,
      operatorName: assignedOperator.name,
      date: selectedDate,
      time: selectedTime,
      durationMinutes: selectedService.durationMinutes,
      status: 'confermato',
      notes: clientNotes,
      reminderSent: false,
    });

    setConfirmedBookingCode(newApp.code);
    setStep(5);
    onBookingSuccess?.();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedOperator('any');
    setSelectedDate('');
    setSelectedTime('');
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setClientNotes('');
    setAcknowledgedWomenOnly(false);
    setConfirmedBookingCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#FAF7F7] border border-[#EEDFE1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modale */}
        <div className="p-5 sm:p-6 bg-[#261F21] text-[#FAF7F7] flex items-center justify-between border-b border-[#AA853D]/30 shrink-0">
          <div>
            <span className="text-[11px] font-mono tracking-widest text-[#D8B268] uppercase font-semibold">
              Sistema di Prenotazione Online
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#FAF7F7]">
              Il Sogno della Bellezza
            </h2>
          </div>
          <button
            onClick={() => {
              onClose();
              if (step === 5) resetForm();
            }}
            className="p-2 text-[#DEC7CA] hover:text-[#FAF7F7] hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Wizard (Stile vogliadiparrucchieri.shop ma con palette lusso) */}
        {step < 5 && (
          <div className="bg-white border-b border-[#EEDFE1] px-4 sm:px-6 py-3 shrink-0">
            <div className="flex items-center justify-between max-w-lg mx-auto text-xs font-medium">
              <button
                onClick={() => setStep(1)}
                className={`flex items-center gap-1.5 ${
                  step === 1 ? 'text-[#AA853D] font-bold' : step > 1 ? 'text-[#261F21]' : 'text-[#8F7D82]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 1 ? 'bg-[#261F21] text-[#D8B268]' : step > 1 ? 'bg-[#EEDFE1] text-[#261F21]' : 'bg-gray-100 text-gray-400'
                }`}>
                  1
                </span>
                <span>Servizio</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-[#DEC7CA]" />

              <button
                onClick={() => selectedService && setStep(2)}
                disabled={!selectedService}
                className={`flex items-center gap-1.5 ${
                  step === 2 ? 'text-[#AA853D] font-bold' : step > 2 ? 'text-[#261F21]' : 'text-[#8F7D82]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 2 ? 'bg-[#261F21] text-[#D8B268]' : step > 2 ? 'bg-[#EEDFE1] text-[#261F21]' : 'bg-gray-100 text-gray-400'
                }`}>
                  2
                </span>
                <span>Operatore</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-[#DEC7CA]" />

              <button
                onClick={() => selectedService && setStep(3)}
                disabled={!selectedService}
                className={`flex items-center gap-1.5 ${
                  step === 3 ? 'text-[#AA853D] font-bold' : step > 3 ? 'text-[#261F21]' : 'text-[#8F7D82]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 3 ? 'bg-[#261F21] text-[#D8B268]' : step > 3 ? 'bg-[#EEDFE1] text-[#261F21]' : 'bg-gray-100 text-gray-400'
                }`}>
                  3
                </span>
                <span>Data & Ora</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-[#DEC7CA]" />

              <button
                onClick={() => selectedService && selectedDate && selectedTime && setStep(4)}
                disabled={!selectedService || !selectedDate || !selectedTime}
                className={`flex items-center gap-1.5 ${
                  step === 4 ? 'text-[#AA853D] font-bold' : 'text-[#8F7D82]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === 4 ? 'bg-[#261F21] text-[#D8B268]' : 'bg-gray-100 text-gray-400'
                }`}>
                  4
                </span>
                <span>Dati</span>
              </button>
            </div>
          </div>
        )}

        {/* Contenuto Dinamico per Step */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          
          {/* ================= STEP 1: SCELTA SERVIZIO ================= */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#261F21]">
                  1. Scegli il tuo trattamento
                </h3>
                <p className="text-xs text-[#55474A]">
                  Seleziona il servizio desiderato tra le nostre specialità avanzate.
                </p>
              </div>

              {/* Ricerca e Filtro Categorie */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#8F7D82] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Cerca trattamento (es. Laser, Massaggio, Ciglia, Viso)..."
                    className="w-full pl-9.5 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
                  />
                  {serviceSearch && (
                    <button
                      onClick={() => setServiceSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8F7D82] hover:text-[#261F21]"
                    >
                      Pulisci
                    </button>
                  )}
                </div>

                {/* Filtri Categoria a pulsante segmentato */}
                <div className="flex flex-wrap gap-1.5 p-1 bg-[#F7EFEF] rounded-lg text-xs">
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
                      className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
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

              {/* Lista Servizi */}
              <div className="grid grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredServices.map((service) => {
                  const isSelected = selectedService?.id === service.id;
                  const effectivePrice = service.promoPrice || service.price;

                  return (
                    <div
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-white border-[#AA853D] shadow-md ring-1 ring-[#AA853D]'
                          : 'bg-white/80 hover:bg-white border-[#EEDFE1] hover:border-[#DEC7CA]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold text-[#AA853D] uppercase tracking-wide">
                              {service.categoryLabel}
                            </span>
                            {service.onlyWomen && (
                              <span className="text-[10px] font-bold text-[#8A3B49] bg-[#F7E1E5] px-2 py-0.5 rounded">
                                Riservato Solo Donna
                              </span>
                            )}
                            {service.isPopular && (
                              <span className="text-[10px] font-semibold text-[#191415] bg-[#D8B268] px-2 py-0.5 rounded">
                                Più Richiesto
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-sm sm:text-base text-[#261F21]">
                            {service.name}
                          </h4>
                          <p className="text-xs text-[#55474A] line-clamp-2">
                            {service.description}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          {service.promoPrice ? (
                            <div>
                              <span className="text-base sm:text-lg font-bold font-serif text-[#AA853D]">
                                €{service.promoPrice.toFixed(2)}
                              </span>
                              <span className="block text-xs text-[#8F7D82] line-through">
                                €{service.price.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-base sm:text-lg font-bold font-serif text-[#261F21]">
                              €{service.price.toFixed(2)}
                            </span>
                          )}
                          <span className="block text-[11px] text-[#8F7D82]">
                            {service.durationMinutes} min
                          </span>
                        </div>
                      </div>

                      {/* Explicit Alert for Massages */}
                      {service.onlyWomen && isSelected && (
                        <div className="mt-3 p-2.5 rounded-lg bg-[#FAF0F2] border border-[#DEC7CA] text-xs text-[#5C242E] flex items-start gap-2">
                          <ShieldAlert className="w-4 h-4 text-[#8A3B49] shrink-0 mt-0.5" />
                          <span>
                            <strong>Nota Informativa:</strong> Per policy aziendale e tutela della privacy,
                            questo massaggio è eseguito da operatrici donne ed è riservato unicamente al pubblico femminile.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredServices.length === 0 && (
                  <div className="text-center py-8 text-xs text-[#8F7D82]">
                    Nessun trattamento trovato con questi criteri. Prova a modificare la ricerca.
                  </div>
                )}
              </div>

              {/* Azione Avanti */}
              <div className="pt-2 flex justify-end">
                <button
                  disabled={!selectedService}
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 bg-[#261F21] text-[#FAF7F7] disabled:opacity-50 hover:bg-[#191415] text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>Continua con la Scelta Operatore</span>
                  <ChevronRight className="w-4 h-4 text-[#D8B268]" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 2: SCELTA OPERATORE ================= */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#261F21]">
                    2. Scegli l’operatrice di riferimento
                  </h3>
                  <p className="text-xs text-[#55474A]">
                    Filtra per tipologia di operatore o scegli la tua professionista di fiducia.
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
              <div className="p-3 bg-[#F7EFEF] rounded-xl space-y-2">
                <span className="text-[11px] font-semibold text-[#736266] uppercase tracking-wider block">
                  Filtra disponibilità per specializzazione:
                </span>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    { id: 'all', label: 'Tutte le Specialiste' },
                    { id: 'titolare', label: 'Titolare (Chiara)' },
                    { id: 'lash-master', label: 'Master Ciglia/Sopracciglia (Melania)' },
                    { id: 'laser-specialist', label: 'Laser & Body Therapist (Alessia)' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setOperatorFilterType(filter.id)}
                      className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
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

              {/* Opzione: Primo operatore disponibile */}
              <div
                onClick={() => setSelectedOperator('any')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedOperator === 'any'
                    ? 'bg-white border-[#AA853D] ring-1 ring-[#AA853D]'
                    : 'bg-white/80 hover:bg-white border-[#EEDFE1]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FAF0F2] text-[#AA853D] flex items-center justify-center font-bold text-sm">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#261F21]">
                        Prima Operatrice Disponibile
                      </h4>
                      <p className="text-xs text-[#55474A]">
                        Ti assegneremo automaticamente la prima professionista libera nell'orario desiderato.
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
                      onClick={() => setSelectedOperator(op)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-white border-[#AA853D] shadow-md ring-1 ring-[#AA853D]'
                          : 'bg-white/80 hover:bg-white border-[#EEDFE1]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-11 h-11 rounded-full bg-[#261F21] text-[#D8B268] flex items-center justify-center font-serif font-bold text-base border border-[#AA853D]/40 shrink-0">
                          {op.name.substring(0, 2).toUpperCase()}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-[#AA853D] shrink-0" />
                        )}
                      </div>

                      <div className="mt-3 space-y-1">
                        <h4 className="font-serif font-bold text-base text-[#261F21]">
                          {op.name}
                        </h4>
                        <p className="text-xs font-semibold text-[#AA853D]">
                          {op.role}
                        </p>
                        <p className="text-xs text-[#55474A] line-clamp-2">
                          {op.specialization}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Azioni */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-medium text-[#55474A] hover:text-[#261F21]"
                >
                  Indietro
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 bg-[#261F21] text-[#FAF7F7] hover:bg-[#191415] text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>Scegli Data e Ora</span>
                  <ChevronRight className="w-4 h-4 text-[#D8B268]" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: DATA E ORA ================= */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#261F21]">
                    3. Seleziona Data e Orario
                  </h3>
                  <p className="text-xs text-[#55474A]">
                    Aperti da Martedì a Sabato (09:00 - 18:30). Domenica e Lunedì riposo settimanale.
                  </p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="text-xs text-[#736266] hover:text-[#261F21] flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cambia Operatore
                </button>
              </div>

              {/* Selezione Giorni */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#261F21] block">
                  Giorni disponibili:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {availableDates.map((item) => {
                    const isSelected = selectedDate === item.dateStr;
                    return (
                      <button
                        key={item.dateStr}
                        onClick={() => {
                          setSelectedDate(item.dateStr);
                          setSelectedTime(''); // reset time on date change
                        }}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-[#261F21] text-[#D8B268] border-[#261F21] shadow-xs'
                            : 'bg-white hover:bg-[#FAF5F5] border-[#EEDFE1] text-[#261F21]'
                        }`}
                      >
                        <span className={`block text-[10px] font-bold tracking-wider ${isSelected ? 'text-[#DEC7CA]' : 'text-[#8F7D82]'}`}>
                          {item.dayName}
                        </span>
                        <span className="block font-serif text-sm font-bold mt-0.5">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selezione Slot Orario */}
              {selectedDate ? (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#261F21]">
                      Orari disponibili per il {selectedDate}:
                    </label>
                    <span className="text-[11px] text-[#8F7D82]">
                      Slot calcolati su durata {selectedService?.durationMinutes} min
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {availableSlots.map(({ time, isAvailable }) => {
                      const isSelected = selectedTime === time;

                      return (
                        <button
                          key={time}
                          disabled={!isAvailable}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 px-3 text-xs font-mono font-medium rounded-lg border transition-all ${
                            isSelected
                              ? 'bg-[#AA853D] text-white border-[#AA853D] shadow-xs'
                              : isAvailable
                              ? 'bg-white hover:border-[#AA853D] border-[#EEDFE1] text-[#261F21]'
                              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#8F7D82] bg-white rounded-xl border border-dashed border-[#DEC7CA]">
                  Seleziona prima una data per visualizzare le fasce orarie libere.
                </div>
              )}

              {/* Azioni */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-medium text-[#55474A] hover:text-[#261F21]"
                >
                  Indietro
                </button>
                <button
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 bg-[#261F21] text-[#FAF7F7] disabled:opacity-50 hover:bg-[#191415] text-xs sm:text-sm font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>Inserisci Dati Cliente</span>
                  <ChevronRight className="w-4 h-4 text-[#D8B268]" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: DATI CLIENTE & CERCA CLIENTI ================= */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#261F21]">
                    4. Riepilogo e Dati di Contatto
                  </h3>
                  <p className="text-xs text-[#55474A]">
                    Ti invieremo conferma istantanea e promemoria email 24h prima tramite Resend.
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

              {/* Riepilogo Trattamento Scelto */}
              <div className="p-4 rounded-xl bg-white border border-[#EEDFE1] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#AA853D] uppercase tracking-wider">
                    {selectedService?.categoryLabel}
                  </span>
                  <span className="font-serif font-bold text-base text-[#261F21]">
                    €{(selectedService?.promoPrice || selectedService?.price)?.toFixed(2)}
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-[#261F21]">
                  {selectedService?.name}
                </h4>
                <div className="flex flex-wrap items-center gap-4 text-xs text-[#55474A] pt-1">
                  <span>📅 Data: <strong>{selectedDate}</strong></span>
                  <span>⏰ Ora: <strong>{selectedTime}</strong></span>
                  <span>
                    👤 Operatrice:{' '}
                    <strong>
                      {selectedOperator === 'any' ? 'Prima disponibile' : selectedOperator.name}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Ricerca Rapida Cliente Esistente (Richiesta esplicita dell'utente) */}
              <div className="p-3.5 rounded-xl bg-[#F7EFEF] border border-[#DEC7CA] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#261F21] flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-[#AA853D]" />
                    Sei già una nostra cliente?
                  </span>
                  <span className="text-[11px] text-[#736266]">
                    Cerca per autocompilare
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    placeholder="Cerca nome o telefono (es. Maria Laura, 340...)"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
                  />
                  {matchingClients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DEC7CA] rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                      {matchingClients.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectClient(c)}
                          className="p-2.5 hover:bg-[#FAF5F5] border-b border-[#EEDFE1] last:border-0 cursor-pointer text-xs"
                        >
                          <p className="font-bold text-[#261F21]">{c.fullName}</p>
                          <p className="text-[11px] text-[#736266]">{c.phone} · {c.email}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modulo Dati Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#261F21]">
                    Nome e Cognome *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Es. Chiara Grasso"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#261F21]">
                    Telefono Cellulare *
                  </label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Es. 345 123 4567"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-[#261F21]">
                    Indirizzo Email (Per promemoria Resend 24h prima) *
                  </label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="Es. nome@gmail.com"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-[#261F21]">
                    Note o preferenze (opzionale)
                  </label>
                  <textarea
                    rows={2}
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    placeholder="Allergie a cosmetici, fototipo pelle, o richieste particolari..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
                  />
                </div>
              </div>

              {/* Controllo e checkbox obbligatoria se MASSAGGIO (Solo Donna) */}
              {selectedService?.onlyWomen && (
                <div className="p-3.5 rounded-xl bg-[#FAF0F2] border border-[#DEC7CA] space-y-2">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="women-only-consent"
                      checked={acknowledgedWomenOnly}
                      onChange={(e) => setAcknowledgedWomenOnly(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-[#8A3B49] rounded border-gray-300 focus:ring-[#8A3B49]"
                    />
                    <label htmlFor="women-only-consent" className="text-xs text-[#5C242E] leading-relaxed cursor-pointer">
                      <strong>Conferma Policy Donna:</strong> Dichiaro che la persona che usufruirà del massaggio è di sesso femminile.
                      Prendo atto che il servizio massaggi de <em>Il Sogno della Bellezza</em> è riservato unicamente alle donne.
                    </label>
                  </div>
                </div>
              )}

              {/* Informazione Pagamento & Cancellazione */}
              <div className="p-3 bg-[#FAF7F7] border border-[#EEDFE1] rounded-lg text-[11px] text-[#736266] space-y-1">
                <p>
                  💳 <strong>Nessun addebito adesso:</strong> Saldatura direttamente in salone a Catania (Contanti o POS).
                </p>
                <p>
                  🔔 <strong>Notifica Resend:</strong> Il sistema automatizzato con cron job ti invierà un promemoria 24 ore prima dell'orario stabilito.
                </p>
              </div>

              {/* Azioni */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-xs font-medium text-[#55474A] hover:text-[#261F21]"
                >
                  Indietro
                </button>
                <button
                  disabled={
                    !clientName ||
                    !clientPhone ||
                    !clientEmail ||
                    (selectedService?.onlyWomen && !acknowledgedWomenOnly)
                  }
                  onClick={handleConfirmBooking}
                  className="px-7 py-3 bg-[#261F21] text-[#FAF7F7] disabled:opacity-50 hover:bg-[#191415] text-xs sm:text-sm font-semibold rounded-md shadow-md transition-all hover:scale-[1.01] flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D8B268]" />
                  <span>Conferma Prenotazione</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 5: SCHERMATA CONFERMA ================= */}
          {step === 5 && (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#FAF0F2] text-[#AA853D] flex items-center justify-center mx-auto border border-[#DEC7CA]">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#AA853D]">
                  Codice Prenotazione: {confirmedBookingCode}
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#261F21]">
                  Appuntamento Confermato!
                </h3>
                <p className="text-xs sm:text-sm text-[#55474A] max-w-md mx-auto">
                  Grazie {clientName}, ti aspettiamo presso <strong>Il Sogno della Bellezza</strong> in Via delle Viole, 7/9 a Catania.
                </p>
              </div>

              {/* Ricevuta riepilogativa */}
              <div className="max-w-md mx-auto p-5 bg-white border border-[#EEDFE1] rounded-xl text-left space-y-2 text-xs">
                <div className="flex justify-between border-b border-[#F7EFEF] pb-2">
                  <span className="text-[#8F7D82]">Trattamento:</span>
                  <span className="font-bold text-[#261F21]">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between border-b border-[#F7EFEF] pb-2">
                  <span className="text-[#8F7D82]">Data & Orario:</span>
                  <span className="font-bold text-[#261F21]">{selectedDate} alle {selectedTime}</span>
                </div>
                <div className="flex justify-between border-b border-[#F7EFEF] pb-2">
                  <span className="text-[#8F7D82]">Operatrice:</span>
                  <span className="font-bold text-[#AA853D]">
                    {selectedOperator === 'any' ? 'Assegnata dal salone' : selectedOperator.name}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-[#8F7D82]">Importo da saldare in salone:</span>
                  <span className="font-serif font-bold text-sm text-[#261F21]">
                    €{(selectedService?.promoPrice || selectedService?.price)?.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Notifica Automatica Resend */}
              <div className="max-w-md mx-auto p-3 bg-[#FAF0F2] rounded-lg text-xs text-[#5C242E] flex items-center justify-center gap-2">
                <Mail className="w-4 h-4 text-[#8A3B49]" />
                <span>
                  Email di promemoria programmata su <strong>{clientEmail}</strong> per 24 ore prima dell'orario.
                </span>
              </div>

              {/* Azioni */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href={`https://wa.me/393453938087?text=Salve%20Chiara%20e%20Melania,%20ho%20prenotato%20online%20con%20codice%20${confirmedBookingCode}%20per%20il%20${selectedDate}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Avvisa su WhatsApp</span>
                </a>

                <button
                  onClick={() => {
                    onClose();
                    resetForm();
                  }}
                  className="px-6 py-2.5 bg-[#261F21] text-[#FAF7F7] hover:bg-[#191415] text-xs font-semibold rounded-md shadow-xs transition-colors"
                >
                  Chiudi e Torna al Sito
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
