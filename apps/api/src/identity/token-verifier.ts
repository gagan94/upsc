export interface AuthClaims {
  sub: string;
  email: string;
  name?: string;
  emailVerified: boolean;
}

export abstract class TokenVerifier {
  /** Throws AppError(401, 'unauthenticated') for any invalid token. */
  abstract verify(token: string): Promise<AuthClaims>;
}
