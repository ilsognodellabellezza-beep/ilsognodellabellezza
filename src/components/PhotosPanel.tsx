import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Users } from 'lucide-react';
import { useSiteConfig } from '../lib/siteSettings';
import {
  operatorPhotoUrl,
  removeOperatorPhoto,
  setOperatorPhoto,
  useSalon,
} from '../lib/salon';

const cardCls = 'bg-white border border-[#EEDFE1] rounded-3xl p-5 sm:p-6 space-y-4';
const SQL_HINT = 'Esegui lo script supabase/08-novita-sito-gestionale.sql nel database (SQL Editor di Supabase).';
const errText = (e: unknown) => {
  const m = (e as Error).message || '';
  return /service_photos|operator_photos|schema cache|relation|bucket/i.test(m) ? SQL_HINT : m;
};

/** Riga con foto, pulsante "Carica / Sostituisci" e "Rimuovi". */
const PhotoRow: React.FC<{
  label: string;
  sub?: string;
  url: string | null;
  round?: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}> = ({ label, sub, url, round, onUpload, onRemove }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-2xl border border-[#EEDFE1] bg-[#FCF8F8]">
      {url ? (
        <img src={url} alt="" className={`w-14 h-14 object-cover shrink-0 border border-[#EEDFE1] ${round ? 'rounded-full' : 'rounded-xl'}`} />
      ) : (
        <div className={`w-14 h-14 shrink-0 bg-[#F1E6E8] flex items-center justify-center text-[#AA853D] ${round ? 'rounded-full' : 'rounded-xl'}`}>
          <ImageIcon className="w-5 h-5 opacity-60" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#261F21] truncate">{label}</p>
        {sub && <p className="text-[10px] text-[#8F7D82] truncate">{sub}</p>}
        {error && <p className="text-[11px] text-red-700">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) run(() => onUpload(f));
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="px-3 py-2 bg-[#261F21] text-[#D8B268] text-[11px] font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-40 shrink-0"
      >
        <Camera className="w-3.5 h-3.5" /> {busy ? 'Attendi…' : url ? 'Sostituisci' : 'Carica'}
      </button>
      {url && (
        <button type="button" disabled={busy} aria-label="Rimuovi foto" onClick={() => run(onRemove)} className="p-2 border border-red-200 text-red-600 rounded-lg shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

/** Foto delle dipendenti (sito, prenotazione, agenda). */
export const TeamPhotosPanel: React.FC = () => {
  const { allOperators } = useSiteConfig();
  useSalon();
  return (
    <section className={cardCls}>
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-[#AA853D]" />
        <h3 className="font-serif text-lg font-bold text-[#261F21]">Foto del team</h3>
      </div>
      <p className="text-[11px] text-[#8F7D82]">
        Le foto compaiono nella sezione “Il nostro team”, nella scelta dell’operatrice in prenotazione e nell’agenda. Caricandone una nuova sostituisci la precedente.
      </p>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {allOperators.map((o) => (
          <PhotoRow
            key={o.id}
            round
            label={o.name}
            sub={o.role}
            url={operatorPhotoUrl(o.id)}
            onUpload={(f) => setOperatorPhoto(o.id, f)}
            onRemove={() => removeOperatorPhoto(o.id)}
          />
        ))}
      </div>
    </section>
  );
};

