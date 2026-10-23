import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../../../core';
import type {
  GradeSheet,
  GradeSheetQuery,
  GroupReportCards,
  ReportCardDocument,
  ReportCardSummary,
  SaveGradeSheetRequest,
  StudentGrades,
} from './academic.models';

/** Planillas de notas, notas por estudiante y boletines. */
@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private readonly api = inject(ApiClient);

  gradeSheet(query: GradeSheetQuery): Observable<GradeSheet> {
    return this.api.get<GradeSheet>('academic/grade-sheets', { params: { ...query } });
  }
  /** Guardado masivo; la API calcula la definitiva (60/30/10). */
  saveGradeSheet(dto: SaveGradeSheetRequest): Observable<{ saved: number }> {
    return this.api.put<{ saved: number }>('academic/grade-sheets', dto);
  }
  studentGrades(studentId: number, periodId?: number | null): Observable<StudentGrades> {
    return this.api.get<StudentGrades>(`academic/students/${studentId}/grades`, {
      params: { periodId },
    });
  }

  reportCardHistory(studentId: number): Observable<ReportCardSummary[]> {
    return this.api.get<ReportCardSummary[]>(`academic/students/${studentId}/report-cards`);
  }
  reportCard(studentId: number, periodId: number): Observable<ReportCardDocument> {
    return this.api.get<ReportCardDocument>(`academic/report-cards/${studentId}/${periodId}`);
  }
  reportCardPdf(studentId: number, periodId: number): Observable<Blob> {
    return this.api.download(`academic/report-cards/${studentId}/${periodId}/pdf`);
  }
  groupReportCards(classroomId: number, periodId: number): Observable<GroupReportCards> {
    return this.api.get<GroupReportCards>(
      `academic/director/classrooms/${classroomId}/report-cards`,
      {
        params: { periodId },
      },
    );
  }
  groupReportCardsZip(classroomId: number, periodId: number): Observable<Blob> {
    return this.api.download(`academic/director/classrooms/${classroomId}/report-cards/zip`, {
      params: { periodId },
    });
  }
}
