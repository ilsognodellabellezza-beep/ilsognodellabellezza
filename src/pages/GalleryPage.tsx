import React, { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { GalleryPhoto, listGalleryPhotos } from '../lib/storage';
import { PageId } from '../types/navigation';

interface GalleryPageProps {
  onNavigate: (page: PageId) => void;
}

export const GalleryPage: React.FC<GalleryPageProps> = ({ onNavigate }) => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    listGalleryPhotos()
      .then(setPhotos)
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="py-10 lg:py-16 bg-[#FAF7F7] min-h-[70vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#261F21]">Galleria</h1>
          <p className="text-sm text-[#55474A]">Uno sguardo al salone e ai nostri trattamenti.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-[#8F7D82]">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <p className="text-center text-sm text-[#8F7D82] py-16">Presto nuove foto. Torna a trovarci!</p>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 [&>*]:mb-3">
            {photos.map((p) => (
              <button
                key={p.id}
                onClick={() => setOpen(p)}
                className="block w-full break-inside-avoid rounded-2xl overflow-hidden border border-[#EEDFE1] bg-white"
              >
                <img src={p.url} alt={p.caption || 'Foto del salone'} loading="lazy" className="w-full h-auto" />
                {p.caption && <span className="block p-2.5 text-left text-xs text-[#55474A]">{p.caption}</span>}
              </button>
            ))}
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => onNavigate('prenota')}
            className="min-h-12 px-8 bg-[#261F21] text-[#FAF7F7] text-sm font-semibold rounded-xl"
          >
            Prenota il tuo appuntamento
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-3" onClick={() => setOpen(null)}>
          <button
            aria-label="Chiudi"
            className="absolute top-3 right-3 w-12 h-12 rounded-full bg-white/15 text-white flex items-center justify-center"
            style={{ marginTop: 'env(safe-area-inset-top)' }}
          >
            <X className="w-6 h-6" />
          </button>
          <img src={open.url} alt={open.caption || 'Foto del salone'} className="max-h-[80vh] max-w-full object-contain rounded-xl" />
          {open.caption && <p className="mt-3 text-sm text-white/90 text-center">{open.caption}</p>}
        </div>
      )}
    </div>
  );
};
