import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient, Page, withContext } from '../../../core';
import {
  compact,
  CreateIncidentInput,
  IncidentDetailView,
  IncidentFilters,
  IncidentKpis,
  IncidentView,
  ReportIncidentInput,
  ReviewAction,
} from './students.models';
import { ApiPaginated, toPage } from './students.service';

/** Bandeja de incidencias del personal y reporte desde el portal. */
@Injectable({ providedIn: 'root' })
export class IncidentsService {
  private readonly api = inject(ApiClient);

  list(filters: IncidentFilters): Observable<Page<IncidentDetailView>> {
    return this.api
      .get<ApiPaginated<IncidentDetailView>>('incidents', {
        params: {
          status: filters.status,
          type: filters.type,
          studentId: filters.studentId,
          page: filters.page,
          limit: filters.pageSize,
        },
      })
      .pipe(map(toPage));
  }

  kpis(): Observable<IncidentKpis> {
    return this.api.get<IncidentKpis>('incidents/kpis');
  }

  get(id: number): Observable<IncidentDetailView> {
    return this.api.get<IncidentDetailView>(`incidents/${id}`);
  }

  create(input: CreateIncidentInput): Observable<IncidentDetailView> {
    return this.api.post<IncidentDetailView>('incidents', compact(input), {
      context: withContext({ skipErrorToast: true }),
    });
  }

  review(id: number, action: ReviewAction, notes?: string): Observable<IncidentDetailView> {
    return this.api.post<IncidentDetailView>(`incidents/${id}/review`, compact({ action, notes }), {
      context: withContext({ skipErrorToast: true }),
    });
  }

  // ------------------------------------------------------------ Portal

  forStudent(studentId: number, page: number, pageSize: number): Observable<Page<IncidentView>> {
    return this.api
      .get<ApiPaginated<IncidentView>>(`portal/students/${studentId}/incidents`, {
        params: { page, limit: pageSize },
      })
      .pipe(map(toPage));
  }

  report(studentId: number, input: ReportIncidentInput): Observable<IncidentView> {
    return this.api.post<IncidentView>(`portal/students/${studentId}/incidents`, compact(input), {
      context: withContext({ skipErrorToast: true }),
    });
  }
}
