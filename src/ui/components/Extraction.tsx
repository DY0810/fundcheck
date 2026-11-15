import { useEffect, useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Answers, Ask, EventFacts, ExtractedItem, ItemCategory } from '../../shared/contracts';
import { centsToInput, money, parseMoney } from '../lib/format';
import { rule } from '../lib/rules';
import { SevChip } from './bits';

const CATEGORIES: { id: ItemCategory; label: string }[] = [
  { id: 'food', label: 'Food' }, { id: 'venue', label: 'Venue' }, { id: 'personnel', label: 'Personnel' },
  { id: 'talent', label: 'Talent' }, { id: 'decoration', label: 'Decoration' }, { id: 'promo', label: 'Promotion' },
  { id: 'travel', label: 'Travel' }, { id: 'lodging', label: 'Lodging' }, { id: 'durable', label: 'Durable goods' },
  { id: 'other', label: 'Other' },
];

/** Keeps the raw text while typing; pushes cents on every valid keystroke so the check reruns live. */
export function MoneyInput({ value, onChange, label, className = '' }: { value: number | null; onChange: (c: number | null) => void; label: string; className?: string }) {
  const [text, setText] = useState(centsToInput(value));
  useEffect(() => {
    if (parseMoney(text) !== value) setText(centsToInput(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only resync when the value changes from outside
  }, [value]);
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-2">$</span>
      <input
        aria-label={label}
        inputMode="decimal"
        autoComplete="off"
        className={`field num pl-6 ${className}`}
        value={text}
        placeholder="Unknown"
        onChange={(e) => {
          setText(e.target.value);
          const c = parseMoney(e.target.value);
          if (c !== undefined) onChange(c);
        }}
      />
    </div>
  );
}

function NumberInput({ value, onChange, label, className = '', id }: { value: number | null; onChange: (n: number | null) => void; label?: string; className?: string; id?: string }) {
  return (
    <input
      id={id}
      aria-label={label}
      type="number"
      inputMode="numeric"
      min={0}
      className={`field num ${className}`}
      value={value ?? ''}
      placeholder="Unknown"
      onChange={(e) => {
        const n = e.target.value === '' ? null : Number(e.target.value);
        if (n === null || (Number.isFinite(n) && n >= 0)) onChange(n);
      }}
    />
  );
}

export function TriState({ legend, value, onChange, wide }: { legend: string; value: boolean | null; onChange: (v: boolean | null) => void; wide?: boolean }) {
  const name = useId();
  const opts: [string, boolean | null][] = [['Yes', true], ['No', false], ['Unknown', null]];
  return (
    <fieldset className={`m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <legend className="label mb-1.5 p-0">{legend}</legend>
      <div className="flex rounded-ctl border border-control bg-panel p-0.5">
        {opts.map(([l, v]) => (
          <label key={l} className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-[4px] px-2 text-sm font-medium transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cardinal ${value === v ? 'bg-ink text-white' : 'text-ink'}`}>
            <input type="radio" name={name} className="sr-only" checked={value === v} onChange={() => onChange(v)} />
            {l}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function TextField({ label, value, onChange, type = 'text' }: { label: string; value: string | null; onChange: (v: string | null) => void; type?: string }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} type={type} className="field" value={value ?? ''} placeholder="Unknown" onChange={(e) => onChange(e.target.value || null)} />
    </div>
  );
}

export function FactsFields({ facts, onChange }: { facts: EventFacts; onChange: (f: Partial<EventFacts>) => void }) {
  const attId = useId();
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 lg:grid-cols-4 lg:gap-x-4">
      <div className="col-span-2"><TextField label="Event name" value={facts.name} onChange={(v) => onChange({ name: v })} /></div>
      <TextField label="Date" type="date" value={facts.date} onChange={(v) => onChange({ date: v })} />
      <TextField label="Time" value={facts.time} onChange={(v) => onChange({ time: v })} />
      <div className="col-span-2"><TextField label="Location" value={facts.location} onChange={(v) => onChange({ location: v })} /></div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={attId} className="label">Expected attendance</label>
        <NumberInput id={attId} value={facts.expectedAttendance} onChange={(v) => onChange({ expectedAttendance: v })} />
      </div>
      <TextField label="End date, if multi-day" type="date" value={facts.endDate} onChange={(v) => onChange({ endDate: v, multiDay: v ? true : facts.multiDay })} />
      <TriState wide legend="On campus" value={facts.onCampus} onChange={(v) => onChange({ onCampus: v })} />
      <TriState wide legend="Ticketed" value={facts.ticketed} onChange={(v) => onChange({ ticketed: v })} />
      <TriState wide legend="Open to all students" value={facts.openToAll} onChange={(v) => onChange({ openToAll: v })} />
      <TriState wide legend="Travel or lodging" value={facts.travel} onChange={(v) => onChange({ travel: v })} />
    </div>
  );
}

