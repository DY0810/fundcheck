# FundCheck

Pre-check your USG funding application.

## Problem

USG's funding Guidelines list "Events that include ticket sales" and "On-campus events that are not open to all students" as not eligible. So the on-campus events USG funds are free and open to every Trojan, and when a club's application misses the deadline or comes back incomplete, that's one fewer free event for everyone. The department can allocate up to $356,100 a year to undergraduate students and RSOs.

The Guidelines run about 2,000 words, with a $4,000 venue and personnel cap, a $35 per person food limit and an $8,000 yearly cap. Applications open only on Wednesdays, the deadline is counted in academic weeks, and if it is missed, "the application will be automatically denied." USG's FAQ says "Funding Directors handle hundreds of applications every year", so an incomplete one costs their time too.

The timing is this week. Under the event-date wording in USG's FAQ, an event between Jan 13 and Feb 23, 2027 has two application Wednesdays left, Nov 18 and Dec 2 (our estimate).

## Solution

FundCheck is one web page with no login. An officer pastes an event plan as they would write it in a group chat and gets a pre-check: the line items it read (all editable), what the Guidelines don't fund with USG's quote and rule ID, the money against each cap, the fund, a deadline estimate, the documents to attach with USG's file names, and drafted form answers plus a budget CSV.

Facts only the officer knows, like money already received this year, become questions instead of guesses. Each "not eligible per §5" flag sits beside the Guidelines line saying the board can still make an exception.

The sample is a Bovard dance showcase, an event type USG's Performing Arts fund paid for 9 times in FY26, with $10 tickets, a balloon arch and a DJ. FundCheck flags all three, trims $800 over the venue cap, and turns an $8,850 plan into a $7,200 request.

## How it's built

The model does only what a keyword list can't. Anthropic's Claude (`claude-opus-5-5`, low effort, about 6 seconds on the sample) reads the plan into line items and event facts, and matches items to rule IDs from a fixed list, like "DJ $600" to "Payments to talent or performers". It also picks the fund and drafts the free-text answers.

Plain TypeScript does the rest: every dollar, every date, the document checklist, and the vendor check (string matching against USG's vendor sheet). Quotes render from a versioned rules table, so the words on screen are always USG's.

Guardrails: Zod validates the model's output and drops any rule ID outside the list. Low-confidence matches become Ask chips, not flags. The plan is wrapped as untrusted data, and the prompt tells the model to ignore instructions inside it. FundCheck stores nothing: the plan goes to the model for one call, and the server logs token counts, never the text. No traveller details are collected. If Claude fails, Cloudflare Workers AI (Llama 3.3 70B) takes over, and the sample plan has a labelled recorded fallback.

Accuracy: 18 hand-written plans, labelled with the rules each must and must not trigger. The latest run passed 17 of 18 (precision 1.0, recall 0.955, on claude-opus-5-5). That is a small set, not a benchmark. The one miss was a "suggested $5 donation" at check-in, which the model marked low confidence, so the officer gets a question instead of a flag.

Stack: TypeScript, React, Vite, Tailwind CSS, Zod and Vitest, all on one Cloudflare Worker. The API key is a Wrangler secret.

## Challenges

USG's documents word the deadline differently: six academic weeks before payment, nine before payment, six before the event, eight for new vendors and travel. So the card leads with the earliest date, shows the latest under the event-date wording, labels both an estimate, and keeps the quotes one click away.

The other hard part was teaching the model when not to decide. Dinner for unpaid musicians is a judgment call, so the evals include plans where the right answer is a question.

## Future implementation

- **Owner:** the USG Funding Department, so Funding Directors open complete applications.
- **Data:** public documents only. The Guidelines are re-approved each year under §7, and each revision gets a new rules-table version.
- **Cost:** about $0 to $50 per semester (estimate): Cloudflare's free tier plus model calls.
- **First rollout:** spring 2027 office hours with the RSO liaisons.
- **Maintenance:** the yearly update is data, not code: the rules table, the vendor sheet and the calendar dates.
- **Not built yet:** a reviewer view, PDF or photo quotes, and other funding sources.

## How this meets the judging criteria

- **Impact & Campus Relevance:** USG-funded on-campus events are free and open to all, so every complete application is one more event any Trojan can attend.
- **Technical & AI Execution:** a fixed rule list for the model, code for money and dates, and public eval scores with the miss shown.
- **Feasibility & Implementation:** public data, no login, no storage, a named owner, and a yearly data edit.
- **User Experience & Design:** paste and check on one page, every flag in USG's own words.

## Built With

typescript, react, vite, tailwindcss, zod, vitest, cloudflare-workers, workers-ai, anthropic, claude, llama
