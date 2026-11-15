# FundCheck

FundCheck pre-checks a USC student organization's USG Funding Department application. An officer pastes an event plan in plain words, and FundCheck works in three steps. **Check** shows which items USG's Guidelines don't fund (each with USG's own quote), the money against every cap, which fund to apply to, a deadline estimate and the documents to attach. **Fix** proposes a fix for each flag, and nothing changes until the officer approves it. **Hand off** gathers drafted form answers to copy, a budget CSV, the documents and a link to USG's funding page; filing itself needs the officer's USC sign-in. The on-campus events USG funds can't sell tickets and must be open to all students, so every application that comes back late or incomplete is one fewer free event for every Trojan. FundCheck exists so the application a Funding Director opens is already complete and inside the rules.

**Live:** https://fundcheck.mayhu733.workers.dev (no login; try the Bovard dance showcase sample)
**Accuracy page:** https://fundcheck.mayhu733.workers.dev/evals (one line: the score. Every case and result is in the repo, in `evals/` and `public/eval-results.json`)

![Step 1, Check: the Bovard dance showcase sample with $7,200 eligible of $8,850 and the ticket-sales flag](submission/screenshots/01-result.png)

| Step 2, Fix | Step 3, Hand off |
|---|---|
| ![Step 2 after Approve all 3: three fixes marked Applied, request $7,200](submission/screenshots/02-fixes.png) | ![Step 3: 1 item left for the board, amount, deadline estimate, fund, link to USG's funding page and budget CSV](submission/screenshots/03-handoff.png) |

| Phone width | Accuracy page |
|---|---|
| ![Step 1 at phone width](submission/screenshots/04-mobile.png) | ![Accuracy page: 98 of 100 test plans checked correctly](submission/screenshots/05-accuracy.png) |

## Run it locally

```bash
npm i
```

Put a Claude API key in `.dev.vars` (git-ignored) as `ANTHROPIC_API_KEY=...`. Without it, the worker falls back to Cloudflare Workers AI, which needs `wrangler login`.

```bash
npm run dev:worker
```

That starts the Worker and its `/api` routes on port 8787. In a second terminal:

```bash
npm run dev
```

That starts the page on http://localhost:5173, with `/api` proxied to 8787. Add `?fixture=1` to the URL to see the sample result without calling any model.

```bash
npm test
```

```bash
npm run evals -- --url https://fundcheck.mayhu733.workers.dev
```

The eval runner defaults to `http://localhost:8787`. Add `--only e01,e06` to run a subset (partial runs don't overwrite the results file).

## Architecture

One Cloudflare Worker serves the React page as static assets plus two JSON endpoints. The rules engine is plain TypeScript that runs in the browser and in the eval runner and never calls a model.

![Architecture: the browser, one Cloudflare Worker, Claude with the Workers AI fallback, and the rules engine](submission/screenshots/06-architecture.png)

```mermaid
flowchart LR
  subgraph Browser
    Check["src/ui/pages/Check.tsx"]
    Evals["src/ui/pages/Evals.tsx"]
    Engine["src/engine/check.ts<br/>money.ts · deadline.ts · docs.ts<br/>vendor.ts · csv.ts"]
    Data["src/shared/rules.json<br/>src/shared/vendors.json"]
  end
  subgraph Worker["Cloudflare Worker"]
    Index["worker/index.ts<br/>/api/extract · /api/draft<br/>rate limit · sample fallback"]
    LLM["worker/llm.ts<br/>callJson(): Claude, then Workers AI"]
    Prompts["worker/prompts.ts"]
    Schema["worker/schema.ts<br/>Zod validation"]
    Cached["src/fixtures/sample-extraction.json"]
  end
  Claude["Anthropic Claude<br/>claude-opus-5-5"]
  WAI["Workers AI<br/>llama-3.3-70b-instruct-fp8-fast"]
  Runner["evals/run.ts<br/>evals/cases.json"]
  Results["public/eval-results.json"]

  Check -- "plan text" --> Index
  Index --> Prompts
  Index --> Schema
  Index --> LLM
  LLM -- "first" --> Claude
  LLM -- "if Claude fails" --> WAI
  Index -. "sample plan only, if slow or failed" .-> Cached
  Index -- "Extraction JSON" --> Check
  Check --> Engine
  Engine --> Data
  Runner -- "each case" --> Index
  Runner --> Engine
  Runner --> Results
  Results --> Evals
```

The shared types (money in integer cents, dates as `YYYY-MM-DD`) are in `src/shared/contracts.ts`.

## What the AI does, and what the code does

| The model (`claude-opus-5-5`, low effort) | Plain TypeScript (`src/engine/`) |
|---|---|
| Reads the free-text plan into line items and event facts (date, attendance, on campus, ticketed, travel) | All dollar math: the $4,000 venue and personnel cap, the $35 per person food limit, the $8,000 yearly cap, the $400 per night lodging limit, and the eligible request, capped by what is left of the $8,000 once the officer says what the org already received |
| Matches each item to rule IDs from a fixed list, with high or low confidence and a one-line reason ("DJ $600" → "Payments to talent or performers") | The deadline estimate (academic weeks, holidays and breaks from USC's academic calendar) and the blackout-date check |
| Picks one of the four funds | The document checklist and the exact file names |
| Drafts the form's free-text answers and the budget justifications, with bracketed placeholders such as "[your organization's mission]" for facts the plan doesn't give | Vendor check: plain string matching against both tabs of USG's vendor sheet (207 rows). This is not AI. |
| | The budget CSV in USG's template columns |

Every flag carries a rule ID internally, and the page renders USG's quote from `src/shared/rules.json` (version `guidelines-2026-10-21.1`, 51 rules), never text from the model. Each flag is badged "AI-judged" or "Rule math", so the officer can see which part made the call.

**Why this model, and what it costs.** We benchmarked cheaper models on a 41-case subset of the test plans. Claude Sonnet 5.5, the next tier down, halved the cost per check but checked 35 of 41 correctly, against 39 of 41 for `claude-opus-5-5`, so we kept the more accurate model. Each check is one model call: we measured 1.4 to 3.7 cents on short plans like the sample (warm or cold prompt cache) and 6 to 8 cents on a 22-item budget, roughly $14 to $37 per thousand checks. Drafting the form answers is a second, optional call that we did not measure. Hosting fits Cloudflare's free tier.

## Security and privacy

- **No storage.** FundCheck has no database and keeps nothing. The plan is sent to the model for that one call. The Worker logs token counts and error codes, never the plan text.
- **No traveller PII.** FundCheck never asks for dates of birth, USC IDs or phone numbers. It only reminds the officer that USG's form needs them.
- **Injection-safe prompt.** The plan is passed inside tags as untrusted data, and the system prompt tells the model to ignore instructions inside it. The output must match a Zod schema, and any rule ID outside the allowed list is dropped, so pasted text can't add a rule or change a quote.
- **Low confidence becomes a question.** An unsure match shows as an Ask chip for the officer, never as a flag.
- **Keys.** `ANTHROPIC_API_KEY` is a Wrangler secret in production and lives in the git-ignored `.dev.vars` locally. No key is in the repo.
- **Rate limit.** 20 model calls per minute per IP, counted per Worker instance.

## Eval results

Hand-written event plans in `evals/cases.json`, each labelled with the rules it must and must not trigger, run through the live `/api/extract` and then the rules engine. Many are phrased indirectly ("entertainment by" a stage name for a paid DJ, Mylar letters for balloons, robotaxi rides for rideshare). Some are clean plans full of decoys, and some are ambiguous plans where the right answer is an Ask chip, not a flag.

**Latest run:** FundCheck checked 98 of 100 test plans correctly, every one scored on a Claude answer (a case served by the fallback is re-run, never scored). Every case, its labels and its result are in `evals/` and `public/eval-results.json`.

Limits: these are test plans we wrote by hand, not real applications, so the score is a check, not a benchmark. The sample plan (e01) is close to the prompt's few-shot examples. Scoring details are in `evals/README.md`.

## Not built, and why

- **Suggesting other funding sources.** USG's Guidelines list "RSO receiving funding from another University income source" among reasons an application can be turned down, so suggesting other sources without care could hurt an application. Cut first.
- **A reviewer view for Funding Directors.** It needs the Funding Department's input on what reviewers want to see. The officer-side check came first.
- **Filing directly into EngageSC.** USG's application sits on EngageSC behind USC sign-in, so FundCheck hands off instead. Filing from FundCheck would need USG to open an integration.
- **Reading quotes from PDFs or images.** FundCheck takes pasted text only. Parsing uploads adds a failure point that the golden path didn't need for the hackathon.

## Notes for the Funding Department

While building the rules table we found a few places where USG's documents word the same rule differently. They're collected, with sources, in [submission/form-notes.md](submission/form-notes.md), as a short list for the next Guidelines revision.

## Built with

TypeScript, React 18, Vite 6, Tailwind CSS v4, Zod 4, Vitest, Cloudflare Workers with static assets, Cloudflare Workers AI, and the Anthropic SDK. The code was written during the hackathon (Nov 14 to 15, 2026) with Claude Code as the coding assistant. The colours are USC cardinal and gold; spacing and the type scale follow IBM Carbon; the single column and one job per screen follow GOV.UK. The footer reads "Not affiliated with USC or USG."
