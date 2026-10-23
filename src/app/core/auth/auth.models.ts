import type { Portal, Role } from './roles';

/** Usuario autenticado tal como lo devuelve `apreu-api`. */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
  isActive: boolean;
  lastLogin: string | null;
  portal: Portal;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  /** Vigencia del token en segundos. */
  expiresIn: number;
  user: AuthUser;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Sesión persistida en `sessionStorage`. */
export interface AuthSession {
  token: string;
  /** Epoch en milisegundos en que expira el token. */
  expiresAt: number;
  tenant: string | null;
  user: AuthUser;
}

export type LogoutReason = 'manual' | 'expired';
