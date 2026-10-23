import { Pipe, PipeTransform } from '@angular/core';

const FORMATS = {
  short: { day: '2-digit', month: '2-digit', year: 'numeric' },
  datetime: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateEsFormat = keyof typeof FORMATS;

/** Formatea fechas en español de Colombia (`16/10/2026`, `jueves, 16 de octubre de 2026`). */
export function formatDateEs(
  value: Date | string | number | null | undefined,
  format: DateEsFormat = 'short',
): string {
  if (value === null || value === undefined || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', FORMATS[format]).format(date);
}

@Pipe({ name: 'dateEs' })
export class DateEsPipe implements PipeTransform {
  transform(
    value: Date | string | number | null | undefined,
    format: DateEsFormat = 'short',
  ): string {
    return formatDateEs(value, format);
  }
}
