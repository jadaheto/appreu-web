import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient, Page } from '../../../core';
import type { SelectOption } from '../../../shared/ui';
import { asPage, PAGE_HANDLES_ERRORS } from './hr-http';
import type {
  ApiPage,
  Employee,
  EmployeeData,
  EmployeeFilters,
  EmployeeKpis,
  EmployeeStatus,
  EmployeeSummary,
  IncomeCertificate,
  IssueCertificateRequest,
  IssuedCertificate,
  PayslipSummary,
  RegisterEmployeeRequest,
  RegisterEmployeeResult,
  RetireEmployeeRequest,
} from './hr.models';

/** Directorio de empleados (`/api/hr/employees`, roles admin/hr; desprendibles e ingresos también finance). */
@Injectable({ providedIn: 'root' })
export class EmployeesService {
  private readonly api = inject(ApiClient);

  list(filters: EmployeeFilters): Observable<Page<EmployeeSummary>> {
    return asPage(
      this.api.get<ApiPage<EmployeeSummary>>('hr/employees', {
        params: {
          search: filters.search,
          type: filters.type,
          status: filters.status,
          page: filters.page,
          limit: filters.pageSize,
        },
      }),
    );
  }

  /** Empleados activos como opciones de `ui-select` ("Nombre (código)"). */
  activeOptions(): Observable<SelectOption<number>[]> {
    return this.api
      .get<ApiPage<EmployeeSummary>>('hr/employees', {
        params: { status: 'active', page: 1, limit: 200 },
      })
      .pipe(
        map((res) =>
          (res.items ?? []).map((e) => ({ value: e.id, label: `${e.fullName} (${e.code})` })),
        ),
      );
  }

  kpis(): Observable<EmployeeKpis> {
    return this.api.get<EmployeeKpis>('hr/employees/kpis');
  }

  get(id: number): Observable<Employee> {
    return this.api.get<Employee>(`hr/employees/${id}`);
  }

  register(dto: RegisterEmployeeRequest): Observable<RegisterEmployeeResult> {
    return this.api.post<RegisterEmployeeResult>('hr/employees', dto, PAGE_HANDLES_ERRORS);
  }

  update(id: number, dto: EmployeeData): Observable<Employee> {
    return this.api.put<Employee>(`hr/employees/${id}`, dto, PAGE_HANDLES_ERRORS);
  }

  changeStatus(id: number, status: EmployeeStatus): Observable<Employee> {
    return this.api.patch<Employee>(`hr/employees/${id}/status`, { status }, PAGE_HANDLES_ERRORS);
  }

  retire(id: number, dto: RetireEmployeeRequest): Observable<Employee> {
    return this.api.post<Employee>(`hr/employees/${id}/retirement`, dto, PAGE_HANDLES_ERRORS);
  }

  payslips(id: number, page: number, pageSize: number): Observable<Page<PayslipSummary>> {
    return asPage(
      this.api.get<ApiPage<PayslipSummary>>(`hr/employees/${id}/payslips`, {
        params: { page, limit: pageSize },
      }),
    );
  }

  issueEmploymentCertificate(
    id: number,
    dto: IssueCertificateRequest,
  ): Observable<IssuedCertificate> {
    return this.api.post<IssuedCertificate>(
      `hr/employees/${id}/certificates/employment`,
      dto,
      PAGE_HANDLES_ERRORS,
    );
  }

  incomeCertificate(id: number, year: number): Observable<IncomeCertificate> {
    return this.api.get<IncomeCertificate>(`hr/employees/${id}/income-certificate`, {
      params: { year },
      ...PAGE_HANDLES_ERRORS,
    });
  }

  /** Certificado de ingresos y retenciones del año en PDF (`application/pdf`). */
  incomeCertificatePdf(id: number, year: number): Observable<Blob> {
    return this.api.download(`hr/employees/${id}/income-certificate/document`, {
      params: { year },
    });
  }
}
