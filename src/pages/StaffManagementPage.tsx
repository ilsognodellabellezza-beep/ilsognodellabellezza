import { GalleryManager } from '../components/GalleryManager';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  User,
  Users,
  Search,
  Filter,
  CheckCircle,
  Plus,
  X,
  Phone,
  Mail,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { Appointment, Client, AppointmentStatus } from '../types';
import {
  getStoredAppointments,
  updateAppointmentStatus,
  getStoredClients,
  searchClients,
  saveAppointment,
  loadManagementData,
  STORAGE_EVENT
} from '../lib/storage';
import { useAuth } from '../lib/auth';
import { toLocalDateStr, addDays } from '../lib/dates';
import { OPERATORS, SERVICES } from '../data/mockData';
import { PageId } from '../types/navigation';

interface StaffManagementPageProps {
  onNavigate: (page: PageId) => void;
}

export const StaffManagementPage: React.FC<StaffManagementPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'agenda' | 'clienti' | 'galleria'>('agenda');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Filters
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'all'>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [appointmentSearch, setAppointmentSearch] = useState<string>('');
  const [clientSearch, setClientSearch] = useState<string>('');

  // Quick add appointment modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newServiceId, setNewServiceId] = useState(SERVICES[0].id);
  const [newOperatorId, setNewOperatorId] = useState(OPERATORS[0].id);
  const [newDate, setNewDate] = useState(toLocalDateStr());
  const [newTime, setNewTime] = useState('10:00');
  const [newNotes, setNewNotes] = useState('');

  const { profile, signOut } = useAuth();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const readCache = () => {
    setAppointments(getStoredAppointments());
    setClients(getStoredClients());
  };

  const refresh = () =>
    loadManagementData({ includeOwnerData: false })
      .then(() => setLoadError(null))
      .catch((err: Error) => setLoadError(err.message));

  useEffect(() => {
    readCache();
    refresh();
    window.addEventListener(STORAGE_EVENT, readCache);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener(STORAGE_EVENT, readCache);
      window.clearInterval(interval);
    };
  }, []);

  const filteredAppointments = useMemo(() => {
    const todayStr = toLocalDateStr();
    const tomorrowStr = toLocalDateStr(addDays(new Date(), 1));

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

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      await updateAppointmentStatus(id, status);
    } catch (err) {
      alert(`Impossibile aggiornare lo stato: ${(err as Error).message}`);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientPhone || !newDate || !newTime || saving) return;

    const serv = SERVICES.find((s) => s.id === newServiceId) || SERVICES[0];
    const op = OPERATORS.find((o) => o.id === newOperatorId) || OPERATORS[0];
    const price = serv.promoPrice || serv.price;

    setSaving(true);
    try {
      await saveAppointment({
        clientName: newClientName,
        clientPhone: newClientPhone,
        clientEmail: newClientEmail,
        serviceId: serv.id,
        serviceName: serv.name,
        servicePrice: price,
        operatorId: op.id,
        operatorName: op.name,
        date: newDate,
        time: newTime,
        durationMinutes: serv.durationMinutes,
        notes: newNotes,
      });
      await refresh();
      setIsAddModalOpen(false);
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
      setNewNotes('');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-10 lg:py-14 bg-[#FAF7F7] min-h-screen space-y-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Intestazione Gestionale Dipendente */}
        <div className="p-6 bg-[#261F21] text-[#FAF7F7] rounded-3xl border border-[#AA853D]/30 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#FAF7F7]">
                Gestionale Staff · Il Sogno della Bellezza
              </span>
              <span className="text-[10px] bg-white/20 text-[#FAF7F7] font-semibold px-2 py-0.5 rounded uppercase">
                Account Dipendente
              </span>
            </div>
            <p className="text-xs text-[#DEC7CA] mt-1">
              Accesso operativo: Agenda appuntamenti, gestione presenze e ricerca anagrafica clienti.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-[#DEC7CA]">
              Collegata: <strong className="text-[#FAF7F7]">{profile?.fullName}</strong>
            </span>
            {profile?.role === 'titolare' && (
              <button
                onClick={() => onNavigate('gestionale-titolare')}
                className="px-3.5 py-1.5 bg-[#FAF7F7]/10 hover:bg-[#FAF7F7]/20 text-[#D8B268] text-xs font-semibold rounded-lg border border-[#AA853D]/40 transition-colors"
              >
                Passa ad Account Titolare →
              </button>
            )}
            <button
              onClick={signOut}
              className="px-3.5 py-1.5 bg-[#FAF7F7]/10 hover:bg-[#FAF7F7]/20 text-[#FAF7F7] text-xs font-semibold rounded-lg border border-white/20 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Esci
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-[#D8B268] hover:bg-[#AA853D] text-[#191415] text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Appuntamento</span>
            </button>
          </div>
        </div>

        {loadError && (
          <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
            Impossibile caricare i dati. Controlla la connessione e ricarica la pagina.
          </div>
        )}

        {/* Tab di Navigazione */}
        <div className="flex items-center gap-3 border-b border-[#EEDFE1] pb-2 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`py-2 px-4 rounded-xl transition-colors flex items-center gap-2 ${
              activeTab === 'agenda'
                ? 'bg-[#261F21] text-[#D8B268]'
                : 'bg-white text-[#736266] border border-[#EEDFE1]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Agenda Appuntamenti ({appointments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('clienti')}
            className={`py-2 px-4 rounded-xl transition-colors flex items-center gap-2 ${
              activeTab === 'clienti'
                ? 'bg-[#261F21] text-[#D8B268]'
                : 'bg-white text-[#736266] border border-[#EEDFE1]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Cerca Clienti ({clients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('galleria')}
            className={`py-2 px-4 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'galleria'
                ? 'bg-[#261F21] text-[#D8B268]'
                : 'bg-white text-[#736266] border border-[#EEDFE1]'
            }`}
          >
            <span>🖼️ Galleria</span>
          </button>
        </div>

        {activeTab === 'galleria' && <GalleryManager />}

        {/* TAB 1: AGENDA APPUNTAMENTI */}
        {activeTab === 'agenda' && (
          <div className="space-y-4">
            {/* Barra Filtri */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EEDFE1] shadow-2xs">
              <div className="flex items-center gap-1 bg-[#FAF5F5] p-1 rounded-xl text-xs">
                <button
                  onClick={() => setDateFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    dateFilter === 'all' ? 'bg-[#261F21] text-[#D8B268]' : 'text-[#736266]'
                  }`}
                >
                  Tutti i giorni
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
                  Domani
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
                  placeholder="Cerca cliente, codice o trattamento..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                />
              </div>
            </div>

            {/* Tabella Appuntamenti (Senza Prezzi né Dati Contabili) */}
            <div className="bg-white rounded-2xl border border-[#EEDFE1] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="mobile-cards w-full text-left text-xs">
                  <thead className="bg-[#FAF5F5] border-b border-[#EEDFE1] text-[#736266] uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Codice & Data</th>
                      <th className="py-3 px-4">Cliente & Contatto</th>
                      <th className="py-3 px-4">Trattamento</th>
                      <th className="py-3 px-4">Operatrice</th>
                      <th className="py-3 px-4">Stato Appuntamento</th>
                      <th className="py-3 px-4 text-right">Note</th>
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

                        <td className="py-3.5 px-4 text-right max-w-xs truncate text-[#8F7D82]">
                          {app.notes || '—'}
                        </td>
                      </tr>
                    ))}

                    {filteredAppointments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-[#8F7D82]">
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

        {/* TAB 2: CERCA CLIENTI */}
        {activeTab === 'clienti' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EEDFE1] shadow-2xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8F7D82] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Cerca cliente per nome, cellulare o note..."
                  className="w-full pl-9.5 pr-4 py-2.5 text-xs bg-white border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
                />
              </div>
              <span className="text-xs text-[#736266] shrink-0">
                {filteredClients.length} clienti registrati
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((c) => (
                <div key={c.id} className="bg-white p-5 rounded-2xl border border-[#EEDFE1] shadow-2xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#261F21]">{c.fullName}</h4>
                      <span className="text-[11px] text-[#8F7D82]">
                        Ultima seduta: {c.lastVisitDate || 'N/D'}
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Nuovo Appuntamento Banco */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-[#EEDFE1] shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-[#F7EFEF] pb-3">
                <h3 className="font-serif text-lg font-bold text-[#261F21]">
                  Nuovo Appuntamento (Telefono o Banco)
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
                      placeholder="Es. Martina B."
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
                  <label className="text-xs font-medium text-[#261F21]">Email (per il promemoria)</label>
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
                          {s.name}
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
                    placeholder="Allergie o richieste particolari..."
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
                    {saving ? 'Salvataggio…' : 'Salva Appuntamento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
