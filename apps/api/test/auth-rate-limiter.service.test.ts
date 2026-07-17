import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AuthRateLimiterService } from '../src/auth/auth-rate-limiter.service.js';

describe('AuthRateLimiterService', () => {
  it('limits repeated login attempts for the same ip and identity', () => {
    const limiter = new AuthRateLimiterService();
    const input = { action: 'login' as const, ip: '127.0.0.1', companySlug: 'acme', email: 'admin@example.com' };
    for (let attempt = 0; attempt < 10; attempt += 1) limiter.consume(input, 1_000);
    expect(() => limiter.consume(input, 1_000)).toThrow(HttpException);
  });

  it('resets a bucket after the configured window', () => {
    const limiter = new AuthRateLimiterService();
    const input = { action: 'provision' as const, ip: '127.0.0.1', companySlug: 'acme', email: 'admin@example.com' };
    for (let attempt = 0; attempt < 5; attempt += 1) limiter.consume(input, 1_000);
    expect(() => limiter.consume(input, 16 * 60 * 1_000)).not.toThrow();
  });

  it('keeps different identities in separate buckets', () => {
    const limiter = new AuthRateLimiterService();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      limiter.consume({ action: 'login', ip: '127.0.0.1', companySlug: 'acme', email: 'one@example.com' }, 1_000);
    }
    expect(() => limiter.consume({ action: 'login', ip: '127.0.0.1', companySlug: 'acme', email: 'two@example.com' }, 1_000)).not.toThrow();
  });
});
