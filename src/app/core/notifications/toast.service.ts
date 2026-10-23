import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  title?: string;
  /** Milisegundos antes de cerrarse; 0 = permanente. */
  duration: number;
}

export interface ToastOptions {
  title?: string;
  duration?: number;
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 6000,
};
const MAX_TOASTS = 5;

/** Notificaciones efímeras (equivalente a `showToast` del legacy). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(type: ToastType, message: string, options: ToastOptions = {}): number {
    const id = this.nextId++;
    const duration = options.duration ?? DEFAULT_DURATION[type];
    const toast: Toast = { id, type, message, title: options.title, duration };
    this._toasts.update((list) => {
      const next = [...list, toast];
      const overflow = next.slice(0, Math.max(0, next.length - MAX_TOASTS));
      overflow.forEach((t) => this.clearTimer(t.id));
      return next.slice(-MAX_TOASTS);
    });
    if (duration > 0)
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), duration),
      );
    return id;
  }

  success(message: string, options?: ToastOptions): number {
    return this.show('success', message, options);
  }
  error(message: string, options?: ToastOptions): number {
    return this.show('error', message, options);
  }
  warning(message: string, options?: ToastOptions): number {
    return this.show('warning', message, options);
  }
  info(message: string, options?: ToastOptions): number {
    return this.show('info', message, options);
  }

  dismiss(id: number): void {
    this.clearTimer(id);
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    this._toasts.set([]);
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
  }
}
