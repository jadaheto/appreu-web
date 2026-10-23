import { Injectable } from '@angular/core';

/**
 * Envoltorio seguro sobre `sessionStorage`/`localStorage`: nunca lanza
 * (modo privado, almacenamiento bloqueado) y serializa en JSON.
 */
export class SafeStorage {
  constructor(private readonly resolve: () => Storage | null) {}

  get<T>(key: string): T | null {
    try {
      const raw = this.resolve()?.getItem(key);
      return raw == null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  }

  set(key: string, value: unknown): void {
    try {
      this.resolve()?.setItem(key, JSON.stringify(value));
    } catch {
      /* almacenamiento no disponible: se ignora */
    }
  }

  remove(key: string): void {
    try {
      this.resolve()?.removeItem(key);
    } catch {
      /* ignorado */
    }
  }
}

const safe =
  (fn: () => Storage): (() => Storage | null) =>
  () => {
    try {
      return typeof window === 'undefined' ? null : fn();
    } catch {
      return null;
    }
  };

/** Almacenamiento por pestaña (tenant y sesión). */
@Injectable({ providedIn: 'root' })
export class SessionStorageService extends SafeStorage {
  constructor() {
    super(safe(() => window.sessionStorage));
  }
}

/** Almacenamiento persistente (preferencias de UI como el tema). */
@Injectable({ providedIn: 'root' })
export class LocalStorageService extends SafeStorage {
  constructor() {
    super(safe(() => window.localStorage));
  }
}
