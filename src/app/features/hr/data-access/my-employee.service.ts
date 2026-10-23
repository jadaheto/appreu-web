import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient, Page } from '../../../core';
import { asPage, PAGE_HANDLES_ERRORS } from './hr-http';
import type {
  ApiPage,
  ContactInfoRequest,
  Employee,
  IncomeCertificate,
  IssueCertificateRequest,
  IssuedCertificate,
  Leave,
  MyDashboard,
  PayslipDocument,
  PayslipSummary,
  RequestLeaveRequest,
} from './hr.models';

/**
 * Autoservicio del empleado (`/api/me/employee`). Todo actúa sobre el empleado
 * vinculado al token. Si el usuario no está vinculado la API responde 403 con
 * un mensaje que las páginas muestran en línea (por eso no se lanza el toast).
 */
@Injectable({ providedIn: 'root' })
export class MyEmployeeService {
  private readonly api = inject(ApiClient);

  profile(): Observable<Employee> {
    return this.api.get<Employee>('me/employee', PAGE_HANDLES_ERRORS);
  }

  updateContact(dto: ContactInfoRequest): Observable<Employee> {
    return this.api.patch<Employee>('me/employee/contact', dto, PAGE_HANDLES_ERRORS);
  }

  dashboard(): Observable<MyDashboard> {
    return this.api.get<MyDashboard>('me/employee/dashboard', PAGE_HANDLES_ERRORS);
  }

  payslips(page: number, pageSize: number): Observable<Page<PayslipSummary>> {
    return asPage(
      this.api.get<ApiPage<PayslipSummary>>('me/employee/payslips', {
        params: { page, limit: pageSize },
        ...PAGE_HANDLES_ERRORS,
      }),
    );
  }

  payslip(paymentId: number): Observable<PayslipDocument> {
    return this.api.get<PayslipDocument>(`me/employee/payslips/${paymentId}`, PAGE_HANDLES_ERRORS);
  }

  /** Mi desprendible en PDF (`application/pdf`). */
  payslipPdf(paymentId: number): Observable<Blob> {
    return this.api.download(`me/employee/payslips/${paymentId}/document`);
  }

  /** Mi certificado de ingresos y retenciones del año en PDF. */
  incomeCertificatePdf(year: number): Observable<Blob> {
    return this.api.download('me/employee/income-certificate/document', { params: { year } });
  }

  leaves(page: number, pageSize: number): Observable<Page<Leave>> {
    return asPage(
      this.api.get<ApiPage<Leave>>('me/employee/leaves', {
        params: { page, limit: pageSize },
        ...PAGE_HANDLES_ERRORS,
      }),
    );
  }

  requestLeave(dto: RequestLeaveRequest): Observable<Leave> {
    return this.api.post<Leave>('me/employee/leaves', dto, PAGE_HANDLES_ERRORS);
  }

  cancelLeave(id: number): Observable<Leave> {
    return this.api.post<Leave>(`me/employee/leaves/${id}/cancel`, {}, PAGE_HANDLES_ERRORS);
  }

  issueEmploymentCertificate(dto: IssueCertificateRequest): Observable<IssuedCertificate> {
    return this.api.post<IssuedCertificate>(
      'me/employee/certificates/employment',
      dto,
      PAGE_HANDLES_ERRORS,
    );
  }

  incomeCertificate(year: number): Observable<IncomeCertificate> {
    return this.api.get<IncomeCertificate>('me/employee/income-certificate', {
      params: { year },
      ...PAGE_HANDLES_ERRORS,
    });
  }
}
