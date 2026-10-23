import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient, Page } from '../../../core';
import {
  AccessLogQuery,
  AccessLogRecord,
  ApiPaginated,
  CreateUserRequest,
  ManagedUser,
  toPage,
  UpdateUserRequest,
  UserQuery,
  UserStats,
  UserWithTemporaryPassword,
} from './administration.models';

/** Administración de usuarios (`/api/users`) y registro de accesos (`/api/audit/access-log`). */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiClient);

  list(query: UserQuery): Observable<Page<ManagedUser>> {
    return this.api
      .get<ApiPaginated<ManagedUser>>('users', {
        params: {
          page: query.page ?? 1,
          limit: query.pageSize ?? 20,
          search: query.search,
          role: query.role,
          active: query.active,
        },
      })
      .pipe(map(toPage));
  }

  stats(): Observable<UserStats> {
    return this.api.get<UserStats>('users/stats');
  }

  get(id: number): Observable<ManagedUser> {
    return this.api.get<ManagedUser>(`users/${id}`);
  }

  create(dto: CreateUserRequest): Observable<UserWithTemporaryPassword> {
    return this.api.post<UserWithTemporaryPassword>('users', dto);
  }

  update(id: number, dto: UpdateUserRequest): Observable<ManagedUser> {
    return this.api.patch<ManagedUser>(`users/${id}`, dto);
  }

  setActive(id: number, active: boolean): Observable<ManagedUser> {
    return this.api.patch<ManagedUser>(`users/${id}/status`, { active });
  }

  resetPassword(id: number): Observable<UserWithTemporaryPassword> {
    return this.api.post<UserWithTemporaryPassword>(`users/${id}/password-reset`);
  }

  accessLog(query: AccessLogQuery): Observable<Page<AccessLogRecord>> {
    return this.api
      .get<ApiPaginated<AccessLogRecord>>('audit/access-log', {
        params: {
          page: query.page ?? 1,
          limit: query.pageSize ?? 20,
          search: query.search,
          userId: query.userId,
          module: query.module,
          allowed: query.allowed,
          from: query.from,
          to: query.to,
        },
      })
      .pipe(map(toPage));
  }
}
