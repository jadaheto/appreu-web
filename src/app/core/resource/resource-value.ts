import type { Resource } from '@angular/core';

/**
 * Valor de un `resource`/`rxResource`, o `fallback` (por defecto `undefined`)
 * mientras carga o si falló. Desde Angular 20 `value()` lanza
 * `ResourceValueError` cuando el recurso está en error: leerlo directamente en
 * una plantilla o un `computed` rompe el render ante un 4xx/5xx.
 */
export function resourceValue<T>(resource: Resource<T>): T | undefined;
export function resourceValue<T, F>(resource: Resource<T>, fallback: F): NonNullable<T> | F;
export function resourceValue<T, F>(resource: Resource<T>, fallback?: F): T | F | undefined {
  return resource.hasValue() ? (resource.value() ?? fallback) : fallback;
}
