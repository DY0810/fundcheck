# FundCheck video script

Hard limit 3:00. Read slowly. Spoken words are on the left, the screen on the right. Every screen cue names the on-screen label to show. Shot-by-shot setup is in `shot-list.md`.

Checked against the live site on Nov 14 after the 20:38 UI freeze (tag `ui-v2-final`): three steps, Check, Fix, Hand off. The site has no accuracy page since b7becec; the test score is shown from the deck, slide 4. No spoken line names a model or provider.

**Timing.** 310 spoken words (the cap is 420). A text-to-speech voice at 135 words per minute reads them in about 2:27. Most clicks happen while the voice runs; allow about 15 to 20 seconds of extra screen time for clicks, scrolls and one tab switch, and the video lands near 2:50, inside 3:00. If a take runs past 2:55, move through the scrolls faster rather than cutting words.

Numbers are written as digits so the captions match the screen. Say "$356,100" in full: "three hundred fifty-six thousand, one hundred dollars".

## Timed outline

| Time | Section | Spoken words | Speech alone |
|---|---|---|---|
| 0:00 to 0:22 | 1. Why a judge should care: free, open events | 49 | about 22 s |
| 0:22 to 2:12 | 2. Live golden path on the sample plan: Check, Fix, Hand off | 198 | about 95 s, plus about 15 s of clicks |
| 2:12 to 2:37 | 3. One handled failure, and the test score | 35 | about 17 s, plus a tab switch and a cut to the deck |
| 2:37 to 2:50 | 4. Who adopts it | 28 | about 12 s, then hold the end card |

---

## 1. Why a judge should care (0:00 to 0:22) · 49 words

| Voice-over | Screen |
|---|---|
| When USG's Funding Department pays for a club event on campus, that event can't sell tickets and has to be open to every student. It's a free event any Trojan can walk into. | Guidelines §5, the lines "Events that include ticket sales" and "On-campus events that are not open to all students". |
| Miss USG's deadline, though, and the application is "automatically denied." One fewer free event for everyone. | Guidelines §1, the sentence "If this deadline is not met the application will be automatically denied." |

## 2. Live golden path (0:22 to 2:12) · 198 words

| Voice-over | Screen |
|---|---|
| USG has up to $356,100 a year for these events. FundCheck shows the next window to apply: Wednesday, November 18. | USG funding page, "the ability to allocate up to $356,100". Cut to the FundCheck home page: "Pre-check your USG funding application." and "Next application window: Wed, Nov 18, 2026, 8:00 AM to 11:59 PM". |
| The sample is a Bovard dance showcase, and USG funded nine last year. AI reads it into line items and matches each one to a USG rule. | Click "Try the Bovard dance showcase sample". It fills "Your event plan" and runs the check by itself ("Reading your plan…", about 6 seconds). A pasted plan uses "Check my plan" instead. |
| Step one, Check: three items not eligible, one over a cap, one for review, and $7,200 eligible of $8,850. | Step 1 "What we found": "3 not eligible", "1 over cap", "1 review note", "Eligible request $7,200 of $8,850 planned", and the "Review fixes" button. |
| First, the $10 tickets, with USG's own sentence under it. The balloon arch and the DJ are marked AI-judged. The model only picks from USG's fixed rule list, so every quote is USG's. | "Not eligible per §5 (3)" with "The board may make an exception" beside it. The "Ticket sales" card: "AI-judged", In your plan: "$10 tickets at the door", "USG Funding Department Guidelines §5 says:" "Events that include ticket sales". Then "Helium balloon arch ($250)" and "DJ ($600)", each with "AI-judged". |
| Anything with a dollar sign is plain code, marked Rule math: Bovard plus the AV crew is $4,800, so $800 is over the $4,000 cap. | "Over cap (1)": "Venue and personnel come to $4,800, $800 over the $4,000 cap." with "Rule math" and the §3 quote. |
| Step two, Fix. FundCheck proposes three fixes, like dropping the balloon arch, and nothing changes until the officer approves. Approve all three, and the request is $7,200. Making the event free changes the event, so it's never automatic. | Click "Review fixes". Step 2 "Review fixes": "Nothing changes until you choose.", "You'll request $8,850 of $8,850 planned", and under "3 changes that follow USG's rules": "Remove Helium balloon arch ($250) from the request", "Remove DJ ($600) from the request", "Request the $4,000 cap for venue and personnel ($800 less)". Click "Approve all 3": the button reads "All 3 applied", each row reads "Applied", and "You'll request $7,200 of $8,850 planned". Point at "Changes to the event": "Don't sell tickets: make the event free" and "These change the event itself, so they are never part of Approve all." |
| Filing needs the officer's USC sign-in, so step three hands off: the amount, a budget CSV, each document's file name, and form answers to copy. Anything it can't know, like the club's mission, stays in brackets. | Click "Continue". Step 3 "Hand off to USG": "1 item left for the board" (Ticket sales), "Amount to request $7,200", "Deadline (estimate) Submit by Wed, Feb 3, 2027", "Open USG's funding page", "Filing needs your USC sign-in. FundCheck doesn't submit for you.", "Download budget CSV". Open "Documents · 11 needed": "Quote from Wolfgang Puck Catering · Needed", "Name it RSO_Lastname_Firstname_WolfgangPuckCatering_Quote.pdf". Open "Form answers", click "Draft my form answers" (cut the wait in editing) and show "How does the event align with your mission/vision/goals?" with "AI draft" and "[your organization's mission]". |

## 3. One handled failure, and the test score (2:12 to 2:37) · 35 words

| Voice-over | Screen |
|---|---|
| Dinner for unpaid jazz musicians: is that paying a performer? The model isn't sure, so FundCheck asks instead of guessing. | Second tab, the musicians plan already checked: "What we found" with "No flags". Open "Questions · 5 could change this": "Is "dinner boxes for the 6 musicians before soundcheck, Mendocino Farms $90" a payment to a performer or other talent?" with "Yes" and "No". |
| FundCheck checked 98 of 100 test plans correctly. They're hand-written test plans, not real applications. | Cut to the pitch deck, slide 4 (`submission/deck/deck.pdf`, page 4), full screen. Hold on "98 of 100" and "hand-written test plans checked correctly". |

## 4. Who adopts it (2:37 to 2:50) · 28 words

| Voice-over | Screen |
|---|---|
| The owner would be USG's Funding Department, starting with RSO liaison office hours in spring 2027. Each year's update is data, not code: new Guidelines, new rules file. | End card: fundcheck.mayhu733.workers.dev and github.com/DY0810/fundcheck. |

---

## Notes for the recording

- Every number spoken is on screen at the same moment, so the captions and the product agree.
- Say "pre-check", "not eligible", "proposes" and "hands off". FundCheck never files anything, and nothing in the video says an application is accepted by USG. "Automatically denied" is said once, as USG's quote.
- Don't answer the sample's "Questions" on camera: an answer reruns the check and changes the $7,200 that steps 2 and 3 show.
- No names of USG staff. Roles only.
- Never show the draft application form on screen.
- If the live read takes longer than 15 seconds on the sample, the page shows a saved result with a note. Re-record the take rather than narrate over it.
