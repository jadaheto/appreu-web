import { map, Observable, OperatorFunction } from 'rxjs';
import { Page, withContext } from '../../../core';
import type { ApiPage } from './hr.models';

/** Las mutaciones manejan sus errores en la página (toast/alerta con el mensaje de la API). */
export const PAGE_HANDLES_ERRORS = { context: withContext({ skipErrorToast: true }) } as const;

/** Convierte `Paginated<T>` de la API (`limit`) en `Page<T>` del frontend (`pageSize`). */
export function toPage<T>(): OperatorFunction<ApiPage<T>, Page<T>> {
  return map((res) => ({
    items: res.items ?? [],
    total: res.total ?? 0,
    page: res.page ?? 1,
    pageSize: res.limit ?? 20,
  }));
}

export function asPage<T>(source: Observable<ApiPage<T>>): Observable<Page<T>> {
  return source.pipe(toPage<T>());
}
