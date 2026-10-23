import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` para acciones destructivas (eliminar, anular…). */
  tone?: 'primary' | 'danger';
}

export interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

/**
 * Diálogo de confirmación global (reemplaza `confirm()` del navegador).
 * `App` renderiza el diálogo a partir de `state`.
 *
 * ```ts
 * if (await confirm.ask({ title: '¿Eliminar usuario?', tone: 'danger' })) { ... }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly _state = signal<ConfirmState | null>(null);
  readonly state = this._state.asReadonly();

  ask(options: ConfirmOptions): Promise<boolean> {
    this._state()?.resolve(false);
    return new Promise<boolean>((resolve) => this._state.set({ ...options, resolve }));
  }

  respond(value: boolean): void {
    const current = this._state();
    this._state.set(null);
    current?.resolve(value);
  }
}
