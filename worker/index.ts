import type { Env } from './llm';

export default {
  async fetch(req, env): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (pathname === '/api/health' && req.method === 'GET') return Response.json({ ok: true });
    return Response.json({ code: 'not_found', message: 'Unknown API route' }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
