import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthRateLimiterService } from './auth-rate-limiter.service.js';
import { AuthService } from './auth.service.js';
import { TenantTransactionsService } from './tenant-transactions.service.js';

@Module({
  controllers: [AuthController],
  providers: [TenantTransactionsService, AuthService, AuthRateLimiterService, AuthGuard],
  exports: [TenantTransactionsService, AuthService, AuthGuard],
})
export class AuthModule {}
