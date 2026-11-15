# FundCheck video script

Target 2:50, hard limit 3:00. Read slowly. Spoken words are on the left, the screen on the right.

**Status: provisional.** The result page is being reordered so the verdict (counts, eligible amount, deadline, first flag) comes first and the editable table moves below it, and the prompts and evals get one more run. The screen column and `shot-list.md` get finalised against the frozen UI. In the spoken words, only these can still change: the verdict counts in section 2 (3 not eligible, 1 over cap, 1 review note) and all of section 3 (the Ask chip and the accuracy figure, written as `[[ACCURACY]]` until HQ sends it). Everything else is final. The UI is also being re-skinned, so the screen column names buttons and on-screen text only, never colours or looks.

**Timing.** 329 spoken words. Read aloud by a text-to-speech voice at 135 words per minute (with "93 of 100" standing in for the accuracy figure), the whole script takes about 2:27, and about 2:23 without the line marked *(cut if long)*. The rest of the 2:50 is pauses for clicks. The 6-second model read is covered by the second line of section 2. If a take runs past 2:55, drop the marked line.

Numbers are written as digits so the captions match the screen. Say "$356,100" in full: "three hundred fifty-six thousand, one hundred dollars".

---

## 1. Problem (0:00 to 0:20) · 49 words · about 20 to 22 s

| Voice-over | Screen |
|---|---|
| USG's Funding Department can give up to $356,100 a year to student events. The on-campus events it funds can't sell tickets and must be open to all students. | USG funding page, the line "the ability to allocate up to $356,100". Cut to Guidelines §5, the lines "Events that include ticket sales" and "On-campus events that are not open to all students". |
| So when an application misses the deadline, USG says it's "automatically denied," and that's one fewer free event for every Trojan. | Guidelines §1, the "automatically denied" sentence highlighted. |

## 2. Live golden path (0:20 to 2:10) · 205 words · about 82 to 91 s

| Voice-over | Screen |
|---|---|
| FundCheck pre-checks that application. This sample is a spring dance showcase in Bovard, and USG funded nine dance showcases last year. | FundCheck home page. Click "Try the Bovard dance showcase sample". The plan fills the box and the check starts. |
| Anthropic's Claude Opus 5.5 reads the plan into line items and matches each one to a USG rule ID. | "Reading your plan…" loading state, then the result appears (about 6 s). |
| Here's the verdict: three things not eligible, one over a cap, one for case-by-case review. The eligible request is $7,200 of an $8,850 plan. | Verdict at the top: 3 not eligible, 1 over cap, 1 review note, eligible request $7,200. |
| The first flag is the $10 tickets at the door. Under it is USG's own sentence from section 5, plus the note that the board can still make an exception. | First flag (R4, ticket sales): the user's words "$10 tickets at the door", then the §5 quote, then the R2 exception line. |
| The balloon arch and the DJ are flagged too, marked AI-judged. The model only picks rule IDs from a fixed list, so every quote on screen is USG's. | Scroll to the R1 (balloons) and R3.talent (DJ) flags. Hover the "AI-judged" badge. |
| Anything with a dollar sign is plain code: Bovard plus the AV crew is $4,800, so $800 is over the $4,000 venue cap. | Money panel: venue and personnel $4,800 of $4,000. Then the R6 flag with its "Rule math" badge. |
| The deadline counts six academic weeks back from April 9 and lands on Wednesday, February 3. USG's documents word this rule differently, so it's labelled an estimate. | Deadline card: "Submit by Wed, Feb 3, 2027", "Estimate", latest Feb 24. Open "Sources word this differently" for one second. |
| Then the document checklist, with the file name USG wants for each vendor quote. Anything misread can be edited, and the check reruns. *(cut if long: It also drafts the form answers and a budget CSV.)* | Documents checklist, the quote file names. Then the editable table: change one cost and watch the totals move. Then click "Draft my form answers" (cut the 5-second wait in editing) and point at "Download budget CSV". |

## 3. How the AI is checked, and one handled failure (2:10 to 2:40) · 52 words · about 21 to 23 s

| Voice-over | Screen |
|---|---|
| Here's a plan the model isn't sure about: dinner boxes for jazz musicians who aren't charging. Is that paying a performer? Instead of guessing, FundCheck asks. | Second tab, already checked: the "dinner for unpaid musicians" plan. The Ask chip: "Does 'dinner boxes for the 6 musicians…' fall under 'Payments to talent or performers'?" with Yes / No. |
| On the accuracy page, FundCheck checked [[ACCURACY]] test plans correctly. Those are plans written by hand, not real applications, so it's a check, not a benchmark. | `/evals`: the score, "[[ACCURACY]] test plans checked correctly". Then the `evals/` folder on GitHub. |

## 4. Who adopts it (2:40 to 2:50) · 23 words · about 9 to 10 s

| Voice-over | Screen |
|---|---|
| The owner would be USG's Funding Department, starting with RSO liaison office hours in spring 2027. Each year's update is data, not code. | End card: fundcheck.mayhu733.workers.dev and github.com/DY0810/fundcheck. |

---

## Notes for the recording

- Every number spoken is on screen at the same moment, so the captions and the product agree.
- Say "pre-check", "not eligible" and "ready for review". Anything stronger is in USG's own words: "automatically denied" is said once, as USG's quote.
- No names of USG staff. Roles only.
- Never show the draft application form on screen.
- If the live read takes longer than 15 seconds on the sample, the page shows a labelled cached result. Re-record the take rather than narrate over the banner.
