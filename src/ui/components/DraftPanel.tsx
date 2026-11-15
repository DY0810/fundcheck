import { useState } from 'react';
import { Download, LoaderCircle, RotateCcw } from 'lucide-react';
import type { Answers, ApiError, CheckResult, Draft, Extraction } from '../../shared/contracts';
import * as api from '../lib/api';
import { date, moneyExact, plural } from '../lib/format';
import { BUDGET_FILE_NAME, budgetCsv } from '../engine';
import { CopyButton, UsgQuote } from './bits';

function Field({ label, value, ai, wide, children }: { label: string; value: string | null; ai?: boolean; wide?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-2 border-t border-line py-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="label m-0">
            {label}
            <span className="ml-2 inline-flex h-5 items-center rounded-full bg-inset px-2 text-xs font-medium text-ink-2 align-middle">{ai ? 'AI draft' : 'Filled by FundCheck'}</span>
          </p>
          <p className="m-0 mt-1.5 max-w-[70ch] whitespace-pre-wrap text-base text-ink [overflow-wrap:anywhere]">{value ?? 'Unknown'}</p>
        </div>
        {value && <CopyButton text={value} what={label} />}
      </div>
      {children}
    </div>
  );
}

// The revised plan already has the lines the officer removed taken out; lines they kept stay, for the board to decide.
function downloadCsv(extraction: Extraction, draft: Draft | null) {
  const blob = new Blob([budgetCsv(extraction.items, draft?.budgetJustifications ?? {})], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: BUDGET_FILE_NAME });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Step 3: the budget CSV of the revised plan, with what it holds said in one line. */
export function CsvButton({ extraction, check, draft }: { extraction: Extraction; check: CheckResult; draft: Draft | null }) {
  const kept = check.flags.filter((f) => f.severity === 'not_eligible' && f.itemId).length;
  return (
    <div className="flex flex-col gap-1.5">
      <button type="button" className="btn btn-secondary self-start" onClick={() => downloadCsv(extraction, draft)} aria-describedby="csv-note">
        <Download aria-hidden size={16} /> Download budget CSV
      </button>
      <p id="csv-note" className="m-0 max-w-[75ch] text-sm text-ink-2 [overflow-wrap:anywhere]">
        {plural(extraction.items.length, 'line')}
        {kept ? `, including ${kept} you kept to ask the board about.` : '.'}
        {check.money.venuePersonnelCents > 0 && ' Venue and personnel are listed at full cost; USG funds up to $4,000 of them.'}
      </p>
    </div>
  );
}

/** Step 3: the form answers for the revised plan. `requestCents` is what the officer chose to request. */
export function DraftPanel({ extraction, check, answers, requestCents, draft, setDraft }: {
  extraction: Extraction; check: CheckResult; answers: Answers; requestCents: number; draft: Draft | null; setDraft: (d: Draft) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const f = extraction.facts;
  const other = answers.otherFundingSources?.trim() || 'N/A';

  async function run() {
    setBusy(true);
    setError(null);
    const res = await api.draft({ extraction, check });
    setBusy(false);
    if (res.ok) setDraft(res.draft);
    else setError(res.error);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="m-0 max-w-[60ch] text-base text-ink-2">Each answer uses the form's exact label. Copy them into the application, then check every line.</p>
        <button type="button" className="btn btn-secondary shrink-0" onClick={run} disabled={busy} aria-busy={busy}>
          {busy && <LoaderCircle aria-hidden size={16} className="animate-spin" />}
          {draft ? 'Redraft my form answers' : 'Draft my form answers'}
        </button>
      </div>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-panel bg-ne-bg p-4 text-ne sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-base">{error.message}</p>
          <button type="button" className="btn btn-secondary" onClick={run}><RotateCcw aria-hidden size={16} /> Try again</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-10">
        <Field wide label="Please select the funding board you would like to apply to." value={check.fund.label} />
        <Field label="Event Name" value={f.name} />
        <Field label="Date of event" value={f.date ? date(f.date) : null} />
        <Field label="Time of event" value={f.time} />
        <Field label="Location of event" value={f.location} />
        <Field label="Expected number of participants" value={f.expectedAttendance == null ? null : String(f.expectedAttendance)} />
        <Field label="Amount of funds being requested" value={moneyExact(Math.max(0, requestCents))} />
        <Field wide label="List of other funding sources. Enter N/A if there are none." value={other}>
          {other !== 'N/A' && <UsgQuote id="R33" intro="Before you list another University source: USG Funding Department Guidelines §6 lists this among the reasons an application may not be approved:" />}
        </Field>
        {draft ? (
          <>
            <Field wide label="Description of event" value={draft.description} ai />
            <Field wide label="How does the event align with your mission/vision/goals?" value={draft.missionAlignment} ai />
            {draft.foodJustification && <Field wide label="Food justification" value={draft.foodJustification} ai />}
            {draft.travelPurpose && <Field wide label="Statement of purpose for travel" value={draft.travelPurpose} ai />}
          </>
        ) : (
          <p className="m-0 border-t border-line pt-4 text-base text-ink-2 lg:col-span-2">
            {busy ? 'Drafting your description and mission alignment…' : 'Press "Draft my form answers" to draft the description, mission alignment and food justification.'}
          </p>
        )}
      </div>
    </div>
  );
}
