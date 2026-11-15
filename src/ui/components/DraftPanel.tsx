import { useState } from 'react';
import { Download, LoaderCircle, RotateCcw } from 'lucide-react';
import type { Answers, ApiError, CheckResult, Draft, Extraction } from '../../shared/contracts';
import * as api from '../lib/api';
import { date, moneyExact } from '../lib/format';
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

function downloadCsv(extraction: Extraction, draft: Draft | null) {
  const blob = new Blob([budgetCsv(extraction, draft?.budgetJustifications ?? {})], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: BUDGET_FILE_NAME });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DraftPanel({ extraction, check, answers }: { extraction: Extraction; check: CheckResult; answers: Answers }) {
  const [draft, setDraft] = useState<Draft | null>(null);
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
    <section aria-labelledby="draft-h" className="panel flex flex-col gap-5 p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-[60ch]">
          <h2 id="draft-h" className="m-0 text-lg font-semibold">Form answers</h2>
          <p className="m-0 mt-1 text-base text-ink-2">Each answer uses the form's exact label. Copy them into the application, then check every line.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={run} disabled={busy} aria-busy={busy}>
            {busy && <LoaderCircle aria-hidden size={16} className="animate-spin" />}
            {draft ? 'Redraft my form answers' : 'Draft my form answers'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => downloadCsv(extraction, draft)}>
            <Download aria-hidden size={16} /> Download budget CSV
          </button>
        </div>
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
        <Field label="Amount of funds being requested" value={moneyExact(Math.max(0, check.money.eligibleCents))} />
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
    </section>
  );
}
