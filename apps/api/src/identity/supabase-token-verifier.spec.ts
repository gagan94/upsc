import { signTestToken, TEST_JWT_SECRET, TEST_SUPABASE_URL } from '../../test/tokens';
import { SupabaseTokenVerifier } from './supabase-token-verifier';

const hs = () =>
  new SupabaseTokenVerifier({
    supabase: { url: TEST_SUPABASE_URL, jwtSecret: TEST_JWT_SECRET },
  } as never);

async function expectUnauthenticated(p: Promise<unknown>) {
  await expect(p).rejects.toMatchObject({ code: 'unauthenticated' });
  await p.catch((e) => expect(e.getStatus()).toBe(401));
}

describe('SupabaseTokenVerifier', () => {
  it('accepts a valid token and maps claims', async () => {
    const token = await signTestToken({
      sub: 'abc',
      email: 'A@Example.com',
      user_metadata: { full_name: 'Asha K' },
    });
    expect(await hs().verify(token)).toEqual({
      sub: 'abc',
      email: 'A@Example.com',
      name: 'Asha K',
      emailVerified: false,
    });
  });

  it('reports emailVerified from user_metadata', async () => {
    const token = await signTestToken({ sub: 'abc', user_metadata: { email_verified: true } });
    expect((await hs().verify(token)).emailVerified).toBe(true);
  });

  it('rejects an expired token', async () => {
    const token = await signTestToken({ exp: Math.floor(Date.now() / 1000) - 3600 });
    await expectUnauthenticated(hs().verify(token));
  });

  it('rejects a wrong issuer', async () => {
    await expectUnauthenticated(hs().verify(await signTestToken({ iss: 'https://evil.example/auth/v1' })));
  });

  it('rejects a wrong audience', async () => {
    await expectUnauthenticated(hs().verify(await signTestToken({ aud: 'anon' })));
  });

  it('rejects a token forged with a different secret', async () => {
    await expectUnauthenticated(
      hs().verify(await signTestToken({}, 'another-secret-another-secret-another-secret')),
    );
  });

  it('rejects garbage', async () => {
    await expectUnauthenticated(hs().verify('not-a-jwt'));
  });

  it('rejects a token without email', async () => {
    const { SignJWT } = await import('jose');
    const noEmail = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('x')
      .setIssuer(`${TEST_SUPABASE_URL}/auth/v1`)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(TEST_JWT_SECRET));
    await expectUnauthenticated(hs().verify(noEmail));
  });

  it('JWKS mode (no secret): an HS256 token is rejected as unauthenticated', async () => {
    const v = new SupabaseTokenVerifier({ supabase: { url: TEST_SUPABASE_URL } } as never);
    await expectUnauthenticated(v.verify(await signTestToken()));
    await expectUnauthenticated(v.verify('garbage'));
  });
});
