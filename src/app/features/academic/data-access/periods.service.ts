import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core';
import type { AcademicPeriod, GenerateReportCardsResult, PeriodInput } from './academic.models';

/** Calendario académico (`/api/academic/periods`). */
@Injectable({ providedIn: 'root' })
export class PeriodsService {
  private readonly api = inject(ApiClient);

  /** Cualquier usuario autenticado puede listar los períodos. */
  list(year?: number | null): Observable<AcademicPeriod[]> {
    return this.api.get<AcademicPeriod[]>('academic/periods', { params: { year } });
  }
  create(dto: PeriodInput): Observable<AcademicPeriod> {
    return this.api.post<AcademicPeriod>('academic/periods', dto);
  }
  update(id: number, dto: Omit<PeriodInput, 'academicYear'>): Observable<AcademicPeriod> {
    return this.api.patch<AcademicPeriod>(`academic/periods/${id}`, dto);
  }
  remove(id: number): Observable<void> {
    return this.api.delete(`academic/periods/${id}`);
  }
  close(id: number): Observable<AcademicPeriod> {
    return this.api.post<AcademicPeriod>(`academic/periods/${id}/close`);
  }
  reopen(id: number): Observable<AcademicPeriod> {
    return this.api.post<AcademicPeriod>(`academic/periods/${id}/reopen`);
  }
  /** Genera (o regenera) los boletines de un período cerrado. */
  generateReportCards(id: number): Observable<GenerateReportCardsResult> {
    return this.api.post<GenerateReportCardsResult>(`academic/periods/${id}/report-cards`);
  }
}
