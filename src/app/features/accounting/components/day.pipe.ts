import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formatea una fecha de calendario `YYYY-MM-DD` como `dd/mm/aaaa` sin pasar por
 * `Date` (evita el corrimiento de un día por zona horaria que produce
 * `new Date('2026-10-01')` en UTC-5). Candidato a `shared/ui`.
 */
export function formatDay(value: string | null | undefined): string {
  if (!value) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
}

@Pipe({ name: 'day' })
export class DayPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatDay(value);
  }
}
