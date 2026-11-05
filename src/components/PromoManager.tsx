import React, { useState } from 'react';
import { Archive, ArchiveRestore, Copy, Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  Promotion,
  PromoInput,
  broadcastShareUrl,
  countdownLabel,
  deletePromotion,
  isPromoActive,
  promoBroadcastText,
  promoPhotoUrl,
  savePromotion,
  setPromoArchived,
  useSalon,
} from '../lib/salon';
import { useSiteConfig } from '../lib/siteSettings';
import { addDays, toLocalDateStr } from '../lib/dates';

const inputCls = 'px-2.5 py-2 text-xs bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D] w-full';
const cardCls = 'bg-white border border-[#EEDFE1] rounded-3xl p-5 sm:p-6 space-y-4';

const fmt = (d: string) => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${d}T12:00:00`));
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

interface FormState {
  title: string;
  description: string;
  promoPrice: string;
  originalPrice: string;
  serviceId: string;
  startsOn: string;
  endsOn: string;
  photoPath: string | null;
}

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  promoPrice: '',
  originalPrice: '',
  serviceId: '',
  startsOn: toLocalDateStr(),
  endsOn: toLocalDateStr(addDays(new Date(), 30)),
  photoPath: null,
});

const fromPromo = (p: Promotion): FormState => ({
  title: p.title,
  description: p.description,
  promoPrice: String(p.promoPrice),
  originalPrice: p.originalPrice === null ? '' : String(p.originalPrice),
  serviceId: p.serviceId ?? '',
  startsOn: p.startsOn,
  endsOn: p.endsOn,
  photoPath: p.photoPath,
});

const SQL_HINT = 'Esegui lo script supabase/08-novita-sito-gestionale.sql nel database (SQL Editor di Supabase).';
const errText = (e: unknown) => {
  const m = (e as Error).message || '';
  return /promotions|schema cache|relation/i.test(m) ? SQL_HINT : m;
};

/** Gestione promozioni: crea, modifica, duplica, archivia. La scadenza sul sito è automatica. */
export const PromoManager: React.FC = () => {
  const { promotions } = useSalon();
  const { allServices } = useSiteConfig();
  const [editing, setEditing] = useState<{ id?: string; form: FormState } | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<Promotion | null>(null);
  const [copied, setCopied] = useState(false);

  const today = toLocalDateStr();
  const live = promotions.filter((p) => isPromoActive(p, today));
  const upcoming = promotions.filter((p) => !p.archived && p.startsOn > today);
  const archive = promotions.filter((p) => p.archived || p.endsOn < today);

  const open = (id: string | undefined, form: FormState) => {
    setEditing({ id, form });
    setPhoto(null);
    setError(null);
    setPublished(null);
  };

  const save = async () => {
    if (!editing) return;
    const f = editing.form;
    const price = num(f.promoPrice);
    if (f.title.trim().length < 2) return setError('Inserisci il titolo della promo.');
    if (price === null || Number.isNaN(price) || price < 0) return setError('Inserisci il prezzo promo.');
    if (!f.startsOn || !f.endsOn) return setError('Data di inizio e di fine sono obbligatorie.');
    const orig = num(f.originalPrice);
    const input: PromoInput = {
      title: f.title,
      description: f.description,
      promoPrice: price,
      originalPrice: orig !== null && !Number.isNaN(orig) ? orig : null,
      serviceId: f.serviceId || null,
      startsOn: f.startsOn,
      endsOn: f.endsOn,
      photoPath: f.photoPath,
    };
    setBusy(true);
    setError(null);
    try {
      const saved = await savePromotion(input, editing.id, photo);
      setEditing(null);
      setPhoto(null);
      setPublished(saved);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      alert(errText(e));
    }
  };

  const duplicate = (p: Promotion) => {
    const span = Math.max(0, Math.round((new Date(`${p.endsOn}T12:00:00`).getTime() - new Date(`${p.startsOn}T12:00:00`).getTime()) / 86_400_000));
    open(undefined, { ...fromPromo(p), title: `${p.title} (copia)`, startsOn: today, endsOn: toLocalDateStr(addDays(new Date(), span)), photoPath: p.photoPath });
  };

  const broadcastText = published ? promoBroadcastText(published) : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#261F21]">Promozioni</h2>
          <p className="text-xs text-[#55474A] max-w-xl">
            Le promo compaiono sul sito dalla data di inizio e spariscono da sole alla data di fine: restano qui in archivio e le puoi riattivare. Se non ce ne sono di attive, la sezione Promo viene nascosta.
          </p>
        </div>
        <button
          type="button"
          onClick={() => open(undefined, emptyForm())}
          className="px-4 py-2.5 bg-[#261F21] text-[#D8B268] text-xs font-bold rounded-xl flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nuova promo
        </button>
      </div>

      {/* Dopo la pubblicazione: messaggio per la lista broadcast */}
      {published && (
        <section className="bg-[#FAF0F2] border border-[#DEC7CA] rounded-3xl p-5 sm:p-6 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#261F21]">Promo salvata</h3>
              <p className="text-xs text-[#5C242E]">
                Vuoi avvisare le clienti? Il pulsante apre WhatsApp con il testo pronto: scegli la tua lista broadcast e premi invia. (Le liste broadcast hanno un limite di contatti e arrivano solo a chi ha salvato il tuo numero.)
              </p>
            </div>
            <button type="button" aria-label="Chiudi" onClick={() => setPublished(null)} className="text-[#8F7D82]">
              <X className="w-5 h-5" />
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-xs bg-white border border-[#EEDFE1] rounded-xl p-3 font-sans text-[#261F21]">{broadcastText}</pre>
          <div className="flex flex-wrap gap-2">
            <a
              href={broadcastShareUrl(broadcastText)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-[#25D366] text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Megaphone className="w-4 h-4" /> Invia alla lista broadcast
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(broadcastText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-4 py-2.5 border border-[#DEC7CA] bg-white text-[#261F21] text-xs font-semibold rounded-xl flex items-center gap-1.5"
            >
              <Copy className="w-4 h-4" /> {copied ? 'Copiato!' : 'Copia testo'}
            </button>
          </div>
        </section>
      )}

      {editing && (
        <section className={`${cardCls} border-[#AA853D]`}>
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-[#261F21]">{editing.id ? 'Modifica promo' : 'Nuova promo'}</h3>
            <button type="button" aria-label="Chiudi" onClick={() => setEditing(null)} className="text-[#8F7D82]">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="sm:col-span-2 space-y-1 text-[11px] font-medium text-[#55474A]">
              <span>Titolo *</span>
              <input value={editing.form.title} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, title: e.target.value } })} className={inputCls} placeholder="Es. Pulizia viso + massaggio" />
            </label>
            <label className="sm:col-span-2 space-y-1 text-[11px] font-medium text-[#55474A]">
              <span>Descrizione</span>
              <textarea rows={3} value={editing.form.description} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, description: e.target.value } })} className={inputCls} />
            </label>
            <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
              <span>Prezzo promo (€) *</span>
              <input inputMode="decimal" value={editing.form.promoPrice} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, promoPrice: e.target.value } })} className={inputCls} />
            </label>
            <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
              <span>Prezzo di listino (€, facoltativo)</span>
              <input inputMode="decimal" value={editing.form.originalPrice} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, originalPrice: e.target.value } })} className={inputCls} />
            </label>
            <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
              <span>Inizio *</span>
              <input type="date" required value={editing.form.startsOn} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, startsOn: e.target.value } })} className={inputCls} />
            </label>
            <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
              <span>Fine * (l’ultimo giorno in cui la promo è visibile)</span>
              <input type="date" required value={editing.form.endsOn} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, endsOn: e.target.value } })} className={inputCls} />
            </label>
            <label className="sm:col-span-2 space-y-1 text-[11px] font-medium text-[#55474A]">
              <span>Trattamento da prenotare (facoltativo: il pulsante “Prenota” lo sceglie già)</span>
              <select value={editing.form.serviceId} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, serviceId: e.target.value } })} className={inputCls}>
                <option value="">Nessuno (prenotazione libera)</option>
                {allServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-2 space-y-1 text-[11px] font-medium text-[#55474A]">
              <span>Foto</span>
              <div className="flex items-center gap-3">
                {(photo || editing.form.photoPath) && (
                  <img
                    src={photo ? URL.createObjectURL(photo) : promoPhotoUrl({ photoPath: editing.form.photoPath }) ?? ''}
                    alt=""
                    className="w-20 h-14 object-cover rounded-lg border border-[#EEDFE1]"
                  />
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-xs" />
              </div>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={save} disabled={busy} className="px-5 py-2.5 bg-[#261F21] text-[#D8B268] text-xs font-bold rounded-xl disabled:opacity-40">
              {busy ? 'Salvataggio…' : editing.id ? 'Salva modifiche' : 'Pubblica promo'}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 text-xs font-semibold text-[#736266]">
              Annulla
            </button>
          </div>
        </section>
      )}

      <PromoList title="Attive sul sito" empty="Nessuna promo attiva: la sezione Promo è nascosta sul sito." items={live} onEdit={(p) => open(p.id, fromPromo(p))} onDuplicate={duplicate} onArchive={(p) => act(() => setPromoArchived(p.id, true))} onRestore={() => undefined} onDelete={(p) => act(() => deletePromotion(p.id))} onBroadcast={setPublished} />
      {upcoming.length > 0 && (
        <PromoList title="In programma" empty="" items={upcoming} onEdit={(p) => open(p.id, fromPromo(p))} onDuplicate={duplicate} onArchive={(p) => act(() => setPromoArchived(p.id, true))} onRestore={() => undefined} onDelete={(p) => act(() => deletePromotion(p.id))} onBroadcast={setPublished} />
      )}
      <PromoList title="Archivio (scadute o archiviate)" empty="Nessuna promo in archivio." items={archive} archive onEdit={(p) => open(p.id, fromPromo(p))} onDuplicate={duplicate} onArchive={() => undefined} onRestore={(p) => act(async () => {
        // riattivare una promo scaduta richiede nuove date: si apre la modifica con date da oggi
        if (p.endsOn < today) {
          const span = Math.max(0, Math.round((new Date(`${p.endsOn}T12:00:00`).getTime() - new Date(`${p.startsOn}T12:00:00`).getTime()) / 86_400_000));
          open(p.id, { ...fromPromo(p), startsOn: today, endsOn: toLocalDateStr(addDays(new Date(), span)) });
          await setPromoArchived(p.id, false);
        } else {
          await setPromoArchived(p.id, false);
        }
      })} onDelete={(p) => act(() => deletePromotion(p.id))} onBroadcast={setPublished} />
    </div>
  );
};

const PromoList: React.FC<{
  title: string;
  empty: string;
  items: Promotion[];
  archive?: boolean;
  onEdit: (p: Promotion) => void;
  onDuplicate: (p: Promotion) => void;
  onArchive: (p: Promotion) => void;
  onRestore: (p: Promotion) => void;
  onDelete: (p: Promotion) => void;
  onBroadcast: (p: Promotion) => void;
}> = ({ title, empty, items, archive, onEdit, onDuplicate, onArchive, onRestore, onDelete, onBroadcast }) => (
  <section className={cardCls}>
    <h3 className="font-serif text-lg font-bold text-[#261F21]">
      {title} <span className="text-xs font-sans font-normal text-[#8F7D82]">({items.length})</span>
    </h3>
    {items.length === 0 ? (
      <p className="text-xs text-[#8F7D82]">{empty}</p>
    ) : (
      <div className="space-y-3">
        {items.map((p) => {
          const photo = promoPhotoUrl(p);
          const today = toLocalDateStr();
          return (
            <div key={p.id} className="p-3 rounded-2xl border border-[#EEDFE1] bg-[#FCF8F8] flex flex-wrap items-center gap-3">
              {photo ? (
                <img src={photo} alt="" className="w-20 h-14 object-cover rounded-lg shrink-0" />
              ) : (
                <div className="w-20 h-14 rounded-lg bg-[#F1E6E8] shrink-0" />
              )}
              <div className="flex-1 min-w-[160px]">
                <p className="font-bold text-sm text-[#261F21]">{p.title}</p>
                <p className="text-[11px] text-[#736266]">
                  €{p.promoPrice.toFixed(2)} · {fmt(p.startsOn)} → {fmt(p.endsOn)}
                  {isPromoActive(p, today) && <span className="ml-2 font-bold text-[#AA853D]">{countdownLabel(p.endsOn)}</span>}
                  {p.startsOn > today && !p.archived && <span className="ml-2 font-bold text-[#736266]">parte il {fmt(p.startsOn)}</span>}
                  {!archive ? null : p.archived ? <span className="ml-2 font-bold text-[#8A3B49]">archiviata</span> : <span className="ml-2 font-bold text-[#8A3B49]">scaduta</span>}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {isPromoActive(p, today) && (
                  <button type="button" onClick={() => onBroadcast(p)} title="Messaggio per la lista broadcast" className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-[#25D366] rounded-lg flex items-center gap-1">
                    <Megaphone className="w-3.5 h-3.5" /> Broadcast
                  </button>
                )}
                <button type="button" onClick={() => onEdit(p)} className="px-2.5 py-1.5 text-[11px] font-semibold border border-[#DEC7CA] rounded-lg flex items-center gap-1">
                  <Pencil className="w-3.5 h-3.5" /> Modifica
                </button>
                <button type="button" onClick={() => onDuplicate(p)} className="px-2.5 py-1.5 text-[11px] font-semibold border border-[#DEC7CA] rounded-lg flex items-center gap-1">
                  <Copy className="w-3.5 h-3.5" /> Duplica
                </button>
                {archive ? (
                  <button type="button" onClick={() => onRestore(p)} className="px-2.5 py-1.5 text-[11px] font-semibold border border-[#DEC7CA] rounded-lg flex items-center gap-1">
                    <ArchiveRestore className="w-3.5 h-3.5" /> Riattiva
                  </button>
                ) : (
                  <button type="button" onClick={() => onArchive(p)} className="px-2.5 py-1.5 text-[11px] font-semibold border border-[#DEC7CA] rounded-lg flex items-center gap-1">
                    <Archive className="w-3.5 h-3.5" /> Archivia
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Elimina promo"
                  onClick={() => confirm(`Eliminare definitivamente “${p.title}”? In alternativa archiviala.`) && onDelete(p)}
                  className="p-1.5 border border-red-200 text-red-600 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>
);
