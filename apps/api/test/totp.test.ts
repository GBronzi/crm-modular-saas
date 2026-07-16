import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, generateTotpSecret, otpauthUrl, totp, verifyTotp } from '../src/auth/totp.js';

describe('totp helpers', () => {
  it('generates and verifies a six digit code', () => {
    const secret = generateTotpSecret();
    const now = 1_784_225_600_000;
    const code = totp(secret, now);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code, now)).toBe(true);
  });

  it('encrypts and decrypts secrets', () => {
    const encrypted = encryptSecret('ABCDEF2345', 'local-secret-material');
    expect(encrypted).not.toContain('ABCDEF2345');
    expect(decryptSecret(encrypted, 'local-secret-material')).toBe('ABCDEF2345');
  });

  it('builds an otpauth URL', () => {
    expect(otpauthUrl({ issuer: 'CRM Modular', account: 'admin@example.com', secret: 'ABCDEF2345' })).toContain('otpauth://totp/');
  });
});
