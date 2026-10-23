import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient, withContext } from '../../../core';
import type {
  DailyAttendanceQuery,
  DailyAttendanceReport,
  ManualAttendanceRequest,
  QrAttendanceRequest,
  QrAttendanceResult,
  StudentAttendance,
} from './academic.models';

/** Asistencia por QR, pase de lista manual y consultas (`/api/academic/attendance`). */
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly api = inject(ApiClient);

  /** El lector maneja sus propios errores (feed en vivo), sin toast global. */
  registerQr(dto: QrAttendanceRequest): Observable<QrAttendanceResult> {
    return this.api.post<QrAttendanceResult>('academic/attendance/qr', dto, {
      context: withContext({ skipErrorToast: true }),
    });
  }
  registerManual(dto: ManualAttendanceRequest): Observable<{ saved: number }> {
    return this.api.post<{ saved: number }>('academic/attendance/manual', dto);
  }
  dailyReport(query: DailyAttendanceQuery): Observable<DailyAttendanceReport> {
    return this.api.get<DailyAttendanceReport>('academic/attendance', { params: { ...query } });
  }
  /** `month` en formato `AAAA-MM` (por defecto el mes actual). */
  student(studentId: number, month?: string | null): Observable<StudentAttendance> {
    return this.api.get<StudentAttendance>(`academic/students/${studentId}/attendance`, {
      params: { month },
    });
  }
}
