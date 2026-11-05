export type PageId =
  | 'home'
  | 'trattamenti'
  | 'promo'
  | 'prenota'
  | 'recensioni'
  | 'galleria'
  | 'chi-siamo'
  | 'gestionale'
  | 'account';

export interface NavigationProps {
  currentPage: PageId;
  onNavigate: (page: PageId, serviceId?: string) => void;
}
