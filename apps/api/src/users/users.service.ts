import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { argon2id, hash as argonHash } from 'argon2';
import type { AuthUser } from '../auth/auth.types.js';
import { TenantTransactionsService } from '../auth/tenant-transactions.service.js';
import type { createUserSchema, updateUserSchema } from './users.schemas.js';
import type { z } from 'zod';

type CreateUserInput = z.infer<typeof createUserSchema>;
type UpdateUserInput = z.infer<typeof updateUserSchema>;

@Injectable()
export class UsersService {
  constructor(private readonly db: TenantTransactionsService) {}

  list(user: AuthUser) {
    return this.db.inTenant(user.companyId, async (client) => (
      await client.query(
        `SELECT id,email,display_name "displayName",role,active,created_at "createdAt",updated_at "updatedAt"
         FROM users
         ORDER BY created_at DESC
         LIMIT 100`,
      )
    ).rows);
  }

  async create(user: AuthUser, input: CreateUserInput) {
    const passwordHash = await argonHash(input.password, { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
    try {
      return await this.db.inTenant(user.companyId, async (client) => (
        await client.query(
          `INSERT INTO users(company_id,email,display_name,password_hash,role)
           VALUES ($1,$2,$3,$4,$5)
           RETURNING id,email,display_name "displayName",role,active,created_at "createdAt"`,
          [user.companyId, input.email, input.displayName, passwordHash, input.role],
        )
      ).rows[0]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('Ya existe un usuario con ese correo en la empresa');
      throw error;
    }
  }

  update(actor: AuthUser, userId: string, input: UpdateUserInput) {
    if (actor.userId === userId && input.active === false) throw new ForbiddenException('No puedes desactivar tu propio usuario');
    return this.db.inTenant(actor.companyId, async (client) => {
      const row = (await client.query(
        `UPDATE users
         SET display_name=COALESCE($2,display_name),
             role=COALESCE($3,role),
             active=COALESCE($4,active),
             token_version=CASE WHEN $3 IS NOT NULL OR $4 IS NOT NULL THEN token_version + 1 ELSE token_version END,
             updated_at=now()
         WHERE id=$1
         RETURNING id,email,display_name "displayName",role,active,created_at "createdAt",updated_at "updatedAt"`,
        [userId, input.displayName ?? null, input.role ?? null, input.active ?? null],
      )).rows[0];
      if (!row) throw new NotFoundException('Usuario no encontrado');
      return row;
    });
  }
}
