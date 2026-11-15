# FundCheck evals

18 hand-written event plans in `cases.json`, each labelled with the USG rules it must and must not trigger. They cover every AI-judged rule the brief targets, phrased indirectly ("entertainment by Kev Beats" for paid talent, "Mylar letters" for balloons, "Waymo rides" for rideshare, a "suggested $5 donation" for ticket sales). They also cover the rule-math cases (food at $40 per person, $7,000 already received, multi-day events, the Dec 10 blackout, a paid professional panel), 3 clean plans full of decoys, and 2 ambiguous plans where the right answer is an Ask chip.

Run: `npx tsx evals/run.ts --url https://fundcheck.mayhu733.workers.dev` (add `--only e01,e03` for a subset; partial runs don't write results). Each case goes through the real `/api/extract`, then `runCheck` from `src/engine`, one at a time. The run writes `public/eval-results.json`, which the `/evals` page shows.

Scoring:
- **Hit:** a `mustFlag` rule appears with any severity other than `pass`, on the item named by `itemContains` when one is given.
- **False flag:** a `mustNotFlag` rule appears as `not_eligible` or `over_cap`.
- **Pass:** no misses, no false flags, and the fund and eligible dollars match whenever the case sets them.
- **Precision and recall:** computed over all labels. False positives are counted only against each case's `mustNotFlag` list.

Limits: this is a small set that the team wrote by hand. It is not a benchmark. e01 is the sample plan, and some of its phrasing is close to the prompt's few-shot examples. Results depend on which provider served each case; the provider is recorded per case.

Label changes: none.
