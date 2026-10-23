import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, Injector, signal, untracked } from '@angular/core';
import { catchError, of, Subscription } from 'rxjs';
import { APP_CONFIG } from '../config/app-config';
import { ApiClient } from '../http/api-client';
import { withContext } from '../http/http-context';
import { TenantService } from '../tenant/tenant.service';

/** Identidad visual del colegio (settings `color_primary`, `color_header_bg`, `color_header_bar`, `logo`, `school_name`). */
export interface Branding {
  schoolName?: string | null;
  logoUrl?: string | null;
  logoSize?: number | null;
  colorPrimary?: string | null;
  colorHeaderBg?: string | null;
  colorHeaderBar?: string | null;
  academicYear?: number | null;
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Marca del colegio: la carga de `GET /api/institution/branding` (público, solo
 * requiere `X-Tenant`) cada vez que cambia el tenant y la aplica sobre las CSS
 * vars globales. La pantalla de configuración llama a `apply()` tras guardar.
 */
@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly document = inject(DOCUMENT);
  private readonly config = inject(APP_CONFIG);
  private readonly api = inject(ApiClient);
  private readonly tenant = inject(TenantService);
  private readonly injector = inject(Injector);
  private request: Subscription | null = null;
  private watching = false;

  readonly schoolName = signal<string>(this.config.appName);
  readonly logoUrl = signal<string | null>(null);
  readonly logoSize = signal<number>(40);
  readonly academicYear = signal<number>(new Date().getFullYear());
  readonly loaded = signal(false);

  /** Empieza a seguir el tenant activo (se llama una vez al arrancar la app). */
  init(): void {
    if (this.watching) return;
    this.watching = true;
    effect(
      () => {
        const slug = this.tenant.slug();
        untracked(() => (slug ? this.load() : this.reset()));
      },
      { injector: this.injector },
    );
  }

  /** Recarga la marca del tenant activo; si falla se conserva la marca por defecto. */
  load(): void {
    this.request?.unsubscribe();
    this.request = this.api
      .get<Branding>('institution/branding', {
        context: withContext({ skipAuth: true, skipErrorToast: true, skipLogoutOn401: true }),
      })
      .pipe(catchError(() => of(null)))
      .subscribe((branding) => {
        this.reset();
        if (branding) {
          this.apply(branding);
          this.loaded.set(true);
        }
      });
  }

  apply(branding: Branding): void {
    const style = this.document.documentElement.style;
    // Variables `--brand-*`: los tokens de `styles/_tokens.scss` las combinan con el tema
    // (en oscuro no se usa el fondo de cabecera de la marca).
    this.setVar(style, '--brand-primary', branding.colorPrimary);
    this.setVar(style, '--brand-header-bg', branding.colorHeaderBg);
    this.setVar(style, '--brand-header-bar', branding.colorHeaderBar);
    if (branding.schoolName) this.schoolName.set(branding.schoolName);
    if (branding.logoUrl !== undefined) this.logoUrl.set(branding.logoUrl || null);
    if (branding.logoSize) this.logoSize.set(Math.min(80, Math.max(24, branding.logoSize)));
    if (branding.academicYear) this.academicYear.set(branding.academicYear);
  }

  reset(): void {
    const style = this.document.documentElement.style;
    ['--brand-primary', '--brand-header-bg', '--brand-header-bar'].forEach((v) =>
      style.removeProperty(v),
    );
    this.schoolName.set(this.config.appName);
    this.logoUrl.set(null);
    this.logoSize.set(40);
    this.academicYear.set(new Date().getFullYear());
    this.loaded.set(false);
  }

  private setVar(style: CSSStyleDeclaration, name: string, value: string | null | undefined): void {
    if (value && HEX.test(value)) style.setProperty(name, value);
  }
}
