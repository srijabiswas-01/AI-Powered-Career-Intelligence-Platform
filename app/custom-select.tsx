"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "./bootstrap-icons";

export type SelectOption = { value: string; label: string; tag?: string; description?: string };
export type SelectGroup = { label?: string; options: SelectOption[] };

export default function CustomSelect({ value, onChange, groups, name, ariaLabel, disabled = false, compact = false }: {
  value: string;
  onChange: (value: string) => void;
  groups: SelectGroup[];
  name?: string;
  ariaLabel: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const options = groups.flatMap(group => group.options);
  const selected = options.find(option => option.value === value) || options[0];
  const available = groups.map(group => ({ ...group, options: group.options.filter(option => option.value !== value) })).filter(group => group.options.length);

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const choose = (next: string) => { onChange(next); setOpen(false); };
  const move = (direction: number) => {
    if (!options.length) return;
    const index = Math.max(0, options.findIndex(option => option.value === value));
    choose(options[(index + direction + options.length) % options.length].value);
  };

  return <div ref={root} className={`customSelect${open ? " open" : ""}${compact ? " compact" : ""}`}>
    {name && <input type="hidden" name={name} value={value} />}
    <button type="button" className="customSelectTrigger" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(state => !state)} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); open ? move(1) : setOpen(true); } if (event.key === "ArrowUp") { event.preventDefault(); open ? move(-1) : setOpen(true); } if (event.key === "Escape") setOpen(false); }}>
      <span>{selected?.tag && <em>{selected.tag}</em>}<b>{selected?.label || "Select"}</b>{selected?.description && <small>{selected.description}</small>}</span><ChevronDown />
    </button>
    {open && <div className="customSelectMenu" role="listbox" aria-label={ariaLabel}>
      {available.length ? available.map((group, groupIndex) => <div className="customSelectGroup" key={`${group.label || "options"}-${groupIndex}`}>{group.label && <strong>{group.label}</strong>}{group.options.map(option => <button type="button" role="option" aria-selected={false} key={option.value} onClick={() => choose(option.value)}><span>{option.tag && <em>{option.tag}</em>}<b>{option.label}</b>{option.description && <small>{option.description}</small>}</span>{option.value === value && <Check />}</button>)}</div>) : <p className="customSelectEmpty">No other options</p>}
    </div>}
  </div>;
}
