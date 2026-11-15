# FundCheck evals

`cases.json` holds 100 event plans that the team wrote and labelled by hand. Each is labelled with the USG rules it must trigger and the rules it must not, and every label comes from the rule's quote in `src/shared/rules.json`.
- **Rules covered:** every AI-judged rule several times, in indirect wording ("entertainment by Kev Beats" for paid talent, "Mylar letters" for balloons, "Waymo rides" for rideshare). Also the cap math (venue/personnel, $35 food, $400 lodging), the yearly cap with an amount already received, events per semester, blackout and holiday dates, UEPA format, other funding, and vendors from both tabs of USG's list.
- **Clean plans:** about 1 in 6 are clean plans full of decoys, and must flag nothing.
- **Ambiguous plans:** about 1 in 10 are ambiguous; there an Ask chip is the right answer and a hard flag is wrong.

Run: `npx tsx evals/run.ts --url https://fundcheck.mayhu733.workers.dev`. Add `--only e01,e03` to run a subset; partial runs don't write results.
- Each case goes through the real `/api/extract`, then `runCheck` from `src/engine`. Up to 4 run at once, paced under the API's 20-per-minute limit, with a 30 s back-off on a 429.
- Only answers from Claude are scored. A case that comes back from the fallback model, the saved sample or an error is re-run, never scored and never dropped.
- The run writes `public/eval-results.json`. The headline is `summary.passed` out of `summary.cases`.

Scoring:
- **Hit:** a `mustFlag` rule appears with any severity other than `pass`, on the item named by `itemContains` when one is given. With `orAsk`, an Ask chip on that item also counts.
- **False flag:** a `mustNotFlag` rule appears as `not_eligible` or `over_cap`.
- **Pass:** the case is fully correct: no misses, no false flags, and the fund and eligible dollars match whenever the case sets them.
- **Precision and recall:** computed over all labels. False positives are counted only against each case's `mustNotFlag` list.

Limits: the set is hand-written by the team, so it is not a benchmark. e01 is the sample plan, and some of its phrasing is close to the prompt's few-shot examples. R24's second quote (no funding during "University holidays, breaks, study days, or finals") is labelled as written.

Label changes:
- e11 (before the first run, at HQ's request): the Surfliner ticket now passes with either an R3.rideshare flag or an Ask chip (`orAsk`), because the clause names "Amtrak cabins" and a coach seat is arguably not a cabin.
- e35 and e36 (after full run 1 of the 100): the `itemContains` token pointed at the venue line ("yamashiro", "cantina") instead of the dinner line that "Restaurant diners" applies to. Run 1 flagged R3.restaurant on the dinner line in both cases but scored them as misses. The tokens are now "prix" and "dinner", and the rule and expectation are unchanged. Run 1 was not published; run 2 is.

History:
- Run 2 (2026-11-15 02:59 UTC): 96/100. e84 and e85 failed because the engine's R24 checked only the Dec 5–Jan 12 and after-May-1 windows.
- Engine fix cc50d5c: R24 now also covers University holidays, breaks, study days and finals from the USC academic calendar.
- Run 3 (2026-11-15 03:22 UTC, published): 98/100, precision 0.991, recall 0.983, all claude-opus-5-5, no labels changed. Still failing: e06 (R4 judged low confidence → Ask) and e87 (tees judged durable → R19 skipped).
