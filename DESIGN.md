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

Calm neutral base; Trojan cardinal and gold are accents, used sparingly.

| Token | Value | Use |
|---|---|---|
| `--color-ground` | `#F6F5F2` | page background |
| `--color-panel` | `#FFFFFF` | panels, inputs, table |
| `--color-inset` | `#EFEDE9` | USG quote surface, hover row, skeleton |
| `--color-line` | `#DCD8D2` | table and panel separators only (tables and forms may have lines) |
| `--color-control` | `#8C857D` | input borders (3.6:1 on white) |
| `--color-ink` | `#1C1917` | body text (16:1 on ground) |
| `--color-ink-2` | `#57534E` | secondary text (7:1 on ground) |
| `--color-cardinal` | `#990000` | primary button, wordmark, links, focus ring, "not eligible" (8.9:1 on white) |
| `--color-cardinal-press` | `#7A0000` | primary button hover/press |
| `--color-gold` | `#FFCC00` | logo check, "Estimate" tag, text selection, cap bar fill. Always with ink text on top (11.6:1); never as text on light |

Cardinal appears on the one primary action per view and on "not eligible". Gold appears at most three places per screen.

### Severity

Severity never relies on colour alone: each has an icon and a text label.

| Severity | Label (exact) | Icon (lucide) | Text | Surface | Ratio |
|---|---|---|---|---|---|
| `not_eligible` | "Not eligible per §5" (or "Not eligible" when the rule is not §5) | `Ban` | `#990000` | `#FBEFEF` | 7.9 |
| `over_cap` | "Over cap" | `Gauge` | `#8A4600` | `#FCF1E4` | 6.4 |
| `review_note` | "Review note" | `MessageSquareText` | `#1D4F80` | `#EBF2F9` | 7.5 |
| `confirm` | "Confirm" | `CircleHelp` | `#6B5300` | `#FFF7D6` | 6.8 |
| `pass` | "Passed" | `CircleCheck` | `#1F6B3A` | `#EAF5EE` | 5.8 |

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

- **Buttons.** Primary: cardinal fill, white text, 44 px tall. Secondary: panel fill, ink text, 1 px control border. Ghost: text only, cardinal, underline on hover. Press: `scale(0.98)`. Loading keeps the label and adds a spinner plus `aria-busy`.
- **Inputs.** Panel fill, 1 px control border, 6 px radius, 44 px tall (40 in the table). Visible `<label>` always; placeholders are examples, never labels.
- **Yes / no / unknown.** A three-option radio group, not a select.
- **Chips.** Full radius, 14 px, 28 px tall; category chips are neutral (inset); match chips take their severity colours.
- **Quote block.** Source line in sans 14 / ink-2 ("USG Funding Department Guidelines §5 says:"), then the quote in serif 16 / ink on inset, 10 px radius, 12 / 16 padding. No coloured side border.
- **Badges.** "Rule math" (`Calculator` icon) and "AI-judged" (`ScanText` icon), 12 px, on inset, ink-2 text. No sparkle icons anywhere.
- **Skeleton.** Inset-coloured bars in the shape of the table, with an opacity pulse; "Reading your plan…" as live text.

## Focus, selection, browser surfaces

- Focus: `outline: 2px solid var(--color-cardinal); outline-offset: 2px` on every focusable element via `:focus-visible`.
- Selection: gold background, ink text.
- Caret: cardinal. Scrollbars: default (Operate mode keeps native affordances).

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
