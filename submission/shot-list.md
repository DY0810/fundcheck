# FundCheck shot list

Checked against the live site on Nov 14 after the final UI freeze (tag `ui-v3-final`), three steps: Check, Fix, Hand off, two columns on desktop, at 1536×864 CSS pixels (a 1920×1080 screen at 125% zoom). Pair this with `video-script.md`: the times match its sections. Things are named by their on-screen labels.

## Recording settings

- Screen: 1920×1080, one browser window, full screen.
- Browser zoom 125%.
- Width: the page needs at least 1,280 CSS pixels so every step shows its two columns. 1920×1080 at 125% gives 1,536; don't zoom past 150%.
- Bookmarks bar hidden, no extensions in the toolbar, and a fresh profile or guest window so no history or autofill shows.
- System appearance: light.
- Mouse: move slowly, and pause one second on anything the voice names.
- Captions on: upload the spoken lines of `video-script.md` as the caption track in YouTube Studio, or burn them in. Check that every number in the captions matches the screen.
- Never open or show the draft USG application form.
- Load the live site once before the first take so it is warm. The site allows 20 checks a minute per network, which is plenty.

## Tabs to open before recording

1. `https://docs.google.com/document/d/1noJFJ4SxrFGD1Zm-6EqUHpXSIOUuFIL-gIobWXcXCt0/edit` (USG Funding Department Guidelines, current as of Oct 21, 2026)
2. `https://usg.usc.edu/branches/funding/`
3. `https://fundcheck.mayhu733.workers.dev/` (fresh load, empty plan box)
4. `https://fundcheck.mayhu733.workers.dev/` with the musicians plan below already checked (shot 15)
5. `submission/deck/deck.pdf` open at page 4 (slide 4), full screen

Reload tab 3 between takes so the plan box is empty and no fixes or answers carry over.

## Sample text

**Bovard sample.** The "Try the Bovard dance showcase sample" button fills this exactly and runs the check; paste it and press "Check my plan" only if the button is missing.

```
Spring Dance Showcase — Bovard Auditorium, Fri Apr 9 2027, 7pm
~300 people, $10 tickets at the door
Catering from Wolfgang Puck Catering $3,000
Helium balloon arch $250
DJ $600
Bovard rental + AV crew $4,800
Printed programs $200
```

**Musicians plan.** Paste into the "Your event plan" box in tab 4 and press "Check my plan" before recording.

```
Jazz in the Courtyard: spring showcase
Fri Apr 2 2027, 6-8pm, Annenberg courtyard
free, open to all, ~120
the Thornton jazz combo isn't charging us, we just want to feed them:
- dinner boxes for the 6 musicians before soundcheck, Mendocino Farms $90
- Crepes Bonaparte crepe cart for the audience $1,100
- music stand + amp rental $140
- programs $60
```

Checked live on the final UI: step 1 "What we found" gives "No flags" and "Eligible request $1,390 of $1,390 planned", the stepper shows "Fix (nothing to fix)", and "Questions · 5 could change this" opens with "Is "dinner boxes for the 6 musicians before soundcheck, Mendocino Farms $90" a payment to a performer or other talent?"

## Shots

