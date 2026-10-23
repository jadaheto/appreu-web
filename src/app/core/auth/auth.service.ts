import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { ApiClient } from '../http/api-client';
import { withContext } from '../http/http-context';
import { APP_PATHS } from '../routing/app-paths';
import { TenantService } from '../tenant/tenant.service';
import type {
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  LogoutReason,
} from './auth.models';
import { parsePermissions } from './permissions';
import { PORTAL_HOME, type Role } from './roles';
import { SessionStore } from './session.store';

/** El `setTimeout` del navegador no admite más de ~24,8 días. */
const MAX_TIMEOUT = 2_147_483_647;

/**
 * Sesión del usuario con signals: usuario, rol, portal, expiración y módulos
 * permitidos (`GET /api/auth/permissions`; `null` = usar la matriz local).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly store = inject(SessionStore);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);

  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly _permissions = signal<ReadonlySet<string> | null>(null);
  private readonly _lastLogoutReason = signal<LogoutReason | null>(null);

  readonly user = this.store.user;
  readonly token = this.store.token;
  readonly isAuthenticated = computed(() => this.store.session() !== null);
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);
  readonly portal = computed(() => this.user()?.portal ?? null);
  readonly expiresAt = computed(() => this.store.session()?.expiresAt ?? null);
  readonly isSuperadmin = computed(() => this.role() === 'superadmin');
  /** Módulos accesibles según la API; `null` si aún no se cargaron o la API no los expone. */
  readonly permissions = this._permissions.asReadonly();
  readonly lastLogoutReason = this._lastLogoutReason.asReadonly();
  /** Ruta de inicio según el portal del usuario. */
  readonly homeUrl = computed(() => {
    const portal = this.portal();
    return portal ? PORTAL_HOME[portal] : `/${APP_PATHS.login}`;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  /** Restaura la sesión al arrancar y refresca usuario/permisos en segundo plano. */
  init(): void {
    const session = this.store.restore(this.tenant.slug());
    if (!session) return;
    this.scheduleExpiry(session.expiresAt);
    this.refreshUser().subscribe();
    this.loadPermissions().subscribe();
  }

  login(credentials: LoginRequest): Observable<AuthUser> {
    return this.api
      .post<LoginResponse>('auth/login', credentials, {
        context: withContext({ skipAuth: true, skipLogoutOn401: true, skipErrorToast: true }),
      })
      .pipe(
        map((res) => {
          const expiresAt = Date.now() + res.expiresIn * 1000;
          this.store.set({
            token: res.accessToken,
            expiresAt,
            tenant: this.tenant.slug(),
            user: res.user,
          });
          this._lastLogoutReason.set(null);
          this.scheduleExpiry(expiresAt);
          this.loadPermissions().subscribe();
          return res.user;
        }),
      );
  }

  /** Cierra la sesión local y navega al login. */
  logout(reason: LogoutReason = 'manual'): void {
    this.clearTimer();
    this.store.clear();
    this._permissions.set(null);
    this._lastLogoutReason.set(reason);
    const queryParams = reason === 'expired' ? { reason } : {};
    void this.router.navigate(['/', APP_PATHS.login], { queryParams });
  }

  refreshUser(): Observable<AuthUser | null> {
    return this.api
      .get<AuthUser>('auth/me', { context: withContext({ skipErrorToast: true }) })
      .pipe(
        tap((user) => this.store.updateUser(user)),
        catchError(() => of(null)),
      );
  }

  changePassword(dto: ChangePasswordRequest): Observable<void> {
    return this.api.patch<void>('auth/password', dto, {
      context: withContext({ skipLogoutOn401: true, skipErrorToast: true }),
    });
  }

  /** Carga los módulos accesibles. Si el endpoint falla, se usa la matriz local de roles. */
  loadPermissions(): Observable<ReadonlySet<string> | null> {
    return this.api
      .get<unknown>('auth/permissions', { context: withContext({ skipErrorToast: true }) })
      .pipe(
        map((body) => parsePermissions(body)),
        catchError(() => of(null)),
        tap((perms) => this._permissions.set(perms)),
      );
  }

  hasRole(...roles: readonly Role[]): boolean {
    const role = this.role();
    if (!role) return false;
    return role === 'superadmin' || roles.includes(role);
  }

  private scheduleExpiry(expiresAt: number): void {
    this.clearTimer();
    const ms = Math.min(Math.max(expiresAt - Date.now(), 0), MAX_TIMEOUT);
    this.expiryTimer = setTimeout(() => this.logout('expired'), ms);
  }

  private clearTimer(): void {
    if (this.expiryTimer !== null) clearTimeout(this.expiryTimer);
    this.expiryTimer = null;
  }
}
