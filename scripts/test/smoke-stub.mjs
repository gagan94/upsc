// Throw-away stub that plays both the Supabase token endpoint and the API.
// Usage: node smoke-stub.mjs <port> [scenario]
// scenarios: ok | subjects7 | admin200 | never-ready | db-down | today500 | leak | got4 | total4 | adminq200
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
    const POLITY = 'polity-node-id';
    const SID = 'session-1';
    if (url === '/api/v1/planner/today') return scenario === 'today500' ? send(res, 500, {}) : send(res, 200, { tasks: [] });
    if (url === '/api/v1/practice/subjects') return send(res, 200, { subjects: [{ id: 'other-node', title: 'History' }, { id: POLITY, title: 'Indian Polity' }] });
    if (url === '/api/v1/admin/questions') return scenario === 'adminq200' ? send(res, 200, { items: [] }) : send(res, 403, {});
    if (url === '/api/v1/practice/sessions' && req.method === 'POST') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const b = JSON.parse(raw || '{}');
        const okBody = Array.isArray(b.subjectNodeIds) && b.subjectNodeIds[0] === POLITY && b.count === 5 && b.mode === 'test' && b.source === 'platform' && b.timed === false;
        if (!okBody) return send(res, 400, { error: { code: 'validation_failed' } });
        const questions = Array.from({ length: 5 }, (_, i) => ({ ordinal: i + 1, stem: 'q', ...(scenario === 'leak' ? { correctOption: 'A' } : {}) }));
        return send(res, 201, { session: { id: SID }, questions, requested: 5, got: scenario === 'got4' ? 4 : 5 });
      });
      return;
    }
    if (url === `/api/v1/practice/sessions/${SID}/answers/1` && req.method === 'PUT') return send(res, 200, { saved: true });
    if (url === `/api/v1/practice/sessions/${SID}/submit` && req.method === 'POST') return send(res, 200, { score: 0 });
    if (url === `/api/v1/practice/sessions/${SID}/results`) {
      return send(res, 200, scenario === 'total4' ? { correct: 1, incorrect: 2, skipped: 1 } : { correct: 1, incorrect: 0, skipped: 4 });
    }
    send(res, 404, {});
  })
  .listen(port, '127.0.0.1');
