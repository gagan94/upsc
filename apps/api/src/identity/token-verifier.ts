export interface AuthClaims {
  sub: string;
  email: string;
  name?: string;
}

export abstract class TokenVerifier {
  /** Throws AppError(401, 'unauthenticated') for any invalid token. */
  abstract verify(token: string): Promise<AuthClaims>;
}
