export type TreatmentCategory =
  | 'laser'
  | 'viso'
  | 'massaggi'
  | 'sguardo'
  | 'mani-piedi'
  | 'corpo'
  | 'epilazione';

export interface Service {
  id: string;
  name: string;
  category: TreatmentCategory;
  categoryLabel: string;
  price: number;
  promoPrice?: number;
  durationMinutes: number;
  description: string;
  benefits: string[];
  onlyWomen?: boolean; // Specific constraint for massages and specific female services
  isPopular?: boolean;
  operatorTypes: ('titolare' | 'lash-master' | 'laser-specialist' | 'estetica-base')[];
}

export interface Operator {
  id: string;
  name: string;
  role: string;
  specialization: string;
  type: 'titolare' | 'lash-master' | 'laser-specialist' | 'estetica-base';
  avatar?: string;
  bio: string;
}

export type AppointmentStatus = 'confermato' | 'in_corso' | 'completato' | 'annullato';

export interface Appointment {
  id: string;
  code: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  operatorId: string;
  operatorName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string;
  reminderSent?: boolean;
  createdAt: string;
  paymentMethod?: 'contanti' | 'pos' | 'bonifico' | 'non_saldato';
}

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  notes?: string;
  allergies?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisitDate?: string;
  preferredOperatorId?: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number; // 1-5
  date: string;
  treatmentName: string;
  comment: string;
  verified: boolean;
  source: 'Google' | 'Fresha' | 'Verificata';
}

export interface FinancialSummary {
  todayRevenue: number;
  monthRevenue: number;
  yearRevenue: number;
  completedAppointmentsCount: number;
  averageTicket: number;
  topServices: { name: string; revenue: number; count: number }[];
}

export type UserRole = 'dipendente' | 'titolare';
