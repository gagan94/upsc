export const APP_CONFIG = 'APP_CONFIG';

export interface AppConfig {
  port: number;
  databaseUrl: string;
  webOrigin: string;
  supabase: { url: string; jwtSecret?: string };
  demoPassword: string;
  production: boolean;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  return {
    port: env.PORT ? Number(env.PORT) : 4000,
    databaseUrl: required(env, 'DATABASE_URL'),
    webOrigin: env.WEB_ORIGIN || 'http://localhost:3000',
    supabase: {
      url: required(env, 'SUPABASE_URL'),
      jwtSecret: env.SUPABASE_JWT_SECRET || undefined,
    },
    demoPassword: env.DEMO_PASSWORD ?? '',
    production: env.NODE_ENV === 'production',
  };
}
