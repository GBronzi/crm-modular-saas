import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type Bucket = { count: number; resetAt: number };

export type RateLimitInput = {
  action: 'provision' | 'login' | 'refresh' | 'password_reset_request' | 'password_reset_confirm';
  ip: string;
  companySlug?: string;
  email?: string;
};

const limits: Record<RateLimitInput['action'], { max: number; windowMs: number }> = {
  provision: { max: 5, windowMs: 15 * 60 * 1000 },
  login: { max: 10, windowMs: 15 * 60 * 1000 },
  refresh: { max: 30, windowMs: 15 * 60 * 1000 },
  password_reset_request: { max: 5, windowMs: 15 * 60 * 1000 },
  password_reset_confirm: { max: 10, windowMs: 15 * 60 * 1000 },
};

@Injectable()
export class AuthRateLimiterService {
  private readonly buckets = new Map<string, Bucket>();

  consume(input: RateLimitInput, now = Date.now()) {
    const limit = limits[input.action];
    const key = this.key(input);
    this.cleanup(now);
    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + limit.windowMs });
      return;
    }
    if (current.count >= limit.max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      throw new HttpException({ message: 'Demasiados intentos. Intenta nuevamente más tarde.', retryAfter }, HttpStatus.TOO_MANY_REQUESTS);
    }
    current.count += 1;
  }

  private key(input: RateLimitInput) {
    const identity = [input.companySlug?.toLowerCase(), input.email?.toLowerCase()].filter(Boolean).join(':') || 'anonymous';
    return `${input.action}:${input.ip}:${identity}`;
  }

  private cleanup(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
