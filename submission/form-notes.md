# Notes for the next Guidelines revision

For the USG Funding Department.

To build FundCheck, every rule in the Guidelines had to become one row in a table with one quote. Doing that turned up seven places where USG's documents word the same rule differently. Documents written at different times by different people drift, and the Guidelines say they are revisited every year (§7), so this is offered as a short list for that revision. Each item is small to fix, and each fix answers a question an officer would otherwise email usgfunds@usc.edu about.

Sources, all public or shared by USG:
- **Guidelines:** USG Funding Department Guidelines, "Current as of October 21, 2026"
- **FAQ doc:** FAQ for Funding Website
- **Funding page:** usg.usc.edu/branches/funding
- **Slides:** USG application breakdown slides
- **Form:** the "RSO Funding Application 2026-27 DRAFT" (saved Sep 9, 2026). It is a draft, so some of these may already be fixed in the live form. It is paraphrased here, not quoted.

## 1. What the submission deadline counts back from

| Source | Wording |
|---|---|
| Guidelines §1 | "at least six academic weeks six academic weeks before the initial payment due date, for approved USC Vendors" |
| Funding page FAQ | "six academic weeks before the event date when using an approved vendor, and or nine academic weeks before the initial payment due date (whichever comes first) for approved USC Vendors" |
| FAQ doc Q9 | "six academic weeks before the event date when using an approved vendor, and eight academic weeks before the event date for new vendors and travel" |
| Form | Counts weeks before the event date for approved vendors, and before the travel date for travel. |

The anchor is the payment due date in one place and the event date in another, and "academic week" is not defined (whether a week with a holiday or a break counts).

**Suggestion:** one sentence that names the anchor, the week counts, and what counts as an academic week, used word for word in every document.

**What FundCheck does today:** computes every reading, shows the earliest date as the headline and the latest under the event-date wording below it, labels both an estimate, and points officers to the Funding Application Deadlines sheet and usgfunds@usc.edu.

## 2. Travel: 9 weeks or 8

The Guidelines §1 say travel needs "at least 9 academic weeks prior to the date of initial payment due date". The FAQ doc Q9 says "eight academic weeks before the event date for new vendors and travel". The form gives 9 weeks in its introduction and 8 weeks in the box applicants sign.

**Suggestion:** pick one number and one anchor for travel.

**What FundCheck does today:** uses 9 weeks for any airfare or hotel line, the stricter count.

## 3. Time to fix an incomplete application: 2 business days or 3

The Guidelines §2 say the applicant "must provide the necessary information within 2 business days", and the slides add that "2 business days is equivalent to 48 hours from the notification of an incomplete application". The FAQ doc Q16 says "three business days".

**Suggestion:** update the FAQ doc to match the Guidelines.

**What FundCheck does today:** keeps 2 business days in its rules table, matching the Guidelines, with the FAQ wording noted beside it.

## 4. Vendors that are not on the Vendor List

The Guidelines §1 say "the list is not exhaustive" and, in the same bullet, "We will not accept a vendor not on the list." The FAQ doc Q9 refers to an 8-week path "for new vendors", which suggests new vendors are possible.

The vendor sheet also has a second tab of non-food vendors. Some of its categories (balloon décor, DJs and talent agencies, bus charters) match items that Guidelines §5 lists as not eligible. They may be there for other University uses or for exceptions at the board's discretion, and a line on the sheet saying so would help officers who find a vendor there and assume it is fundable.

**Suggestion:** one sentence on what an officer should do when the vendor they want is not on the list.

**What FundCheck does today:** never calls a vendor rejected. A vendor that is not found shows "not found on the list, verify" and moves the deadline estimate to the 8-week path.

## 5. Blackout dates on the 2026-27 form

The form's introduction gives the 2026-27 no-funding windows: events between December 5, 2026 and January 12, 2027, and events after May 1, 2027. The acknowledgement applicants sign on the same page still shows the previous year's dates.

**Suggestion:** update the signed acknowledgement to the 2026-27 dates.

**What FundCheck does today:** checks the event date against the 2026-27 windows from the introduction.

## 6. The name of the arts fund

The Guidelines §4 call it the "Performing and Visual Arts Fund". The form's fund question lists "Performing, Visual Arts, & Cultural Fund". The FY26 Annual Financial Report uses "Performing & Visual Arts, Cultural Fund".

**Suggestion:** use the form's name everywhere, since that is what applicants select.

**What FundCheck does today:** shows the form's label, and quotes the Guidelines' description as the reason.

## 7. A repeated phrase in §1

The Guidelines §1 read "at least six academic weeks six academic weeks before the initial payment due date". The phrase appears twice in a row.

**Suggestion:** remove the repeat.

**What FundCheck does today:** quotes the sentence exactly as written.

---

FundCheck keeps every rule in one versioned file (`src/shared/rules.json`, currently `guidelines-2026-10-21.1`). When the Guidelines are revised, updating that file is the whole change, and each of the items above becomes a one-line edit.
