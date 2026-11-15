# FundCheck video script

Hard limit 3:00. Read slowly. Spoken words are on the left, the screen on the right. Every screen cue names the on-screen label to show. Shot-by-shot setup is in `shot-list.md`.

Checked against the live site on Nov 15 after the row-layout UI change (commit `1eabae1`): three steps, Check, Fix, Hand off, each one column of full-width rows; the home page keeps two columns. The test score is shown from the deck, slide 4. No spoken line names a model or provider.

**Timing.** 306 spoken words (the cap is 420). The rendered video runs 2:20, inside 3:00: about 2:02 of speech, plus four clicks and the step changes. The result cuts in straight after each click, so no wait is shown. If a re-recorded take runs past 2:55, move through the scrolls faster rather than cutting words.

Numbers are written as digits so the captions match the screen. Say "$356,100" in full: "three hundred fifty-six thousand, one hundred dollars".

## Timed outline

| Time | Section | Spoken words | Speech alone |
|---|---|---|---|
| 0:00 to 0:19 | 1. Why a judge should care: free, open events | 49 | 17 s |
| 0:19 to 1:49 | 2. Live golden path on the sample plan: Check, Fix, Hand off | 194 | 79 s, plus four clicks and two step changes |
| 1:49 to 2:05 | 3. One handled failure, and the test score | 35 | 14 s, plus a cut to the second plan and a cut to the deck |
| 2:05 to 2:20 | 4. Who adopts it | 28 | 12 s, then hold the end card |

---

## 1. Why a judge should care (0:00 to 0:19) · 49 words

| Voice-over | Screen |
|---|---|
| When USG's Funding Department pays for a club event on campus, that event can't sell tickets and has to be open to every student. It's a free event any Trojan can walk into. | Guidelines §5, the lines "Events that include ticket sales" and "On-campus events that are not open to all students". |
| Miss USG's deadline, though, and the application is "automatically denied." One fewer free event for everyone. | Guidelines §1, the sentence "If this deadline is not met the application will be automatically denied." |

## 2. Live golden path (0:19 to 1:49) · 194 words

| Voice-over | Screen |
|---|---|
| USG has up to $356,100 a year for these events. FundCheck shows the next window to apply: Wednesday, November 18. | USG funding page, "the ability to allocate up to $356,100". Cut to the FundCheck home page: "Pre-check your USG funding application." and "Next application window: Wed, Nov 18, 2026, 8:00 AM to 11:59 PM". |
| The sample is a Bovard dance showcase, and USG funded nine last year. AI reads it into line items and matches each one to a USG rule. | The Bovard sample is already in "Your event plan" when the page loads. Click "Check my plan" ("Reading your plan…", about 6 seconds; cut the wait in editing). |
| Step one, Check: three items not eligible, one over a cap, one for review, and $7,200 eligible of $8,850. | Step 1 "What we found": "3 not eligible", "1 over cap", "1 review note", "Eligible request $7,200 of $8,850 planned", and the "Review fixes" button. |
| First, the $10 tickets, with USG's own sentence under it. AI matched the balloon arch and the DJ. The model only picks from USG's fixed rule list, so every quote is USG's. | "Not eligible per §5" with "The board may make an exception" beside it. "Ticket sales": In your plan: "$10 tickets at the door", "USG Funding Department Guidelines §5 says:" "Events that include ticket sales". Then "Helium balloon arch ($250)" and "DJ ($600)", each with its own §5 quote. |
| Anything with a dollar sign is plain code: Bovard plus the AV crew is $4,800, so $800 is over the $4,000 cap. | "Over cap": "Venue and personnel come to $4,800, $800 over the $4,000 cap." with the §3 quote under it. |
| Step two, Fix. FundCheck proposes three fixes, like dropping the balloon arch, and nothing changes until the officer approves. Approve all three, and the request is $7,200. Making the event free changes the event, so it's never automatic. | Click "Review fixes". Step 2 "Review fixes": "You'll request $8,850 of $8,850 planned", and under "3 changes that follow USG's rules": "Remove Helium balloon arch ($250) from the request", "Remove DJ ($600) from the request", "Request the $4,000 cap for venue and personnel ($800 less)". Click "Approve all 3": the button reads "All 3 applied", each row reads "Applied", and "You'll request $7,200 of $8,850 planned". Point at "Changes to the event": "Don't sell tickets: make the event free". |
| Filing needs the officer's USC sign-in, so step three hands off: the amount, a budget CSV, each document's file name, and form answers to copy. Anything it can't know, like the club's mission, stays in brackets. | Click "Continue". Step 3 "Hand off to USG": "1 item left for the board" (Ticket sales), "Amount to request $7,200", "Deadline (estimate) Submit by Wed, Feb 3, 2027", "Open USG's funding page", "Download budget CSV". "Form answers" and "Documents · 11 needed" are full-width rows below: click "Draft my form answers" beforehand (cut the wait in editing), then scroll down to Documents: "Quote for Bovard rental + AV crew (name the vendor) · Needed", "Name it RSO_Lastname_Firstname_BovardrentalAVcrew_Quote.pdf". Scroll back up to Form answers: "How does the event align with your mission/vision/goals?" with "AI draft" and "[your organization's mission]". |

## 3. One handled failure, and the test score (1:49 to 2:05) · 35 words

| Voice-over | Screen |
|---|---|
| Dinner for unpaid jazz musicians: is that paying a performer? The model isn't sure, so FundCheck asks instead of guessing. | Second tab, the musicians plan already checked: "What we found" with "No flags". Open "Questions · 5 could change this": "Is "dinner boxes for the 6 musicians before soundcheck, Mendocino Farms" a payment to a performer or other talent?" with "Yes" and "No". |
| FundCheck checked 98 of 100 test plans correctly. They're hand-written test plans, not real applications. | Cut to the pitch deck, slide 4 (`submission/deck/deck.pdf`, page 4), full screen. Hold on "98 of 100" and "hand-written test plans checked correctly". |

## 4. Who adopts it (2:05 to 2:20) · 28 words

| Voice-over | Screen |
|---|---|
| The owner would be USG's Funding Department, starting with RSO liaison office hours in spring 2027. Each year's update is data, not code: new Guidelines, new rules file. | A "Proposed rollout" card: "USG's Funding Department", "Spring 2027 · RSO liaison office hours", beside the placement mockup (`submission/deck/placement.png`) with its label "Proposed placement, mockup. Not live on USG's site." Then the end card: FundCheck, "Pre-check your USG funding application.", "Yearly upkeep: data, not code." No FundCheck link on screen. |

---

## Notes for the recording

- Every number spoken is on screen at the same moment, so the captions and the product agree.
- Say "pre-check", "not eligible", "proposes" and "hands off". FundCheck never files anything, and nothing in the video says an application is accepted by USG. "Automatically denied" is said once, as USG's quote.
- Don't answer the sample's "Questions" on camera: an answer reruns the check and changes the $7,200 that steps 2 and 3 show.
- No names of USG staff. Roles only.
- Never show the draft application form on screen.
- If the live read takes longer than 15 seconds on the sample, the page shows a saved result with a note. Re-record the take rather than narrate over it.
