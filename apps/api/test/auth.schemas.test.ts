import { describe,expect,it } from 'vitest';
import { loginSchema,provisionSchema } from '../src/auth/auth.schemas.js';
describe('auth schemas',()=>{
  it('normalizes tenant and email',()=>{ const value=provisionSchema.parse({companyName:'Acme',companySlug:'ACME-CL',displayName:'Admin',email:' ADMIN@EXAMPLE.COM ',password:'a-secure-password'}); expect(value.companySlug).toBe('acme-cl'); expect(value.email).toBe('admin@example.com'); });
  it('does not accept a role from the client',()=>{ expect(provisionSchema.safeParse({companyName:'Acme',companySlug:'acme',displayName:'Admin',email:'a@b.cl',password:'a-secure-password',role:'maestro'}).success).toBe(false); });
  it('requires a company slug during login',()=>{ expect(loginSchema.safeParse({email:'a@b.cl',password:'x'}).success).toBe(false); });
});
