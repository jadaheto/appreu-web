import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient, Page } from '../../../core';
import { asPage, PAGE_HANDLES_ERRORS } from './hr-http';
import type {
  ApiPage,
  CalculatePayrollResult,
  CreatePayrollPeriodRequest,
  PayrollKpis,
  PayrollNovelty,
  PayrollParameters,
  PayrollParametersRequest,
  PayrollPeriod,
  PayrollPeriodDetail,
  PayrollPeriodFilters,
  PayslipDocument,
  RegisterNoveltyRequest,
} from './hr.models';

/**
 * Nómina: parámetros legales por año, períodos y su máquina de estados
 * (`draft → calculated → approved → paid`, `→ cancelled`) y desprendibles.
 */
@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly api = inject(ApiClient);

  parameters(year: number): Observable<PayrollParameters> {
    return this.api.get<PayrollParameters>(`payroll/parameters/${year}`);
  }

  saveParameters(year: number, dto: PayrollParametersRequest): Observable<PayrollParameters> {
    return this.api.put<PayrollParameters>(`payroll/parameters/${year}`, dto, PAGE_HANDLES_ERRORS);
  }

  kpis(month: string): Observable<PayrollKpis> {
    return this.api.get<PayrollKpis>('payroll/kpis', { params: { month } });
  }

  periods(filters: PayrollPeriodFilters): Observable<Page<PayrollPeriod>> {
    return asPage(
      this.api.get<ApiPage<PayrollPeriod>>('payroll/periods', {
        params: {
          year: filters.year,
          status: filters.status,
          page: filters.page,
          limit: filters.pageSize,
        },
      }),
    );
  }

  createPeriod(dto: CreatePayrollPeriodRequest): Observable<PayrollPeriod> {
    return this.api.post<PayrollPeriod>('payroll/periods', dto, PAGE_HANDLES_ERRORS);
  }

  period(id: number): Observable<PayrollPeriodDetail> {
    return this.api.get<PayrollPeriodDetail>(`payroll/periods/${id}`);
  }

  addNovelty(periodId: number, dto: RegisterNoveltyRequest): Observable<PayrollNovelty> {
    return this.api.post<PayrollNovelty>(
      `payroll/periods/${periodId}/novelties`,
      dto,
      PAGE_HANDLES_ERRORS,
    );
  }

  removeNovelty(periodId: number, noveltyId: number): Observable<void> {
    return this.api.delete<void>(
      `payroll/periods/${periodId}/novelties/${noveltyId}`,
      PAGE_HANDLES_ERRORS,
    );
  }

  calculate(id: number): Observable<CalculatePayrollResult> {
    return this.api.post<CalculatePayrollResult>(
      `payroll/periods/${id}/calculate`,
      {},
      PAGE_HANDLES_ERRORS,
    );
  }

  approve(id: number): Observable<PayrollPeriod> {
    return this.api.post<PayrollPeriod>(`payroll/periods/${id}/approve`, {}, PAGE_HANDLES_ERRORS);
  }

  pay(id: number): Observable<PayrollPeriod> {
    return this.api.post<PayrollPeriod>(`payroll/periods/${id}/pay`, {}, PAGE_HANDLES_ERRORS);
  }

  cancel(id: number, reason: string): Observable<PayrollPeriod> {
    return this.api.post<PayrollPeriod>(
      `payroll/periods/${id}/cancel`,
      { reason },
      PAGE_HANDLES_ERRORS,
    );
  }

  payslip(paymentId: number): Observable<PayslipDocument> {
    return this.api.get<PayslipDocument>(`payroll/payslips/${paymentId}`);
  }

  /** Desprendible en PDF (`application/pdf`). */
  payslipPdf(paymentId: number): Observable<Blob> {
    return this.api.download(`payroll/payslips/${paymentId}/document`);
  }
}
