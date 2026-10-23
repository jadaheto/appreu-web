export const ACCOUNTING_BASE = '/admin/contabilidad';

import type { BadgeTone, SelectOption } from '../../../shared/ui';
import {
  ACCOUNT_TYPES,
  AccountType,
  DOCUMENT_TYPES,
  DocumentType,
  JournalEntryStatus,
  VOUCHER_TYPES,
  VoucherType,
} from './accounting.models';

/** Etiquetas de presentación (solo texto; los cálculos los hace la API). */
export const VOUCHER_TYPE_LABELS: Record<VoucherType, string> = {
  RC: 'Recibo de Caja',
  CE: 'Comprobante de Egreso',
  FC: 'Factura de Compra',
  FV: 'Factura de Venta',
  NC: 'Nota Crédito',
  ND: 'Nota Débito',
  NI: 'Nota Interna',
  SALA: 'Nómina',
};

export const VOUCHER_TYPE_OPTIONS: SelectOption<VoucherType>[] = VOUCHER_TYPES.map((t) => ({
  value: t,
  label: `${t} — ${VOUCHER_TYPE_LABELS[t]}`,
}));

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  activo: 'Activo',
  pasivo: 'Pasivo',
  patrimonio: 'Patrimonio',
  ingreso: 'Ingreso',
  gasto: 'Gasto',
  costo: 'Costo',
  orden: 'Orden',
};

export const ACCOUNT_TYPE_TONES: Record<AccountType, BadgeTone> = {
  activo: 'primary',
  pasivo: 'warning',
  patrimonio: 'info',
  ingreso: 'success',
  gasto: 'danger',
  costo: 'warning',
  orden: 'neutral',
};

export const ACCOUNT_TYPE_OPTIONS: SelectOption<AccountType>[] = ACCOUNT_TYPES.map((t) => ({
  value: t,
  label: ACCOUNT_TYPE_LABELS[t],
}));

export const DOCUMENT_TYPE_OPTIONS: SelectOption<DocumentType>[] = DOCUMENT_TYPES.map((t) => ({
  value: t,
  label:
    t === 'CC'
      ? 'CC — Cédula'
      : t === 'CE'
        ? 'CE — Cédula de extranjería'
        : t === 'TI'
          ? 'TI — Tarjeta de identidad'
          : t,
}));

export const ENTRY_STATUS_LABELS: Record<JournalEntryStatus, string> = {
  draft: 'Borrador',
  posted: 'Contabilizado',
  voided: 'Anulado',
};

export const ENTRY_STATUS_TONES: Record<JournalEntryStatus, BadgeTone> = {
  draft: 'warning',
  posted: 'success',
  voided: 'danger',
};

export const ENTRY_STATUS_OPTIONS: SelectOption<JournalEntryStatus>[] = (
  ['draft', 'posted', 'voided'] as const
).map((s) => ({ value: s, label: ENTRY_STATUS_LABELS[s] }));

/** Fecha local `YYYY-MM-DD`. */
export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Primer y último día del mes de `date` (`YYYY-MM-DD`). */
export function monthRange(date = new Date()): { from: string; to: string } {
  return {
    from: isoDate(new Date(date.getFullYear(), date.getMonth(), 1)),
    to: isoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

/** Mes actual `YYYY-MM`. */
export function currentMonth(date = new Date()): string {
  return isoDate(date).slice(0, 7);
}

/** Documento visible de un asiento (`RC-000012` o "Borrador #5"). */
export function entryDocument(entry: {
  displayNumber: string | null;
  type: string;
  id: number;
}): string {
  return entry.displayNumber ?? `${entry.type} · Borrador #${entry.id}`;
}
