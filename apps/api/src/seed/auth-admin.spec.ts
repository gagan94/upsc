import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAuthAdmin } from './auth-admin';

const input = { email: 'a@example.com', password: 'pw', name: 'A' };

function fakeClient(opts: {
  create: { data: { user: { id: string } | null }; error: { message: string; status?: number; code?: string } | null };
  pages?: { id: string; email: string }[][];
}) {
  const createUser = jest.fn().mockResolvedValue(opts.create);
  const listUsers = jest.fn().mockImplementation(async ({ page }: { page: number }) => ({
    data: { users: (opts.pages ?? [])[page - 1] ?? [] },
    error: null,
  }));
  const client = { auth: { admin: { createUser, listUsers } } } as unknown as SupabaseClient;
  return { client, createUser, listUsers };
}

describe('SupabaseAuthAdmin (injected fake client)', () => {
  it('creates a new confirmed user', async () => {
    const f = fakeClient({ create: { data: { user: { id: 'sub-1' } }, error: null } });
    const admin = new SupabaseAuthAdmin({ url: 'http://x', serviceRoleKey: 'k' }, f.client);
    expect(await admin.ensureUser(input)).toEqual({ subject: 'sub-1' });
    expect(f.createUser).toHaveBeenCalledWith({
      email: 'a@example.com',
      password: 'pw',
      email_confirm: true,
      user_metadata: { full_name: 'A' },
    });
    expect(f.listUsers).not.toHaveBeenCalled();
  });

  it('returns the existing user id (paginating) when already registered', async () => {
    const page1 = Array.from({ length: 200 }, (_, n) => ({ id: `o${n}`, email: `o${n}@example.com` }));
    const f = fakeClient({
      create: { data: { user: null }, error: { message: 'A user with this email address has already been registered', status: 422, code: 'email_exists' } },
      pages: [page1, [{ id: 'sub-9', email: 'A@Example.com' }]],
    });
    const admin = new SupabaseAuthAdmin({ url: 'http://x', serviceRoleKey: 'k' }, f.client);
    expect(await admin.ensureUser(input)).toEqual({ subject: 'sub-9' });
    expect(f.listUsers).toHaveBeenCalledTimes(2);
  });

  it('throws on other errors without leaking the password', async () => {
    const f = fakeClient({ create: { data: { user: null }, error: { message: 'boom', status: 500 } } });
    const admin = new SupabaseAuthAdmin({ url: 'http://x', serviceRoleKey: 'k' }, f.client);
    await expect(admin.ensureUser(input)).rejects.toThrow(/boom/);
    await expect(admin.ensureUser(input)).rejects.not.toThrow(/pw/);
  });
});
