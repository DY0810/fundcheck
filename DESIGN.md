# FundCheck design system (v2)

FundCheck is a task tool: an RSO officer pastes an event plan and gets a pre-check of their USG funding application in three steps: Check, Fix, Hand off. It is judged on a phone and a laptop, often in a video. This file is the design system. **Where any design skill disagrees with this file, this file wins.**

v2 replaces the USWDS palette with USC cardinal as the brand, and lowers density. The layout values come from IBM Carbon (expressive type and spacing) and the GOV.UK Design System (column width, line length, one job per screen). The source notes are in `research/design-v2.md`.

## Owner's changes, Nov 15 (these override anything below)

- **Rows, not columns.** Check, Fix and Hand off are one column of full-width rows at every width. Only the landing keeps two columns from 1024 px. Text inside a row stops at 680 px.
- **No badges or counts.** Flag cards carry no "AI-judged" or "Rule math" badge, no "AI reasoning" line, and group headings carry no bracketed count. "AI draft" and "Filled by FundCheck" on form answers stay.
- **No caveat or helper sentences.** The small grey notes are gone, including the privacy line, the sign-in line, the footer line and the note under the CSV button. There is no footer. "The board may make an exception" stays.
- **The sample is the box's starting text.** There is no sample button; the first focus selects the sample so a paste replaces it.

## The idea

Two voices, never mixed:

- **USG's words** are set in a serif (Source Serif 4) on a quiet inset surface, always introduced by their source ("USG Funding Department Guidelines §5 says:"). Only text from `src/shared/rules.json` `quotes` may use this style.
- **Our words** (messages, labels, notes) and **the AI's words** are set in the sans (Public Sans). AI-drafted form answers are labelled "AI draft". Flag cards show no AI reasoning: the USG quote says why.
- **Say it once.** Each fact appears once in its detail section; a summary number in the verdict with its detail lower down is the only repeat. No rule IDs on screen.

## Mode and rejected skill rules

Mode is **Operate** (a tool, not a landing page). Restraint, familiar controls, fast feedback. Rejected here: eyebrow labels, pill badges above headings, section numbers, tiny tracked caps; double-bezel cards, glass, gradients, glows, shadows at rest; `py-24`+ section padding and scroll-entry animation; stock photography and decorative illustration; coloured side bars on cards (the icon and label already say it).

## Screens

One job per screen. Once a result exists, the paste area collapses to one row (the event name from 640 px, "Edit the plan", "Check another plan"; the pasted text is kept) and the step indicator ("Check · Fix · Hand off") sits at the top. Each screen has exactly one primary button.

- **Step 1, What we found.** Verdict (eligible request of plan total, one count line, the "Review fixes" button), then the flag groups. Not eligible, over cap and confirm groups are open; review notes and passed checks are one-line rows. Each open group shows 3 flags, then "Show N more". Below, one-line rows with their key fact when closed: Questions, Money, Deadline, Fund, Documents, Vendors, Edit the plan.
- **Step 2, Review fixes.** The "You'll request $X" figure on a gold-tint surface, "Approve all N" (secondary), then one row per fix with Apply / Keep and ask the board. Fixes covered by Approve all come first; a fix that changes the event (ticket sales) comes last, set apart.
- **Step 3, Hand off.** Status line ("Nothing left to flag" or "N items left for the board"), amount, deadline and fund, the budget CSV, "Open USG's funding page" (primary) with "Filing needs your USC sign-in. FundCheck doesn't submit for you.", then form answers, documents and after-the-event rows.

**Fold rule.** At 1280×800 the verdict, the primary button and the first flag with its USG quote are on the first screen. At 375×812 the verdict and the primary button are, with the first flag title just under. At most two disclosure levels: the screen, and one expandable row. No folds inside folds.

## Colour

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--color-ground` | `#FAFAFA` | page background | ink 16.5, ink-2 6.5, brand 8.6 |
| `--color-panel` | `#FFFFFF` | cards, inputs | ink 17.2, ink-2 6.7, brand 8.9 |
| `--color-inset` | `#F0F0EE` | USG quote surface, skeleton, neutral chips | ink 15.1, ink-2 5.9, brand 7.8 |
| `--color-line` | `#DCDCDC` | separators only | decorative |
| `--color-control` | `#767676` | input borders (USC Gray 70K) | 4.5 on panel |
| `--color-ink` | `#1B1B1B` | body text, focus ring, caret, links inside flag cards | |
| `--color-ink-2` | `#565C65` | secondary text | |
| `--color-brand` | `#990000` | USC Cardinal: primary button fill, secondary button text and outline, ghost buttons, links, selected options | white on it 8.9 |
| `--color-brand-press` | `#7A0000` | hover and press (cardinal +20% K, approximate) | white on it 11.5 |
| `--color-brand-tint` | `#FFF2BF` | USC Gold 25% tint: selection, "Estimate" tag, the "You'll request" surface, secondary hover. Cardinal tints are not allowed by USC, so the tint is gold | ink 15.3, cardinal 7.9 |
| `--color-usc-cardinal` | `#990000` | the header mark | |
| `--color-usc-gold` | `#FFCC00` | only on cardinal (5.9) or ink | fails on white (1.5) |

