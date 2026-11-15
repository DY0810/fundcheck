# FundCheck design system

FundCheck is a task tool: an RSO officer pastes an event plan and reads a pre-check of their USG funding application. It is judged on a phone and a laptop, often in a video. This file is the design system. **Where any design skill disagrees with this file, this file wins.**

## The idea

Two voices, never mixed:

- **USG's words** are set in a serif (Source Serif 4) on a quiet inset surface, always introduced by their source ("USG Funding Department Guidelines §5 says:"). Only text from `src/shared/rules.json` `quotes` may use this style.
- **Our words** (messages, labels, notes) and **the AI's words** are set in the sans (Public Sans). AI text is always labelled "AI reasoning" or "AI draft".

A reader can tell at a glance whose words they are reading. That is the product's trust argument, made visual.

The live part of the page is the check itself: every edit to an item, a fact or an answer reruns the rules in the browser at once.

## Mode and rejected skill rules

Mode is **Operate** (a tool, not a landing page). Restraint, familiar controls, fast feedback. These skill defaults are rejected here:

- Eyebrow labels, pill badges above headings, section numbers, tiny tracked caps.
- Double-bezel cards, glass, gradients, glows, shadows on anything at rest.
- `py-24`+ section padding, scroll-entry animation on every block, landing-page image floors and moving-element counts.
- Stock photography or decorative illustration. The interface is the picture.

## Colour

The palette follows the U.S. Web Design System (USWDS): a calm cool-grey base, one blue for every action, and a separate colour family per severity. Blue never means "not eligible" and red never means "click here". A small USC accent (cardinal and gold) appears in exactly two places, listed below, and nowhere else.

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--color-ground` | `#F7F9FA` | page background (USWDS gray-cool-2) | ink 16.3, ink-2 6.4, brand 6.4 |
| `--color-panel` | `#FFFFFF` | panels, inputs, table | ink 17.2, ink-2 6.7, brand 6.7 |
| `--color-inset` | `#EDEFF0` | USG quote surface, fold header, skeleton (gray-cool-5) | ink 14.9, ink-2 5.9, brand 5.8 |
| `--color-line` | `#DFE1E2` | separators only, never the only edge of a control (base-lighter) | decorative |
| `--color-control` | `#71767A` | input borders (base) | 4.6 on panel |
| `--color-ink` | `#1B1B1B` | body text (base-darkest) | |
| `--color-ink-2` | `#565C65` | secondary text (base-dark) | |
| `--color-brand` | `#005EA2` | primary button, links, focus ring, caret, cap-bar fill (primary) | white on it 6.7 |
| `--color-brand-press` | `#1A4480` | primary button hover and press (primary-dark) | white on it 9.6 |
| `--color-brand-tint` | `#D9E8F6` | "Estimate" tag, text selection, secondary-button hover. Fill only, ink text on it (13.8) | |
| `--color-usc-cardinal` | `#990000` | USC accent, two places only | graphic, 8.5 on ground |
| `--color-usc-gold` | `#FFCC00` | USC accent, only inside the cardinal mark | 5.9 on cardinal |

**USC accent, exactly two places:** the header mark (cardinal square, gold check) and a 4 px cardinal rule across the very top of the page. Cardinal and gold never appear in the paste area, the result, a panel, chip, bar, border, button, link, focus ring or severity. Gold is never text and never on a light surface. The header is not sticky, so the accent is off screen whenever "not eligible" red is on screen.

### Severity

Severity never relies on colour alone: each has an icon and a text label. Pairs are USWDS state and system colours; each text colour passes AA on its own surface and on white.

| Severity | Label (exact) | Icon (lucide) | Text | Surface | Ratio |
|---|---|---|---|---|---|
| `not_eligible` | "Not eligible per §5" (or "Not eligible" when the rule is not §5) | `Ban` | `#B50909` | `#F4E3DB` | 5.6 |
| `over_cap` | "Over cap" | `Gauge` | `#8C471C` | `#F2E4D4` | 5.6 |
| `review_note` | "Review note" | `MessageSquareText` | `#0E4F5C` | `#E7F6F8` | 8.3 |
| `confirm` | "Confirm" | `CircleHelp` | `#5C4809` | `#FAF3D1` | 7.9 |
| `pass` | "Passed" | `CircleCheck` | `#216E1F` | `#ECF3EC` | 5.6 |

**No coloured side bars.** USWDS alerts carry a 4 px coloured bar on the left; the design skills used here reject coloured side stripes on cards as decoration that repeats what the icon and label already say. Flags show severity through the icon, the label and the chip, not a stripe. The verdict panel is the one exception: a 4 px top rule in the worst severity present (red if anything is not eligible, green if all passed), because it summarises the whole page's state. It is never brand blue or USC cardinal. The quote block keeps no side border either.

**Not copied from USWDS:** the government banner, flag, `.gov` or lock icons, GSA or USWDS logos, "Official" wording, the USWDS icon set and illustrations, USWDS page copy, and the USWDS `secondary` red. Gold never sits on or next to the blue.

Banned words in the UI: "violation", "denied", "rejected", "fail" (except on `/evals`, where a test case passes or fails). The only "denied" on screen is inside a USG quote (R26), set as a quote.

## Type

