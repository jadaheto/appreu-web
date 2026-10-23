/**
 * Contratos de administración: usuarios y auditoría (`identity`) e institución /
 * configuración (`institution`). Reflejan los DTO de respuesta de `apreu-api`.
 */
import type { Page, Role } from '../../../core';

export interface ApiPaginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export function toPage<T>(res: ApiPaginated<T>): Page<T> {
  return {
    items: res.items ?? [],
    total: res.total ?? 0,
    page: res.page ?? 1,
    pageSize: res.limit,
  };
}

// ───────────────────────────── Usuarios ─────────────────────────────

export type EffectiveUserStatus = 'active' | 'inactive' | 'suspended' | 'retired' | 'on_leave';

export const EFFECTIVE_STATUS_LABELS: Record<EffectiveUserStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
  retired: 'Retirado',
  on_leave: 'En licencia',
};

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLogin: string | null;
  createdAt: string | null;
  employmentStatus: string | null;
  effectiveStatus: EffectiveUserStatus;
}

export interface UserQuery {
  page?: number;
  pageSize?: number;
  search?: string | null;
  role?: Role | null;
  active?: boolean | null;
}

export interface UserStats {
  total: number;
  admins: number;
  staff: number;
  families: number;
  inactive: number;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: Role;
}

export type UpdateUserRequest = Partial<CreateUserRequest>;

export interface UserWithTemporaryPassword {
  user: ManagedUser;
  /** Se muestra una sola vez; el usuario debe cambiarla al iniciar sesión. */
  temporaryPassword: string;
}

// ───────────────────────────── Auditoría ─────────────────────────────

export interface AccessLogRecord {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string | null;
  role: string;
  path: string;
  module: string;
  allowed: boolean;
  ipAddress: string;
  createdAt: string | null;
}

export interface AccessLogQuery {
  page?: number;
  pageSize?: number;
  search?: string | null;
  userId?: number | null;
  module?: string | null;
  allowed?: boolean | null;
  from?: string | null;
  to?: string | null;
}

// ─────────────────────────── Institución ───────────────────────────

export const DOCUMENT_TYPES = ['NIT', 'CC'] as const;
export const PERSON_TYPES = ['juridica', 'natural'] as const;

export interface InstitutionProfile {
  id: number | null;
  name: string;
  nit: string;
  nitDv: number | null;
  nitFormatted: string;
  documentType: string;
  personType: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  cityDaneCode: string | null;
  department: string | null;
  departmentDaneCode: string | null;
  postalCode: string | null;
  taxResponsibilities: string[];
  daneCode: string | null;
  resolutionNumber: string | null;
  rectorName: string | null;
  billingContact: { name: string | null; phone: string | null; email: string | null };
  logoUrl: string | null;
}

export interface UpdateInstitutionRequest {
  name: string;
  nit: string;
  documentType: string;
  personType: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  cityDaneCode?: string | null;
  department?: string | null;
  departmentDaneCode?: string | null;
  postalCode?: string | null;
  taxResponsibilities?: string[];
  daneCode?: string | null;
  resolutionNumber?: string | null;
  rectorName?: string | null;
  billingContactName?: string | null;
  billingContactPhone?: string | null;
  billingContactEmail?: string | null;
}

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

/**
 * Dígito de verificación DIAN de un NIT (módulo 11 con los primos de la DIAN).
 * Solo para previsualizar mientras se escribe: el valor oficial lo calcula y
 * devuelve la API (`nitDv`, `nitFormatted`).
 */
export function nitCheckDigit(nit: string): number | null {
  const digits = (nit ?? '').replace(/\D/g, '');
  if (!digits || digits.length > 15) return null;
  const primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += Number(digits[digits.length - 1 - i]) * primes[i];
  }
  const mod = sum % 11;
  return mod >= 2 ? 11 - mod : mod;
}

// ─────────────────────────── Configuración ───────────────────────────

/** Valor que la API devuelve para un secreto configurado; reenviarlo no lo modifica. */
export const SECRET_MASK = '••••••••';

/** Secciones que gestiona esta pantalla (la configuración DIAN es del feature e-invoicing). */
export const SETTINGS_SECTIONS = [
  'academic',
  'invoice-email',
  'payments',
  'payroll',
  'branding',
  'modules',
  'integrations',
  'ai',
] as const;
export type SettingsSectionKey = (typeof SETTINGS_SECTIONS)[number];

export type SettingType =
  | 'text'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'enum'
  | 'enum-set'
  | 'hex-color'
  | 'email'
  | 'url'
  | 'date';

export type SettingValue = string | number | boolean | string[] | null;

export interface SettingField {
  key: string;
  label: string;
  type: SettingType;
  secret: boolean;
  readOnly: boolean;
  options: string[] | null;
  min: number | null;
  max: number | null;
  maxLength: number | null;
}

export interface SettingsSectionMetadata {
  key: string;
  label: string;
  fields: SettingField[];
}

export interface SettingsSectionValues {
  section: string;
  label: string;
  values: Record<string, SettingValue>;
}
