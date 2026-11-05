import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export interface PickerItem {
  id: string;
  label: string;
  hint?: string;
}

interface Props {
  items: PickerItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

/** Campo con ricerca: si scrive per filtrare e si sceglie dall'elenco. */
export const SearchPicker: React.FC<Props> = ({ items, value, onChange, placeholder = 'Cerca…' }) => {
  const selected = items.find((i) => i.id === value);
  const [text, setText] = useState(selected?.label ?? '');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(selected?.label ?? '');
  }, [value, selected?.label]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setText(selected?.label ?? '');
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [selected?.label]);

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q || q === selected?.label.toLowerCase()) return items;
    return items.filter((i) => `${i.label} ${i.hint ?? ''}`.toLowerCase().includes(q));
  }, [items, text, selected?.label]);

  return (
    <div ref={ref} className="relative">
      <Search className="w-3.5 h-3.5 text-[#8F7D82] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={text}
        placeholder={placeholder}
        onFocus={(e) => {
          setOpen(true);
          e.currentTarget.select();
        }}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        className="w-full pl-8 pr-8 py-2 text-xs border border-[#DEC7CA] rounded-xl focus:outline-none focus:border-[#AA853D]"
      />
      <button type="button" tabIndex={-1} aria-label="Apri elenco" onClick={() => setOpen((o) => !o)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8F7D82]">
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-[#EEDFE1] rounded-xl shadow-lg">
          {filtered.length === 0 && <li className="px-3 py-2 text-xs text-[#8F7D82]">Nessun risultato</li>}
          {filtered.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(i.id);
                  setText(i.label);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-[#FAF5F5] ${i.id === value ? 'font-semibold text-[#AA853D]' : 'text-[#261F21]'}`}
              >
                {i.label}
                {i.hint && <span className="block text-[10px] text-[#8F7D82]">{i.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