const lineTotal = (i: ExtractedItem) => i.totalCents ?? (i.unitCostCents == null ? null : (i.quantity ?? 1) * i.unitCostCents);

function MatchChips({ item }: { item: ExtractedItem }) {
  if (!item.matches.length) return <span className="text-sm text-ink-2">No rule matched</span>;
  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {item.matches.map((m) => {
        const title = rule(m.ruleId)?.title ?? m.ruleId;
        const sev = m.ruleId === 'R20' ? 'confirm' : m.confidence === 'high' ? 'not_eligible' : 'confirm';
        return <SevChip key={m.ruleId} severity={sev}>{m.confidence === 'low' ? `Ask: ${title}` : title}</SevChip>;
      })}
    </div>
  );
}

const cellLabel = 'label mb-1 block lg:sr-only';

export function ItemsTable({ items, onChange, onAdd, onRemove }: {
  items: ExtractedItem[];
  onChange: (id: string, patch: Partial<ExtractedItem>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const total = items.reduce((s, i) => s + (lineTotal(i) ?? 0), 0);
  const unknown = items.filter((i) => lineTotal(i) == null).length;
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="m-0 rounded-panel bg-inset px-4 py-6 text-base text-ink-2">
          We didn't find any expenses in your plan. Add each expense and its cost so the caps and checks can run.
        </p>
      ) : (
        <table className="block w-full border-collapse text-left lg:table">
          <caption className="sr-only">Line items read from your plan. Every field can be edited.</caption>
          <thead className="sr-only lg:not-sr-only lg:table-header-group">
            <tr className="text-sm text-ink-2">
              <th scope="col" className="px-2 pb-2 font-medium lg:w-[25%]">Item</th>
              <th scope="col" className="px-2 pb-2 font-medium lg:w-[17%]">Vendor</th>
              <th scope="col" className="px-2 pb-2 font-medium lg:w-[10%]">Qty</th>
              <th scope="col" className="px-2 pb-2 font-medium lg:w-[12%]">Cost</th>
              <th scope="col" className="px-2 pb-2 font-medium lg:w-[14%]">Category</th>
              <th scope="col" className="px-2 pb-2 font-medium">Checks</th>
              <th scope="col" className="px-2 pb-2 font-medium"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody className="flex flex-col gap-3 lg:table-row-group">
            {items.map((it) => {
              const name = it.description || 'this item';
              return (
                <tr key={it.id} className="relative grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-panel border border-line p-3 lg:table-row lg:border-0 lg:border-t lg:p-0">
                  <td className="col-span-2 order-0 lg:px-2 lg:py-2 lg:align-top">
                    <label className={cellLabel} htmlFor={`${it.id}-d`}>Item</label>
                    <input id={`${it.id}-d`} className="field lg:min-h-10" value={it.description} onChange={(e) => onChange(it.id, { description: e.target.value })} />
                  </td>
                  <td className="order-1 min-w-0 lg:px-2 lg:py-2 lg:align-top">
                    <label className={cellLabel} htmlFor={`${it.id}-v`}>Vendor</label>
                    <input id={`${it.id}-v`} className="field lg:min-h-10" value={it.vendor ?? ''} placeholder="Unknown" onChange={(e) => onChange(it.id, { vendor: e.target.value || null })} />
                  </td>
                  <td className="order-3 lg:px-2 lg:py-2 lg:align-top">
                    <span className={cellLabel} aria-hidden>Qty</span>
                    <NumberInput
                      label={`Quantity for ${name}`}
                      className="lg:min-h-10"
                      value={it.quantity}
                      onChange={(q) => onChange(it.id, it.unitCostCents == null ? { quantity: q } : { quantity: q, totalCents: (q ?? 1) * it.unitCostCents })}
                    />
                  </td>
                  <td className="order-4 lg:px-2 lg:py-2 lg:align-top">
                    <span className={cellLabel} aria-hidden>Cost</span>
                    <MoneyInput
                      label={`Line cost for ${name}`}
                      className="lg:min-h-10"
                      value={lineTotal(it)}
                      onChange={(c) => onChange(it.id, { totalCents: c, unitCostCents: c != null && it.quantity ? Math.round(c / it.quantity) : it.unitCostCents })}
                    />
                  </td>
                  <td className="order-2 min-w-0 lg:px-2 lg:py-2 lg:align-top">
                    <label className={cellLabel} htmlFor={`${it.id}-c`}>Category</label>
                    <select id={`${it.id}-c`} className="field lg:min-h-10" value={it.category} onChange={(e) => onChange(it.id, { category: e.target.value as ItemCategory })}>
                      {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </td>
                  <td className="order-5 col-span-2 min-w-0 pt-1 lg:px-2 lg:py-3 lg:align-top">
                    <MatchChips item={it} />
                  </td>
                  <td className="absolute top-1 right-1 lg:static lg:px-1 lg:py-2 lg:align-top">
                    <button type="button" className="btn btn-ghost min-h-10 min-w-10 justify-center px-0 text-ink-2" aria-label={`Remove ${name}`} onClick={() => onRemove(it.id)}>
                      <Trash2 aria-hidden size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn btn-secondary" onClick={onAdd}>
          <Plus aria-hidden size={16} /> Add a line
        </button>
        <p className="num m-0 text-sm text-ink-2">
          {items.length} {items.length === 1 ? 'line' : 'lines'} · {money(total)} total{unknown ? ` · ${unknown} without a cost` : ''}
        </p>
      </div>
    </div>
  );
}

// ---------- Asks ----------

type AskValue = string | number | boolean | null | undefined;

export function askValue(ask: Ask, answers: Answers, facts: EventFacts): AskValue {
  if (ask.id.startsWith('match:')) return answers.matchAnswers?.[ask.id.slice(6)];
  if (ask.id.startsWith('facts.')) return facts[ask.id.slice(6) as keyof EventFacts] as AskValue;
  return answers[ask.id as keyof Answers] as AskValue;
}

export function AskRow({ ask, value, onAnswer }: { ask: Ask; value: AskValue; onAnswer: (v: AskValue) => void }) {
  const id = useId();
  const r = rule(ask.ruleId);
  const input = (() => {
    switch (ask.kind) {
      case 'yesno':
        return (
          <div role="radiogroup" aria-labelledby={id} className="flex gap-2">
            {([['Yes', true], ['No', false]] as const).map(([l, v]) => (
              <button key={l} type="button" role="radio" aria-checked={value === v} className={`btn min-h-10 px-4 ${value === v ? 'bg-ink text-white' : 'btn-secondary'}`} onClick={() => onAnswer(v)}>
                {l}
              </button>
            ))}
          </div>
        );
      case 'money':
        return <MoneyInput label={ask.question} value={(value as number | null | undefined) ?? null} onChange={onAnswer} className="max-w-48" />;
      case 'number':
        return <NumberInput label={ask.question} value={(value as number | null | undefined) ?? null} onChange={onAnswer} className="max-w-32" />;
      case 'date':
        return <input aria-labelledby={id} type="date" className="field max-w-48" value={(value as string | null) ?? ''} onChange={(e) => onAnswer(e.target.value || null)} />;
      default:
        return <input aria-labelledby={id} className="field max-w-80" value={(value as string | null) ?? ''} placeholder={ask.id === 'uepaNumber' ? 'A12345' : ''} onChange={(e) => onAnswer(e.target.value || null)} />;
    }
  })();
  return (
    <li className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p id={id} className="m-0 text-base text-ink">{ask.question}</p>
        <p className="m-0 text-xs text-ink-2">{ask.ruleId}{r ? ` · ${r.title}` : ''}</p>
      </div>
      <div className="shrink-0">{input}</div>
    </li>
  );
}
