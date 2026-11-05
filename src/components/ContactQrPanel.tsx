import React, { useEffect, useState } from 'react';
import { Download, MessageCircle, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { SALON_NAME, formatPhone, saveContact, useSalon } from '../lib/salon';

const inputCls = 'px-2.5 py-2 text-xs bg-white border border-[#DEC7CA] rounded-lg focus:outline-none focus:border-[#AA853D]';
const cardCls = 'bg-white border border-[#EEDFE1] rounded-3xl p-5 sm:p-6 space-y-4';

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------
export const ContactPanel: React.FC = () => {
  const { contact, loaded } = useSalon();
  const [value, setValue] = useState(contact.whatsapp);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (loaded) setValue(contact.whatsapp);
  }, [loaded, contact.whatsapp]);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await saveContact(value);
      setMsg({ ok: true, text: 'Salvato: il pulsante WhatsApp del sito usa subito il nuovo numero.' });
    } catch (e) {
      const m = (e as Error).message;
      setMsg({ ok: false, text: /schema cache|relation|site_settings/i.test(m) ? 'Esegui lo script supabase/06-gestione-sito.sql nel database.' : m });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cardCls}>
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-[#25D366]" />
        <h3 className="font-serif text-lg font-bold text-[#261F21]">Numero WhatsApp</h3>
      </div>
      <p className="text-[11px] text-[#8F7D82]">
        Il pulsante “Scrivici su WhatsApp” compare su tutte le pagine del sito, nei contatti e nella conferma di prenotazione, con un messaggio già scritto.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-[11px] font-medium text-[#55474A]">
          <span>Numero (con o senza +39)</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="tel" placeholder="345 393 8087" className={`${inputCls} block w-56`} />
        </label>
        <button type="button" onClick={save} disabled={busy} className="px-4 py-2.5 bg-[#261F21] text-[#D8B268] text-xs font-bold rounded-xl disabled:opacity-40">
          {busy ? 'Salvataggio…' : 'Salva numero'}
        </button>
        <span className="text-xs text-[#736266] pb-2">Attuale: {formatPhone(contact.whatsapp)}</span>
      </div>
      {msg && (
        <p role="status" className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {msg.text}
        </p>
      )}
    </section>
  );
};

// ---------------------------------------------------------------------------
// QR code
// ---------------------------------------------------------------------------
type Target = 'sito' | 'prenota' | 'promo';

const TARGETS: { id: Target; label: string; hash: string; caption: string }[] = [
  { id: 'sito', label: 'Sito', hash: '', caption: 'Scopri i nostri trattamenti' },
  { id: 'prenota', label: 'Pagina di prenotazione', hash: '#prenota', caption: 'Prenota il tuo appuntamento' },
  { id: 'promo', label: 'Pagina promo', hash: '#promo', caption: 'Scopri le nostre promozioni' },
];

