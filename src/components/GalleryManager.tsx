import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { GalleryPhoto, listGalleryPhotos, uploadGalleryPhoto, deleteGalleryPhoto } from '../lib/storage';

/** Pannello del gestionale per caricare ed eliminare le foto della galleria. */
export const GalleryManager: React.FC = () => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    try {
      setPhotos(await listGalleryPhotos());
      setError(null);
    } catch {
      setError('Galleria non disponibile. Esegui lo script supabase/05-galleria.sql nel database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    const list = Array.from(files);
    try {
      for (let i = 0; i < list.length; i++) {
        setProgress(`Caricamento ${i + 1} di ${list.length}…`);
        await uploadGalleryPhoto(list[i], list.length === 1 ? caption : '');
      }
      setCaption('');
      await refresh();
    } catch (e) {
      setError(`Caricamento non riuscito: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setProgress('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (photo: GalleryPhoto) => {
    if (!window.confirm('Eliminare questa foto dalla galleria?')) return;
    try {
      await deleteGalleryPhoto(photo);
      setPhotos((p) => p.filter((x) => x.id !== photo.id));
    } catch (e) {
      setError(`Eliminazione non riuscita: ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-[#261F21]">Carica nuove foto</h3>
          <p className="text-xs text-[#55474A]">
            Scegli una o più foto dal telefono (o scattale al momento). Compaiono subito nella pagina Galleria del sito.
          </p>
        </div>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={160}
          placeholder="Didascalia (facoltativa, per una foto singola)"
          className="w-full px-4 py-3 rounded-xl border border-[#DEC7CA] bg-[#FAF7F7] focus:outline-none focus:border-[#AA853D]"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="w-full sm:w-auto min-h-12 px-6 bg-[#261F21] text-[#FAF7F7] disabled:opacity-60 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4 text-[#D8B268]" />}
          <span>{busy ? progress : 'Scegli foto da caricare'}</span>
        </button>
        {error && (
          <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
            {error}
          </p>
        )}
      </div>

      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#EEDFE1] shadow-2xs space-y-4">
        <h3 className="font-serif text-lg font-bold text-[#261F21]">Foto in galleria ({photos.length})</h3>
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-[#8F7D82]" />
        ) : photos.length === 0 ? (
          <p className="text-xs text-[#8F7D82]">Nessuna foto ancora. Caricane una qui sopra.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="relative rounded-2xl overflow-hidden border border-[#EEDFE1] bg-[#FAF5F5]">
                <img src={p.url} alt={p.caption || 'Foto galleria'} loading="lazy" className="w-full aspect-square object-cover" />
                {p.caption && <p className="p-2 text-[11px] text-[#55474A] truncate">{p.caption}</p>}
                <button
                  type="button"
                  aria-label="Elimina foto"
                  onClick={() => handleDelete(p)}
                  className="absolute top-2 right-2 w-10 h-10 rounded-full bg-white/95 text-red-600 shadow flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
