/**
 * Convención de paginación para listados (servidor). Los servicios de
 * `features/<ctx>/data-access` deben mapear la respuesta de la API a este tipo.
 */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
  search?: string;
}

export function emptyPage<T>(pageSize = 20): Page<T> {
  return { items: [], total: 0, page: 1, pageSize };
}
