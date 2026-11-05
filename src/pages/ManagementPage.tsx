import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Users,
  Search,
  CheckCircle,
  Send,
  Check,
  Eye,
  Plus,
  X,
  LogOut,
  Star,
  Trash2,
  MessageSquare,
  Ban,
  Megaphone,
  Settings,
  Image as ImageIcon,
} from 'lucide-react';
import { Appointment, Client, AppointmentStatus } from '../types';
import {
  getStoredAppointments,
  updateAppointmentStatus,
  getStoredClients,
  searchClients,
  getStoredEmailLogs,
  saveAppointment,
  loadManagementData,
  triggerReminderEmails,
  getAllDbReviews,
  setReviewApproved,
  deleteReview,
  STORAGE_EVENT,
  EmailLog,
  PendingReview,
} from '../lib/storage';
import { useAuth } from '../lib/auth';
import { GalleryManager } from '../components/GalleryManager';
import { SlotPicker } from '../components/SlotPicker';
import { SearchPicker } from '../components/SearchPicker';
import { toLocalDateStr, addDays } from '../lib/dates';
import { SiteSettingsPanel } from '../components/SiteSettingsPanel';
import { AgendaTab } from '../components/AgendaBoard';
import { PromoManager } from '../components/PromoManager';
import { ClosuresPanel } from '../components/ClosuresPanel';
import { BlocksPanel } from '../components/BlocksPanel';
import { LaserPanel } from '../components/LaserPanel';
import { OperatorAvatar } from '../components/ServicePhoto';
import { useSiteConfig, loadSiteConfig } from '../lib/siteSettings';
import { useSalon, loadSalonData, formatPhone, getContact } from '../lib/salon';
import { PageId } from '../types/navigation';

interface ManagementPageProps {
  onNavigate: (page: PageId) => void;
}

type Tab = 'agenda' | 'clienti' | 'promo' | 'calendario' | 'sito' | 'galleria' | 'cloud';

