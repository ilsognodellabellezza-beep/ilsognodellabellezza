import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Euro, Loader2, Plus, RotateCcw, Trash2, UserPlus } from 'lucide-react';
import { Operator, Service, TreatmentCategory } from '../types';
import {
  BookingSettings,
  DayHours,
  ServiceOverride,
  WEEKDAY_NAMES,
  WEEKDAY_ORDER,
  resetServiceOverride,
  saveCustomService,
  deleteCustomService,
  saveCustomOperator,
  deleteCustomOperator,
  saveBookingSettings,
  saveServiceOverride,
  useSiteConfig,
  CATEGORY_LIST,
} from '../lib/siteSettings';
import { ContactPanel, QrPanel } from './ContactQrPanel';
import { TeamPhotosPanel, ServicePhotosPanel, AccountingExportPanel } from './PhotosPanel';
import { SERVICES } from '../data/mockData';
import { timeToMinutes } from '../lib/dates';

const inputCls =
  'px-2.5 py-2 text-xs bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]';
const cardCls = 'bg-white border border-[#EEDFE1] rounded-3xl p-5 sm:p-6 space-y-4';

const SQL_HINT = 'Esegui lo script supabase/06-gestione-sito.sql nel database (SQL Editor di Supabase).';
const errMsg = (e: unknown) => {
  const m = (e as Error).message || '';
  return /site_settings|service_overrides|schema cache|relation/i.test(m) ? SQL_HINT : m;
};
const errMsg2 = (e: unknown) => {
  const m = (e as Error).message || '';
  return /custom_services|custom_operators|schema cache|relation/i.test(m)
    ? 'Esegui lo script supabase/07-servizi-dipendenti.sql nel database (SQL Editor di Supabase).'
    : m;
};

