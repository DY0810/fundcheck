# FundCheck shot list

**PROVISIONAL.** The result page is being reordered so the verdict (counts, eligible amount, deadline, first flag) appears first and the edit table moves below it, and the prompts and evals get one more run. Shots 5 to 11 describe today's layout and get finalised against the frozen UI. Shots 12 and 13 depend on the final prompts and eval run. Shots 1 to 4 and 14 will not change.

Pair this with `video-script.md`: the times below match its sections.

## Recording settings

- Screen: 1920×1080, one browser window, full screen.
- Browser zoom 125% (the page then lays out at about 1536×864 CSS pixels).
- Bookmarks bar hidden, no extensions in the toolbar, a fresh profile or guest window so no history or autofill shows.
- System appearance: light.
- Mouse: move slowly, pause one second on anything the voice names.
- Captions on: upload `video-script.md`'s spoken lines as the caption track in YouTube Studio, or burn them in. Check that every number in the captions matches the screen.
- Never open or show the draft USG application form.
- Before recording, load the live site once so the first real take is warm. The site allows 20 checks a minute per network, which is plenty.

## Tabs to open before recording

1. `https://usg.usc.edu/branches/funding/`
2. `https://docs.google.com/document/d/1noJFJ4SxrFGD1Zm-6EqUHpXSIOUuFIL-gIobWXcXCt0/edit` (USG Funding Department Guidelines, current as of Oct 21, 2026)
3. `https://fundcheck.mayhu733.workers.dev/` (fresh load, empty box)
4. `https://fundcheck.mayhu733.workers.dev/` with the musicians plan below already checked (shot 12)
5. `https://fundcheck.mayhu733.workers.dev/evals`

## Sample text

**Bovard sample** (the "Try the Bovard dance showcase sample" button fills this exactly; paste it only if the button is gone):

```
Spring Dance Showcase — Bovard Auditorium, Fri Apr 9 2027, 7pm
~300 people, $10 tickets at the door
Catering from Wolfgang Puck Catering $3,000
Helium balloon arch $250
DJ $600
Bovard rental + AV crew $4,800
Printed programs $200
```

**Musicians plan** (eval case e17, verbatim from `evals/cases.json`; paste into tab 4 and press "Check my plan" before recording):

```
Jazz in the Courtyard: spring showcase
Fri Apr 2 2027, 6–8pm, Annenberg courtyard
free, open to all, ~120
the Thornton jazz combo isn't charging us, we just want to feed them:
- dinner boxes for the 6 musicians before soundcheck, Mendocino Farms $90
- Crepes Bonaparte crepe cart for the audience $1,100
- music stand + amp rental $140
- programs $60
```

Checked live on Nov 14: this plan raises the Ask chip "Does 'dinner boxes for the 6 musicians before soundcheck, Mendocino Farms $90' fall under 'Payments to talent or performers'?" and no flags.

## Shots

| # | Time | URL / tab | What to do | On screen when the voice names it |
|---|---|---|---|---|
| 1 | 0:00 | Tab 1, funding page | Scroll to "Fund Descriptions". Cmd+F "356,100" so the browser highlights it. | "the ability to allocate up to $356,100 toward undergraduate students and RSOs" |
| 2 | 0:07 | Tab 2, Guidelines | Cmd+F "Events that include ticket sales". Hold. | §5 list: "Events that include ticket sales", "On-campus events that are not open to all students" |
| 3 | 0:13 | Tab 2, Guidelines | Cmd+F "automatically denied". Hold. | §1: "If this deadline is not met the application will be automatically denied." |
| 4 | 0:20 | Tab 3, FundCheck home | Hold one second on the heading, then click "Try the Bovard dance showcase sample". | "Pre-check your USG funding application." and the plan filling the box |
| 5 | 0:27 | Tab 3 | Do nothing while it reads (about 6 s). | "Reading your plan…" then the result |
| 6 | 0:34 | Tab 3 | *(provisional)* Scroll so the verdict is in view. | "3 not eligible · 1 over cap · 1 review note", "Eligible request $7,200" |
| 7 | 0:43 | Tab 3 | *(provisional)* Scroll to the first flag. Hover the quote. | "Selling tickets makes the event not eligible per §5.", "In your plan: '$10 tickets at the door'", the §5 quote, the R2 exception line |
| 8 | 0:53 | Tab 3 | *(provisional)* Scroll to the balloon and DJ flags. Hover the "AI-judged" badge. | "Helium balloon arch ($250) is not eligible per §5.", "DJ ($600) is not eligible per §5." |
| 9 | 1:08 | Tab 3 | *(provisional)* Scroll to Money, then the R6 flag. Hover "Rule math". | "Venue and personnel $4,800 of $4,000 cap" |
| 10 | 1:22 | Tab 3 | *(provisional)* Scroll to Deadline. Click "Sources word this differently", hold one second, close it. | "Submit by Wed, Feb 3, 2027", "Estimate", "Latest date under the event-date wording: Wed, Feb 24, 2027" |
| 11 | 1:35 | Tab 3 | *(provisional)* Scroll to the documents checklist. Then in the line-items table change "Printed programs" from 200 to 150 and watch the totals update. Then click "Draft my form answers" (about 5 s; cut the wait in editing) and point at "Download budget CSV". | Quote file names such as `RSO_Lastname_Firstname_WolfgangPuckCatering_Quote.pdf`; the plan total changing; the drafted "Description of event" |
| 12 | 2:10 | Tab 4, musicians plan *(provisional)* | Scroll to the Ask chip. Hover "Yes" and "No" without clicking. | "Does 'dinner boxes for the 6 musicians…' fall under 'Payments to talent or performers'?" |
| 13 | 2:22 | Tab 5, `/evals` *(provisional: numbers change after the final eval run)* | Hold on the summary, then scroll to e06. | "17 of 18", "Precision 100%", "Recall 96%", then "Fail · Suggested donation at check-in (e06)", "Missed R4." |
| 14 | 2:40 | End card | The repo page `github.com/DY0810/fundcheck` in a logged-out window, or S6's closing slide. | `fundcheck.mayhu733.workers.dev` and `github.com/DY0810/fundcheck` |

## If something goes wrong on camera

- The read takes longer than 15 seconds and a "cached result" note appears: stop and re-take. Don't narrate over it.
- A different count appears on the sample (the model reads the Bovard line differently): re-take once. If it repeats, tell HQ before recording more.
