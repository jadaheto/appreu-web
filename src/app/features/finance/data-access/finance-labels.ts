import type { BadgeTone, SelectOption } from '../../../shared/ui';
import {
  CHARGE_STATUSES,
  COLLECTION_FILE_BANKS,
  CONCEPT_CATEGORIES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PAYROLL_FILE_BANKS,
  RISK_LEVELS,
  type ChargeStatus,
  type CollectionFileBank,
  type ConceptCategory,
  type PaymentMethod,
  type PaymentStatus,
  type PayrollFileBank,
  type RiskLevel,
} from './finance.models';

/** Etiquetas y tonos de presentación del contexto Finanzas (sin reglas de negocio). */

export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  pending: 'Pendiente',
  partial: 'Abonado',
  paid: 'Pagado',
  overdue: 'Vencido',
  cancelled: 'Anulado',
};

export const CHARGE_STATUS_TONES: Record<ChargeStatus, BadgeTone> = {
  pending: 'warning',
  partial: 'info',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'neutral',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  applied: 'Aplicado',
  reversed: 'Anulado',
  pending: 'Pendiente',
};

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, BadgeTone> = {
  applied: 'success',
  reversed: 'neutral',
  pending: 'warning',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia bancaria',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  breb: 'Bre-B',
  transferencia_ext: 'Transferencia otros bancos',
  tarjeta: 'Tarjeta débito/crédito',
  pse: 'PSE',
  cheque: 'Cheque',
  datafono: 'Datáfono',
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Bajo',
};

export const RISK_HINTS: Record<RiskLevel, string> = {
  critico: 'Más de 90 días',
  alto: '61 a 90 días',
  medio: '31 a 60 días',
  bajo: 'Hasta 30 días',
};

export const RISK_TONES: Record<RiskLevel, BadgeTone> = {
  critico: 'danger',
  alto: 'warning',
  medio: 'info',
  bajo: 'success',
};

export const CATEGORY_LABELS: Record<ConceptCategory, string> = {
  matricula: 'Matrícula',
  pension: 'Pensión',
  mensualidad: 'Mensualidad',
  servicios: 'Servicios',
  materiales: 'Materiales',
  transporte: 'Transporte',
  alimentacion: 'Alimentación',
  certificado: 'Certificado',
  recargo: 'Recargo',
  inscripcion: 'Inscripción',
  otro: 'Otro',
};

export const COLLECTION_BANK_LABELS: Record<CollectionFileBank, string> = {
  asobancaria: 'Asobancaria 2001',
  bancolombia_pab: 'Bancolombia Recaudo PAB',
};

export const PAYROLL_BANK_LABELS: Record<PayrollFileBank, string> = {
  bancolombia: 'Bancolombia',
  davivienda: 'Davivienda',
  bogota: 'Banco de Bogotá',
};

const options = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({ value, label: labels[value] })) as SelectOption<T>[];

export const CHARGE_STATUS_OPTIONS = options(CHARGE_STATUSES, CHARGE_STATUS_LABELS);
export const PAYMENT_STATUS_OPTIONS = options(PAYMENT_STATUSES, PAYMENT_STATUS_LABELS);
export const PAYMENT_METHOD_OPTIONS = options(PAYMENT_METHODS, PAYMENT_METHOD_LABELS);
export const RISK_OPTIONS = options(RISK_LEVELS, RISK_LABELS);
export const CATEGORY_OPTIONS = options(CONCEPT_CATEGORIES, CATEGORY_LABELS);
export const COLLECTION_BANK_OPTIONS = options(COLLECTION_FILE_BANKS, COLLECTION_BANK_LABELS);
export const PAYROLL_BANK_OPTIONS = options(PAYROLL_FILE_BANKS, PAYROLL_BANK_LABELS);

export function categoryLabel(category: string | null | undefined): string {
  if (!category) return '—';
  return CATEGORY_LABELS[category as ConceptCategory] ?? category;
}

export function methodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha local `AAAA-MM-DD`. */
export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Mes local `AAAA-MM`. */
export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** `2026-03` → `marzo 2026`. */
export function monthLabel(period: string | null | undefined): string {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return period ?? '—';
  const [y, m] = period.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** Fecha `AAAA-MM-DD` (sin zona) → `dd/mm/aaaa` sin desfase horario. */
export function formatDay(value: string | null | undefined): string {
  if (!value) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

/** Mensaje en español de un error de la API (los interceptores ya lo traducen a `ApiError`). */
export function errorMessage(
  error: unknown,
  fallback = 'No se pudo completar la operación.',
): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string' && msg) return msg;
  }
  return fallback;
}
