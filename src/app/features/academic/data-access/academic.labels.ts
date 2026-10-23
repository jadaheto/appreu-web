import { saveBlob as saveBlobCore } from '../../../core/http/download';
import type { BadgeTone, SelectOption } from '../../../shared/ui';
import type {
  AttendanceStatus,
  EducationLevel,
  PerformanceLevel,
  PeriodStatus,
} from './academic.models';
import { ATTENDANCE_STATUSES, EDUCATION_LEVELS } from './academic.models';

/** Etiquetas y tonos de presentación del contexto académico (sin reglas de negocio). */

export const LEVEL_LABELS: Record<EducationLevel, string> = {
  preescolar: 'Preescolar',
  primaria: 'Primaria',
  secundaria: 'Secundaria',
  media: 'Media',
};

export const LEVEL_OPTIONS: SelectOption<EducationLevel>[] = EDUCATION_LEVELS.map((l) => ({
  value: l,
  label: LEVEL_LABELS[l],
}));

export function levelLabel(level: string | null | undefined): string {
  return level && level in LEVEL_LABELS ? LEVEL_LABELS[level as EducationLevel] : (level ?? '—');
}

export const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  open: 'Abierto',
  closed: 'Cerrado',
  bulletins_generated: 'Boletines listos',
};

export const PERIOD_STATUS_TONES: Record<PeriodStatus, BadgeTone> = {
  open: 'success',
  closed: 'neutral',
  bulletins_generated: 'primary',
};

export const PERFORMANCE_TONES: Record<PerformanceLevel, BadgeTone> = {
  superior: 'success',
  alto: 'info',
  basico: 'warning',
  bajo: 'danger',
};

/** Escala nacional de valoración (Decreto 1290), solo como leyenda informativa. */
export const PERFORMANCE_SCALE: { level: PerformanceLevel; label: string; range: string }[] = [
  { level: 'superior', label: 'Superior', range: '4.6 – 5.0' },
  { level: 'alto', label: 'Alto', range: '4.0 – 4.5' },
  { level: 'basico', label: 'Básico', range: '3.0 – 3.9' },
  { level: 'bajo', label: 'Bajo', range: '0.0 – 2.9' },
];

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: 'Presente',
  absent: 'Ausente',
  late: 'Tarde',
  excused: 'Excusado',
};

export const ATTENDANCE_TONES: Record<AttendanceStatus, BadgeTone> = {
  present: 'success',
  absent: 'danger',
  late: 'warning',
  excused: 'info',
};

export const ATTENDANCE_OPTIONS: SelectOption<AttendanceStatus>[] = ATTENDANCE_STATUSES.map(
  (s) => ({ value: s, label: ATTENDANCE_LABELS[s] }),
);

export const GENDER_LABELS: Record<string, string> = { M: 'Masculino', F: 'Femenino', O: 'Otro' };

/** Nota con un decimal (`4.5`) o guion. */
export function formatScore(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : value.toFixed(1);
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

/** `2026-03` → `marzo de 2026`. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return MONTHS[m - 1] ? `${MONTHS[m - 1]} de ${y}` : month;
}

/** Desplaza un mes `AAAA-MM`. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Fecha local `AAAA-MM-DD` (sin desfase UTC). */
export function todayIso(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** `2026-02-01` → `01 feb 2026` sin desfase de zona horaria. */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(y, m - 1, d));
}

/** Descarga un `Blob` con el nombre indicado (delegado en `core`). */
export function saveBlob(blob: Blob, fileName: string, doc: Document = document): void {
  saveBlobCore(blob, fileName, { doc });
}

/** Nombre de archivo ASCII seguro. */
export function safeFileName(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'documento'
  );
}

/** El interceptor ya mostró un toast para este error (red, 403, 429, 5xx). */
export function isAutoToasted(status: number): boolean {
  return status === 0 || status === 403 || status === 429 || status >= 500;
}

export function periodStatusLabel(status: string): string {
  return PERIOD_STATUS_LABELS[status as PeriodStatus] ?? status;
}
export function periodStatusTone(status: string): BadgeTone {
  return PERIOD_STATUS_TONES[status as PeriodStatus] ?? 'neutral';
}
export function attendanceLabel(status: string): string {
  return ATTENDANCE_LABELS[status as AttendanceStatus] ?? status;
}
export function attendanceTone(status: string): BadgeTone {
  return ATTENDANCE_TONES[status as AttendanceStatus] ?? 'neutral';
}
