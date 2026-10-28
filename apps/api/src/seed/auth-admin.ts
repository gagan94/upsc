import type { SupabaseClient } from '@supabase/supabase-js';
import { v5 } from 'uuid';

export interface AuthAdmin {
  ensureUser(i: { email: string; password: string; name: string }): Promise<{ subject: string }>;
}

const PAGE_SIZE = 200;

export class SupabaseAuthAdmin implements AuthAdmin {
  private client: SupabaseClient | undefined;
  private readonly opts: { url: string; serviceRoleKey: string };

  /** `client` is injectable for tests; production code passes only the options. */
  constructor(opts: { url: string; serviceRoleKey: string }, client?: SupabaseClient) {
    this.opts = opts;
    this.client = client;
  }

  // Loaded lazily: supabase-js prints a Node-version warning on import, which tests with a fake client avoid.
  private async admin(): Promise<SupabaseClient['auth']['admin']> {
    if (!this.client) {
      const { createClient } = await import('@supabase/supabase-js');
      this.client = createClient(this.opts.url, this.opts.serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    return this.client.auth.admin;
  }

  async ensureUser(i: { email: string; password: string; name: string }): Promise<{ subject: string }> {
    const { data, error } = await (await this.admin()).createUser({
      email: i.email,
      password: i.password,
      email_confirm: true,
      user_metadata: { full_name: i.name },
      // Marks accounts this seed owns; an existing account without it is never adopted.
      app_metadata: { seeded: true },
    });
    if (!error && data.user) return { subject: data.user.id };
    if (error && isAlreadyRegistered(error)) return { subject: await this.adoptSeededUser(i.email, i.password) };
    throw new Error(`Supabase createUser failed for ${i.email}: ${error?.message ?? 'no user returned'}`);
  }

  /** Re-uses an existing account only if the seed created it, and resets its password to the current one. */
  private async adoptSeededUser(email: string, password: string): Promise<string> {
    const user = await this.findUser(email);
    if (user.app_metadata?.seeded !== true) {
      throw new Error(
        `Supabase user ${email} already exists. This Supabase user was not created by the seed. ` +
          'Delete it in the Supabase dashboard (Authentication → Users) and re-run the seed.',
      );
    }
    const { error } = await (await this.admin()).updateUserById(user.id, { password, email_confirm: true });
    if (error) throw new Error(`Supabase updateUserById failed for ${email}: ${error.message}`);
    return user.id;
  }

  private async findUser(email: string): Promise<{ id: string; app_metadata?: Record<string, unknown> }> {
    const wanted = email.toLowerCase();
    for (let page = 1; ; page++) {
      const { data, error } = await (await this.admin()).listUsers({ page, perPage: PAGE_SIZE });
      if (error) throw new Error(`Supabase listUsers failed: ${error.message}`);
      const hit = data.users.find((u) => u.email?.toLowerCase() === wanted);
      if (hit) return hit;
      if (data.users.length < PAGE_SIZE) throw new Error(`Supabase reports ${email} exists but it was not found`);
    }
  }
}

function isAlreadyRegistered(e: { message: string; status?: number; code?: string }): boolean {
  return e.code === 'email_exists' || /already (been )?registered|already exists/i.test(e.message);
}

const FAKE_NAMESPACE = '0b8e6c64-4f7c-4d0e-8d55-6a1f1c9d2e77';

/** Deterministic in-memory AuthAdmin for tests. */
export class FakeAuthAdmin implements AuthAdmin {
  readonly calls: { email: string; name: string }[] = [];

  async ensureUser(i: { email: string; password: string; name: string }): Promise<{ subject: string }> {
    this.calls.push({ email: i.email, name: i.name });
    return { subject: v5(i.email.toLowerCase(), FAKE_NAMESPACE) };
  }
}
