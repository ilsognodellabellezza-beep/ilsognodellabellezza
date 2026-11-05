export type PageId =
  | 'home'
  | 'trattamenti'
  | 'promo'
  | 'prenota'
  | 'recensioni'
  | 'galleria'
  | 'chi-siamo'
  | 'gestionale'
  | 'account'
  | 'installa-app';

export interface NavigationProps {
  currentPage: PageId;
  onNavigate: (page: PageId, serviceId?: string) => void;
}
