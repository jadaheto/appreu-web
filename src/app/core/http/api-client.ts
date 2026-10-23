import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';

export type QueryValue = string | number | boolean | Date | null | undefined;
export type QueryParams = Record<string, QueryValue | readonly QueryValue[]>;

export interface RequestOptions {
  params?: QueryParams;
  headers?: Record<string, string>;
  context?: HttpContext;
}

/** `true` si la URL apunta a la API configurada (los interceptores solo actúan sobre ella). */
export function isApiUrl(url: string, apiUrl: string): boolean {
  return url.startsWith(apiUrl);
}

/** Construye `HttpParams` ignorando `null`/`undefined`/'' y serializando fechas en ISO. */
export function toHttpParams(params: QueryParams = {}): HttpParams {
  let result = new HttpParams();
  const serialize = (v: QueryValue): string | null => {
    if (v === null || v === undefined || v === '') return null;
    return v instanceof Date ? v.toISOString() : String(v);
  };
  for (const [key, value] of Object.entries(params)) {
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      const s = serialize(v as QueryValue);
      if (s !== null) result = result.append(key, s);
    }
  }
  return result;
}

/**
 * Cliente HTTP de la API. Recibe rutas relativas (`'auth/me'` o `'/auth/me'`)
 * y les antepone `apiUrl`. Las cabeceras `X-Tenant`/`Authorization` y la
 * traducción de errores las agregan los interceptores.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  url(path: string): string {
    if (/^https?:\/\//.test(path)) return path;
    const base = this.config.apiUrl.replace(/\/+$/, '');
    return `${base}/${path.replace(/^\/+/, '')}`;
  }

  get<T>(path: string, options: RequestOptions = {}): Observable<T> {
    return this.http.get<T>(this.url(path), this.build(options));
  }

  post<T>(path: string, body?: unknown, options: RequestOptions = {}): Observable<T> {
    return this.http.post<T>(this.url(path), body ?? null, this.build(options));
  }

  put<T>(path: string, body?: unknown, options: RequestOptions = {}): Observable<T> {
    return this.http.put<T>(this.url(path), body ?? null, this.build(options));
  }

  patch<T>(path: string, body?: unknown, options: RequestOptions = {}): Observable<T> {
    return this.http.patch<T>(this.url(path), body ?? null, this.build(options));
  }

  delete<T = void>(path: string, options: RequestOptions = {}): Observable<T> {
    return this.http.delete<T>(this.url(path), this.build(options));
  }

  /** Descarga binaria (PDF, XML, Excel…). */
  download(path: string, options: RequestOptions = {}): Observable<Blob> {
    return this.http.get(this.url(path), { ...this.build(options), responseType: 'blob' });
  }

  private build(options: RequestOptions) {
    return {
      params: toHttpParams(options.params),
      headers: new HttpHeaders(options.headers ?? {}),
      context: options.context,
    };
  }
}