| # | Time | Tab | What to do | On screen when the voice names it |
|---|---|---|---|---|
| 1 | 0:00 | 1, Guidelines | Cmd+F "Events that include ticket sales". Hold. | §5 list: "Events that include ticket sales", "On-campus events that are not open to all students" |
| 2 | 0:12 | 1, Guidelines | Cmd+F "automatically denied". Hold. | §1: "If this deadline is not met the application will be automatically denied." |
| 3 | 0:23 | 2, funding page | Scroll to "Fund Descriptions". Cmd+F "356,100". | "the ability to allocate up to $356,100 toward undergraduate students and RSOs" |
| 4 | 0:29 | 3, FundCheck home | Hold on the heading, then point at the window line. | "Pre-check your USG funding application." and "Next application window: Wed, Nov 18, 2026, 8:00 AM to 11:59 PM" |
| 5 | 0:36 | 3 | Click "Try the Bovard dance showcase sample". It fills the plan and runs the check by itself; do nothing while it reads. | The plan in "Your event plan", then "Reading your plan…" (about 6 s) |
| 6 | 0:48 | 3 | Hold on step 1: the verdict across the top, flags on the left, the Questions to Vendors rows on the right. The paste box has collapsed to one row. | "Spring Dance Showcase", "Edit the plan", "Check another plan"; the stepper "Check, Fix, Hand off"; "What we found", "3 not eligible", "1 over cap", "1 review note", "Eligible request $7,200 of $8,850 planned", "Review fixes" |
| 7 | 0:56 | 3 | In the left column, point at the "Not eligible per §5 (3)" heading and "The board may make an exception" beside it, then the first card. | "Ticket sales", "AI-judged", In your plan: "$10 tickets at the door", "USG Funding Department Guidelines §5 says:" "Events that include ticket sales" |
| 8 | 1:03 | 3 | Scroll down slowly through the left column. Hover the "AI-judged" chip on "Helium balloon arch ($250)". | "Helium balloon arch ($250)" ("… Balloons") and "DJ ($600)" ("Payments to talent or performers"), each with "AI-judged" |
| 9 | 1:12 | 3 | Keep scrolling to "Over cap (1)". Hover "Rule math". | "Venue and personnel come to $4,800, $800 over the $4,000 cap." with "Rule math" and the §3 quote |
| 10 | 1:23 | 3 | Scroll back to the top and click "Review fixes" on the right of the verdict. | Step 2 "Review fixes": "Nothing changes until you choose.", "You'll request $8,850 of $8,850 planned", and under "3 changes that follow USG's rules": "Remove Helium balloon arch ($250) from the request", "Remove DJ ($600) from the request", "Request the $4,000 cap for venue and personnel ($800 less)" |
| 11 | 1:31 | 3 | Click "Approve all 3". Then scroll the left column to "Changes to the event"; the "You'll request" panel on the right stays in view. Don't touch the ticket row. | "All 3 applied", each row "Applied", "You'll request $7,200 of $8,850 planned"; "Don't sell tickets: make the event free" and "These change the event itself, so they are never part of Approve all." |
| 12 | 1:42 | 3 | Click "Continue" in the "You'll request" panel. Hold, then click "Draft my form answers" at the top of the right column (about 10 s; cut the wait in editing). | Step 3 "Hand off to USG": "1 item left for the board" (Ticket sales · Not eligible), "Amount to request $7,200", "Deadline (estimate) Submit by Wed, Feb 3, 2027", "Open USG's funding page", "Filing needs your USC sign-in. FundCheck doesn't submit for you.", "Download budget CSV" |
| 13 | 1:51 | 3 | Scroll down the right column to "Documents · 11 needed" (open by default). | "Quote from Wolfgang Puck Catering · Needed", "Name it RSO_Lastname_Firstname_WolfgangPuckCatering_Quote.pdf" |
| 14 | 1:57 | 3 | Scroll back up a little to the drafted answers under "Form answers · ready to copy, description to draft" (open by default). | "How does the event align with your mission/vision/goals?" with "AI draft" and "[your organization's mission]" |
| 15 | 2:13 | 4, musicians plan | Click "Questions · 5 could change this" in the right column. Hover "Yes" and "No" without clicking. | "No flags", then "Is "dinner boxes for the 6 musicians before soundcheck, Mendocino Farms $90" a payment to a performer or other talent?" |
| 16 | 2:27 | 5, deck | Switch to tab 5, the deck at slide 4, full screen. Hold on the "98 of 100" block. | "98 of 100" and "hand-written test plans checked correctly" |
| 17 | 2:38 | End card | The repo page `github.com/DY0810/fundcheck` in a logged-out window, or the deck's closing slide. | `fundcheck.mayhu733.workers.dev` and `github.com/DY0810/fundcheck` |

## If something goes wrong on camera

- The read takes longer than 15 seconds and the page shows a saved result with a note: stop and re-take. Don't narrate over it.
- The sample gives different counts (the model reads the Bovard line differently): re-take once. If it repeats, tell HQ before recording more.
- "Approve all 3" doesn't leave "You'll request $7,200": an answer in "Questions" probably carried over. Reload tab 3 and re-take.
- A wrong click: the browser's Back button moves one step back, and from step 1 it returns to the paste box with the text kept.
- Don't open the sample's "Questions" row on camera. Its count moves between 5 and 6 from run to run, and the voice-over never says it.
