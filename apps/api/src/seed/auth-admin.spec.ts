import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAuthAdmin } from './auth-admin';

const PASSWORD = 'rotated-demo-password-42';
const input = { email: 'a@example.com', password: PASSWORD, name: 'A' };
const EXISTS = { message: 'A user with this email address has already been registered', status: 422, code: 'email_exists' };

type FakeUser = { id: string; email: string; app_metadata?: Record<string, unknown> };

function fakeClient(opts: {
  create: { data: { user: { id: string } | null }; error: { message: string; status?: number; code?: string } | null };
  pages?: FakeUser[][];
  update?: { error: { message: string } | null };
}) {
  const createUser = jest.fn().mockResolvedValue(opts.create);
  const listUsers = jest.fn().mockImplementation(async ({ page }: { page: number }) => ({
    data: { users: (opts.pages ?? [])[page - 1] ?? [] },
    error: null,
  }));
  const updateUserById = jest.fn().mockResolvedValue({ data: { user: {} }, error: null, ...opts.update });
  const client = { auth: { admin: { createUser, listUsers, updateUserById } } } as unknown as SupabaseClient;
  return { client, createUser, listUsers, updateUserById };
}

const make = (f: ReturnType<typeof fakeClient>) => new SupabaseAuthAdmin({ url: 'http://x', serviceRoleKey: 'k' }, f.client);

async function rejection(p: Promise<unknown>): Promise<Error> {
  await expect(p).rejects.toThrow();
  return p.then(
    () => {
      throw new Error('expected rejection');
    },
    (e: unknown) => e as Error,
  );
}

describe('SupabaseAuthAdmin (injected fake client)', () => {
  it('creates a new confirmed user marked as seeded', async () => {
    const f = fakeClient({ create: { data: { user: { id: 'sub-1' } }, error: null } });
    expect(await make(f).ensureUser(input)).toEqual({ subject: 'sub-1' });
    expect(f.createUser).toHaveBeenCalledWith({
      email: 'a@example.com',
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'A' },
      app_metadata: { seeded: true },
    });
    expect(f.listUsers).not.toHaveBeenCalled();
    expect(f.updateUserById).not.toHaveBeenCalled();
  });

  it('re-uses an existing seeded user (paginating) and resets its password', async () => {
    const page1 = Array.from({ length: 200 }, (_, n) => ({ id: `o${n}`, email: `o${n}@example.com` }));
    const f = fakeClient({
      create: { data: { user: null }, error: EXISTS },
      pages: [page1, [{ id: 'sub-9', email: 'A@Example.com', app_metadata: { provider: 'email', seeded: true } }]],
    });
    expect(await make(f).ensureUser(input)).toEqual({ subject: 'sub-9' });
    expect(f.listUsers).toHaveBeenCalledTimes(2);
    expect(f.updateUserById).toHaveBeenCalledWith('sub-9', { password: PASSWORD, email_confirm: true });
  });

  it('refuses an existing user the seed did not create, without updating it', async () => {
    const f = fakeClient({
      create: { data: { user: null }, error: EXISTS },
      pages: [[{ id: 'squatter', email: 'a@example.com', app_metadata: { provider: 'email' } }]],
    });
    const err = await rejection(make(f).ensureUser(input));
    expect(err.message).toContain('a@example.com');
    expect(err.message).toContain(
      'This Supabase user was not created by the seed. Delete it in the Supabase dashboard (Authentication → Users) and re-run the seed.',
    );
    expect(err.message).not.toContain(PASSWORD);
    expect(f.updateUserById).not.toHaveBeenCalled();
  });

  it('fails when the password reset of a seeded user fails, without leaking the password', async () => {
    const f = fakeClient({
      create: { data: { user: null }, error: EXISTS },
      pages: [[{ id: 'sub-9', email: 'a@example.com', app_metadata: { seeded: true } }]],
      update: { error: { message: 'nope' } },
    });
    const err = await rejection(make(f).ensureUser(input));
    expect(err.message).toMatch(/nope/);
    expect(err.message).not.toContain(PASSWORD);
  });

  it('throws on other errors without leaking the password', async () => {
    const f = fakeClient({ create: { data: { user: null }, error: { message: 'boom', status: 500 } } });
    const err = await rejection(make(f).ensureUser(input));
    expect(err.message).toMatch(/boom/);
    expect(err.message).not.toContain(PASSWORD);
  });
});