Two families, loaded from Google Fonts by the first line of `src/ui/tokens.css`, with system fallbacks.

- Sans: `Public Sans`, then `system-ui`. Everything that is ours.
- Serif: `Source Serif 4`, then `Georgia`. USG quotes only.

Fixed rem scale (ratio ≈ 1.25), no fluid type:

| Token | Size / line height | Use |
|---|---|---|
| `text-xs` | 12 / 16 | rule IDs, file names, table meta |
| `text-sm` | 14 / 20 | labels, chips, secondary lines |
| `text-base` | 16 / 24 | body, inputs, quotes |
| `text-lg` | 20 / 28 | panel headings |
| `text-xl` | 28 / 34 | page headline (24 / 30 under 640 px) |
| `text-2xl` | 40 / 44 | the eligible-request figure only |

Weights: 400 body, 500 labels, 600 headings and figures. Headings track `-0.01em`; the figure `-0.02em`. Money and dates use `tabular-nums`. Prose measure stays under 70ch. Inputs are 16 px so iOS does not zoom.

## Space and shape

- 4 px base. Steps used: 4, 8, 12, 16, 24, 32, 48, 64.
- Inside a panel: 16 (phone) / 24 (desktop) padding; 12 between rows; 24 between groups. Between panels: 16 / 24. Between page regions: 48 / 64.
- Page: max width 1200, side margins 16 (phone) / 32 (desktop).
- Radius, decided once: **6 px** buttons and inputs, **10 px** panels, **full** for chips. No other radii.
- Elevation: none at rest. Surfaces separate by tone step (ground → panel → inset) and, for panels, a 1 px `--color-line` border. Only a true overlay may have a shadow (there are none in Wave 1).

## Layout

- **Verdict first.** After a check, the verdict (severity counts, eligible request vs plan total, deadline with its Estimate label, fund) is scrolled to the top and focused. The first flag and its USG quote must be on screen with no scrolling at 1280×800 and 375×812.
- **Desktop (≥ 1024 px):** header; paste region (next application window, textarea 8 cols, notes 4 cols); verdict full width; flags (8 cols) beside answers that could change the result, money, deadline and fund (4 cols); then "Fix what we read" (folded), documents (with form-only answers), form answers and budget CSV, vendors (folded unless a vendor needs checking), after the event (folded); footer.
- **Phone (< 1024 px):** one column in that same order. The items table becomes stacked rows; no horizontal scroll at 320 px.
- **Folds.** Detail that doesn't change the verdict starts collapsed in a `<details>` panel with a one-line summary of what's inside. The documents checklist and form answers stay open.

## Components

- **Buttons.** Primary: brand fill, white text, 44 px tall. Secondary: panel fill, ink text, 1 px control border, brand-tint on hover. Ghost: text only, brand, underline on hover. Press: `scale(0.98)`. Loading keeps the label and adds a spinner plus `aria-busy`.
- **Inputs.** Panel fill, 1 px control border, 6 px radius, 44 px tall (40 in the table). Visible `<label>` always; placeholders are examples, never labels.
- **Yes / no / unknown.** A three-option radio group, not a select.
- **Chips.** Full radius, 14 px, 28 px tall; category chips are neutral (inset); match chips take their severity colours.
- **Quote block.** Source line in sans 14 / ink-2 ("USG Funding Department Guidelines §5 says:"), then the quote in serif 16 / ink on inset, 10 px radius, 12 / 16 padding. No coloured side border.
- **Badges.** "Rule math" (`Calculator` icon) and "AI-judged" (`ScanText` icon), 12 px, on inset, ink-2 text. No sparkle icons anywhere.
- **Skeleton.** Inset-coloured bars in the shape of the table, with an opacity pulse; "Reading your plan…" as live text.

## Focus, selection, browser surfaces

- Focus: `outline: 3px solid var(--color-brand); outline-offset: 2px` on every focusable element via `:focus-visible`.
- Selection: brand-tint background, ink text.
- Caret: brand. Scrollbars: default (Operate mode keeps native affordances).

## Motion

Motion conveys state only. All transitions name their properties; never `transition: all`.

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | entrances, disclosures |
| `--dur-press` | 120 ms | button press scale |
| `--dur-hover` | 150 ms | colour changes |
| `--dur-ui` | 200 ms | disclosure, chip state |
| `--dur-reveal` | 240 ms | result first appears (opacity + 8 px rise) |
| stagger | 40 ms | flags revealing in order (Wave 2) |
| count-up | 600 ms, once | eligible figure (Wave 2) |

`prefers-reduced-motion: reduce`: no transforms, no stagger, no count-up; opacity fades only, 120 ms. Hover effects sit behind `@media (hover: hover) and (pointer: fine)`. Typing never animates anything.

## Copy rules

- Neutral and specific. "Pre-check", not "audit". "Not eligible per §5, exception at the board's discretion", never "will be denied".
- A vendor not on the list: "Not found on the list, verify". Never "rejected".
- Nulls render as "Unknown". Never `NaN`, `$0` for a missing cost, or an empty cell.
- Deadline card is labelled "Estimate", carries the exact estimate copy, and never uses a red banner.
- Privacy line under the textarea: "Nothing you paste is stored. Don't paste traveller details." The page stores nothing (no localStorage, no plan in the URL).
