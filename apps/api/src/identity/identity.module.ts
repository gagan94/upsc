import { DynamicModule, Module } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../common/config';
import { AuthGuard } from './auth.guard';
import { MeController } from './me.controller';
import { RolesGuard } from './roles.guard';
import { SupabaseTokenVerifier } from './supabase-token-verifier';
import { TokenVerifier } from './token-verifier';
import { UsersService } from './users.service';

// Global so guards used by other modules' controllers can resolve their dependencies.
@Module({})
export class IdentityModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: IdentityModule,
      global: true,
      controllers: [MeController],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        { provide: TokenVerifier, useClass: SupabaseTokenVerifier },
        UsersService,
        AuthGuard,
        RolesGuard,
      ],
      exports: [TokenVerifier, UsersService, AuthGuard, RolesGuard],
    };
  }
}
