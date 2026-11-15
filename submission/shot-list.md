# FundCheck shot list

Checked against the live site on Nov 14 after the 19:10 UI freeze, at 1536×864 CSS pixels (a 1920×1080 screen at 125% zoom). Pair this with `video-script.md`: the times match its sections. Things are named by their on-screen labels.

## Recording settings

- Screen: 1920×1080, one browser window, full screen.
- Browser zoom 125%.
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
4. `https://fundcheck.mayhu733.workers.dev/` with the musicians plan below already checked (shot 13)
5. `https://fundcheck.mayhu733.workers.dev/evals`

Reload tab 3 between takes so the plan box is empty and the answers are cleared.

## Sample text

**Bovard sample.** The "Try the Bovard dance showcase sample" button fills this exactly; paste it only if the button is missing.

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

Checked live after the freeze: it gives "No flags", "Eligible request $1,390", and under "5 answers could change this" the question "Is 'dinner boxes for the 6 musicians before soundcheck, Mendocino Farms $90' a payment to a performer or other talent?"

## Shots

| # | Time | Tab | What to do | On screen when the voice names it |
|---|---|---|---|---|
| 1 | 0:00 | 1, Guidelines | Cmd+F "Events that include ticket sales". Hold. | §5 list: "Events that include ticket sales", "On-campus events that are not open to all students" |
| 2 | 0:12 | 1, Guidelines | Cmd+F "automatically denied". Hold. | §1: "If this deadline is not met the application will be automatically denied." |
| 3 | 0:22 | 2, funding page | Scroll to "Fund Descriptions". Cmd+F "356,100". | "the ability to allocate up to $356,100 toward undergraduate students and RSOs" |
| 4 | 0:28 | 3, FundCheck home | Hold on the heading, then point at the window line. | "Pre-check your USG funding application." and "Next application window: Wed, Nov 18, 2026, 8:00 AM to 11:59 PM" |
| 5 | 0:35 | 3 | Click "Try the Bovard dance showcase sample". Do nothing while it reads; the page scrolls to the result by itself. | The plan in "Your event plan", then "Reading your plan…" (about 6 s) |
| 6 | 0:48 | 3 | Hold on the summary at the top of the result. | "Pre-check", "3 not eligible", "1 over cap", "1 review note", "Eligible request $7,200 of $8,850 planned", "Deadline · Estimate · Submit by Wed, Feb 3, 2027", "Fund · Performing, Visual Arts, & Cultural Fund" |
| 7 | 1:00 | 3 | Point at the first flag under "Not eligible per §5 (3)". | "Selling tickets makes the event not eligible per §5.", "In your plan: '$10 tickets at the door'", "USG Funding Department Guidelines §5 says: 'Events that include ticket sales'" |
| 8 | 1:08 | 3 | Scroll down. Hover the "AI-judged" tag on the balloon flag. | "Helium balloon arch ($250) is not eligible per §5.", "DJ ($600) is not eligible per §5.", each with "AI-judged" |
| 9 | 1:20 | 3 | Keep scrolling past "Exception at the board's discretion." to "Over cap (1)". Hover "Rule math". | "Venue and personnel come to $4,800, $800 over the $4,000 cap (§3)." |
| 10 | 1:30 | 3 | In the side panel "5 answers could change this" (sometimes 6; the count depends on the read), click "How much has your org already received from USG Funding this year?", type 2000, press Tab. Scroll up to the summary. | "1 over cap" becomes "2 over cap"; "Eligible request $6,000 of $8,850 planned"; "Capped at the $6,000 your org has left of its $8,000 for the year" |
| 11 | 1:45 | 3 | Click "Documents" in the summary's links. | "Documents checklist", "Quote from Wolfgang Puck Catering · Needed", "Name it RSO_Lastname_Firstname_WolfgangPuckCatering_Quote.pdf" |
| 12 | 1:52 | 3 | Click "Form answers and budget CSV", then "Draft my form answers" (about 5 to 8 s; cut the wait in editing). Point at "Download budget CSV". | "Form answers", "Filled by FundCheck" rows, then "How does the event align with your mission/vision/goals?" with "AI draft" and "[your organization's mission]"; "The budget CSV leaves out 2 lines that aren't eligible: Helium balloon arch, DJ." |
| 13 | 2:10 | 4, musicians plan | Scroll to "5 answers could change this". Hover "Yes" and "No" without clicking. | "No flags", then "Is 'dinner boxes for the 6 musicians before soundcheck, Mendocino Farms $90' a payment to a performer or other talent?" |
| 14 | 2:24 | 4, then 5 | Click "How accurate is it?" in the header (or switch to tab 5). Hold on the score, then point at the GitHub link. | "How accurate are the AI checks?", the score line, "See every test plan and its answer on GitHub" |
| 15 | 2:35 | End card | The repo page `github.com/DY0810/fundcheck` in a logged-out window, or the deck's closing slide. | `fundcheck.mayhu733.workers.dev` and `github.com/DY0810/fundcheck` |

## If something goes wrong on camera

- The read takes longer than 15 seconds and the page shows a saved result with a note: stop and re-take. Don't narrate over it.
- The sample gives different counts (the model reads the Bovard line differently): re-take once. If it repeats, tell HQ before recording more.
- After shot 10 the summary counts change. That is expected: the voice-over describes the new numbers.
- The sample's counts (3 not eligible, 1 over cap, 1 review note, $7,200) were the same on all three live runs. Only the number of questions in "answers could change this" moved, between 5 and 6, and the voice-over never says it.
