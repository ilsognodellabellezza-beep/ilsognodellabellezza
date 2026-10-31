import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  Users,
  Search,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle,
  Mail,
  Send,
  Database,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Eye,
  Plus,
  X
} from 'lucide-react';
import { Appointment, Client, FinancialSummary, AppointmentStatus } from '../types';
import {
  getStoredAppointments,
  updateAppointmentStatus,
  getStoredClients,
  searchClients,
  computeFinancialSummary,
  getStoredEmailLogs,
  logEmailSent,
  saveAppointment,
  EmailLog
} from '../lib/storage';
import { OPERATORS, SERVICES } from '../data/mockData';
import { SUPABASE_SQL_SCHEMA, VERCEL_JSON_CONFIG, RESEND_CRON_API_CODE } from '../lib/cloudArchitecture';
import { PageId } from '../types/navigation';

interface OwnerManagementPageProps {
  onNavigate: (page: PageId) => void;
}

export const OwnerManagementPage: React.FC<OwnerManagementPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'agenda' | 'clienti' | 'contabilita' | 'cloud'>('contabilita');
  
  // Data states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [financials, setFinancials] = useState<FinancialSummary | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'all'>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [appointmentSearch, setAppointmentSearch] = useState<string>('');
  const [clientSearch, setClientSearch] = useState<string>('');

  // Quick appointment modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newServiceId, setNewServiceId] = useState(SERVICES[0].id);
  const [newOperatorId, setNewOperatorId] = useState(OPERATORS[0].id);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('10:00');
  const [newNotes, setNewNotes] = useState('');

  // Copied alert states
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Email preview modal state
  const [previewEmailApp, setPreviewEmailApp] = useState<Appointment | null>(null);

  const loadData = () => {
    setAppointments(getStoredAppointments());
    setClients(getStoredClients());
    setEmailLogs(getStoredEmailLogs());
    setFinancials(computeFinancialSummary());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('ilsogno_storage_change', loadData);
    return () => window.removeEventListener('ilsogno_storage_change', loadData);
  }, []);

  const filteredAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return appointments.filter((app) => {
      if (dateFilter === 'today' && app.date !== todayStr) return false;
      if (dateFilter === 'tomorrow' && app.date !== tomorrowStr) return false;
      if (operatorFilter !== 'all' && app.operatorId !== operatorFilter) return false;

      if (appointmentSearch.trim()) {
        const q = appointmentSearch.toLowerCase();
        const matchesName = app.clientName.toLowerCase().includes(q);
        const matchesCode = app.code.toLowerCase().includes(q);
        const matchesPhone = app.clientPhone.includes(q);
        const matchesService = app.serviceName.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesPhone && !matchesService) return false;
      }

      return true;
    });
  }, [appointments, dateFilter, operatorFilter, appointmentSearch]);

  const filteredClients = useMemo(() => {
    return searchClients(clientSearch);
  }, [clients, clientSearch]);

  const handleStatusChange = (id: string, status: AppointmentStatus) => {
    updateAppointmentStatus(id, status);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientPhone || !newDate || !newTime) return;

    const serv = SERVICES.find((s) => s.id === newServiceId) || SERVICES[0];
    const op = OPERATORS.find((o) => o.id === newOperatorId) || OPERATORS[0];
    const price = serv.promoPrice || serv.price;

    saveAppointment({
      clientName: newClientName,
      clientPhone: newClientPhone,
      clientEmail: newClientEmail || `${newClientName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      serviceId: serv.id,
      serviceName: serv.name,
      servicePrice: price,
      operatorId: op.id,
      operatorName: op.name,
      date: newDate,
      time: newTime,
      durationMinutes: serv.durationMinutes,
      status: 'confermato',
      notes: newNotes,
      reminderSent: false,
    });

    setIsAddModalOpen(false);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmail('');
    setNewNotes('');
  };

  // Simulate Resend 24h Cron Job
  const handleTriggerResendCronJob = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const eligible = appointments.filter(
      (app) => app.date === tomorrowStr && app.status === 'confermato' && !app.reminderSent
    );

    if (eligible.length === 0) {
      alert(`Nessun appuntamento da notificare per domani (${tomorrowStr}). Crea una prenotazione per domani per testare l'invio Resend.`);
      return;
    }

    eligible.forEach((app) => {
      const current = getStoredAppointments();
      const updated = current.map((a) => (a.id === app.id ? { ...a, reminderSent: true } : a));
      localStorage.setItem('ilsogno_appointments_v1', JSON.stringify(updated));

      logEmailSent({
        recipientEmail: app.clientEmail,
        recipientName: app.clientName,
        appointmentCode: app.code,
        date: app.date,
        time: app.time,
        serviceName: app.serviceName,
        status: 'inviata',
        triggerType: 'cron_job_24h',
      });
    });

    window.dispatchEvent(new Event('ilsogno_storage_change'));
    alert(`Successo! Inviate ${eligible.length} email promemoria con Resend per gli appuntamenti di domani.`);
  };

  // Export CSV for accountant
  const handleExportCSV = () => {
    const headers = ['Codice', 'Data', 'Ora', 'Cliente', 'Telefono', 'Trattamento', 'Operatrice', 'Prezzo', 'Stato', 'Metodo Pagamento'];
    const rows = appointments.map((app) => [
      app.code,
      app.date,
      app.time,
      `"${app.clientName}"`,
      `"${app.clientPhone}"`,
      `"${app.serviceName}"`,
      app.operatorName,
      app.servicePrice.toFixed(2),
      app.status,
      app.paymentMethod || 'non_saldato',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `contabilita_il_sogno_bellezza_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="py-10 lg:py-14 bg-[#FAF7F7] min-h-screen space-y-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Intestazione Titolare Completa */}
        <div className="p-6 sm:p-8 bg-[#261F21] text-[#FAF7F7] rounded-3xl border border-[#AA853D]/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#FAF7F7]">
                Pannello Titolare · Chiara & Melania
              </span>
              <span className="text-xs bg-[#D8B268] text-[#191415] font-bold px-2.5 py-0.5 rounded uppercase">
                Accesso Amministratore
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#DEC7CA]">
              Accesso totale: Contabilità aziendale, monitoraggio incassi, esportazione fiscale, CRM e automazioni Cloud.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('gestionale-dipendenti')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-[#D8B268] text-xs font-semibold rounded-xl border border-[#AA853D]/40 transition-colors"
            >
              Visualizza come Dipendente
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-[#D8B268] hover:bg-[#AA853D] text-[#191415] text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Appuntamento</span>
            </button>
          </div>
        </div>

        {/* Tab Bar Titolare */}
        <div className="flex items-center gap-2 sm:gap-3 border-b border-[#EEDFE1] pb-2 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('contabilita')}
            className={`py-2 px-4 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'contabilita'
                ? 'bg-[#261F21] text-[#D8B268]'
                : 'bg-white text-[#736266] border border-[#EEDFE1]'
            }`}
          >
            <DollarSign className="w-4 h-4 text-[#AA853D]" />
            <span>Contabilità & Incassi</span>
          </button>

          <button
            onClick={() => setActiveTab('agenda')}
            className={`py-2 px-4 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'agenda'
                ? 'bg-[#261F21] text-[#D8B268]'
                : 'bg-white text-[#736266] border border-[#EEDFE1]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Agenda & Appuntamenti ({appointments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('clienti')}
            className={`py-2 px-4 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'clienti'
                ? 'bg-[#261F21] text-[#D8B268]'
                : 'bg-white text-[#736266] border border-[#EEDFE1]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Anagrafica Clienti CRM ({clients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-2 px-4 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'cloud'
                ? 'bg-[#261F21] text-[#D8B268]'
                : 'bg-white text-[#736266] border border-[#EEDFE1]'
            }`}
          >
            <Database className="w-4 h-4 text-[#AA853D]" />
            <span>Cloud Supabase & Resend Cron</span>
          </button>
        </div>

        {/* TAB 1: CONTABILITA & DATI FINANZIARI */}
        {activeTab === 'contabilita' && (
          <div className="space-y-6">
            
            {/* KPI Finanziari */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white p-6 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-2">
                <span className="text-[11px] font-semibold text-[#8F7D82] uppercase tracking-wider block">
                  Incasso Previsto Oggi
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="font-serif text-3xl font-bold text-[#261F21]">
                    €{financials?.todayRevenue.toFixed(2)}
                  </span>
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-[10px] text-[#8F7D82]">Sulla base degli appuntamenti odierni</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-2">
                <span className="text-[11px] font-semibold text-[#8F7D82] uppercase tracking-wider block">
                  Incasso Mese Corrente
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="font-serif text-3xl font-bold text-[#AA853D]">
                    €{financials?.monthRevenue.toFixed(2)}
                  </span>
                  <DollarSign className="w-5 h-5 text-[#AA853D]" />
                </div>
                <span className="text-[10px] text-[#8F7D82]">Performance salone positiva</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-2">
                <span className="text-[11px] font-semibold text-[#8F7D82] uppercase tracking-wider block">
                  Scontrino Medio
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="font-serif text-3xl font-bold text-[#261F21]">
                    €{financials?.averageTicket}
                  </span>
                  <span className="text-xs text-[#AA853D] font-bold">Medio</span>
                </div>
                <span className="text-[10px] text-[#8F7D82]">Trainato da Laser Total Body</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-2">
                <span className="text-[11px] font-semibold text-[#8F7D82] uppercase tracking-wider block">
                  Trattamenti Eseguiti
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="font-serif text-3xl font-bold text-[#261F21]">
                    {financials?.completedAppointmentsCount}
                  </span>
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-[10px] text-[#8F7D82]">Su {appointments.length} totali registrati</span>
              </div>

            </div>

            {/* Trattamenti più redditizi & Esportazione Fiscale */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-[#261F21]">
                    Classifica Trattamenti per Fatturato
                  </h3>
                  <span className="text-xs text-[#8F7D82]">Più venduti</span>
                </div>

                <div className="space-y-3">
                  {financials?.topServices.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-3 rounded-xl hover:bg-[#FAF5F5] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#FAF0F2] text-[#AA853D] font-bold flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-[#261F21]">{item.name}</p>
                          <p className="text-[11px] text-[#8F7D82]">{item.count} prenotazioni registrate</p>
                        </div>
                      </div>
                      <span className="font-serif font-bold text-base text-[#AA853D]">
                        €{item.revenue.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#EEDFE1] shadow-2xs flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-serif text-lg font-bold text-[#261F21]">
                    Esportazione Contabilità Commercialista
                  </h3>
                  <p className="text-xs text-[#55474A] leading-relaxed">
                    Scarica con un click l'intero registro degli incassi con date, codici univoci,
                    nominativi clienti, operatrici assegnate e importi per la dichiarazione dei redditi.
                  </p>
                </div>

                <div className="p-4 bg-[#FAF5F5] rounded-2xl text-xs space-y-1.5 text-[#55474A]">
                  <p>✓ Compatibile al 100% con Microsoft Excel e Google Sheets</p>
                  <p>✓ Codici univoci per contrastare no-show</p>
                  <p>✓ Report entrate per ciascuna operatrice</p>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="w-full py-3 bg-[#261F21] hover:bg-[#191415] text-[#FAF7F7] text-xs font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#D8B268]" />
                  <span>Scarica File CSV (.csv)</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: AGENDA APPUNTAMENTI (CON PREZZI & RESEND TRIGGER) */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EEDFE1] shadow-2xs">
              <div className="flex items-center gap-1 bg-[#FAF5F5] p-1 rounded-xl text-xs">
                <button
                  onClick={() => setDateFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    dateFilter === 'all' ? 'bg-[#261F21] text-[#D8B268]' : 'text-[#736266]'
                  }`}
                >
                  Tutti
                </button>
                <button
                  onClick={() => setDateFilter('today')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    dateFilter === 'today' ? 'bg-[#261F21] text-[#D8B268]' : 'text-[#736266]'
                  }`}
                >
                  Oggi
                </button>
                <button
                  onClick={() => setDateFilter('tomorrow')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    dateFilter === 'tomorrow' ? 'bg-[#261F21] text-[#D8B268]' : 'text-[#736266]'
                  }`}
                >
                  Domani (Notifiche 24h)
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#736266]">Operatrice:</span>
                <select
                  value={operatorFilter}
                  onChange={(e) => setOperatorFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-[#DEC7CA] rounded-xl text-xs font-medium focus:outline-none focus:border-[#AA853D]"
                >
                  <option value="all">Tutte le Operatrici</option>
                  {OPERATORS.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name} ({op.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="w-4 h-4 text-[#8F7D82] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={appointmentSearch}
                  onChange={(e) => setAppointmentSearch(e.target.value)}
                  placeholder="Cerca cliente, codice o tel..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#EEDFE1] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF5F5] border-b border-[#EEDFE1] text-[#736266] uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Codice & Data</th>
                      <th className="py-3 px-4">Cliente & Contatto</th>
                      <th className="py-3 px-4">Trattamento</th>
                      <th className="py-3 px-4">Operatrice</th>
                      <th className="py-3 px-4">Prezzo</th>
                      <th className="py-3 px-4">Stato Appuntamento</th>
                      <th className="py-3 px-4 text-right">Promemoria Resend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F7EFEF]">
                    {filteredAppointments.map((app) => (
                      <tr key={app.id} className="hover:bg-[#FAF7F7] transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-[#AA853D]">{app.code}</span>
                          <div className="text-[11px] text-[#55474A] mt-0.5">
                            {app.date} alle <strong>{app.time}</strong>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#261F21]">{app.clientName}</div>
                          <div className="text-[11px] text-[#736266]">
                            <a href={`tel:${app.clientPhone}`} className="hover:text-[#AA853D]">
                              {app.clientPhone}
                            </a>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#261F21]">{app.serviceName}</div>
                          <div className="text-[10px] text-[#8F7D82]">
                            Durata: {app.durationMinutes} min
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-medium text-[#261F21] bg-[#FAF0F2] px-2.5 py-1 rounded-lg border border-[#DEC7CA]">
                            {app.operatorName}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-serif font-bold text-[#261F21]">
                          €{app.servicePrice.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(app.id, e.target.value as any)}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border focus:outline-none ${
                              app.status === 'confermato'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : app.status === 'in_corso'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : app.status === 'completato'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            <option value="confermato">Confermato</option>
                            <option value="in_corso">In Corso</option>
                            <option value="completato">Completato</option>
                            <option value="annullato">Annullato</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          {app.reminderSent ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Inviata</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => setPreviewEmailApp(app)}
                              className="inline-flex items-center gap-1 text-[11px] text-[#AA853D] hover:underline"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Anteprima</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ANAGRAFICA CLIENTI CRM */}
        {activeTab === 'clienti' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EEDFE1] shadow-2xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8F7D82] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Cerca cliente per nome, cellulare, email o note..."
                  className="w-full pl-9.5 pr-4 py-2.5 text-xs bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                />
              </div>
              <span className="text-xs text-[#736266] shrink-0">
                {filteredClients.length} clienti in archivio
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((c) => (
                <div key={c.id} className="bg-white p-5 rounded-2xl border border-[#EEDFE1] shadow-2xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#261F21]">{c.fullName}</h4>
                      <span className="text-[11px] text-[#8F7D82]">
                        Ultima visita: {c.lastVisitDate || 'N/D'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-[#FAF0F2] text-[#AA853D] px-2 py-0.5 rounded font-bold">
                      {c.totalVisits} visite
                    </span>
                  </div>

                  <div className="text-xs text-[#55474A] space-y-1">
                    <p>Tel: <a href={`tel:${c.phone}`} className="font-bold text-[#261F21] hover:underline">{c.phone}</a></p>
                    <p className="truncate">Email: {c.email}</p>
                  </div>

                  {c.notes && (
                    <div className="p-2.5 bg-[#FAF5F5] rounded-xl text-[11px] text-[#55474A] italic">
                      "{c.notes}"
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#F7EFEF] flex justify-between items-center text-xs">
                    <span className="text-[#8F7D82]">Fatturato Cliente:</span>
                    <span className="font-serif font-bold text-[#AA853D]">
                      €{c.totalSpent.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CLOUD SUPABASE & RESEND CRON */}
        {activeTab === 'cloud' && (
          <div className="space-y-6">
            
            {/* Simulatore Cron Job Resend 24h */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#AA853D] font-bold">
                    Automazione Notifiche 24 Ore Prima
                  </span>
                  <h3 className="font-serif text-xl font-bold text-[#261F21]">
                    Simulatore & Test Cron Job Resend
                  </h3>
                  <p className="text-xs text-[#55474A]">
                    Il cron job scansiona gli appuntamenti del giorno successivo e invia l'email promemoria via Resend.
                  </p>
                </div>

                <button
                  onClick={handleTriggerResendCronJob}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#AA853D] hover:bg-[#8C6E2E] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Esegui Cron Job Resend Adesso</span>
                </button>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-[#261F21] mb-2">Log Notifiche Email Inviate:</h4>
                <div className="max-h-48 overflow-y-auto border border-[#EEDFE1] rounded-2xl divide-y divide-[#F7EFEF] text-xs">
                  {emailLogs.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#8F7D82]">
                      Nessuna notifica inviata finora. Clicca su "Esegui Cron Job Resend" per testare.
                    </div>
                  ) : (
                    emailLogs.map((log) => (
                      <div key={log.id} className="p-3 flex items-center justify-between hover:bg-[#FAF7F7]">
                        <div>
                          <span className="font-bold text-[#261F21]">{log.recipientName}</span>{' '}
                          <span className="text-[#8F7D82]">({log.recipientEmail})</span>
                          <p className="text-[10px] text-[#736266]">
                            {log.serviceName} · App: {log.appointmentCode} per il {log.date} alle {log.time}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                            Inviata con successo
                          </span>
                          <span className="block text-[9px] text-[#8F7D82] mt-0.5">
                            {new Date(log.sentAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Script Supabase & Config Vercel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-white p-6 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-[#261F21]">
                      1. Script SQL Supabase
                    </h4>
                    <p className="text-[11px] text-[#736266]">
                      Copia ed esegui nel Supabase SQL Editor per creare tabelle e indici
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(SUPABASE_SQL_SCHEMA, 'supabase')}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#FAF5F5] hover:bg-[#EEDFE1] text-[#261F21] text-xs rounded-lg border border-[#DEC7CA]"
                  >
                    {copiedType === 'supabase' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copia SQL</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-[#191415] text-[#D8B268] rounded-xl text-[10px] font-mono overflow-x-auto max-h-48">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-[#261F21]">
                      2. Configurazione vercel.json per Cron Job
                    </h4>
                    <p className="text-[11px] text-[#736266]">
                      Pianificato ogni giorno alle ore 08:00
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(VERCEL_JSON_CONFIG, 'vercel')}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#FAF5F5] hover:bg-[#EEDFE1] text-[#261F21] text-xs rounded-lg border border-[#DEC7CA]"
                  >
                    {copiedType === 'vercel' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copia JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-[#191415] text-[#D8B268] rounded-xl text-[11px] font-mono overflow-x-auto max-h-24">
                  {VERCEL_JSON_CONFIG}
                </pre>

                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#261F21]">
                      Codice API Resend (api/cron/reminder-emails.ts)
                    </span>
                    <button
                      onClick={() => copyToClipboard(RESEND_CRON_API_CODE, 'resend')}
                      className="text-[11px] text-[#AA853D] hover:underline"
                    >
                      {copiedType === 'resend' ? 'Copiato!' : 'Copia Codice API'}
                    </button>
                  </div>
                  <pre className="mt-1 p-3 bg-[#191415] text-[#FAF7F7] rounded-xl text-[10px] font-mono overflow-x-auto max-h-24">
                    {RESEND_CRON_API_CODE}
                  </pre>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Modal Nuovo Appuntamento Banco */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-[#EEDFE1] shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-[#F7EFEF] pb-3">
                <h3 className="font-serif text-lg font-bold text-[#261F21]">
                  Nuovo Appuntamento da Banco
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-[#8F7D82] hover:text-[#261F21]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleQuickAdd} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#261F21]">Nome Cliente *</label>
                    <input
                      type="text"
                      required
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Es. Elena Rossi"
                      className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#261F21]">Telefono *</label>
                    <input
                      type="tel"
                      required
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="345..."
                      className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#261F21]">Email per promemoria Resend</label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#261F21]">Trattamento</label>
                    <select
                      value={newServiceId}
                      onChange={(e) => setNewServiceId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                    >
                      {SERVICES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (€{s.promoPrice || s.price})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#261F21]">Operatrice</label>
                    <select
                      value={newOperatorId}
                      onChange={(e) => setNewOperatorId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                    >
                      {OPERATORS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#261F21]">Data</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#261F21]">Orario</label>
                    <input
                      type="time"
                      required
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#261F21]">Note</label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Richieste speciali..."
                    className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs text-[#55474A]"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#261F21] text-[#FAF7F7] hover:bg-[#191415] text-xs font-semibold rounded-xl shadow-sm"
                  >
                    Salva Appuntamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Anteprima Email Resend */}
        {previewEmailApp && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-[#EEDFE1] shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-[#F7EFEF] pb-3">
                <div>
                  <h4 className="font-serif font-bold text-base text-[#261F21]">
                    Anteprima Email Resend Promemoria 24h
                  </h4>
                  <p className="text-[11px] text-[#736266]">
                    Destinatario: {previewEmailApp.clientEmail}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewEmailApp(null)}
                  className="text-[#8F7D82] hover:text-[#261F21]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="border border-[#DEC7CA] rounded-2xl overflow-hidden text-xs bg-[#FAF7F7]">
                <div className="bg-[#261F21] text-center p-4 text-[#FAF7F7]">
                  <p className="font-serif font-bold tracking-wider text-sm text-[#D8B268]">
                    IL SOGNO DELLA BELLEZZA
                  </p>
                  <p className="text-[10px] text-[#DEC7CA]">Chiara & Melania · Catania</p>
                </div>

                <div className="p-5 space-y-3 bg-white text-[#4A4042]">
                  <p>Gentile <strong>{previewEmailApp.clientName}</strong>,</p>
                  <p>
                    Ti ricordiamo il tuo appuntamento di domani presso il nostro centro estetico in <strong>Via delle Viole, 7/9 a Catania</strong>.
                  </p>

                  <div className="p-3.5 bg-[#FCF8F8] border border-[#EEDFE1] rounded-xl space-y-1">
                    <p className="font-bold text-[#261F21]">{previewEmailApp.serviceName}</p>
                    <p>📅 Data: {previewEmailApp.date} alle ore {previewEmailApp.time}</p>
                    <p>👤 Operatrice: {previewEmailApp.operatorName}</p>
                    <p className="font-mono text-[#AA853D] font-bold">Codice: {previewEmailApp.code}</p>
                  </div>

                  <p className="text-[11px] text-[#736266]">
                    Per qualsiasi necessità o modifica, contattaci su WhatsApp al 345 393 8087.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setPreviewEmailApp(null)}
                  className="px-5 py-2 bg-[#261F21] text-white rounded-xl text-xs font-semibold"
                >
                  Chiudi Anteprima
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