/** Gestione del sito (solo titolare): orari di apertura, prezzi, durate e visibilità dei servizi. */
export const SiteSettingsPanel: React.FC = () => {
  const { settings, overrides, loaded } = useSiteConfig();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#261F21]">Gestione del sito</h2>
        <p className="text-xs text-[#55474A]">
          Le modifiche valgono subito per il sito pubblico e per la prenotazione online: orari, WhatsApp, foto, prezzi e durate.
        </p>
      </div>
      <HoursEditor key={loaded ? "ready" : "loading"} initial={settings} ready={loaded} />
      <ContactPanel />
      <QrPanel />
      <OperatorsEditor />
      <TeamPhotosPanel />
      <CustomServicesEditor />
      <ServicePhotosPanel />
      <ServicesEditor overrides={overrides} />
      <AccountingExportPanel />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Orari
// ---------------------------------------------------------------------------
const HoursEditor: React.FC<{ initial: BookingSettings; ready: boolean }> = ({ initial, ready }) => {
  const [draft, setDraft] = useState<BookingSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const setDay = (d: number, patch: Partial<DayHours>) =>
    setDraft((s) => ({ ...s, hours: { ...s.hours, [d]: { ...s.hours[d], ...patch } } }));

  const validate = (): string | null => {
    for (const d of WEEKDAY_ORDER) {
      const h = draft.hours[d];
      if (!h.open) continue;
      if (!h.from || !h.to || timeToMinutes(h.to) <= timeToMinutes(h.from)) {
        return `${WEEKDAY_NAMES[d]}: l'orario di chiusura deve essere dopo quello di apertura.`;
      }
      if (h.breakFrom || h.breakTo) {
        if (!h.breakFrom || !h.breakTo || timeToMinutes(h.breakTo) <= timeToMinutes(h.breakFrom)) {
          return `${WEEKDAY_NAMES[d]}: la pausa va indicata con inizio e fine corretti (o svuotata).`;
        }
      }
    }
    if (draft.maxAdvanceDays < 1 || draft.maxAdvanceDays > 730) return 'I giorni di anticipo devono essere tra 1 e 730.';
    return null;
  };

  const save = async () => {
    const problem = validate();
    if (problem) return setMsg({ ok: false, text: problem });
    setSaving(true);
    setMsg(null);
    try {
      await saveBookingSettings(draft);
      setMsg({ ok: true, text: 'Orari salvati: il sito è già aggiornato.' });
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={cardCls}>
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-[#AA853D]" />
        <h3 className="font-serif text-lg font-bold text-[#261F21]">Orari di apertura e prenotazioni</h3>
      </div>
      <p className="text-[11px] text-[#8F7D82]">
        Un trattamento deve finire entro l'orario di chiusura: con chiusura alle 18:30 un servizio da 1 ora può iniziare al massimo alle 17:30.
      </p>

      <div className="space-y-2">
        {WEEKDAY_ORDER.map((d) => {
          const h = draft.hours[d];
          return (
            <div
              key={d}
              className={`grid grid-cols-2 sm:grid-cols-[130px_auto_1fr] gap-x-3 gap-y-2 items-center p-3 rounded-2xl border ${
                h.open ? 'border-[#EEDFE1] bg-[#FCF8F8]' : 'border-[#EEDFE1] bg-[#FAF5F5] opacity-80'
              }`}
            >
              <label className="flex items-center gap-2 text-sm font-semibold text-[#261F21] cursor-pointer">
                <input
                  type="checkbox"
                  checked={h.open}
                  onChange={(e) => setDay(d, { open: e.target.checked })}
                  className="w-4 h-4 accent-[#AA853D]"
                />
                {WEEKDAY_NAMES[d]}
              </label>
              {h.open ? (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-[#55474A]">
                    <input type="time" value={h.from} onChange={(e) => setDay(d, { from: e.target.value })} className={inputCls} aria-label={`${WEEKDAY_NAMES[d]} apertura`} />
                    <span>–</span>
                    <input type="time" value={h.to} onChange={(e) => setDay(d, { to: e.target.value })} className={inputCls} aria-label={`${WEEKDAY_NAMES[d]} chiusura`} />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex flex-wrap items-center gap-1.5 text-xs text-[#55474A]">
                    <span>Pausa</span>
                    <input type="time" value={h.breakFrom} onChange={(e) => setDay(d, { breakFrom: e.target.value })} className={inputCls} aria-label={`${WEEKDAY_NAMES[d]} inizio pausa`} />
                    <span>–</span>
                    <input type="time" value={h.breakTo} onChange={(e) => setDay(d, { breakTo: e.target.value })} className={inputCls} aria-label={`${WEEKDAY_NAMES[d]} fine pausa`} />
                    {(h.breakFrom || h.breakTo) && (
                      <button type="button" onClick={() => setDay(d, { breakFrom: '', breakTo: '' })} className="text-[#AA853D] font-semibold hover:underline">
                        senza pausa
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <span className="col-span-1 sm:col-span-2 text-xs text-[#8F7D82]">Chiuso</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="space-y-1 text-xs font-medium text-[#261F21]">
          <span>Un orario ogni…</span>
          <select
            value={draft.slotStepMinutes}
            onChange={(e) => setDraft((s) => ({ ...s, slotStepMinutes: Number(e.target.value) }))}
            className={`${inputCls} w-full`}
          >
            {[15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} minuti
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-[#261F21]">
          <span>Prenotabile con anticipo massimo di (giorni)</span>
          <input
            type="number"
            min={1}
            max={730}
            value={draft.maxAdvanceDays}
            onChange={(e) => setDraft((s) => ({ ...s, maxAdvanceDays: Number(e.target.value) }))}
            className={`${inputCls} w-full`}
          />
          <span className="block text-[11px] font-normal text-[#8F7D82]">180 giorni = circa 6 mesi.</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !ready}
          className="px-5 py-2.5 bg-[#261F21] text-[#D8B268] text-xs font-bold rounded-xl disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Salva orari
        </button>
        {msg && (
          <span role="status" className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </section>
  );
};

// ---------------------------------------------------------------------------
// Servizi e prezzi
// ---------------------------------------------------------------------------
const ServicesEditor: React.FC<{ overrides: ServiceOverride[] }> = ({ overrides }) => (
  <section className={cardCls}>
    <div className="flex items-center gap-2">
      <Euro className="w-5 h-5 text-[#AA853D]" />
      <h3 className="font-serif text-lg font-bold text-[#261F21]">Prezzi, durate e servizi</h3>
    </div>
    <p className="text-[11px] text-[#8F7D82]">
      Prezzo, promo e durata cambiano su tutto il sito e nella prenotazione. Le prenotazioni già fatte mantengono il prezzo con cui sono state registrate.
      Un servizio nascosto non compare più sul sito né si può prenotare online.
    </p>
    <div className="space-y-3">
      {SERVICES.map((s) => (
        <ServiceRow key={s.id} serviceId={s.id} overrides={overrides} />
      ))}
    </div>
  </section>
);

const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

const ServiceRow: React.FC<{ serviceId: string; overrides: ServiceOverride[] }> = ({ serviceId, overrides }) => {
  const base = SERVICES.find((s) => s.id === serviceId)!;
  const ov = overrides.find((o) => o.serviceId === serviceId);

  const initial = {
    price: String(ov?.price ?? base.price),
    promo: ov ? (ov.promoPrice === null ? '' : String(ov.promoPrice)) : base.promoPrice !== undefined ? String(base.promoPrice) : '',
    duration: String(ov?.durationMinutes ?? base.durationMinutes),
    active: ov?.active ?? true,
  };
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // se i dati cambiano dall'esterno (salvataggio / ripristino) riallinea i campi
  const sig = JSON.stringify(initial);
  useEffect(() => {
    setF(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const dirty = JSON.stringify(f) !== sig;

  const save = async () => {
    const price = numOrNull(f.price);
    const promo = numOrNull(f.promo);
    const duration = numOrNull(f.duration);
    if (price === null || !(price >= 0)) return setMsg({ ok: false, text: 'Prezzo non valido.' });
    if (promo !== null && !(promo >= 0 && promo < price)) return setMsg({ ok: false, text: 'La promo deve essere minore del prezzo.' });
    if (duration === null || !Number.isInteger(duration) || duration < 5 || duration > 480)
      return setMsg({ ok: false, text: 'Durata non valida (5–480 minuti).' });
    setBusy(true);
    setMsg(null);
    try {
      await saveServiceOverride({ serviceId, price, promoPrice: promo, durationMinutes: duration, active: f.active });
      setMsg({ ok: true, text: 'Salvato' });
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await resetServiceOverride(serviceId);
      setMsg({ ok: true, text: 'Ripristinato' });
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`p-4 rounded-2xl border border-[#EEDFE1] ${f.active ? 'bg-[#FCF8F8]' : 'bg-[#FAF5F5] opacity-75'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <span className="text-[10px] font-semibold text-[#AA853D] uppercase tracking-wide">{base.categoryLabel}</span>
          <h4 className="font-serif font-bold text-sm text-[#261F21]">{base.name}</h4>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-[#261F21] cursor-pointer">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="w-4 h-4 accent-[#AA853D]" />
          Visibile sul sito
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
          <span>Prezzo (€)</span>
          <input inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={`${inputCls} w-full`} />
        </label>
        <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
          <span>Promo (€, vuoto = nessuna)</span>
          <input inputMode="decimal" value={f.promo} onChange={(e) => setF({ ...f, promo: e.target.value })} className={`${inputCls} w-full`} />
        </label>
        <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
          <span>Durata (minuti)</span>
          <input inputMode="numeric" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} className={`${inputCls} w-full`} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="px-4 py-2 bg-[#261F21] text-[#D8B268] text-xs font-bold rounded-xl disabled:opacity-40"
        >
          {busy ? 'Salvataggio…' : 'Salva'}
        </button>
        {ov && (
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="px-3 py-2 text-xs font-semibold text-[#736266] border border-[#DEC7CA] rounded-xl flex items-center gap-1.5 disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Ripristina originale
          </button>
        )}
        {msg && (
          <span role="status" className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Nuovi servizi
// ---------------------------------------------------------------------------
const CATEGORY_OPTIONS = CATEGORY_LIST;

const CustomServicesEditor: React.FC = () => {
  const { customServices } = useSiteConfig();
  return (
    <section className={cardCls}>
      <div className="flex items-center gap-2">
        <Plus className="w-5 h-5 text-[#AA853D]" />
        <h3 className="font-serif text-lg font-bold text-[#261F21]">Aggiungi nuovi servizi</h3>
      </div>
      <p className="text-[11px] text-[#8F7D82]">
        I servizi che aggiungi compaiono subito nella pagina Trattamenti e nella prenotazione online, con le operatrici che scegli.
      </p>
      <div className="space-y-3">
        {customServices.map((s) => (
          <CustomServiceCard key={s.id} service={s} />
        ))}
        <CustomServiceCard key={`new-${customServices.length}`} />
      </div>
    </section>
  );
};

const CustomServiceCard: React.FC<{ service?: Service }> = ({ service }) => {
  const { allOperators } = useSiteConfig();
  const isNew = !service;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: service?.name ?? '',
    category: (service?.category ?? 'viso') as TreatmentCategory,
    price: service ? String(service.price) : '',
    promo: service?.promoPrice !== undefined ? String(service.promoPrice) : '',
    duration: service ? String(service.durationMinutes) : '60',
    description: service?.description ?? '',
    onlyWomen: service?.onlyWomen ?? false,
    isPopular: service?.isPopular ?? false,
    active: service?.active ?? true,
    operatorIds: service?.operatorIds ?? ([] as string[]),
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggleOp = (id: string) =>
    setF((x) => ({ ...x, operatorIds: x.operatorIds.includes(id) ? x.operatorIds.filter((o) => o !== id) : [...x.operatorIds, id] }));

  const save = async () => {
    const price = numOrNull(f.price);
    const promo = numOrNull(f.promo);
    const duration = numOrNull(f.duration);
    if (f.name.trim().length < 2) return setMsg({ ok: false, text: 'Inserisci il nome del servizio.' });
    if (price === null || !(price >= 0)) return setMsg({ ok: false, text: 'Prezzo non valido.' });
    if (promo !== null && !(promo >= 0 && promo < price)) return setMsg({ ok: false, text: 'La promo deve essere minore del prezzo.' });
    if (duration === null || !Number.isInteger(duration) || duration < 5 || duration > 480)
      return setMsg({ ok: false, text: 'Durata non valida (5–480 minuti).' });
    if (f.operatorIds.length === 0) return setMsg({ ok: false, text: 'Scegli almeno una operatrice che esegue il servizio.' });
    setBusy(true);
    setMsg(null);
    try {
      await saveCustomService(
        {
          name: f.name,
          category: f.category,
          price,
          promoPrice: promo,
          durationMinutes: duration,
          description: f.description,
          onlyWomen: f.onlyWomen,
          isPopular: f.isPopular,
          operatorIds: f.operatorIds,
          active: f.active,
        },
        service?.id
      );
      setMsg({ ok: true, text: isNew ? 'Servizio aggiunto' : 'Salvato' });
      if (isNew) setOpen(false);
    } catch (e) {
      setMsg({ ok: false, text: errMsg2(e) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!service || !confirm(`Eliminare il servizio "${service.name}"? Le prenotazioni già fatte restano nell'agenda.`)) return;
    setBusy(true);
    try {
      await deleteCustomService(service.id);
    } catch (e) {
      setMsg({ ok: false, text: errMsg2(e) });
      setBusy(false);
    }
  };

  if (isNew && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-[#DEC7CA] text-xs font-bold text-[#AA853D] flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Nuovo servizio
      </button>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border ${isNew ? 'border-[#AA853D] bg-white' : 'border-[#EEDFE1] bg-[#FCF8F8]'} space-y-3`}>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1 text-[11px] font-medium text-[#55474A] sm:col-span-2">
          <span>Nome del servizio</span>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={`${inputCls} w-full`} placeholder="Es. Pulizia viso base" />
        </label>
        <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
          <span>Categoria</span>
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as TreatmentCategory })} className={`${inputCls} w-full`}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
            <span>Prezzo €</span>
            <input inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={`${inputCls} w-full`} />
          </label>
          <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
            <span>Promo €</span>
            <input inputMode="decimal" value={f.promo} onChange={(e) => setF({ ...f, promo: e.target.value })} className={`${inputCls} w-full`} />
          </label>
          <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
            <span>Minuti</span>
            <input inputMode="numeric" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} className={`${inputCls} w-full`} />
          </label>
        </div>
        <label className="space-y-1 text-[11px] font-medium text-[#55474A] sm:col-span-2">
          <span>Descrizione (opzionale)</span>
          <textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={`${inputCls} w-full`} />
        </label>
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-[#55474A]">Chi lo esegue</span>
        <div className="flex flex-wrap gap-2">
          {allOperators.map((op) => (
            <label
              key={op.id}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer ${
                f.operatorIds.includes(op.id) ? 'bg-[#261F21] text-[#D8B268] border-[#261F21]' : 'bg-white text-[#55474A] border-[#DEC7CA]'
              }`}
            >
              <input type="checkbox" className="sr-only" checked={f.operatorIds.includes(op.id)} onChange={() => toggleOp(op.id)} />
              {op.name}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#261F21]">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-[#AA853D]" checked={f.onlyWomen} onChange={(e) => setF({ ...f, onlyWomen: e.target.checked })} /> Riservato alle donne
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-[#AA853D]" checked={f.isPopular} onChange={(e) => setF({ ...f, isPopular: e.target.checked })} /> Più richiesto
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-[#AA853D]" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Visibile sul sito
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="px-4 py-2 bg-[#261F21] text-[#D8B268] text-xs font-bold rounded-xl disabled:opacity-40">
          {busy ? 'Salvataggio…' : isNew ? 'Aggiungi servizio' : 'Salva'}
        </button>
        {isNew ? (
          <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-xs font-semibold text-[#736266]">
            Annulla
          </button>
        ) : (
          <button type="button" onClick={remove} disabled={busy} className="px-3 py-2 text-xs font-semibold text-red-700 border border-red-200 rounded-xl flex items-center gap-1.5 disabled:opacity-40">
            <Trash2 className="w-3.5 h-3.5" /> Elimina
          </button>
        )}
        {msg && (
          <span role="status" className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Dipendenti / operatrici
// ---------------------------------------------------------------------------
const OperatorsEditor: React.FC = () => {
  const { operators, customOperators } = useSiteConfig();
  const fixed = operators.filter((o) => !o.custom);
  return (
    <section className={cardCls}>
      <div className="flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-[#AA853D]" />
        <h3 className="font-serif text-lg font-bold text-[#261F21]">Dipendenti e operatrici</h3>
      </div>
      <p className="text-[11px] text-[#8F7D82]">
        Ogni dipendente ha la sua colonna nell'agenda e si può scegliere nella prenotazione online per i servizi che le assegni. Puoi caricare la sua foto qui sotto, nella sezione “Foto del team”.
      </p>
      <div className="flex flex-wrap gap-2">
        {fixed.map((o) => (
          <span key={o.id} className="px-3 py-1.5 rounded-full bg-[#FAF5F5] border border-[#EEDFE1] text-xs font-semibold text-[#261F21]">
            {o.name} <span className="font-normal text-[#8F7D82]">· {o.role}</span>
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {customOperators.map((o) => (
          <CustomOperatorCard key={o.id} operator={o} />
        ))}
        <CustomOperatorCard key={`new-${customOperators.length}`} />
      </div>
    </section>
  );
};

const CustomOperatorCard: React.FC<{ operator?: Operator }> = ({ operator }) => {
  const { allServices } = useSiteConfig();
  const isNew = !operator;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: operator?.name ?? '',
    role: operator?.role ?? '',
    specialization: operator?.specialization ?? '',
    serviceIds: operator?.serviceIds ?? ([] as string[]),
    active: operator?.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggle = (id: string) =>
    setF((x) => ({ ...x, serviceIds: x.serviceIds.includes(id) ? x.serviceIds.filter((s) => s !== id) : [...x.serviceIds, id] }));

  const save = async () => {
    if (f.name.trim().length < 2) return setMsg({ ok: false, text: 'Inserisci il nome.' });
    setBusy(true);
    setMsg(null);
    try {
      await saveCustomOperator(f, operator?.id);
      setMsg({ ok: true, text: isNew ? 'Dipendente aggiunta' : 'Salvato' });
      if (isNew) setOpen(false);
    } catch (e) {
      setMsg({ ok: false, text: errMsg2(e) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!operator || !confirm(`Eliminare ${operator.name}? Gli appuntamenti già registrati restano nell'agenda. In alternativa togli la spunta "Attiva".`)) return;
    setBusy(true);
    try {
      await deleteCustomOperator(operator.id);
    } catch (e) {
      setMsg({ ok: false, text: errMsg2(e) });
      setBusy(false);
    }
  };

  if (isNew && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-2xl border-2 border-dashed border-[#DEC7CA] text-xs font-bold text-[#AA853D] flex items-center justify-center gap-2"
      >
        <UserPlus className="w-4 h-4" /> Nuova dipendente
      </button>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border ${isNew ? 'border-[#AA853D] bg-white' : 'border-[#EEDFE1] bg-[#FCF8F8]'} space-y-3`}>
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
          <span>Nome</span>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={`${inputCls} w-full`} placeholder="Es. Giulia" />
        </label>
        <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
          <span>Ruolo</span>
          <input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className={`${inputCls} w-full`} placeholder="Es. Estetista" />
        </label>
        <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
          <span>Specializzazione</span>
          <input value={f.specialization} onChange={(e) => setF({ ...f, specialization: e.target.value })} className={`${inputCls} w-full`} placeholder="Es. Manicure e pedicure" />
        </label>
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-[#55474A]">Servizi che esegue (prenotabili online con lei)</span>
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
          {allServices.map((s) => (
            <label
              key={s.id}
              className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold cursor-pointer ${
                f.serviceIds.includes(s.id) ? 'bg-[#261F21] text-[#D8B268] border-[#261F21]' : 'bg-white text-[#55474A] border-[#DEC7CA]'
              }`}
            >
              <input type="checkbox" className="sr-only" checked={f.serviceIds.includes(s.id)} onChange={() => toggle(s.id)} />
              {s.name}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-[#261F21] cursor-pointer">
        <input type="checkbox" className="w-4 h-4 accent-[#AA853D]" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
        Attiva (compare in agenda e nella prenotazione)
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="px-4 py-2 bg-[#261F21] text-[#D8B268] text-xs font-bold rounded-xl disabled:opacity-40">
          {busy ? 'Salvataggio…' : isNew ? 'Aggiungi dipendente' : 'Salva'}
        </button>
        {isNew ? (
          <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-xs font-semibold text-[#736266]">
            Annulla
          </button>
        ) : (
          <button type="button" onClick={remove} disabled={busy} className="px-3 py-2 text-xs font-semibold text-red-700 border border-red-200 rounded-xl flex items-center gap-1.5 disabled:opacity-40">
            <Trash2 className="w-3.5 h-3.5" /> Elimina
          </button>
        )}
        {msg && (
          <span role="status" className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
};
