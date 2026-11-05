export type TreatmentCategory =
  | 'laser'
  | 'viso'
  | 'corpo'
  | 'sguardo'
  | 'mani'
  | 'pedicure'
  | 'makeup';

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
  /** servizi aggiunti dal titolare: operatrici abilitate (per id) */
  operatorIds?: string[];
  /** servizio creato dal titolare nel gestionale */
  custom?: boolean;
  active?: boolean;
}

export interface Operator {
  id: string;
  name: string;
  role: string;
  specialization: string;
  type: 'titolare' | 'lash-master' | 'laser-specialist' | 'estetica-base';
  avatar?: string;
  bio: string;
  /** dipendente aggiunta dal titolare nel gestionale */
  custom?: boolean;
  /** servizi (id) che questa dipendente può eseguire, oltre a quelli per tipo */
  serviceIds?: string[];
  active?: boolean;
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
}

export interface Client {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  notes?: string;
  allergies?: string;
  totalVisits: number;
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

