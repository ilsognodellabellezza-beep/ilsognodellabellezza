import React from 'react';
import { Sparkles } from 'lucide-react';
import { servicePhotoUrl, operatorPhotoUrl } from '../lib/salon';

/** Foto di un trattamento; senza foto mostra un riquadro elegante con il nome. */
export const ServicePhoto: React.FC<{
  serviceId: string;
  name: string;
  className?: string;
  /** immagini sotto la piega: caricate solo quando servono */
  lazy?: boolean;
}> = ({ serviceId, name, className = '', lazy = true }) => {
  const url = servicePhotoUrl(serviceId);
  if (url) {
    return <img src={url} alt={name} loading={lazy ? 'lazy' : 'eager'} decoding="async" className={`object-cover ${className}`} />;
  }
  return (
    <div
      role="img"
      aria-label={name}
      className={`bg-gradient-to-br from-[#FAF0F2] via-[#F7EFEF] to-[#EEDFE1] flex items-center justify-center text-[#AA853D] ${className}`}
    >
      <Sparkles className="w-8 h-8 opacity-60" />
    </div>
  );
};

/** Foto tonda di una dipendente; senza foto mostra le iniziali. */
export const OperatorAvatar: React.FC<{ operatorId: string; name: string; className?: string }> = ({ operatorId, name, className = 'w-11 h-11' }) => {
  const url = operatorPhotoUrl(operatorId);
  if (url) {
    return <img src={url} alt={name} loading="lazy" decoding="async" className={`rounded-full object-cover border border-[#AA853D]/40 shrink-0 ${className}`} />;
  }
  return (
    <div
      aria-label={name}
      className={`rounded-full bg-[#261F21] text-[#D8B268] flex items-center justify-center font-serif font-bold border border-[#AA853D]/40 shrink-0 ${className}`}
    >
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
};
