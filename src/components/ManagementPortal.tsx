import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  Users,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Send,
  Database,
  Terminal,
  Code,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Eye,
  Plus,
  X
} from 'lucide-react';
import { UserRole, Appointment, Client, FinancialSummary, AppointmentStatus } from '../types';
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

interface ManagementPortalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: UserRole;
  onChangeRole: (role: UserRole) => void;
}

export const ManagementPortal: React.FC<ManagementPortalProps> = ({
  isOpen,
  onClose,
  activeRole,
  onChangeRole,
}) => {
  const [activeTab, setActiveTab] = useState<'agenda' | 'clienti' | 'contabilita' | 'automazioni'>('agenda');
  
  // Data states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [financials, setFinancials] = useState<FinancialSummary | null>(null);

  // Filters for agenda
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'all'>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [appointmentSearch, setAppointmentSearch] = useState<string>('');

  // Filters for client CRM
  const [clientSearch, setClientSearch] = useState<string>('');

  // New appointment quick modal inside backoffice
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

  // Reload data from storage
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

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    return appointments.filter((app) => {
      // Date filter
      if (dateFilter === 'today' && app.date !== todayStr) return false;
      if (dateFilter === 'tomorrow' && app.date !== tomorrowStr) return false;

      // Operator filter
      if (operatorFilter !== 'all' && app.operatorId !== operatorFilter) return false;

      // Search term (Client name, phone, or booking code)
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

  // Filtered Clients
  const filteredClients = useMemo(() => {
    return searchClients(clientSearch);
  }, [clients, clientSearch]);

  const handleStatusChange = (id: string, status: AppointmentStatus) => {
    updateAppointmentStatus(id, status);
  };

  const handleQuickAddAppointment = (e: React.FormEvent) => {
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
      // Mark as reminder sent
      const current = getStoredAppointments();
      const updated = current.map((a) => (a.id === app.id ? { ...a, reminderSent: true } : a));
      localStorage.setItem('ilsogno_appointments_v1', JSON.stringify(updated));

      // Log email
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

  // Export CSV for accountant (Titolare only)
  const handleExportCSV = () => {
    if (activeRole !== 'titolare') return;

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-6xl bg-white border border-[#EEDFE1] rounded-2xl shadow-2xl flex flex-col h-[92vh] overflow-hidden">
        
        {/* Header Gestionale con Switch Ruolo */}
        <div className="p-4 sm:p-6 bg-[#261F21] text-[#FAF7F7] flex flex-wrap items-center justify-between gap-4 border-b border-[#AA853D]/30 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#FAF7F7]">
                Area Gestionale · Il Sogno della Bellezza
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                activeRole === 'titolare'
                  ? 'bg-[#D8B268] text-[#191415]'
                  : 'bg-white/20 text-[#FAF7F7]'
              }`}>
                {activeRole === 'titolare' ? 'Titolare (Completo)' : 'Dipendente (No Contabilità)'}
              </span>
            </div>
            <p className="text-xs text-[#DEC7CA] mt-0.5">
              {activeRole === 'titolare'
                ? 'Accesso completo: Agenda, Gestione Clienti, Dati Finanziari & Cloud'
                : 'Accesso Operatrici: Agenda appuntamenti e ricerca clienti (Contabilità disabilitata)'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Selettore Ruolo Switcher */}
            <div className="flex items-center bg-[#191415] p-1 rounded-lg border border-[#AA853D]/40 text-xs">
              <button
                onClick={() => {
                  onChangeRole('dipendente');
                  if (activeTab === 'contabilita') setActiveTab('agenda');
                }}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeRole === 'dipendente'
                    ? 'bg-[#3B3033] text-white font-semibold'
                    : 'text-[#DEC7CA] hover:text-white'
                }`}
              >
                Dipendente
              </button>
              <button
                onClick={() => onChangeRole('titolare')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeRole === 'titolare'
                    ? 'bg-[#D8B268] text-[#191415] font-bold'
                    : 'text-[#DEC7CA] hover:text-white'
                }`}
              >
                Titolare
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-[#DEC7CA] hover:text-[#FAF7F7] hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra di Navigazione Tab */}
        <div className="bg-[#FAF7F7] border-b border-[#EEDFE1] px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('agenda')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'agenda'
                  ? 'border-[#AA853D] text-[#AA853D]'
                  : 'border-transparent text-[#736266] hover:text-[#261F21]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Agenda Appuntamenti</span>
              <span className="text-[10px] bg-white px-1.5 py-0.2 rounded-full border border-[#EEDFE1]">
                {appointments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('clienti')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'clienti'
                  ? 'border-[#AA853D] text-[#AA853D]'
                  : 'border-transparent text-[#736266] hover:text-[#261F21]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Cerca Clienti (CRM)</span>
              <span className="text-[10px] bg-white px-1.5 py-0.2 rounded-full border border-[#EEDFE1]">
                {clients.length}
              </span>
            </button>

            {/* TAB RISERVATI AL TITOLARE */}
            {activeRole === 'titolare' && (
              <>
                <button
                  onClick={() => setActiveTab('contabilita')}
                  className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    activeTab === 'contabilita'
                      ? 'border-[#AA853D] text-[#AA853D]'
                      : 'border-transparent text-[#736266] hover:text-[#261F21]'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-[#AA853D]" />
                  <span>Dati Finanziari & Incassi</span>
                </button>

                <button
                  onClick={() => setActiveTab('automazioni')}
                  className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    activeTab === 'automazioni'
                      ? 'border-[#AA853D] text-[#AA853D]'
                      : 'border-transparent text-[#736266] hover:text-[#261F21]'
                  }`}
                >
                  <Database className="w-4 h-4 text-[#AA853D]" />
                  <span>Cloud & Resend Cron</span>
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#261F21] text-[#FAF7F7] hover:bg-[#191415] rounded-md text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#D8B268]" />
            <span>Nuovo Appuntamento</span>
          </button>
        </div>

        {/* Contenuto Dinamico del Gestionale */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#FAF7F7]/60">
          
          {/* ================= TAB 1: AGENDA APPUNTAMENTI ================= */}
          {activeTab === 'agenda' && (
            <div className="space-y-4">
              
              {/* Barra Filtri Agenda */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#EEDFE1] shadow-2xs">
                
                {/* Filtro Data Rapido */}
                <div className="flex items-center gap-1 bg-[#F7EFEF] p-1 rounded-lg text-xs">
                  <button
                    onClick={() => setDateFilter('all')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      dateFilter === 'all' ? 'bg-[#261F21] text-[#D8B268]' : 'text-[#736266]'
                    }`}
                  >
                    Tutti i giorni
                  </button>
                  <button
                    onClick={() => setDateFilter('today')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      dateFilter === 'today' ? 'bg-[#261F21] text-[#D8B268]' : 'text-[#736266]'
                    }`}
                  >
                    Oggi
                  </button>
                  <button
                    onClick={() => setDateFilter('tomorrow')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      dateFilter === 'tomorrow' ? 'bg-[#261F21] text-[#D8B268]' : 'text-[#736266]'
                    }`}
                  >
                    Domani (Resend Target)
                  </button>
                </div>

                {/* Filtro Operatore */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#736266]">Operatrice:</span>
                  <select
                    value={operatorFilter}
                    onChange={(e) => setOperatorFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-[#DEC7CA] rounded-md text-xs font-medium focus:outline-none focus:border-[#AA853D]"
                  >
                    <option value="all">Tutte le Operatrici</option>
                    {OPERATORS.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name} ({op.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cerca appuntamento per nome o codice */}
                <div className="relative min-w-[200px] flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-[#8F7D82] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={appointmentSearch}
                    onChange={(e) => setAppointmentSearch(e.target.value)}
                    placeholder="Cerca cliente, codice, tel..."
                    className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white border border-[#DEC7CA] rounded-md focus:outline-none focus:border-[#AA853D]"
                  />
                </div>
              </div>

              {/* Tabella Appuntamenti */}
              <div className="bg-white rounded-xl border border-[#EEDFE1] overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF5F5] border-b border-[#EEDFE1] text-[#736266] uppercase text-[10px] tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-4">Codice & Data</th>
                        <th className="py-3 px-4">Cliente & Contatto</th>
                        <th className="py-3 px-4">Trattamento</th>
                        <th className="py-3 px-4">Operatrice</th>
                        {activeRole === 'titolare' && (
                          <th className="py-3 px-4">Prezzo</th>
                        )}
                        <th className="py-3 px-4">Stato Appuntamento</th>
                        <th className="py-3 px-4 text-right">Promemoria 24h</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F7EFEF]">
                      {filteredAppointments.map((app) => (
                        <tr key={app.id} className="hover:bg-[#FAF7F7] transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-[#AA853D]">
                              {app.code}
                            </span>
                            <div className="text-[11px] text-[#55474A] flex items-center gap-1.5 mt-0.5">
                              <span>{app.date}</span>
                              <span className="font-bold text-[#261F21]">ore {app.time}</span>
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
                            <div className="font-semibold text-[#261F21] line-clamp-1">
                              {app.serviceName}
                            </div>
                            <div className="text-[10px] text-[#8F7D82]">
                              Durata: {app.durationMinutes} min
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-medium text-[#261F21] bg-[#FAF0F2] px-2 py-0.5 rounded border border-[#DEC7CA]">
                              {app.operatorName}
                            </span>
                          </td>

                          {/* Prezzo visibile SOLO per Titolare */}
                          {activeRole === 'titolare' && (
                            <td className="py-3.5 px-4 whitespace-nowrap font-serif font-bold text-[#261F21]">
                              €{app.servicePrice.toFixed(2)}
                            </td>
                          )}

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <select
                              value={app.status}
                              onChange={(e) => handleStatusChange(app.id, e.target.value as any)}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border focus:outline-none ${
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
                                title="Visualizza anteprima email Resend"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Anteprima</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}

                      {filteredAppointments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-[#8F7D82]">
                            Nessun appuntamento trovato per questi filtri.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ================= TAB 2: CERCA CLIENTI (CRM) ================= */}
          {activeTab === 'clienti' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#EEDFE1] shadow-2xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#8F7D82] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Cerca cliente per nome, cellulare, email o note..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
                  />
                </div>
                <span className="text-xs text-[#736266] shrink-0">
                  {filteredClients.length} clienti in archivio
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white p-4 rounded-xl border border-[#EEDFE1] shadow-2xs space-y-3"
                  >
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
                      <p className="flex items-center gap-1.5">
                        <span className="text-[#8F7D82]">Tel:</span>
                        <a href={`tel:${c.phone}`} className="font-medium text-[#261F21] hover:underline">
                          {c.phone}
                        </a>
                      </p>
                      <p className="flex items-center gap-1.5 truncate">
                        <span className="text-[#8F7D82]">Email:</span>
                        <span className="truncate">{c.email}</span>
                      </p>
                    </div>

                    {c.notes && (
                      <div className="p-2 bg-[#FCF8F8] border border-[#F7EFEF] rounded text-[11px] text-[#55474A] italic">
                        "{c.notes}"
                      </div>
                    )}

                    {/* Dati Spesa visibili SOLO per Titolare */}
                    {activeRole === 'titolare' && (
                      <div className="pt-2 border-t border-[#F7EFEF] flex justify-between items-center text-xs">
                        <span className="text-[#8F7D82]">Totale Speso:</span>
                        <span className="font-serif font-bold text-[#AA853D]">
                          €{c.totalSpent.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= TAB 3: CONTABILITA & DATI FINANZIARI (SOLO TITOLARE) ================= */}
          {activeTab === 'contabilita' && activeRole === 'titolare' && (
            <div className="space-y-6">
              
              {/* Statistiche Principali (KPI) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white p-5 rounded-xl border border-[#EEDFE1] shadow-2xs space-y-2">
                  <span className="text-[11px] font-semibold text-[#8F7D82] uppercase tracking-wider block">
                    Incasso di Oggi
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-[#261F21]">
                      €{financials?.todayRevenue.toFixed(2)}
                    </span>
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <span className="text-[10px] text-[#8F7D82]">Sulla base degli appuntamenti odierni</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-[#EEDFE1] shadow-2xs space-y-2">
                  <span className="text-[11px] font-semibold text-[#8F7D82] uppercase tracking-wider block">
                    Incasso Mese Corrente
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-[#AA853D]">
                      €{financials?.monthRevenue.toFixed(2)}
                    </span>
                    <DollarSign className="w-5 h-5 text-[#AA853D]" />
                  </div>
                  <span className="text-[10px] text-[#8F7D82]">Previsione chiusura mese positivo</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-[#EEDFE1] shadow-2xs space-y-2">
                  <span className="text-[11px] font-semibold text-[#8F7D82] uppercase tracking-wider block">
                    Scontrino Medio
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-[#261F21]">
                      €{financials?.averageTicket}
                    </span>
                    <span className="text-xs text-[#AA853D] font-bold">Medio</span>
                  </div>
                  <span className="text-[10px] text-[#8F7D82]">Ottimizzato grazie a Promo Laser</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-[#EEDFE1] shadow-2xs space-y-2">
                  <span className="text-[11px] font-semibold text-[#8F7D82] uppercase tracking-wider block">
                    Trattamenti Completati
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-[#261F21]">
                      {financials?.completedAppointmentsCount}
                    </span>
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                  <span className="text-[10px] text-[#8F7D82]">Su {appointments.length} totali registrati</span>
                </div>

              </div>

              {/* Classifica Trattamenti più Redditizi & Esportazione */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Trattamenti Top */}
                <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-[#EEDFE1] shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-base font-bold text-[#261F21]">
                      Trattamenti più Redditizi
                    </h3>
                    <span className="text-xs text-[#8F7D82]">Per fatturato generato</span>
                  </div>

                  <div className="space-y-3">
                    {financials?.topServices.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-[#FAF5F5]">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#FAF0F2] text-[#AA853D] font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-[#261F21]">{item.name}</p>
                            <p className="text-[10px] text-[#8F7D82]">{item.count} prenotazioni</p>
                          </div>
                        </div>
                        <span className="font-serif font-bold text-[#AA853D]">
                          €{item.revenue.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Esportazione Fiscale & Dati Cassa */}
                <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-[#EEDFE1] shadow-2xs flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#261F21]">
                      Esportazione Contabile
                    </h3>
                    <p className="text-xs text-[#55474A] mt-1">
                      Genera il file CSV compatibile con Excel e i gestionali del commercialista
                      con l'elenco di tutte le entrate e metodi di pagamento.
                    </p>
                  </div>

                  <div className="p-3 bg-[#FAF5F5] rounded-lg text-xs space-y-1 text-[#55474A]">
                    <p>✓ Elenco transazioni completo</p>
                    <p>✓ Codice univoco appuntamento</p>
                    <p>✓ Ripartizione per operatrice</p>
                  </div>

                  <button
                    onClick={handleExportCSV}
                    className="w-full py-2.5 bg-[#261F21] hover:bg-[#191415] text-[#FAF7F7] text-xs font-semibold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#D8B268]" />
                    <span>Esporta Dati Incassi (.CSV)</span>
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* ================= TAB 4: CLOUD & NOTIFICHE RESEND CRON (SOLO TITOLARE) ================= */}
          {activeTab === 'automazioni' && activeRole === 'titolare' && (
            <div className="space-y-6">
              
              {/* Simulatore Cron Job Resend 24h */}
              <div className="bg-white p-6 rounded-xl border border-[#EEDFE1] shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#AA853D] font-bold">
                      Automazione Notifiche 24 Ore Prima
                    </span>
                    <h3 className="font-serif text-lg font-bold text-[#261F21]">
                      Simulatore & Test Cron Job Resend
                    </h3>
                    <p className="text-xs text-[#55474A]">
                      Il cron job automatico scansiona gli appuntamenti del giorno successivo e invia l'email promemoria via Resend.
                    </p>
                  </div>

                  <button
                    onClick={handleTriggerResendCronJob}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#AA853D] hover:bg-[#8C6E2E] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Esegui Cron Job Resend Adesso</span>
                  </button>
                </div>

                {/* Log Invii Recenti */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-[#261F21] mb-2">Log Notifiche Email Inviate:</h4>
                  <div className="max-h-44 overflow-y-auto border border-[#EEDFE1] rounded-lg divide-y divide-[#F7EFEF] text-xs">
                    {emailLogs.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#8F7D82]">
                        Nessuna notifica registrata finora. Clicca su "Esegui Cron Job Resend" per testare.
                      </div>
                    ) : (
                      emailLogs.map((log) => (
                        <div key={log.id} className="p-2.5 flex items-center justify-between hover:bg-[#FAF7F7]">
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

              {/* Blueprint per Supabase & Vercel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Supabase SQL Schema */}
                <div className="bg-white p-5 rounded-xl border border-[#EEDFE1] shadow-2xs space-y-3">
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
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#F7EFEF] hover:bg-[#EEDFE1] text-[#261F21] text-xs rounded border border-[#DEC7CA]"
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
                  <pre className="p-3 bg-[#191415] text-[#D8B268] rounded-lg text-[10px] font-mono overflow-x-auto max-h-48">
                    {SUPABASE_SQL_SCHEMA}
                  </pre>
                </div>

                {/* Vercel Cron Configuration */}
                <div className="bg-white p-5 rounded-xl border border-[#EEDFE1] shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-[#261F21]">
                        2. File vercel.json per Cron Job
                      </h4>
                      <p className="text-[11px] text-[#736266]">
                        Pianificato ogni mattina alle 08:00 (1 giorno prima dell'appuntamento)
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(VERCEL_JSON_CONFIG, 'vercel')}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#F7EFEF] hover:bg-[#EEDFE1] text-[#261F21] text-xs rounded border border-[#DEC7CA]"
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
                  <pre className="p-3 bg-[#191415] text-[#D8B268] rounded-lg text-[11px] font-mono overflow-x-auto max-h-24">
                    {VERCEL_JSON_CONFIG}
                  </pre>

                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#261F21]">
                        Serverless Function Resend (api/cron/reminder-emails.ts)
                      </span>
                      <button
                        onClick={() => copyToClipboard(RESEND_CRON_API_CODE, 'resend')}
                        className="text-[11px] text-[#AA853D] hover:underline"
                      >
                        {copiedType === 'resend' ? 'Copiato!' : 'Copia Codice API'}
                      </button>
                    </div>
                    <pre className="mt-1 p-3 bg-[#191415] text-[#FAF7F7] rounded-lg text-[10px] font-mono overflow-x-auto max-h-24">
                      {RESEND_CRON_API_CODE}
                    </pre>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Modal Rapido: Nuovo Appuntamento al Volo */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-[#EEDFE1] shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-[#F7EFEF] pb-3">
                <h3 className="font-serif text-lg font-bold text-[#261F21]">
                  Nuovo Appuntamento (Banco o Telefono)
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-[#8F7D82] hover:text-[#261F21]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleQuickAddAppointment} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#261F21]">Nome Cliente *</label>
                    <input
                      type="text"
                      required
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Es. Elena Rossi"
                      className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
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
                      className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
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
                    className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#261F21]">Trattamento</label>
                    <select
                      value={newServiceId}
                      onChange={(e) => setNewServiceId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
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
                      className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
                    >
                      {OPERATORS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.role})
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
                      className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#261F21]">Orario</label>
                    <input
                      type="time"
                      required
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
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
                    className="w-full px-3 py-2 text-xs border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]"
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
                    className="px-5 py-2 bg-[#261F21] text-[#FAF7F7] hover:bg-[#191415] text-xs font-semibold rounded-lg shadow-sm"
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
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-[#EEDFE1] shadow-2xl relative">
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

              {/* Template Email Grafico Reale */}
              <div className="border border-[#DEC7CA] rounded-xl overflow-hidden text-xs bg-[#FAF7F7]">
                <div className="bg-[#261F21] text-center p-4 text-[#FAF7F7]">
                  <p className="font-serif font-bold tracking-wider text-sm text-[#D8B268]">
                    IL SOGNO DELLA BELLEZZA
                  </p>
                  <p className="text-[10px] text-[#DEC7CA]">Chiara & Melania · Catania</p>
                </div>

                <div className="p-4 space-y-3 bg-white text-[#4A4042]">
                  <p>Gentile <strong>{previewEmailApp.clientName}</strong>,</p>
                  <p>
                    Ti ricordiamo il tuo appuntamento di domani presso il nostro centro estetico in <strong>Via delle Viole, 7/9 a Catania</strong>.
                  </p>

                  <div className="p-3 bg-[#FCF8F8] border border-[#EEDFE1] rounded-lg space-y-1">
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
                  className="px-5 py-2 bg-[#261F21] text-white rounded-lg text-xs font-semibold"
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