/** Gestionale unico: un solo accesso, nessuna contabilità. */
export const ManagementPage: React.FC<ManagementPageProps> = () => {
  const [activeTab, setActiveTab] = useState<Tab>('agenda');
  const [blockSignal, setBlockSignal] = useState(0);

  const { allServices: SERVICES, operators: OPERATORS } = useSiteConfig();
  useSalon();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  // Filtri
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'all'>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [appointmentSearch, setAppointmentSearch] = useState<string>('');
  const [clientSearch, setClientSearch] = useState<string>('');

  // Nuovo appuntamento da banco
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newServiceId, setNewServiceId] = useState(SERVICES[0]?.id ?? '');
  const [newOperatorId, setNewOperatorId] = useState(OPERATORS[0]?.id ?? '');
  const [newDate, setNewDate] = useState(toLocalDateStr());
  const [newTime, setNewTime] = useState('10:00');
  const [newNotes, setNewNotes] = useState('');

  const [previewEmailApp, setPreviewEmailApp] = useState<Appointment | null>(null);

  const { profile, signOut } = useAuth();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [dbReviews, setDbReviews] = useState<PendingReview[]>([]);

  const readCache = () => {
    setAppointments(getStoredAppointments());
    setClients(getStoredClients());
    setEmailLogs(getStoredEmailLogs());
    setDbReviews(getAllDbReviews());
  };

  const refresh = () =>
    loadManagementData()
      .then(() => setLoadError(null))
      .catch((err: Error) => setLoadError(err.message));

  useEffect(() => {
    readCache();
    refresh();
    // dopo l'accesso si rileggono i dati completi dello staff (note dei blocchi, promo archiviate…)
    loadSalonData(true).catch(() => undefined);
    loadSiteConfig(true).catch(() => undefined);
    window.addEventListener(STORAGE_EVENT, readCache);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener(STORAGE_EVENT, readCache);
      window.clearInterval(interval);
    };
  }, []);

  const pendingReviews = dbReviews.filter((r) => !r.approved);

  const filteredAppointments = useMemo(() => {
    const todayStr = toLocalDateStr();
    const tomorrowStr = toLocalDateStr(addDays(new Date(), 1));

    return appointments.filter((app) => {
      if (dateFilter === 'today' && app.date !== todayStr) return false;
      if (dateFilter === 'tomorrow' && app.date !== tomorrowStr) return false;
      if (operatorFilter !== 'all' && app.operatorId !== operatorFilter) return false;

      if (appointmentSearch.trim()) {
        const q = appointmentSearch.toLowerCase();
        const matches =
          app.clientName.toLowerCase().includes(q) ||
          app.code.toLowerCase().includes(q) ||
          app.clientPhone.includes(q) ||
          app.serviceName.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [appointments, dateFilter, operatorFilter, appointmentSearch]);

  const filteredClients = useMemo(() => searchClients(clientSearch), [clients, clientSearch]);

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

  const handleTriggerResendCronJob = async () => {
    setSendingReminders(true);
    try {
      const r = await triggerReminderEmails();
      await refresh();
      alert(r.processed === 0 ? 'Nessun appuntamento da ricordare per domani.' : `Promemoria inviati: ${r.sent}. Falliti: ${r.failed}.`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSendingReminders(false);
    }
  };

  const handleReviewApproval = async (id: string, approved: boolean) => {
    try {
      await setReviewApproved(id, approved);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleReviewDelete = async (id: string) => {
    if (!confirm('Eliminare definitivamente questa recensione?')) return;
    try {
      await deleteReview(id);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'agenda', label: `Agenda (${appointments.length})`, icon: <Calendar className="w-4 h-4" /> },
    { id: 'clienti', label: `Clienti (${clients.length})`, icon: <Users className="w-4 h-4" /> },
    { id: 'promo', label: 'Promozioni', icon: <Megaphone className="w-4 h-4 text-[#AA853D]" /> },
    { id: 'calendario', label: 'Chiusure, blocchi e laser', icon: <Ban className="w-4 h-4 text-[#8A3B49]" /> },
    { id: 'sito', label: 'Gestione sito', icon: <Settings className="w-4 h-4 text-[#AA853D]" /> },
    { id: 'galleria', label: 'Galleria', icon: <ImageIcon className="w-4 h-4" /> },
    {
      id: 'cloud',
      label: `Promemoria e recensioni${pendingReviews.length > 0 ? ` (${pendingReviews.length} da approvare)` : ''}`,
      icon: <MessageSquare className="w-4 h-4 text-[#AA853D]" />,
    },
  ];

  return (
    <div className="py-10 lg:py-14 bg-[#FAF7F7] min-h-screen space-y-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Intestazione */}
        <div className="p-6 sm:p-8 bg-[#261F21] text-[#FAF7F7] rounded-3xl border border-[#AA853D]/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#FAF7F7]">Gestionale · Chiara & Melania</span>
            <p className="text-xs sm:text-sm text-[#DEC7CA]">Agenda, clienti, promozioni, chiusure e blocchi, contenuti del sito.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-[#DEC7CA]">
              Collegata: <strong className="text-[#FAF7F7]">{profile?.fullName}</strong>
            </span>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-[#FAF7F7] text-xs font-semibold rounded-xl border border-white/20 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Esci
            </button>
            <button
              onClick={() => {
                setActiveTab('calendario');
                setBlockSignal((n) => n + 1);
              }}
              className="px-4 py-2 bg-[#8A3B49] hover:bg-[#6F2E3A] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Ban className="w-4 h-4" />
              <span>Blocca appuntamenti</span>
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

        {/* Schede */}
        <div className="flex items-center gap-2 sm:gap-3 border-b border-[#EEDFE1] pb-2 text-xs font-bold overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-2 px-4 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === t.id ? 'bg-[#261F21] text-[#D8B268]' : 'bg-white text-[#736266] border border-[#EEDFE1]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {loadError && (
          <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
            Impossibile caricare i dati. Controlla la connessione e ricarica la pagina.
          </div>
        )}

        {/* AGENDA */}
        {activeTab === 'agenda' && (
          <AgendaTab
            appointments={appointments}
            onPreviewEmail={(a) => setPreviewEmailApp(a)}
            onStatusChange={handleStatusChange}
            onAddAt={(date, time, operatorId) => {
              setNewDate(date);
              setNewTime(time);
              setNewOperatorId(operatorId);
              setIsAddModalOpen(true);
            }}
            listView={
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EEDFE1] shadow-2xs">
                  <div className="flex items-center gap-1 bg-[#FAF5F5] p-1 rounded-xl text-xs">
                    {(
                      [
                        ['all', 'Tutti'],
                        ['today', 'Oggi'],
                        ['tomorrow', 'Domani'],
                      ] as ['all' | 'today' | 'tomorrow', string][]
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setDateFilter(id)}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${dateFilter === id ? 'bg-[#261F21] text-[#D8B268]' : 'text-[#736266]'}`}
                      >
                        {label}
                      </button>
                    ))}
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

                  {/* Filtro per dipendente, con la foto */}
                  <div className="w-full flex flex-wrap items-center gap-2 text-xs">
                    <button
                      onClick={() => setOperatorFilter('all')}
                      className={`px-3 py-1.5 rounded-full border font-semibold ${operatorFilter === 'all' ? 'bg-[#261F21] text-[#D8B268] border-[#261F21]' : 'bg-white text-[#55474A] border-[#DEC7CA]'}`}
                    >
                      Tutte
                    </button>
                    {OPERATORS.map((op) => (
                      <button
                        key={op.id}
                        onClick={() => setOperatorFilter(op.id)}
                        className={`pl-1 pr-3 py-1 rounded-full border font-semibold flex items-center gap-2 ${operatorFilter === op.id ? 'bg-[#261F21] text-[#D8B268] border-[#261F21]' : 'bg-white text-[#55474A] border-[#DEC7CA]'}`}
                      >
                        <OperatorAvatar operatorId={op.id} name={op.name} className="w-7 h-7 text-[10px]" />
                        {op.name}
                      </button>
                    ))}
                  </div>
                </div>

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
                          <th className="py-3 px-4 text-right">Promemoria</th>
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
                              <div className="text-[10px] text-[#8F7D82]">Durata: {app.durationMinutes} min</div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-2 font-medium text-[#261F21]">
                                <OperatorAvatar operatorId={app.operatorId} name={app.operatorName} className="w-7 h-7 text-[10px]" />
                                {app.operatorName}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <select
                                value={app.status}
                                onChange={(e) => handleStatusChange(app.id, e.target.value as AppointmentStatus)}
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
                                <button onClick={() => setPreviewEmailApp(app)} className="inline-flex items-center gap-1 text-[11px] text-[#AA853D] hover:underline">
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
            }
          />
        )}

        {/* CLIENTI */}
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
              <span className="text-xs text-[#736266] shrink-0">{filteredClients.length} clienti in archivio</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((c) => (
                <div key={c.id} className="bg-white p-5 rounded-2xl border border-[#EEDFE1] shadow-2xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#261F21]">{c.fullName}</h4>
                      <span className="text-[11px] text-[#8F7D82]">Ultima visita: {c.lastVisitDate || 'N/D'}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-[#FAF0F2] text-[#AA853D] px-2 py-0.5 rounded font-bold">{c.totalVisits} visite</span>
                  </div>

                  <div className="text-xs text-[#55474A] space-y-1">
                    <p>
                      Tel:{' '}
                      <a href={`tel:${c.phone}`} className="font-bold text-[#261F21] hover:underline">
                        {c.phone}
                      </a>
                    </p>
                    <p className="truncate">Email: {c.email}</p>
                  </div>

                  {c.notes && <div className="p-2.5 bg-[#FAF5F5] rounded-xl text-[11px] text-[#55474A] italic">"{c.notes}"</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'promo' && <PromoManager />}

        {activeTab === 'calendario' && (
          <div className="space-y-6">
            <BlocksPanel appointments={appointments} onStatusChange={handleStatusChange} openSignal={blockSignal} />
            <ClosuresPanel />
            <LaserPanel />
          </div>
        )}

        {activeTab === 'sito' && <SiteSettingsPanel />}

        {activeTab === 'galleria' && <GalleryManager />}

        {/* PROMEMORIA & RECENSIONI */}
        {activeTab === 'cloud' && (
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#AA853D] font-bold">Automazione Notifiche 24 Ore Prima</span>
                  <h3 className="font-serif text-xl font-bold text-[#261F21]">Promemoria email automatici</h3>
                  <p className="text-xs text-[#55474A]">
                    Ogni mattina il sistema invia un'email di promemoria alle clienti con appuntamento il giorno dopo. Puoi anche lanciarlo a mano.
                  </p>
                </div>

                <button
                  onClick={handleTriggerResendCronJob}
                  disabled={sendingReminders}
                  className="disabled:opacity-60 inline-flex items-center gap-2 px-5 py-2.5 bg-[#AA853D] hover:bg-[#8C6E2E] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingReminders ? 'Invio in corso…' : 'Invia promemoria di domani adesso'}</span>
                </button>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-[#261F21] mb-2">Log Notifiche Email Inviate:</h4>
                <div className="max-h-48 overflow-y-auto border border-[#EEDFE1] rounded-2xl divide-y divide-[#F7EFEF] text-xs">
                  {emailLogs.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#8F7D82]">Nessun promemoria inviato finora.</div>
                  ) : (
                    emailLogs.map((log) => (
                      <div key={log.id} className="p-3 flex items-center justify-between hover:bg-[#FAF7F7]">
                        <div>
                          <span className="font-bold text-[#261F21]">{log.recipientName}</span> <span className="text-[#8F7D82]">({log.recipientEmail})</span>
                          <p className="text-[10px] text-[#736266]">
                            {log.serviceName} · App: {log.appointmentCode} per il {log.date} alle {log.time}
                          </p>
                        </div>
                        <div className="text-right">
                          {log.status === 'inviata' ? (
                            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">Inviata</span>
                          ) : (
                            <span title={log.error} className="text-[10px] font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded font-bold">
                              Fallita
                            </span>
                          )}
                          <span className="block text-[9px] text-[#8F7D82] mt-0.5">{new Date(log.sentAt).toLocaleString('it-IT')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#AA853D] font-bold">Moderazione</span>
                <h3 className="font-serif text-xl font-bold text-[#261F21]">Recensioni inviate dal sito</h3>
                <p className="text-xs text-[#55474A]">Le nuove recensioni restano nascoste finché non le approvi.</p>
              </div>

              {dbReviews.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#8F7D82] border border-[#EEDFE1] rounded-2xl">Nessuna recensione ricevuta dal sito.</div>
              ) : (
                <div className="divide-y divide-[#F7EFEF] border border-[#EEDFE1] rounded-2xl text-xs">
                  {dbReviews.map((r) => (
                    <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#261F21]">{r.author}</span>
                          <span className="flex text-[#C5A059]">
                            {[...Array(r.rating)].map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-[#C5A059]" />
                            ))}
                          </span>
                          <span className="text-[#8F7D82]">
                            · {r.treatmentName} · {r.date}
                          </span>
                          {r.approved ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Pubblicata</span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Da approvare</span>
                          )}
                        </div>
                        <p className="text-[#4A4042] break-words">{r.comment}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.approved ? (
                          <button onClick={() => handleReviewApproval(r.id, false)} className="px-3 py-1.5 border border-[#DEC7CA] rounded-lg text-[#261F21] font-semibold">
                            Nascondi
                          </button>
                        ) : (
                          <button onClick={() => handleReviewApproval(r.id, true)} className="px-3 py-1.5 bg-[#261F21] text-[#FAF7F7] rounded-lg font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Approva
                          </button>
                        )}
                        <button onClick={() => handleReviewDelete(r.id)} aria-label="Elimina recensione" className="p-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nuovo appuntamento da banco */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-6 space-y-4 border border-[#EEDFE1] shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-[#F7EFEF] pb-3">
                <h3 className="font-serif text-lg font-bold text-[#261F21]">Nuovo Appuntamento da Banco</h3>
                <button onClick={() => setIsAddModalOpen(false)} aria-label="Chiudi" className="text-[#8F7D82] hover:text-[#261F21]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleQuickAdd} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#261F21]">Cerca cliente già registrata</label>
                  <SearchPicker
                    items={clients.map((c) => ({ id: c.id, label: c.fullName, hint: `${c.phone} · ${c.email}` }))}
                    value=""
                    onChange={(id) => {
                      const c = clients.find((x) => x.id === id);
                      if (!c) return;
                      setNewClientName(c.fullName);
                      setNewClientPhone(c.phone);
                      setNewClientEmail(c.email);
                      if (c.preferredOperatorId && OPERATORS.some((o) => o.id === c.preferredOperatorId)) setNewOperatorId(c.preferredOperatorId);
                    }}
                    placeholder="Cerca per nome, telefono o email…"
                  />
                </div>

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
                    <SearchPicker
                      items={SERVICES.map((s) => ({ id: s.id, label: s.name, hint: `${s.categoryLabel} · €${s.promoPrice || s.price}` }))}
                      value={newServiceId}
                      onChange={setNewServiceId}
                      placeholder="Cerca trattamento…"
                    />
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

                <SlotPicker
                  date={newDate}
                  time={newTime}
                  onDateChange={setNewDate}
                  onTimeChange={setNewTime}
                  operatorId={newOperatorId}
                  durationMinutes={(SERVICES.find((s) => s.id === newServiceId) || SERVICES[0]).durationMinutes}
                  refreshKey={appointments.length}
                />

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
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs text-[#55474A]">
                    Annulla
                  </button>
                  <button type="submit" className="px-5 py-2 bg-[#261F21] text-[#FAF7F7] hover:bg-[#191415] text-xs font-semibold rounded-xl shadow-sm">
                    {saving ? 'Salvataggio…' : 'Salva Appuntamento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Anteprima email di promemoria */}
        {previewEmailApp && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-[#EEDFE1] shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-[#F7EFEF] pb-3">
                <div>
                  <h4 className="font-serif font-bold text-base text-[#261F21]">Anteprima email di promemoria</h4>
                  <p className="text-[11px] text-[#736266]">Destinatario: {previewEmailApp.clientEmail}</p>
                </div>
                <button onClick={() => setPreviewEmailApp(null)} aria-label="Chiudi" className="text-[#8F7D82] hover:text-[#261F21]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="border border-[#DEC7CA] rounded-2xl overflow-hidden text-xs bg-[#FAF7F7]">
                <div className="bg-[#261F21] text-center p-4 text-[#FAF7F7]">
                  <p className="font-serif font-bold tracking-wider text-sm text-[#D8B268]">IL SOGNO DELLA BELLEZZA</p>
                  <p className="text-[10px] text-[#DEC7CA]">Chiara & Melania · Catania</p>
                </div>

                <div className="p-5 space-y-3 bg-white text-[#4A4042]">
                  <p>
                    Gentile <strong>{previewEmailApp.clientName}</strong>,
                  </p>
                  <p>
                    Ti ricordiamo il tuo appuntamento di domani presso il nostro centro estetico in <strong>Via delle Viole, 7/9 a Catania</strong>.
                  </p>

                  <div className="p-3.5 bg-[#FCF8F8] border border-[#EEDFE1] rounded-xl space-y-1">
                    <p className="font-bold text-[#261F21]">{previewEmailApp.serviceName}</p>
                    <p>📅 Data: {previewEmailApp.date} alle ore {previewEmailApp.time}</p>
                    <p>👤 Operatrice: {previewEmailApp.operatorName}</p>
                    <p className="font-mono text-[#AA853D] font-bold">Codice: {previewEmailApp.code}</p>
                  </div>

                  <p className="text-[11px] text-[#736266]">Per qualsiasi necessità o modifica, contattaci su WhatsApp al {formatPhone(getContact().whatsapp)}.</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => setPreviewEmailApp(null)} className="px-5 py-2 bg-[#261F21] text-white rounded-xl text-xs font-semibold">
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
