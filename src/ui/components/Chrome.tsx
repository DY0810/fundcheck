import { rulesFile } from '../lib/rules';

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <rect width="32" height="32" rx="7" fill="#990000" />
      <path d="M9 16.5l4.5 4.5L23 11.5" fill="none" stroke="#FFCC00" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Header({ page }: { page: 'check' | 'evals' }) {
  return (
    <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-4 py-4 lg:px-8">
      <a href="/" className="flex items-center gap-2.5 text-ink no-underline" aria-label="FundCheck home">
        <Mark />
        <span className="text-lg font-semibold tracking-[-0.01em]">FundCheck</span>
      </a>
      <nav aria-label="Main">
        {page === 'check' ? (
          <a href="/evals" className="text-sm font-medium">How accurate is it?</a>
        ) : (
          <a href="/" className="text-sm font-medium">Check a plan</a>
        )}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto mt-16 flex w-full max-w-[1200px] flex-col gap-2 px-4 pb-10 text-sm text-ink-2 lg:px-8">
      <p className="m-0">
        Rules from USG Funding Department Guidelines, current as of Oct 21, 2026 · rules version {rulesFile.version}
      </p>
      <p className="m-0">
        <a href="/evals">See how accurate the AI checks are</a>
      </p>
      <p className="m-0">Not affiliated with USG. A pre-check, not an approval.</p>
    </footer>
  );
}
