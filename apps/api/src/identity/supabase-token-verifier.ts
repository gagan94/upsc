import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, JWTVerifyGetKey } from 'jose';
import { APP_CONFIG, type AppConfig } from '../common/config';
import { AppError } from '../common/errors';
import { AuthClaims, TokenVerifier } from './token-verifier';

const unauthenticated = () => new AppError(401, 'unauthenticated', 'Authentication required');

@Injectable()
export class SupabaseTokenVerifier implements TokenVerifier {
  private readonly issuer: string;
  private readonly secret?: Uint8Array;
  private readonly jwks?: JWTVerifyGetKey;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const base = config.supabase.url.replace(/\/+$/, '');
    this.issuer = `${base}/auth/v1`;
    if (config.supabase.jwtSecret) {
      this.secret = new TextEncoder().encode(config.supabase.jwtSecret);
    } else {
      this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
    }
  }

  async verify(token: string): Promise<AuthClaims> {
    try {
      const options = { issuer: this.issuer, audience: 'authenticated' };
      const { payload } = this.secret
        ? await jwtVerify(token, this.secret, { ...options, algorithms: ['HS256'] })
        : await jwtVerify(token, this.jwks as JWTVerifyGetKey, {
            ...options,
            algorithms: ['RS256', 'ES256', 'EdDSA'],
          });
      if (typeof payload.sub !== 'string' || !payload.sub) throw unauthenticated();
      if (typeof payload.email !== 'string' || !payload.email.trim()) throw unauthenticated();
      const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
      const rawName = meta.full_name ?? meta.name;
      return {
        sub: payload.sub,
        email: payload.email,
        name: typeof rawName === 'string' && rawName.trim() ? rawName.trim() : undefined,
        emailVerified: meta.email_verified === true,
      };
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw unauthenticated();
    }
  }
}
