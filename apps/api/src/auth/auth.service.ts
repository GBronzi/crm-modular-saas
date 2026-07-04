import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { argon2id, hash as argonHash, verify as argonVerify } from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { PoolClient } from 'pg';
import type { AuthUser, UserRole } from './auth.types.js';
import { TenantTransactionsService } from './tenant-transactions.service.js';

interface UserRow { id: string; company_id: string; password_hash: string; role: UserRole; token_version: number; active: boolean }
interface CompanyRow { id: string; active: boolean }

@Injectable()
export class AuthService {
  private readonly accessSecret: Uint8Array;
  private readonly accessTtl = process.env.JWT_ACCESS_TTL ?? '15m';
  private readonly refreshDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
  constructor(private readonly db: TenantTransactionsService) {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret || secret.length < 32) throw new Error('JWT_ACCESS_SECRET debe contener al menos 32 caracteres');
    if (!Number.isInteger(this.refreshDays) || this.refreshDays < 1 || this.refreshDays > 365) throw new Error('REFRESH_TOKEN_TTL_DAYS inválido');
    this.accessSecret = new TextEncoder().encode(secret);
  }
  async provision(input: { companyName: string; companySlug: string; displayName: string; email: string; password: string }) {
    const passwordHash = await argonHash(input.password, { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
    try {
      return await this.db.transaction(async (client) => {
        const company = await client.query<{ id: string }>('INSERT INTO companies(name,slug) VALUES ($1,$2) RETURNING id', [input.companyName,input.companySlug]);
        const companyId = company.rows[0]!.id;
        await client.query("SELECT set_config('app.company_id', $1, true)", [companyId]);
        const user = await client.query<{ id: string }>("INSERT INTO users(company_id,email,display_name,password_hash,role) VALUES ($1,$2,$3,$4,'maestro') RETURNING id", [companyId,input.email,input.displayName,passwordHash]);
        await client.query("INSERT INTO company_modules(company_id,module_key) SELECT $1, unnest(ARRAY['comercial','cobranzas','marketing','reportes'])", [companyId]);
        const identity: AuthUser = { userId: user.rows[0]!.id, companyId, role: 'maestro', tokenVersion: 0 };
        return { companyId, userId: identity.userId, ...(await this.issueSession(client, identity)) };
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('El identificador de empresa ya existe');
      throw error;
    }
  }
  async login(input: { companySlug: string; email: string; password: string }) {
    const company = await this.company(input.companySlug);
    if (!company?.active) throw new UnauthorizedException('Credenciales inválidas');
    return this.db.inTenant(company.id, async (client) => {
      const user = (await client.query<UserRow>('SELECT id,company_id,password_hash,role,token_version,active FROM users WHERE email=$1', [input.email])).rows[0];
      if (!user?.active || !(await argonVerify(user.password_hash,input.password))) throw new UnauthorizedException('Credenciales inválidas');
      return this.issueSession(client, { userId:user.id,companyId:user.company_id,role:user.role,tokenVersion:user.token_version });
    });
  }
  async refresh(input: { companySlug: string; refreshToken: string }) {
    const company = await this.company(input.companySlug);
    if (!company?.active) throw new UnauthorizedException('Sesión inválida');
    return this.db.inTenant(company.id, async (client) => {
      const row = (await client.query<UserRow & { session_id:string; expires_at:Date; revoked_at:Date|null }>(`SELECT s.id session_id,s.expires_at,s.revoked_at,u.id,u.company_id,u.password_hash,u.role,u.token_version,u.active FROM refresh_sessions s JOIN users u ON u.company_id=s.company_id AND u.id=s.user_id WHERE s.token_hash=$1 FOR UPDATE`,[this.hashToken(input.refreshToken)])).rows[0];
      if (!row || row.revoked_at || row.expires_at <= new Date() || !row.active) throw new UnauthorizedException('Sesión inválida');
      await client.query('UPDATE refresh_sessions SET revoked_at=now() WHERE id=$1',[row.session_id]);
      return this.issueSession(client,{ userId:row.id,companyId:row.company_id,role:row.role,tokenVersion:row.token_version });
    });
  }
  async logout(input: { companySlug: string; refreshToken: string }): Promise<void> {
    const company = await this.company(input.companySlug); if (!company) return;
    await this.db.inTenant(company.id, async (client) => { await client.query('UPDATE refresh_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE token_hash=$1',[this.hashToken(input.refreshToken)]); });
  }
  async verifyAccessToken(token: string): Promise<AuthUser> {
    try {
      const { payload } = await jwtVerify(token,this.accessSecret,{ issuer:'crm-modular-saas',audience:'crm-api' });
      const user: AuthUser = { userId:payload.sub!,companyId:String(payload.companyId),role:payload.role as UserRole,tokenVersion:Number(payload.tokenVersion) };
      if (!user.userId || !user.companyId || !['maestro','colaborador','solo_lectura'].includes(user.role)) throw new Error('claims');
      const current = (await this.db.inTenant(user.companyId,(client) => client.query<{token_version:number;active:boolean}>('SELECT token_version,active FROM users WHERE id=$1',[user.userId]))).rows[0];
      if (!current?.active || current.token_version !== user.tokenVersion) throw new Error('revoked');
      return user;
    } catch { throw new UnauthorizedException('Token de acceso inválido'); }
  }
  private async company(slug:string): Promise<CompanyRow|undefined> { return (await this.db.query<CompanyRow>('SELECT id,active FROM companies WHERE slug=$1',[slug])).rows[0]; }
  private async issueSession(client:PoolClient,user:AuthUser) {
    const refreshToken=randomBytes(48).toString('base64url');
    await client.query("INSERT INTO refresh_sessions(company_id,user_id,token_hash,expires_at) VALUES ($1,$2,$3,now()+($4 * interval '1 day'))",[user.companyId,user.userId,this.hashToken(refreshToken),this.refreshDays]);
    const accessToken=await new SignJWT({companyId:user.companyId,role:user.role,tokenVersion:user.tokenVersion}).setProtectedHeader({alg:'HS256'}).setSubject(user.userId).setIssuer('crm-modular-saas').setAudience('crm-api').setIssuedAt().setExpirationTime(this.accessTtl).sign(this.accessSecret);
    return { accessToken,refreshToken,expiresIn:this.accessTtl };
  }
  private hashToken(token:string):string { return createHash('sha256').update(token).digest('hex'); }
}