**Form rule (binding).** Cardinal only on things you can click. Severity colours only on status you cannot click: chips, icons, group headings, the verdict's 4 px top rule. The brand never sits on a severity surface, and a severity colour never fills a button or a link. Links inside flag cards, including the USG source link and the exception toggle, are ink with an underline.

**Gold** is never text, never an underline, icon or step marker on a light surface, and never a fill under white text. It appears as the check inside the header mark and as the 25% tint.

**USC marks.** No USC logo, seal, shield, monogram or wordmark. The header mark (a cardinal square with a gold check) is FundCheck's own. The footer says only "Rules from USG Funding Department Guidelines, current as of Oct 21, 2026"; the non-affiliation line was removed at the user's request. The v1 4 px cardinal page-top rule is dropped: cardinal is the brand now, and the rule would sit above the verdict's severity rule.

### Severity

Severity never relies on colour alone: each has an icon and a text label. None uses cardinal or gold.

| Severity | Label (exact) | Icon (lucide) | Text | Surface | Text on surface / on white |
|---|---|---|---|---|---|
| `not_eligible` | "Not eligible per §5" (or "Not eligible") | `Ban` | `#B3124A` rose | `#F0F0EE` (neutral inset) | 5.9 / 6.8 |
| `over_cap` | "Over cap" | `Gauge` | `#8C471C` | `#F2E4D4` | 5.6 / 6.9 |
| `review_note` | "Review note" | `MessageSquareText` | `#0E4F5C` | `#E7F6F8` | 8.3 / 9.2 |
| `confirm` | "Confirm" | `CircleHelp` | `#54378F` violet | `#EFEAF7` | 7.7 / 9.1 |
| `pass` | "Passed" | `CircleCheck` | `#216E1F` | `#ECF3EC` | 5.6 / 6.3 |

Rose sits 21° from cardinal on the hue wheel, so hue alone does not separate them; the form rule, the `Ban` icon and the "Not eligible" label do. HQ picked the neutral surface: `--color-ne-bg` is `#F0F0EE`, so rose appears only in the icon, the label and the verdict's top rule, never as a tinted surface beside cardinal.

The verdict panel carries a 4 px top rule in the worst severity present, neutral line grey when nothing has been read. It is never cardinal.

Banned words in the UI: "violation", "denied", "rejected", "fail", "approved", "will be funded", "submitted". The only "denied" on screen is inside a USG quote, set as a quote.

## Type

Public Sans (ours) and Source Serif 4 (USG quotes only), from Google Fonts, weights 400, 500, 600. No IBM Plex. Carbon's sizes carry over as they are.

| Token | Size / line height | Use |
|---|---|---|
| `text-xs` | 12 / 16 | badges, table meta |
| `text-sm` | 14 / 20 | labels, chips, secondary lines |
| `text-base` | 16 / 24 | body, inputs, quotes |
| `text-lg` | 20 / 28 | group headings (Carbon heading-03) |
| `text-xl` | 28 / 36 | step titles; display on phones (Carbon heading-04) |
| `text-2xl` | 42 / 50 | display from 1024 px: the landing headline and the eligible figure (Carbon fluid-heading-06) |

