import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient, Page } from '../../../core';
import { asPage, PAGE_HANDLES_ERRORS } from './hr-http';
import type { ApiPage, HrRequestLeaveRequest, Leave, LeaveFilters } from './hr.models';

/** Bandeja de permisos de RR. HH. (`/api/hr/leaves`, roles admin/hr). */
@Injectable({ providedIn: 'root' })
export class LeavesService {
  private readonly api = inject(ApiClient);

  list(filters: LeaveFilters): Observable<Page<Leave>> {
    return asPage(
      this.api.get<ApiPage<Leave>>('hr/leaves', {
        params: {
          status: filters.status,
          employeeId: filters.employeeId,
          from: filters.from,
          to: filters.to,
          page: filters.page,
          limit: filters.pageSize,
        },
      }),
    );
  }

  create(dto: HrRequestLeaveRequest): Observable<Leave> {
    return this.api.post<Leave>('hr/leaves', dto, PAGE_HANDLES_ERRORS);
  }

  approve(id: number, note?: string): Observable<Leave> {
    return this.api.post<Leave>(
      `hr/leaves/${id}/approve`,
      note ? { note } : {},
      PAGE_HANDLES_ERRORS,
    );
  }

  reject(id: number, reason: string): Observable<Leave> {
    return this.api.post<Leave>(`hr/leaves/${id}/reject`, { reason }, PAGE_HANDLES_ERRORS);
  }

  cancel(id: number): Observable<Leave> {
    return this.api.post<Leave>(`hr/leaves/${id}/cancel`, {}, PAGE_HANDLES_ERRORS);
  }
}
