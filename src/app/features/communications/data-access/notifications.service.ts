import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient, withContext } from '../../../core';
import {
  ApiPaginated,
  AppNotification,
  MyNotifications,
  NotificationsQuery,
  SendNotificationRequest,
  toPage,
} from './communications.models';

/**
 * Notificaciones internas (`/api/notifications`): cada usuario ve y marca las suyas;
 * admin, finanzas y RR. HH. pueden enviarlas. Pensado para la campana del shell.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(ApiClient);

  /** Sin toast: la campana no debe interrumpir si el sondeo falla. */
  mine(query: NotificationsQuery = {}): Observable<MyNotifications> {
    return this.api
      .get<ApiPaginated<AppNotification> & { unread: number }>('notifications', {
        params: {
          page: query.page ?? 1,
          limit: query.pageSize ?? 10,
          unreadOnly: query.unreadOnly || null,
        },
        context: withContext({ skipErrorToast: true }),
      })
      .pipe(map((res) => ({ ...toPage(res), unread: res.unread ?? 0 })));
  }

  markRead(id: number): Observable<AppNotification> {
    return this.api.patch<AppNotification>(`notifications/${id}/read`);
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.api.patch<{ updated: number }>('notifications/read-all');
  }

  send(request: SendNotificationRequest): Observable<{ created: number }> {
    const body: Record<string, unknown> = {
      userIds: request.userIds,
      title: request.title,
      message: request.message,
    };
    if (request.type) body['type'] = request.type;
    return this.api.post<{ created: number }>('notifications', body);
  }
}
