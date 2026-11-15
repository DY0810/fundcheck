# FundCheck

Pre-check your USG funding application.

<!-- Video field on Devpost: https://www.youtube.com/watch?v=Kr4KWkKh0ew (walkthrough, 2:20). The description starts at the next line. -->

**Slide deck:** [FundCheck pitch deck (PDF)](https://github.com/DY0810/fundcheck/blob/main/submission/deck/deck.pdf) · **90-second version:** [video](https://youtu.be/WddQY8_CtII)

## Problem

USG's funding Guidelines list "Events that include ticket sales" and "On-campus events that are not open to all students" as not eligible. So the on-campus events USG funds are free and open to every Trojan, and when a club's application misses the deadline or comes back incomplete, that's one fewer free event for everyone. The department can allocate up to $356,100 a year to undergraduate students and RSOs.

The Guidelines run about 2,000 words, with a $4,000 venue and personnel cap, a $35 per person food limit and an $8,000 yearly cap. Applications open only on Wednesdays, the deadline is counted in academic weeks, and if it is missed, "the application will be automatically denied." USG's FAQ says "Funding Directors handle hundreds of applications every year", so an incomplete one costs their time too.

The timing is this week. Under the event-date wording in USG's FAQ, an event between Jan 13 and Feb 23, 2027 has two application Wednesdays left, Nov 18 and Dec 2 (our estimate).

## Solution

FundCheck is one web page with no login, in three steps. An officer pastes an event plan and step one, Check, shows the line items it read, what the Guidelines don't fund, with USG's quote and a note that the board may make an exception, the money against each cap, the fund, a deadline estimate and the documents to attach. Step two, Fix, proposes a fix for each flag, and nothing changes until the officer approves it. Step three, Hand off, gives drafted answers to copy, the budget CSV, the documents and a link to USG's funding page.

Facts only the officer knows become questions, not guesses.

The sample is a Bovard dance showcase (USG's Performing Arts fund paid for 9 in FY26) with $10 tickets, a balloon arch and a DJ. FundCheck flags all three, trims $800 over the venue cap, and turns an $8,850 plan into a $7,200 request.

## How it's built

The model does only what a keyword list can't. Anthropic's Claude (`claude-opus-5-5`, about 6 seconds on the sample) reads the plan into line items and event facts, and matches items to rule IDs from a fixed list. It also picks the fund and drafts the free-text answers, leaving bracketed blanks for facts the plan doesn't give.

Plain TypeScript does the rest: every dollar, every date, the document checklist, and the vendor check (string matching against USG's vendor sheet). Quotes render from a versioned rules table, so the words on screen are always USG's.

Guardrails: Zod validates the model's output and drops any rule ID outside the list. The plan is wrapped as untrusted data, and the prompt tells the model to ignore instructions inside it. FundCheck stores nothing: the plan goes to the model for one call, and the server logs token counts, never the text. If Claude fails, Cloudflare Workers AI takes over.

Accuracy: FundCheck checked 98 of 100 hand-written test plans correctly, each labelled with the rules it must and must not trigger. They are not real applications, so the score is a check, not a benchmark.

Stack: TypeScript, React, Vite, Tailwind CSS, Zod and Vitest, all on one Cloudflare Worker.

## Challenges

USG's documents describe the deadline in more than one way, so the card shows the earliest date, labelled an estimate, with each source's wording one click away.

Another was teaching the model when not to decide: dinner for unpaid musicians is a judgment call, so FundCheck asks.

Choosing the model: we benchmarked cheaper models on a 41-case subset of the test plans. The next Claude tier down halved the cost but checked 35 of 41 correctly, against Opus's 39, so we kept Opus.

## Future implementation

- **Owner:** the USG Funding Department, so Funding Directors open complete applications.
- **On USG's funding page first:** FundCheck can sit on the page USG already has, as a link or as one line of HTML that embeds it. We loaded the live tool inside a test page on another origin and the sample plan ran through all three steps in the frame. Nothing is on USG's site yet: this is the first step we would propose. A stand-in page with the live tool embedded is at https://fundcheck.cyberprivacy.workers.dev/embed-demo.
- **Data:** public documents only. The yearly update is data, not code: the rules table, vendor sheet and calendar dates.
- **Cost (measured):** each check is one model call, 1.4 to 3.7 cents on short plans like the sample and 6 to 8 cents on a 22-item budget, roughly $14 to $37 per thousand checks. Drafting form answers is a second, optional call we did not measure. Hosting fits Cloudflare's free tier.
- **First rollout:** spring 2027 office hours with the RSO liaisons.
- **A smaller model, later:** with consent, the Funding Department's decisions on applications checked through FundCheck become labelled examples for a smaller model that sorts line items and sends disagreements to a reviewer. That data doesn't exist yet; no model is trained.
- **Filing into EngageSC:** with a USG integration, the finished packet goes straight into the application form. Today the form sits behind USC sign-in, so FundCheck hands off.
- **Next:** a reviewer view for Funding Directors and PDF or photo quotes.

## How this meets the judging criteria

- **Impact & Campus Relevance:** every complete application is one more free event any Trojan can attend.
- **Technical & AI Execution:** the model picks from a fixed rule list, code does money and dates, and every test case is public.
- **Feasibility & Implementation:** public data, no login, no storage, a named owner, and a yearly data edit.
- **User Experience & Design:** three steps, one job per screen, every flag in USG's own words.

## Built With

typescript, react, vite, tailwindcss, zod, vitest, cloudflare-workers, workers-ai, anthropic, claude, llama