/** PDF A4 con una sola immagine JPEG (nessuna libreria: struttura minima valida). */
function jpegToPdf(jpeg: Uint8Array, pxW: number, pxH: number): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (b: Uint8Array | string) => {
    const bytes = typeof b === 'string' ? enc.encode(b) : b;
    parts.push(bytes);
    length += bytes.length;
  };
  const obj = (n: number, body: string | Uint8Array[]) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    if (typeof body === 'string') push(body);
    else body.forEach((p) => push(p));
    push('\nendobj\n');
  };

  const W = 595;
  const H = 842;
  push('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, [
    enc.encode(`<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
    jpeg,
    enc.encode('\nendstream'),
  ]);
  const content = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const xref = length;
  push(`xref\n0 6\n0000000000 65535 f \n`);
  for (let n = 1; n <= 5; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

/** Foglio stampabile A4 (1240 × 1754 px = 150 dpi) con QR, nome del salone e indicazione. */
async function renderSheet(url: string, caption: string): Promise<HTMLCanvasElement> {
  const W = 1240;
  const H = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const qrSize = 860;
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, url, { width: qrSize, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#261F21', light: '#ffffff' } });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#AA853D';
  ctx.font = '600 38px Georgia, serif';
  ctx.fillText('CHIARA E MELANIA · CATANIA', W / 2, 330);
  ctx.fillStyle = '#261F21';
  ctx.font = 'bold 96px Georgia, serif';
  ctx.fillText(SALON_NAME, W / 2, 450);
  ctx.fillStyle = '#D8B268';
  ctx.fillRect(W / 2 - 90, 490, 180, 5);

  ctx.drawImage(qr, (W - qrSize) / 2, 560, qrSize, qrSize);

  ctx.fillStyle = '#261F21';
  ctx.font = 'bold 62px Georgia, serif';
  ctx.fillText(caption, W / 2, 1530);
  ctx.fillStyle = '#736266';
  ctx.font = '34px Arial, sans-serif';
  ctx.fillText('Inquadra con la fotocamera del telefono', W / 2, 1600);
  return canvas;
}

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export const QrPanel: React.FC = () => {
  const [target, setTarget] = useState<Target>('prenota');
  const [base, setBase] = useState(() => window.location.origin);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = TARGETS.find((x) => x.id === target)!;
  const url = `${base.replace(/\/+$/, '')}/${t.hash}`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 360, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#261F21', light: '#ffffff' } })
      .then((d) => active && setPreview(d))
      .catch(() => active && setPreview(''));
    return () => {
      active = false;
    };
  }, [url]);

  const fileBase = `qr-${t.id}-il-sogno-della-bellezza`;

  const getPng = async () => {
    // PNG ad alta risoluzione, adatto alla stampa
    const dataUrl = await QRCode.toDataURL(url, { width: 1600, margin: 3, errorCorrectionLevel: 'M', color: { dark: '#261F21', light: '#ffffff' } });
    const res = await fetch(dataUrl);
    return res.blob();
  };

  const onPng = async () => {
    setBusy('png');
    setError(null);
    try {
      download(await getPng(), `${fileBase}.png`);
    } catch {
      setError('Impossibile creare il file. Riprova.');
    } finally {
      setBusy(null);
    }
  };

  const onPdf = async () => {
    setBusy('pdf');
    setError(null);
    try {
      const canvas = await renderSheet(url, t.caption);
      const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('jpeg'))), 'image/jpeg', 0.95));
      const bytes = new Uint8Array(await jpeg.arrayBuffer());
      download(jpegToPdf(bytes, canvas.width, canvas.height), `${fileBase}.pdf`);
    } catch {
      setError('Impossibile creare il PDF. Riprova o usa il PNG.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={cardCls}>
      <div className="flex items-center gap-2">
        <QrCode className="w-5 h-5 text-[#AA853D]" />
        <h3 className="font-serif text-lg font-bold text-[#261F21]">QR code stampabile</h3>
      </div>
      <p className="text-[11px] text-[#8F7D82]">
        Scarica il QR code che apre il sito o la pagina di prenotazione: lo puoi stampare per la vetrina, i biglietti da visita e i volantini. Il PDF è un foglio A4 pronto da stampare; il PNG è l’immagine ad alta risoluzione del solo QR.
      </p>
      <div className="grid sm:grid-cols-[auto,1fr] gap-5 items-start">
        <div className="mx-auto sm:mx-0 p-3 border border-[#EEDFE1] rounded-2xl bg-white">
          {preview ? <img src={preview} alt={`QR code: ${url}`} className="w-44 h-44 sm:w-52 sm:h-52" /> : <div className="w-44 h-44 sm:w-52 sm:h-52 bg-[#F7EFEF] rounded-lg" />}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {TARGETS.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setTarget(x.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border ${target === x.id ? 'bg-[#261F21] text-[#D8B268] border-[#261F21]' : 'bg-white text-[#55474A] border-[#DEC7CA]'}`}
              >
                {x.label}
              </button>
            ))}
          </div>
          <label className="block space-y-1 text-[11px] font-medium text-[#55474A]">
            <span>Indirizzo del sito (controlla che sia quello pubblico definitivo)</span>
            <input value={base} onChange={(e) => setBase(e.target.value)} className={`${inputCls} w-full`} />
          </label>
          <p className="text-[11px] text-[#736266] break-all">
            Il QR apre: <strong>{url}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onPdf} disabled={busy !== null} className="px-4 py-2.5 bg-[#261F21] text-[#D8B268] text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-40">
              <Download className="w-4 h-4" /> {busy === 'pdf' ? 'Creazione…' : 'Scarica PDF (A4)'}
            </button>
            <button type="button" onClick={onPng} disabled={busy !== null} className="px-4 py-2.5 border border-[#DEC7CA] text-[#261F21] text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-40">
              <Download className="w-4 h-4" /> {busy === 'png' ? 'Creazione…' : 'Scarica PNG'}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
