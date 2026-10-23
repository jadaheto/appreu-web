import { computed, inject, Injectable, signal } from '@angular/core';
import { SessionStorageService } from '../storage/browser-storage';
import type { AuthSession, AuthUser } from './auth.models';

const STORAGE_KEY = 'apreu.session';

/**
 * Estado de bajo nivel de la sesión (token + usuario) con persistencia en
 * `sessionStorage`. Lo usan los interceptores sin depender de `AuthService`.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly storage = inject(SessionStorageService);
  private readonly _session = signal<AuthSession | null>(null);

  readonly session = this._session.asReadonly();
  readonly token = computed(() => this._session()?.token ?? null);
  readonly user = computed(() => this._session()?.user ?? null);

  /** Recupera la sesión guardada; descarta la expirada o la de otro tenant. */
  restore(tenant: string | null, now = Date.now()): AuthSession | null {
    const saved = this.storage.get<AuthSession>(STORAGE_KEY);
    const valid =
      !!saved &&
      typeof saved.token === 'string' &&
      typeof saved.expiresAt === 'number' &&
      saved.expiresAt > now &&
      !!saved.user &&
      (tenant === null || saved.tenant === tenant);
    if (!valid) {
      this.clear();
      return null;
    }
    this._session.set(saved);
    return saved;
  }

  set(session: AuthSession): void {
    this._session.set(session);
    this.storage.set(STORAGE_KEY, session);
  }

  updateUser(user: AuthUser): void {
    const current = this._session();
    if (current) this.set({ ...current, user });
  }

  clear(): void {
    this._session.set(null);
    this.storage.remove(STORAGE_KEY);
  }
}
