import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(320);

export const userRoleSchema = z.enum(['maestro', 'colaborador', 'solo_lectura']);

export const createUserSchema = z.object({
  email,
  displayName: z.string().trim().min(2).max(255),
  password: z.string().min(12).max(128),
  role: userRoleSchema,
}).strict();

export const updateUserSchema = z.object({
  displayName: z.string().trim().min(2).max(255).optional(),
  role: userRoleSchema.optional(),
  active: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Debe enviar al menos un campo para actualizar');

export const userIdSchema = z.string().uuid();

