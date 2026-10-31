import { Service, Operator, TreatmentCategory, Client } from '../types';

export type PageId =
  | 'home'
  | 'trattamenti'
  | 'laser'
  | 'prenota'
  | 'recensioni'
  | 'chi-siamo'
  | 'gestionale-dipendenti'
  | 'gestionale-titolare';

export interface NavigationProps {
  currentPage: PageId;
  onNavigate: (page: PageId, serviceId?: string) => void;
}
