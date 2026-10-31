import { Appointment, Client, FinancialSummary, Review, Service } from '../types';
import { INITIAL_APPOINTMENTS, INITIAL_CLIENTS, INITIAL_REVIEWS, SERVICES } from '../data/mockData';

const APPOINTMENTS_KEY = 'ilsogno_appointments_v1';
const CLIENTS_KEY = 'ilsogno_clients_v1';
const REVIEWS_KEY = 'ilsogno_reviews_v1';
const EMAIL_LOGS_KEY = 'ilsogno_email_logs_v1';

export interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  appointmentCode: string;
  date: string;
  time: string;
  serviceName: string;
  sentAt: string;
  status: 'inviata' | 'fallita';
  triggerType: 'cron_job_24h' | 'manuale_gestionale';
}

export function getStoredAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(APPOINTMENTS_KEY);
    if (!raw) {
      localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(INITIAL_APPOINTMENTS));
      return INITIAL_APPOINTMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_APPOINTMENTS;
  }
}

export function saveAppointment(appointment: Omit<Appointment, 'id' | 'code' | 'createdAt'>): Appointment {
  const current = getStoredAppointments();
  const codeNumber = Math.floor(1000 + Math.random() * 9000);
  const newAppointment: Appointment = {
    ...appointment,
    id: `app-${Date.now()}`,
    code: `SOGNO-${codeNumber}`,
    createdAt: new Date().toISOString(),
    status: 'confermato',
    reminderSent: false,
    paymentMethod: 'non_saldato',
  };

  const updated = [newAppointment, ...current];
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updated));

  // Sync or create client
  syncClientFromAppointment(newAppointment);

  window.dispatchEvent(new Event('ilsogno_storage_change'));
  return newAppointment;
}

export function updateAppointmentStatus(
  id: string,
  status: Appointment['status'],
  paymentMethod?: Appointment['paymentMethod']
): void {
  const current = getStoredAppointments();
  const updated = current.map((app) => {
    if (app.id === id) {
      return {
        ...app,
        status,
        ...(paymentMethod ? { paymentMethod } : {}),
      };
    }
    return app;
  });
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('ilsogno_storage_change'));
}

export function getStoredClients(): Client[] {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    if (!raw) {
      localStorage.setItem(CLIENTS_KEY, JSON.stringify(INITIAL_CLIENTS));
      return INITIAL_CLIENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CLIENTS;
  }
}

export function searchClients(query: string): Client[] {
  const clients = getStoredClients();
  const q = query.trim().toLowerCase();
  if (!q) return clients;
  return clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(q) ||
      c.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
      c.email.toLowerCase().includes(q)
  );
}

function syncClientFromAppointment(app: Appointment) {
  const clients = getStoredClients();
  const existingIndex = clients.findIndex(
    (c) => c.email.toLowerCase() === app.clientEmail.toLowerCase() || c.phone === app.clientPhone
  );

  if (existingIndex >= 0) {
    const existing = clients[existingIndex];
    clients[existingIndex] = {
      ...existing,
      fullName: app.clientName,
      totalVisits: existing.totalVisits + 1,
      totalSpent: existing.totalSpent + app.servicePrice,
      lastVisitDate: app.date,
      preferredOperatorId: app.operatorId,
    };
  } else {
    const newClient: Client = {
      id: `client-${Date.now()}`,
      fullName: app.clientName,
      phone: app.clientPhone,
      email: app.clientEmail,
      notes: app.notes || 'Nuova cliente registrata da prenotazione online',
      totalVisits: 1,
      totalSpent: app.servicePrice,
      lastVisitDate: app.date,
      preferredOperatorId: app.operatorId,
    };
    clients.unshift(newClient);
  }

  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

export function getStoredReviews(): Review[] {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    if (!raw) {
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(INITIAL_REVIEWS));
      return INITIAL_REVIEWS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_REVIEWS;
  }
}

export function addReview(review: Omit<Review, 'id' | 'date' | 'verified' | 'source'>): Review {
  const current = getStoredReviews();
  const newReview: Review = {
    ...review,
    id: `rev-${Date.now()}`,
    date: 'Oggi',
    verified: true,
    source: 'Verificata',
  };
  const updated = [newReview, ...current];
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('ilsogno_storage_change'));
  return newReview;
}

export function getStoredEmailLogs(): EmailLog[] {
  try {
    const raw = localStorage.getItem(EMAIL_LOGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function logEmailSent(log: Omit<EmailLog, 'id' | 'sentAt'>): EmailLog {
  const current = getStoredEmailLogs();
  const newLog: EmailLog = {
    ...log,
    id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    sentAt: new Date().toISOString(),
  };
  const updated = [newLog, ...current];
  localStorage.setItem(EMAIL_LOGS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('ilsogno_storage_change'));
  return newLog;
}

export function computeFinancialSummary(): FinancialSummary {
  const appointments = getStoredAppointments();
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);
  const currentYearStr = todayStr.substring(0, 4);

  let todayRevenue = 0;
  let monthRevenue = 0;
  let yearRevenue = 0;
  let completedCount = 0;
  const serviceStats: Record<string, { revenue: number; count: number }> = {};

  appointments.forEach((app) => {
    // Only count completed or confirmed appointments for valid tracking
    const price = app.servicePrice || 0;
    const isRevenueEligible = app.status !== 'annullato';

    if (isRevenueEligible) {
      if (app.date === todayStr) {
        todayRevenue += price;
      }
      if (app.date.startsWith(currentMonthStr)) {
        monthRevenue += price;
      }
      if (app.date.startsWith(currentYearStr)) {
        yearRevenue += price;
      }

      if (app.status === 'completato') {
        completedCount++;
      }

      if (!serviceStats[app.serviceName]) {
        serviceStats[app.serviceName] = { revenue: 0, count: 0 };
      }
      serviceStats[app.serviceName].revenue += price;
      serviceStats[app.serviceName].count += 1;
    }
  });

  const topServices = Object.entries(serviceStats)
    .map(([name, stat]) => ({ name, revenue: stat.revenue, count: stat.count }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const averageTicket =
    appointments.length > 0
      ? Math.round(
          appointments.reduce((acc, curr) => acc + (curr.servicePrice || 0), 0) /
            appointments.length
        )
      : 0;

  return {
    todayRevenue,
    monthRevenue,
    yearRevenue,
    completedAppointmentsCount: completedCount,
    averageTicket,
    topServices,
  };
}
