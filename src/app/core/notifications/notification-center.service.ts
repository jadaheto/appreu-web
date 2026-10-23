import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { catchError, EMPTY, Observable, tap } from 'rxjs';
import { ApiClient } from '../http/api-client';
import { withContext } from '../http/http-context';

export type InboxNotificationType = 'info' | 'success' | 'warning' | 'error';

/** Notificación interna del usuario (`NotificationView` de la API). */
export interface InboxNotification {
  id: number;
  title: string;
  message: string;
  type: InboxNotificationType;
  isRead: boolean;
  createdAt: string | null;
}

interface MyNotificationsResponse {
  items: InboxNotification[];
  total: number;
  page: number;
  limit: number;
  unread: number;
}

/** Cada cuánto se consulta la campana mientras hay un portal abierto. */
export const NOTIFICATIONS_POLL_MS = 60_000;

/**
 * Campana de notificaciones: `GET /api/notifications` (últimas + total sin leer),
 * `PATCH /api/notifications/:id/read` y `PATCH /api/notifications/read-all`.
 * El `PortalShell` llama a `start()` al montarse y la consulta se detiene sola
 * cuando el shell se destruye (cierre de sesión).
 */
@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private readonly api = inject(ApiClient);
  private readonly quiet = withContext({ skipErrorToast: true });
  private timer: ReturnType<typeof setInterval> | null = null;

  private readonly _items = signal<InboxNotification[]>([]);
  private readonly _unread = signal(0);
  private readonly _loading = signal(false);

  readonly items = this._items.asReadonly();
  readonly unread = this._unread.asReadonly();
  readonly loading = this._loading.asReadonly();

  /** Carga inmediata + consulta periódica, ligada al ciclo de vida de quien la llama. */
  start(destroyRef: DestroyRef, intervalMs = NOTIFICATIONS_POLL_MS): void {
    this.stop();
    this.refresh();
    this.timer = setInterval(() => this.refresh(), intervalMs);
    destroyRef.onDestroy(() => this.clear());
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  refresh(limit = 10): void {
    this._loading.set(true);
    this.api
      .get<MyNotificationsResponse>('notifications', { params: { limit }, context: this.quiet })
      .pipe(catchError(() => EMPTY))
      .subscribe({
        next: (res) => {
          this._items.set(res?.items ?? []);
          this._unread.set(res?.unread ?? 0);
        },
        complete: () => this._loading.set(false),
      });
  }

  markRead(id: number): Observable<unknown> {
    const target = this._items().find((n) => n.id === id);
    if (!target || target.isRead) return EMPTY;
    return this.api.patch(`notifications/${id}/read`, undefined, { context: this.quiet }).pipe(
      tap(() => {
        this._items.update((list) => list.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        this._unread.update((u) => Math.max(0, u - 1));
      }),
    );
  }

  markAllRead(): Observable<unknown> {
    return this.api.patch('notifications/read-all', undefined, { context: this.quiet }).pipe(
      tap(() => {
        this._items.update((list) => list.map((n) => ({ ...n, isRead: true })));
        this._unread.set(0);
      }),
    );
  }

  /** Limpia el estado al cerrar sesión. */
  clear(): void {
    this.stop();
    this._items.set([]);
    this._unread.set(0);
  }
}
