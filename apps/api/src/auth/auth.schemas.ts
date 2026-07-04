import { z } from 'zod';
const email = z.string().trim().toLowerCase().email().max(320);
export const provisionSchema = z.object({ companyName: z.string().trim().min(2).max(255), companySlug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80), displayName: z.string().trim().min(2).max(255), email, password: z.string().min(12).max(128) }).strict();
export const loginSchema = z.object({ companySlug: z.string().trim().toLowerCase(), email, password: z.string().max(128) }).strict();
export const refreshSchema = z.object({ companySlug: z.string().trim().toLowerCase(), refreshToken: z.string().min(32).max(512) }).strict();
