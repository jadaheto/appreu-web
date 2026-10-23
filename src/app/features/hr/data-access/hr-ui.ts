import { ApiError } from '../../../core';

/** Mensaje en español de un error de la API (o genérico). */
export function apiMessage(
  error: unknown,
  fallback = 'No se pudo completar la operación.',
): string {
  if (error instanceof ApiError) return error.message;
  const cause = (error as { cause?: unknown } | null)?.cause;
  if (cause instanceof ApiError) return cause.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Fecha local `YYYY-MM-DD`. */
export function isoDate(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Mes local `YYYY-MM`. */
export function isoMonth(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** Interpreta `YYYY-MM-DD` como fecha local (evita el corrimiento por zona horaria de `new Date(iso)`). */
export function localDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
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

/** `16 de octubre de 2026` a partir de `YYYY-MM-DD`. */
export function longDate(value: string | null | undefined): string {
  const d = localDate(value);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

/** `dd/mm/aaaa` a partir de `YYYY-MM-DD`. */
export function shortDate(value: string | null | undefined): string {
  const d = localDate(value);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Elimina cadenas vacías (la API valida `IsOptional` solo con `undefined`/`null`). */
export function blankToNull(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}
