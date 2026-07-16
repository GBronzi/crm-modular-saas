import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { parseBody } from '../common/validation.js';
import { loginSchema, mfaCodeSchema, passwordResetConfirmSchema, passwordResetRequestSchema, provisionSchema, refreshSchema } from './auth.schemas.js';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard.js';
import { AuthRateLimiterService } from './auth-rate-limiter.service.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly rateLimiter: AuthRateLimiterService) {}

  @Post('provision')
  provision(@Req() req: Request, @Body() body: unknown) {
    const value = parseBody(provisionSchema, body);
    this.rateLimiter.consume({ action: 'provision', ip: clientIp(req), companySlug: value.companySlug, email: value.email });
    return this.auth.provision(value);
  }

  @HttpCode(200)
  @Post('login')
  login(@Req() req: Request, @Body() body: unknown) {
    const value = parseBody(loginSchema, body);
    this.rateLimiter.consume({ action: 'login', ip: clientIp(req), companySlug: value.companySlug, email: value.email });
    return this.auth.login(value);
  }

  @HttpCode(200)
  @Post('refresh')
  refresh(@Req() req: Request, @Body() body: unknown) {
    const value = parseBody(refreshSchema, body);
    this.rateLimiter.consume({ action: 'refresh', ip: clientIp(req), companySlug: value.companySlug });
    return this.auth.refresh(value);
  }

  @HttpCode(200)
  @Post('password-reset/request')
  requestPasswordReset(@Req() req: Request, @Body() body: unknown) {
    const value = parseBody(passwordResetRequestSchema, body);
    this.rateLimiter.consume({ action: 'password_reset_request', ip: clientIp(req), companySlug: value.companySlug, email: value.email });
    return this.auth.requestPasswordReset(value);
  }

  @HttpCode(200)
  @Post('password-reset/confirm')
  confirmPasswordReset(@Req() req: Request, @Body() body: unknown) {
    const value = parseBody(passwordResetConfirmSchema, body);
    this.rateLimiter.consume({ action: 'password_reset_confirm', ip: clientIp(req), companySlug: value.companySlug });
    return this.auth.confirmPasswordReset(value);
  }

  @HttpCode(204)
  @Post('logout')
  logout(@Body() body: unknown) {
    return this.auth.logout(parseBody(refreshSchema, body));
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Post('mfa/setup')
  setupMfa(@Req() req: AuthenticatedRequest) {
    return this.auth.setupMfa(req.user);
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Post('mfa/enable')
  enableMfa(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.auth.enableMfa(req.user, parseBody(mfaCodeSchema, body).code);
  }

  @UseGuards(AuthGuard)
  @HttpCode(200)
  @Post('mfa/disable')
  disableMfa(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.auth.disableMfa(req.user, parseBody(mfaCodeSchema, body).code);
  }
}

function clientIp(req: Request) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) return forwardedFor.split(',')[0]!.trim();
  if (Array.isArray(forwardedFor) && forwardedFor[0]) return forwardedFor[0];
  return req.ip || req.socket.remoteAddress || 'unknown';
}
