// Throw-away stub that plays both the Supabase token endpoint and the API.
// Usage: node smoke-stub.mjs <port> [scenario]
// scenarios: ok | subjects7 | admin200 | never-ready | db-down
import http from 'node:http';

const port = Number(process.argv[2]);
const scenario = process.argv[3] ?? 'ok';
export const TOKEN = 'stub-access-token-SECRET123';

const send = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

http
  .createServer((req, res) => {
    const url = req.url ?? '';
    if (url.startsWith('/auth/v1/token')) {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const ok = req.headers.apikey === 'anon-key' && JSON.parse(raw || '{}').email === 'student@example.com';
        return ok ? send(res, 200, { access_token: TOKEN }) : send(res, 400, { error: 'bad' });
      });
      return;
    }
    if (url === '/api/v1/health') {
      if (scenario === 'never-ready') return send(res, 503, { status: 'starting' });
      return send(res, 200, { status: 'ok', db: scenario === 'db-down' ? 'down' : 'up' });
    }
    const authed = req.headers.authorization === `Bearer ${TOKEN}`;
    if (!authed) return send(res, 401, {});
    if (url === '/api/v1/learn/subjects') {
      const n = scenario === 'subjects7' ? 7 : 8;
      return send(res, 200, { subjects: Array.from({ length: n }, (_, i) => ({ id: i })) });
    }
    if (url === '/api/v1/admin/users') {
      return scenario === 'admin200' ? send(res, 200, { users: [] }) : send(res, 403, {});
    }
    send(res, 404, {});
  })
  .listen(port, '127.0.0.1');
