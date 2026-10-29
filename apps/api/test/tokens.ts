import { SignJWT } from 'jose';

export const TEST_JWT_SECRET = 'test-secret-test-secret-test-secret-0123456789';
export const TEST_SUPABASE_URL = 'https://test.supabase.co';

export async function signTestToken(
  claims: Partial<{
    sub: string;
    email: string;
    iss: string;
    aud: string;
    exp: number | string;
    user_metadata: Record<string, unknown>;
  }> = {},
  secret: string = TEST_JWT_SECRET,
): Promise<string> {
  const { sub, iss, aud, exp, ...rest } = claims;
  return new SignJWT({ email: 'user@example.com', ...rest })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub ?? 'sub-1')
    .setIssuer(iss ?? `${TEST_SUPABASE_URL}/auth/v1`)
    .setAudience(aud ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(exp ?? '1h')
    .sign(new TextEncoder().encode(secret));
}