Weights: 400 body, 500 labels, 600 headings and figures. Headings track `-0.01em`, display `-0.02em`. Money and dates use `tabular-nums`. Lines stay under 70ch (GOV.UK's limit is 75). Inputs are 16 px so iOS does not zoom.

## Space and shape

- Spacing steps (Carbon): 4, 8, 12, 16, 24, 32, 40, 48, 64, 80.
- Page: one centred container, max width **1280 px** (`max-w-page`), side padding 16 / 32. The header mark, the content and the footer share its left and right edges.
- Below 1024 px: **one column**, at most 680 px (`max-w-main`), left-aligned, on every step. Phone and tablet never change with the desktop rules below.
- From 1024 px (`lg:`), two columns, roughly 7 : 5, 40 px apart, top-aligned. They are placed with `lg:` grid classes on the same markup, so the phone's reading order is untouched.
  - Landing: headline, intro, next application window and "What it checks" (open from 1024 px) on the left; the paste box, the privacy line and both buttons on the right, starting on the same line.
  - Step 1: the plan row, the step indicator and the verdict span the container. Flags with their USG quotes on the left, the detail rows on the right. "Edit the plan" sits full width under both, because its line-item table needs the room.
  - Step 2: fix rows on the left; the "You'll request" card with Continue on the right, sticky.
  - Step 3: the status panel spans the container; the packet (amount, deadline, fund, "Open USG's funding page", budget CSV) on the left; form answers and documents (open by default) and "After the event" on the right.
- Line length: no body line or quote longer than about 75 characters. Wide space is split into columns, never filled with stretched paragraphs.
- Card padding **24 phone / 32 desktop** (`p-card lg:p-card-lg`). 16 between rows in a card, 24 (phone) / 32 (desktop, `gap-group`) between groups in a step, 48 / 64 between page regions.
- Targets: **44 px** for every control, ghost buttons and step links included (`min-h-target`).
- Radius: 6 px controls, 10 px panels, full for chips. No other radii.
- Elevation: none at rest. Surfaces separate by tone (ground → panel → inset) and a 1 px line border on panels.

## Components

- **Buttons.** Labels 16 / 600, 44 px tall. Primary: cardinal fill, white text. Secondary: panel fill, cardinal text, 2 px inset cardinal stroke; gold-tint fill and brand-press on hover. Ghost: cardinal text, underline on hover. Press: `scale(0.98)`. Loading keeps the label and adds a spinner plus `aria-busy`.
- **Selected options.** Yes / no / unknown answers: cardinal fill, white text (clickable, so cardinal is allowed). Step 2's Apply / Keep: the chosen segment is white with a 2 px ink ring, a check icon and a semibold "Applied" or "Kept for the board", no cardinal, so "Continue" stays the only cardinal fill on that screen.
- **Alerts.** A paste or service error sits on a white panel with a control border and ink text, never on a severity surface: an outage is not a finding.
- **Step indicator.** Current step: ink disc, white number. Done steps: buttons with a gold-tint disc and cardinal text. Future: inset disc. A step with nothing to do (Fix with no fixes) is not clickable.
- **Inputs.** Panel fill, 1 px control border, 6 px radius, 44 px tall. Visible `<label>` always.
- **Chips.** Full radius, 14 px; severity chips on their surface; neutral chips on inset.
- **Quote block.** Source line in sans 14 / ink-2 with the source name as an ink link, then the quote in serif 16 / ink on inset, 12 / 16 padding.
- **Flag card.** Severity icon and title, "In your plan:" only when the plan's words say more than the title, then the quote block. Under "Not eligible per §5" the title is the thing itself ("DJ ($600)", "Ticket sales").
- **Exception.** Once per group: "The board may make an exception" beside the group heading, an ink toggle that opens the R2 quote under it. It stays visible, because it keeps a flag from reading as final.
- **One-line rows.** A `<details>` row: title, then its key fact after a middle dot ("Deadline · Submit by Wed, Feb 3, 2027"), chevron at the end.
- **Skeleton.** Inset bars with an opacity pulse; "Reading your plan…" as live text.

## Focus, selection

- Focus: `outline: 3px solid var(--color-ink); outline-offset: 2px` via `:focus-visible`. An ink ring cannot be read as an error or a severity.
- Selection: gold tint, ink text. Caret: ink.

## Motion

Motion conveys state only; transitions name their properties.

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | entrances, disclosures |
| `--dur-press` / `--dur-hover` / `--dur-ui` | 120 / 150 / 200 ms | press, colour, disclosure |
| reveal | 240 ms, opacity + 8 px rise | a step first appears; verdict 0 ms, flag groups 80 ms + 60 ms each |
| count-up | rejected | the eligible figure is data, it never moves for style |

`prefers-reduced-motion: reduce`: no transforms or stagger; opacity fades only, 120 ms.

## Copy rules

- Neutral and specific. "Pre-check", not "audit". "Not eligible per §5, exception at the board's discretion", never "will be denied".
- A vendor not on the list: "Not found on the list, verify".
- Nulls render as "Unknown". Never `NaN` or an empty cell.
- The deadline is labelled "Estimate" and never uses a red banner.
- "Nothing you paste is stored. Don't paste traveller details." The page stores nothing.

## Favicon and social preview

`public/favicon.svg` is the header mark. `public/og.png` (1200 × 630) shows the v2 look: the mark, the headline, the three steps, and a card with the sample's eligible request, a cardinal "Review fixes" button and one USG quote from `rules.json` (R4). It uses no severity colour.
