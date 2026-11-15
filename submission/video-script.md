# FundCheck video script

Hard limit 3:00. Read slowly. Spoken words are on the left, the screen on the right. Every screen cue names the on-screen label to show. Shot-by-shot setup is in `shot-list.md`.

Checked against the live site on Nov 14 after the 19:19 UI freeze.

**Timing.** 351 spoken words (the cap is 420). A text-to-speech voice at 135 words per minute reads them in about 2:35. Add about 15 seconds of clicks, typing and tab switches and the video lands near 2:50, inside 3:00. If a take runs past 2:55, move through the scrolls faster rather than cutting words.

Numbers are written as digits so the captions match the screen. Say "$356,100" in full: "three hundred fifty-six thousand, one hundred dollars".

## Timed outline

| Time | Section | Spoken words | Speech alone |
|---|---|---|---|
| 0:00 to 0:22 | 1. Why a judge should care: free, open events | 49 | about 22 s |
| 0:22 to 2:10 | 2. Live golden path on the sample plan | 229 | about 100 s, plus about 8 s of clicks and typing |
| 2:10 to 2:35 | 3. One handled failure, and the accuracy page | 45 | about 20 s, plus a tab switch and a page load |
| 2:35 to 2:50 | 4. Who adopts it | 28 | about 12 s, then hold the end card |

---

## 1. Why a judge should care (0:00 to 0:22) · 49 words

| Voice-over | Screen |
|---|---|
| When USG's Funding Department pays for a club event on campus, that event can't sell tickets and has to be open to every student. It's a free event any Trojan can walk into. | Guidelines §5, the lines "Events that include ticket sales" and "On-campus events that are not open to all students". |
| Miss USG's deadline, though, and the application is "automatically denied." One fewer free event for everyone. | Guidelines §1, the sentence "If this deadline is not met the application will be automatically denied." |

## 2. Live golden path (0:22 to 2:10) · 229 words

| Voice-over | Screen |
|---|---|
| USG has up to $356,100 a year for these events. FundCheck pre-checks the application, starting with the next window to apply: Wednesday, November 18. | USG funding page, "the ability to allocate up to $356,100". Cut to the FundCheck home page: "Pre-check your USG funding application." and "Next application window: Wed, Nov 18, 2026, 8:00 AM to 11:59 PM". |
| This sample is a spring dance showcase in Bovard, and USG funded nine dance showcases last year. Anthropic's Claude Opus 5.5 reads it into line items and matches each one to a USG rule. | Click "Try the Bovard dance showcase sample". The plan fills "Your event plan", then "Reading your plan…" for about 6 seconds. |
| The verdict comes first: three items not eligible, one over a cap, one for case-by-case review. The eligible request is $7,200 of the $8,850 planned, plus a deadline estimate. | The "Pre-check" summary: "3 not eligible", "1 over cap", "1 review note", "Eligible request $7,200 of $8,850 planned", "Deadline · Estimate · Submit by Wed, Feb 3, 2027", "Fund · Performing, Visual Arts, & Cultural Fund". |
| The first flag is the $10 tickets at the door, with USG's own sentence from section 5 under it. The balloon arch and the DJ are marked AI-judged. The model only picks from a fixed list of USG rules, so every quote on screen is USG's. | "Not eligible per §5 (3)" with "The board may make an exception" beside it. The "Ticket sales" card: "AI-judged", In your plan: "$10 tickets at the door", "USG Funding Department Guidelines §5 says:" "Events that include ticket sales". Then "Helium balloon arch ($250)" and "DJ ($600)", each with "AI-judged". |
| Anything with a dollar sign is plain code, marked Rule math: Bovard plus the AV crew is $4,800, so $800 is over the $4,000 cap. | "Over cap (1)": "Venue and personnel come to $4,800, $800 over the $4,000 cap." with "Rule math" and the §3 quote. |
| Some facts only the club knows, so FundCheck asks. Say the club already got $2,000 this year. The request drops to $6,000, what's left of its $8,000 for the year. | The "answers could change this" panel (it says 5 or 6, depending on the read). Type 2000 into "How much has your org already received from USG Funding this year?". The summary changes to "$6,000" and "Capped at the $6,000 your org has left of its $8,000 for the year". |
| Then the documents, down to the file name USG wants for each quote. | "Documents checklist": "Quote from Wolfgang Puck Catering · Needed", "Name it RSO_Lastname_Firstname_WolfgangPuckCatering_Quote.pdf". |
| Last, it drafts the form answers under the form's own labels. Anything it can't know, like the club's mission, stays in brackets for the officer to fill in. | "Form answers": click "Draft my form answers" (cut the wait in editing). Show "How does the event align with your mission/vision/goals?" with "[your organization's mission]", then "Download budget CSV" and the line "The budget CSV leaves out 2 lines that aren't eligible". |

## 3. One handled failure, and the accuracy page (2:10 to 2:35) · 45 words

| Voice-over | Screen |
|---|---|
| Here's a plan the model isn't sure about: dinner boxes for jazz musicians who aren't charging. Is that paying a performer? Instead of guessing, FundCheck asks. | Second tab, the musicians plan already checked: "No flags", and under "5 answers could change this": "Is 'dinner boxes for the 6 musicians before soundcheck, Mendocino Farms $90' a payment to a performer or other talent?" with "Yes" and "No". |
| On the accuracy page, FundCheck checked 96 of 100 test plans correctly. They're hand-written test plans, not real applications. | "How accurate is it?" link, then `/evals`: the score line, then "See every test plan and its answer on GitHub". |

## 4. Who adopts it (2:35 to 2:50) · 28 words

| Voice-over | Screen |
|---|---|
| The owner would be USG's Funding Department, starting with RSO liaison office hours in spring 2027. Each year's update is data, not code: new Guidelines, new rules file. | End card: fundcheck.mayhu733.workers.dev and github.com/DY0810/fundcheck. |

---

## Notes for the recording

- Every number spoken is on screen at the same moment, so the captions and the product agree.
- Say "pre-check", "not eligible" and "ready for review". Anything stronger is in USG's own words: "automatically denied" is said once, as USG's quote.
- No names of USG staff. Roles only.
- Never show the draft application form on screen.
- If the live read takes longer than 15 seconds on the sample, the page shows a saved result with a note. Re-record the take rather than narrate over it.
