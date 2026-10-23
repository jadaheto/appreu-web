import { computed, inject, Injectable, signal } from '@angular/core';
import { APP_CONFIG } from '../config/app-config';
import { RESERVED_SEGMENTS } from '../routing/app-paths';
import { SessionStorageService } from '../storage/browser-storage';

/** Origen desde el que se resolvió el tenant. */
export type TenantSource = 'subdomain' | 'path' | 'storage' | 'default' | 'manual';

export interface TenantLocation {
  hostname: string;
  pathname: string;
}

const STORAGE_KEY = 'apreu.tenant';
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const NON_TENANT_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin', 'superadmin']);

/**
 * Resuelve y conserva el colegio (tenant) activo (ADR-0003).
 *
 * Prioridad: subdominio `<slug>.<baseDomain>` → primer segmento de la ruta
 * `/<slug>/...` → `sessionStorage` → `defaultTenant` del entorno.
 * El slug resuelto se guarda en `sessionStorage` y viaja en la cabecera `X-Tenant`.
 */
@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly config = inject(APP_CONFIG);
  private readonly storage = inject(SessionStorageService);

  private readonly _slug = signal<string | null>(null);
  private readonly _source = signal<TenantSource | null>(null);

  readonly slug = this._slug.asReadonly();
  readonly source = this._source.asReadonly();
  readonly hasTenant = computed(() => this._slug() !== null);
  /** Con subdominio el tenant es fijo: la UI no debe permitir cambiarlo. */
  readonly isLocked = computed(() => this._source() === 'subdomain');

  static isValidSlug(value: string | null | undefined): value is string {
    return !!value && SLUG_PATTERN.test(value);
  }

  static normalize(value: string): string {
    return value.trim().toLowerCase();
  }

  /** Resuelve el tenant a partir de la URL actual (se llama al arrancar la app). */
  resolve(location: TenantLocation = window.location): string | null {
    const fromHost = this.fromHostname(location.hostname);
    if (fromHost) return this.apply(fromHost, 'subdomain');

    const fromPath = this.fromPathname(location.pathname);
    if (fromPath) return this.apply(fromPath, 'path');

    const stored = this.storage.get<string>(STORAGE_KEY);
    if (TenantService.isValidSlug(stored)) return this.apply(stored, 'storage');

    const fallback = this.config.defaultTenant;
    if (TenantService.isValidSlug(fallback)) return this.apply(fallback, 'default');

    return null;
  }

  /** Fija el tenant manualmente (formulario de login o ruta `/<slug>/login`). */
  set(value: string, source: TenantSource = 'manual'): boolean {
    if (this.isLocked()) return false;
    const slug = TenantService.normalize(value);
    if (!TenantService.isValidSlug(slug) || RESERVED_SEGMENTS.has(slug)) return false;
    this.apply(slug, source);
    return true;
  }

  clear(): void {
    if (this.isLocked()) return;
    this._slug.set(null);
    this._source.set(null);
    this.storage.remove(STORAGE_KEY);
  }

  fromHostname(hostname: string): string | null {
    const host = hostname.toLowerCase();
    const base = this.config.baseDomain.toLowerCase();
    if (!base || !host.endsWith(`.${base}`)) return null;
    const label = host.slice(0, -(base.length + 1));
    if (label.includes('.') || NON_TENANT_SUBDOMAINS.has(label)) return null;
    return TenantService.isValidSlug(label) ? label : null;
  }

  fromPathname(pathname: string): string | null {
    const first = pathname.split('/').filter(Boolean)[0];
    if (!first) return null;
    const segment = decodeURIComponent(first).toLowerCase();
    if (RESERVED_SEGMENTS.has(segment)) return null;
    return TenantService.isValidSlug(segment) ? segment : null;
  }

  private apply(slug: string, source: TenantSource): string {
    this._slug.set(slug);
    this._source.set(source);
    this.storage.set(STORAGE_KEY, slug);
    return slug;
  }
}
