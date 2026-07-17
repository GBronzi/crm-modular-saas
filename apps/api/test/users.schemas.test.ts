import { describe, expect, it } from 'vitest';
import { createUserSchema, updateUserSchema, userIdSchema } from '../src/users/users.schemas.js';

describe('users schemas', () => {
  it('accepts valid administrative user creation payloads', () => {
    expect(createUserSchema.parse({
      email: '  OPERADOR@EJEMPLO.COM ',
      displayName: 'Operador Comercial',
      password: 'clave-segura-123',
      role: 'colaborador',
    })).toMatchObject({ email: 'operador@ejemplo.com', role: 'colaborador' });
  });

  it('rejects unsafe user updates and invalid ids', () => {
    expect(() => updateUserSchema.parse({})).toThrow();
    expect(() => createUserSchema.parse({
      email: 'x@example.com',
      displayName: 'Solo Lectura',
      password: 'corta',
      role: 'admin',
    })).toThrow();
    expect(() => userIdSchema.parse('no-es-uuid')).toThrow();
  });
});
