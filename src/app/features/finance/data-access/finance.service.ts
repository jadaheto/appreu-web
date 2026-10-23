import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { ApiClient, Page, saveBlob, withContext } from '../../../core';
import type {
  AccountStatement,
  AgingReport,
  BankFileDownload,
  BillingConcept,
  BillingStudent,
  ChargeBatchRequest,
  ChargeBatchSummary,
  Charge,
  ChargeDocument,
  ChargeFilters,
  ChargeListItem,
  ChargeSummaryRow,
  CollectionFileBank,
  CreateExpenseRequest,
  CreditApplication,
  Expense,
  ExpenseCategory,
  ExpenseFilters,
  FinanceDashboard,
  GradeOption,
  IndividualChargeRequest,
  PaymentFilters,
  PaymentListItem,
  PayrollFileBank,
  PayrollPeriodOption,
  Receipt,
  Reconciliation,
  ReconciliationStatus,
  RegisteredPayment,
  RegisterPaymentRequest,
  RiskLevel,
  SaveBillingConcept,
  StudentCharges,
  TuitionRate,
  TuitionSchedule,
  VoidedPayment,
  PortalDianArtifact,
  PortalDianDocumentPage,
} from './finance.models';
import { todayIso } from './finance-labels';

/** Respuesta paginada de `apreu-api` (`limit` en lugar de `pageSize`). */
interface ApiPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

const toPage = <T>(res: ApiPage<T>): Page<T> => ({
  items: res.items ?? [],
  total: res.total ?? 0,
  page: res.page ?? 1,
  pageSize: res.limit ?? 20,
});

/** Nombre del archivo en `Content-Disposition: attachment; filename="x.txt"`. */
export function fileNameFromDisposition(header: string | null, fallback: string): string {
  const match = header ? /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header) : null;
  return match ? decodeURIComponent(match[1]) : fallback;
}

/** `AAAAMMDD` local (nombre por defecto si CORS oculta `Content-Disposition`). */
const compactToday = () => todayIso().replace(/-/g, '');

/** Guarda un contenido como archivo descargable en el navegador. */
export function saveFile(content: Blob | string, fileName: string, type = 'text/plain'): void {
  saveBlob(content, fileName, { type });
}

