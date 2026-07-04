export const roles = ['maestro', 'colaborador', 'solo_lectura'] as const;
export type UserRole = (typeof roles)[number];
export interface AuthUser { userId: string; companyId: string; role: UserRole; tokenVersion: number }
