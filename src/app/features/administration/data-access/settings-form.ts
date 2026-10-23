import { AbstractControl, FormControl, ValidatorFn, Validators } from '@angular/forms';
import { SECRET_MASK, SettingField, SettingValue } from './administration.models';

/**
 * Construcción del formulario dinámico de una sección de configuración a partir
 * de los metadatos tipados de `GET /api/institution/settings`. La validación
 * definitiva la hace la API; aquí solo se anticipan los errores evidentes.
 */

const URL_PATTERN = /^https?:\/\/\S+$/i;
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** Un secreto que conserva la máscara no se valida (no se reenvía). */
function unlessMasked(validator: ValidatorFn): ValidatorFn {
  return (control: AbstractControl) => (control.value === SECRET_MASK ? null : validator(control));
}

export function settingValidators(field: SettingField): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  switch (field.type) {
    case 'integer':
      validators.push(Validators.pattern(/^-?\d+$/));
      break;
    case 'email':
      validators.push(Validators.email);
      break;
    case 'url':
      validators.push(Validators.pattern(URL_PATTERN));
      break;
    case 'hex-color':
      validators.push(Validators.pattern(HEX_PATTERN));
      break;
  }
  if (field.min !== null) validators.push(Validators.min(field.min));
  if (field.max !== null) validators.push(Validators.max(field.max));
  if (['text', 'email', 'url'].includes(field.type))
    validators.push(Validators.maxLength(field.maxLength ?? 255));
  return field.secret ? validators.map(unlessMasked) : validators;
}

/** Valor inicial del control según el tipo (los secretos traen la máscara o `null`). */
export function initialControlValue(field: SettingField, value: SettingValue | undefined): unknown {
  switch (field.type) {
    case 'boolean':
      return value === true || value === '1' || value === 'true';
    case 'enum-set':
      return Array.isArray(value) ? [...value] : [];
    case 'integer':
    case 'decimal':
      return typeof value === 'number'
        ? value
        : value === null || value === undefined
          ? null
          : Number(value);
    default:
      return value ?? (field.secret ? '' : null);
  }
}

export function buildSettingControl(
  field: SettingField,
  value: SettingValue | undefined,
): FormControl {
  return new FormControl(
    { value: initialControlValue(field, value), disabled: field.readOnly },
    { validators: settingValidators(field) },
  );
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
  return (a ?? null) === (b ?? null);
}

/**
 * Valores a enviar en `PUT /api/institution/settings/:section`: solo los campos
 * modificados. Un secreto que conserva `••••••••` no se reenvía; vaciarlo lo borra (`null`).
 */
export function changedSettingValues(
  fields: readonly SettingField[],
  current: Record<string, unknown>,
  initial: Record<string, SettingValue>,
): Record<string, SettingValue> {
  const changes: Record<string, SettingValue> = {};
  for (const field of fields) {
    if (field.readOnly || !(field.key in current)) continue;
    let value = current[field.key] as SettingValue | undefined;
    if (field.secret && value === SECRET_MASK) continue;
    if (typeof value === 'string') value = value.trim();
    if (value === '' || value === undefined) value = null;
    const before = initialControlValue(field, initial[field.key]);
    const normalizedBefore = before === '' ? null : before;
    if (!sameValue(value, normalizedBefore)) changes[field.key] = value;
  }
  return changes;
}

const OPTION_LABELS: Record<string, string> = {
  tls: 'TLS',
  ssl: 'SSL',
  ahorros: 'Ahorros',
  corriente: 'Corriente',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  breb: 'Llaves Bre-B',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  datafono: 'Datáfono',
};

export function optionLabel(option: string): string {
  return (
    OPTION_LABELS[option] ?? option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ')
  );
}

export function settingErrors(field: SettingField): Record<string, string> {
  return {
    pattern:
      field.type === 'url'
        ? 'Debe ser una URL válida (https://…).'
        : field.type === 'hex-color'
          ? 'Usa un color hexadecimal (#RRGGBB).'
          : field.type === 'integer'
            ? 'Debe ser un número entero.'
            : 'El formato no es válido.',
  };
}