/** Cliente HTTP de `/api/finance/**` (cobros, caja, cartera, gastos, archivos bancarios). */
@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly api = inject(ApiClient);
  private readonly http = inject(HttpClient);
  private readonly silent = { context: withContext({ skipErrorToast: true }) };

  // ── Reportes ───────────────────────────────────────────────
  dashboard(month?: string | null): Observable<FinanceDashboard> {
    return this.api.get<FinanceDashboard>('finance/dashboard', { params: { month } });
  }

  aging(
    filters: { risk?: RiskLevel | null; gradeId?: number | null } = {},
  ): Observable<AgingReport> {
    return this.api.get<AgingReport>('finance/aging', { params: { ...filters } });
  }

  reconciliation(month?: string | null): Observable<Reconciliation> {
    return this.api.get<Reconciliation>('finance/reconciliation', { params: { month } });
  }

  // ── Estudiantes / estado de cuenta ─────────────────────────
  searchStudents(q: string, limit = 10): Observable<BillingStudent[]> {
    return this.api.get<BillingStudent[]>('finance/students/search', { params: { q, limit } });
  }

  accountStatement(studentId: number): Observable<AccountStatement> {
    return this.api.get<AccountStatement>(`finance/students/${studentId}/account-statement`);
  }

  studentCharges(studentId: number): Observable<StudentCharges> {
    return this.api.get<StudentCharges>(`finance/students/${studentId}/charges`);
  }

  studentPayments(studentId: number): Observable<PaymentListItem[]> {
    return this.api.get<PaymentListItem[]>(`finance/students/${studentId}/payments`);
  }

  applyCredit(studentId: number): Observable<CreditApplication> {
    return this.api.post<CreditApplication>(`finance/students/${studentId}/credit/apply`, {});
  }

  /** Estudiantes vinculados al usuario del portal (selector de hijo). */
  myStudents(): Observable<BillingStudent[]> {
    return this.api.get<BillingStudent[]>('finance/portal/students');
  }

  /** Facturas electrónicas DIAN del estudiante (portal; solo las aceptadas o enviadas). */
  portalDianDocuments(studentId: number, page = 1, limit = 20): Observable<PortalDianDocumentPage> {
    return this.api.get<PortalDianDocumentPage>(
      `e-invoicing/portal/students/${studentId}/documents`,
      {
        params: { page, limit },
      },
    );
  }

  /** Representación gráfica (PDF) o `AttachedDocument` (XML) de una factura del portal. */
  portalDianArtifact(
    studentId: number,
    documentId: number,
    artifact: PortalDianArtifact,
  ): Observable<Blob> {
    return this.api.download(
      `e-invoicing/portal/students/${studentId}/documents/${documentId}/${artifact}`,
    );
  }

  // ── Conceptos y tarifas ────────────────────────────────────
  concepts(active?: boolean | null): Observable<BillingConcept[]> {
    return this.api.get<BillingConcept[]>('finance/concepts', { params: { active } });
  }

  createConcept(dto: SaveBillingConcept): Observable<BillingConcept> {
    return this.api.post<BillingConcept>('finance/concepts', dto);
  }

  updateConcept(id: number, dto: SaveBillingConcept): Observable<BillingConcept> {
    return this.api.put<BillingConcept>(`finance/concepts/${id}`, dto);
  }

  setConceptActive(id: number, active: boolean): Observable<BillingConcept> {
    return this.api.patch<BillingConcept>(`finance/concepts/${id}/active`, { active });
  }

  tuition(year?: number | null): Observable<TuitionSchedule> {
    return this.api.get<TuitionSchedule>('finance/tuition', { params: { year } });
  }

  saveTuition(year: number, rates: TuitionRate[]): Observable<TuitionSchedule> {
    return this.api.put<TuitionSchedule>(`finance/tuition/${year}`, { rates });
  }

  // ── Cobros ─────────────────────────────────────────────────
  charges(filters: ChargeFilters): Observable<Page<ChargeListItem>> {
    const { pageSize, ...rest } = filters;
    return this.api
      .get<ApiPage<ChargeListItem>>('finance/charges', {
        params: { ...rest, limit: pageSize, overdueOnly: rest.overdueOnly || null },
      })
      .pipe(map(toPage));
  }

  chargesSummary(limit = 20): Observable<ChargeSummaryRow[]> {
    return this.api.get<ChargeSummaryRow[]>('finance/charges/summary', { params: { limit } });
  }

  previewBatch(dto: ChargeBatchRequest): Observable<ChargeBatchSummary> {
    return this.api.post<ChargeBatchSummary>('finance/charges/batch/preview', dto);
  }

  generateBatch(dto: ChargeBatchRequest): Observable<ChargeBatchSummary> {
    return this.api.post<ChargeBatchSummary>('finance/charges/batch', dto);
  }

  createCharge(dto: IndividualChargeRequest): Observable<Charge> {
    return this.api.post<Charge>('finance/charges', dto);
  }

  cancelCharge(id: number): Observable<Charge> {
    return this.api.post<Charge>(`finance/charges/${id}/cancel`, {});
  }

  chargeDocument(id: number): Observable<ChargeDocument> {
    return this.api.get<ChargeDocument>(`finance/charges/${id}/document`);
  }

  // ── Pagos y caja ───────────────────────────────────────────
  payments(filters: PaymentFilters): Observable<Page<PaymentListItem>> {
    const { pageSize, ...rest } = filters;
    return this.api
      .get<ApiPage<PaymentListItem>>('finance/payments', { params: { ...rest, limit: pageSize } })
      .pipe(map(toPage));
  }

  registerPayment(dto: RegisterPaymentRequest): Observable<RegisteredPayment> {
    return this.api.post<RegisteredPayment>('finance/payments', dto);
  }

  voidPayment(id: number, reason: string): Observable<VoidedPayment> {
    return this.api.post<VoidedPayment>(`finance/payments/${id}/void`, { reason });
  }

  reconcilePayment(id: number, bankRef: string): Observable<ReconciliationStatus> {
    return this.api.post<ReconciliationStatus>(`finance/payments/${id}/reconcile`, { bankRef });
  }

  unreconcilePayment(id: number): Observable<ReconciliationStatus> {
    return this.api.delete<ReconciliationStatus>(`finance/payments/${id}/reconcile`);
  }

  receipt(receiptNumber: string): Observable<Receipt> {
    return this.api.get<Receipt>(`finance/receipts/${encodeURIComponent(receiptNumber)}`);
  }

  // ── Gastos ─────────────────────────────────────────────────
  expenses(filters: ExpenseFilters): Observable<Page<Expense>> {
    const { pageSize, ...rest } = filters;
    return this.api
      .get<ApiPage<Expense>>('finance/expenses', { params: { ...rest, limit: pageSize } })
      .pipe(map(toPage));
  }

  createExpense(dto: CreateExpenseRequest): Observable<Expense> {
    return this.api.post<Expense>('finance/expenses', dto);
  }

  expenseCategories(): Observable<ExpenseCategory[]> {
    return this.api.get<ExpenseCategory[]>('finance/expense-categories');
  }

  createExpenseCategory(name: string): Observable<ExpenseCategory> {
    return this.api.post<ExpenseCategory>('finance/expense-categories', { name });
  }

  renameExpenseCategory(id: number, name: string): Observable<ExpenseCategory> {
    return this.api.put<ExpenseCategory>(`finance/expense-categories/${id}`, { name });
  }

  // ── Archivos bancarios (TXT) ───────────────────────────────
  collectionFile(bank: CollectionFileBank, month: string): Observable<BankFileDownload> {
    return this.textFile(
      'finance/bank-files/collection',
      { bank, month },
      `RECAUDO_${bank.toUpperCase()}_${compactToday()}.txt`,
    );
  }

  payrollFile(bank: PayrollFileBank, periodId: number): Observable<BankFileDownload> {
    return this.textFile(
      'finance/bank-files/payroll',
      { bank, periodId },
      `PAGO_${bank.toUpperCase()}_${compactToday()}.txt`,
    );
  }

  // ── Catálogos de otros contextos (opcionales) ──────────────
  /** Grados (`/api/academic/grades`, solo admin). Lista vacía si no hay acceso. */
  grades(): Observable<GradeOption[]> {
    return this.api
      .get<GradeOption[]>('academic/grades', this.silent)
      .pipe(catchError(() => of([] as GradeOption[])));
  }

  /** Períodos de nómina para la dispersión. Lista vacía si no hay acceso. */
  payrollPeriods(): Observable<PayrollPeriodOption[]> {
    return this.api
      .get<ApiPage<PayrollPeriodOption>>('payroll/periods', {
        ...this.silent,
        params: { limit: 100 },
      })
      .pipe(
        map((res) => res.items ?? []),
        catchError(() => of([] as PayrollPeriodOption[])),
      );
  }

  private textFile(path: string, body: unknown, fallback: string): Observable<BankFileDownload> {
    return this.http
      .post(this.api.url(path), body, { observe: 'response', responseType: 'text' })
      .pipe(
        map((res) => ({
          fileName: fileNameFromDisposition(res.headers.get('Content-Disposition'), fallback),
          content: res.body ?? '',
          records: Number(res.headers.get('X-Records') ?? 0),
        })),
      );
  }
}
