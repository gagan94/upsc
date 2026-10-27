import { loadConfig } from './config';

const base = { DATABASE_URL: 'postgres://x', SUPABASE_URL: 'https://p.supabase.co' };

describe('loadConfig', () => {
  it('applies defaults', () => {
    const c = loadConfig(base);
    expect(c.port).toBe(4000);
    expect(c.webOrigin).toBe('http://localhost:3000');
    expect(c.production).toBe(false);
    expect(c.databaseUrl).toBe('postgres://x');
    expect(c.supabase.url).toBe('https://p.supabase.co');
  });

  it('throws naming DATABASE_URL when missing', () => {
    expect(() => loadConfig({ SUPABASE_URL: 'https://p.supabase.co' })).toThrow(/DATABASE_URL/);
  });

  it('throws naming SUPABASE_URL when missing', () => {
    expect(() => loadConfig({ DATABASE_URL: 'postgres://x' })).toThrow(/SUPABASE_URL/);
  });

  it('detects production', () => {
    expect(loadConfig({ ...base, NODE_ENV: 'production' }).production).toBe(true);
  });
});
