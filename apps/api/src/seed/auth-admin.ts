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
    });
    if (!error && data.user) return { subject: data.user.id };
    if (error && isAlreadyRegistered(error)) return { subject: await this.findUserId(i.email) };
    throw new Error(`Supabase createUser failed for ${i.email}: ${error?.message ?? 'no user returned'}`);
  }

  private async findUserId(email: string): Promise<string> {
    const wanted = email.toLowerCase();
    for (let page = 1; ; page++) {
      const { data, error } = await (await this.admin()).listUsers({ page, perPage: PAGE_SIZE });
      if (error) throw new Error(`Supabase listUsers failed: ${error.message}`);
      const hit = data.users.find((u) => u.email?.toLowerCase() === wanted);
      if (hit) return hit.id;
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
