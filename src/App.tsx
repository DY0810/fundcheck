import Check from './ui/pages/Check';
import { Footer, Header } from './ui/components/Chrome';

if (import.meta.env.DEV && new URLSearchParams(location.search).has('axe')) {
  // Dev-only accessibility check: call window.axeCheck() once the view you want is on screen.
  (window as unknown as { axeCheck: () => Promise<unknown> }).axeCheck = () =>
    import('axe-core').then(async (a) => {
      const r = await a.default.run();
      const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      console.table(r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })));
      return { serious: bad.length, violations: r.violations.map((v) => `${v.impact}: ${v.id} (${v.nodes.length})`) };
    });
}

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-ctl focus:bg-panel focus:px-3 focus:py-2">Skip to content</a>
      <Header />
      <div id="main" className="flex-1"><Check /></div>
      <Footer />
    </div>
  );
}
