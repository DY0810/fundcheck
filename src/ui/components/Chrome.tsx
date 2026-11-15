export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <rect width="32" height="32" rx="7" fill="var(--color-usc-cardinal)" />
      <path d="M9 16.5l4.5 4.5L23 11.5" fill="none" stroke="var(--color-usc-gold)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-page items-center justify-between gap-4 px-4 py-4 lg:px-8">
      <a href="/" className="flex min-h-target items-center gap-2.5 text-ink no-underline" aria-label="FundCheck home">
        <Mark />
        <span className="text-lg font-semibold tracking-[-0.01em]">FundCheck</span>
      </a>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto mt-16 flex w-full max-w-page flex-col gap-2 px-4 pb-10 text-sm text-ink-2 lg:px-8">
      <p className="m-0">
        Rules from USG Funding Department Guidelines, current as of Oct 21, 2026
      </p>
    </footer>
  );
}
