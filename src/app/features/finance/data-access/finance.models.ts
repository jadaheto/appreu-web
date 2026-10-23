/**
 * Modelos del contexto Finanzas (cobros, caja, cartera, gastos). Reflejan los
 * read models de `apreu-api/src/modules/finance/application/**`.
 */

export const CHARGE_STATUSES = ['pending', 'partial', 'paid', 'overdue', 'cancelled'] as const;
export type ChargeStatus = (typeof CHARGE_STATUSES)[number];

export const PAYMENT_STATUSES = ['applied', 'reversed', 'pending'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = [
  'efectivo',
  'transferencia',
  'nequi',
  'daviplata',
  'breb',
  'transferencia_ext',
  'tarjeta',
  'pse',
  'cheque',
  'datafono',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const RISK_LEVELS = ['critico', 'alto', 'medio', 'bajo'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const CONCEPT_CATEGORIES = [
  'matricula',
  'pension',
  'mensualidad',
  'servicios',
  'materiales',
  'transporte',
  'alimentacion',
  'certificado',
  'recargo',
  'inscripcion',
  'otro',
] as const;
export type ConceptCategory = (typeof CONCEPT_CATEGORIES)[number];

export const COLLECTION_FILE_BANKS = ['asobancaria', 'bancolombia_pab'] as const;
export type CollectionFileBank = (typeof COLLECTION_FILE_BANKS)[number];
export const PAYROLL_FILE_BANKS = ['bancolombia', 'davivienda', 'bogota'] as const;
export type PayrollFileBank = (typeof PAYROLL_FILE_BANKS)[number];

/** Estudiante tal como lo muestran las pantallas de finanzas (`BillingStudent`). */
export interface BillingStudent {
  id: number;
  code: string;
  fullName: string;
  documentNumber: string | null;
  status: string;
  gradeId: number | null;
  gradeName: string | null;
  classroomName: string | null;
  scholarshipPct: number;
  guardianName: string | null;
  guardianPhone: string | null;
}

export interface BillingConcept {
  id: number;
  name: string;
  description: string | null;
  code: string | null;
  category: ConceptCategory;
  amount: number;
  taxRate: number;
  isActive: boolean;
}

export interface SaveBillingConcept {
  name: string;
  description?: string;
  code?: string;
  category?: ConceptCategory;
  amount: number;
  taxRate?: number;
}

export interface Charge {
  id: number;
  studentId: number;
  conceptId: number;
  description: string;
  period: string;
  amount: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  status: ChargeStatus;
  isOverdue: boolean;
  academicYear: number;
  createdAt: string | null;
}

export interface ChargeListItem {
  id: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  conceptId: number;
  conceptName: string;
  conceptCategory: string;
  description: string;
  period: string;
  netAmount: number;
  paidAmount: number;
  pendingAmount: number;
  dueDate: string;
  status: ChargeStatus;
  isOverdue: boolean;
}

export interface ChargeFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  studentId?: number | null;
  conceptId?: number | null;
  status?: ChargeStatus | null;
  period?: string | null;
  overdueOnly?: boolean | null;
}

export interface ChargesSummary {
  totalCharged: number;
  totalPaid: number;
  balance: number;
  overdueBalance: number;
  pendingCount: number;
  paidCount: number;
}

export interface StudentCharges {
  studentId: number;
  summary: ChargesSummary;
  charges: Charge[];
}

export interface ChargeSummaryRow {
  conceptId: number;
  conceptName: string;
  period: string;
  chargesCount: number;
  totalNet: number;
  totalPaid: number;
  paidCount: number;
  paidRate: number;
  collectedRate: number;
}

export interface ChargeRequest {
  conceptId: number;
  period: string;
  dueDate?: string;
  customAmount?: number;
  applyScholarship?: boolean;
}

export interface ChargeBatchRequest extends ChargeRequest {
  gradeId?: number;
}

export interface IndividualChargeRequest extends ChargeRequest {
  studentId: number;
  description?: string;
  allowDuplicate?: boolean;
}

export interface ChargeBatchSummary {
  conceptId: number;
  conceptName: string;
  period: string;
  dueDate: string;
  studentsCount: number;
  alreadyCharged: number;
  chargesCount: number;
  totalNet: number;
  amounts: { netAmount: number; count: number }[];
}

export interface ChargeDocument {
  documentNumber: string;
  issueDate: string | null;
  schoolName: string;
  schoolNit: string;
  conceptName: string;
  conceptCategory: string;
  student: BillingStudent;
  charge: Charge;
  isPaid: boolean;
}

export interface PaymentListItem {
  id: number;
  receiptNumber: string;
  studentId: number;
  studentName: string;
  studentCode: string;
  amount: number;
  appliedAmount: number;
  unappliedAmount: number;
  method: PaymentMethod;
  paidAt: string;
  status: PaymentStatus;
  reference: string | null;
  bankRef: string | null;
  reconciled: boolean;
  reconciledAt: string | null;
  cashierName: string | null;
  concepts: string[];
}

export interface PaymentFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  from?: string | null;
  to?: string | null;
  studentId?: number | null;
  status?: PaymentStatus | null;
  method?: PaymentMethod | null;
}

export interface RegisterPaymentRequest {
  studentId: number;
  amount: number;
  method: PaymentMethod;
  paymentDate?: string;
  notes?: string;
  reference?: string;
  chargeIds?: number[];
}

export interface AppliedCharge {
  chargeId: number;
  conceptId: number;
  conceptName: string;
  description: string;
  amount: number;
  chargeStatus: ChargeStatus;
  chargePending: number;
}

export interface RegisteredPayment {
  paymentId: number;
  receiptNumber: string;
  studentId: number;
  amount: number;
  appliedAmount: number;
  unappliedAmount: number;
  creditBalance: number;
  paidAt: string;
  applications: AppliedCharge[];
}

export interface VoidedPayment {
  paymentId: number;
  receiptNumber: string;
  status: string;
  revertedCharges: number[];
}

export interface ReconciliationStatus {
  paymentId: number;
  reconciled: boolean;
  bankRef: string | null;
  reconciledAt: string | null;
}

export interface CreditApplication {
  studentId: number;
  appliedAmount: number;
  remainingCredit: number;
  applications: {
    paymentId: number;
    receiptNumber: string;
    studentChargeId: number;
    amount: number;
  }[];
}

export interface ReceiptLine {
  chargeId: number;
  conceptName: string;
  description: string;
  amount: number;
  chargePending: number;
}

export interface Receipt {
  paymentId: number;
  receiptNumber: string;
  studentId: number;
  studentName: string;
  studentCode: string;
  documentNumber: string | null;
  amount: number;
  method: PaymentMethod;
  methodLabel: string;
  paidAt: string;
  status: PaymentStatus;
  reference: string | null;
  notes: string | null;
  cashierName: string | null;
  voidReason: string | null;
  lines: ReceiptLine[];
  schoolName: string;
  schoolNit: string;
  appliedAmount: number;
  unappliedAmount: number;
}

export interface AccountStatement {
  student: BillingStudent;
  summary: ChargesSummary & { creditBalance: number; netBalance: number };
  charges: Charge[];
  payments: PaymentListItem[];
}

export interface Kpi {
  value: number;
  previous: number;
  changePct: number | null;
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface InvoiceSummary {
  id: number;
  invoiceNumber: string;
  studentName: string | null;
  issueDate: string;
  totalAmount: number;
  status: string;
}

export interface FinanceDashboard {
  month: string;
  income: Kpi;
  expenses: Kpi;
  netProfit: number;
  overduePortfolio: { balance: number; debtors: number };
  chargesByCategory: CategoryTotal[];
  topExpenseCategories: CategoryTotal[];
  latestInvoices: InvoiceSummary[];
}

export interface Debtor {
  position: number;
  studentId: number;
  studentName: string;
  studentCode: string;
  gradeId: number | null;
  gradeName: string | null;
  classroomName: string | null;
  oldestDueDate: string;
  daysOverdue: number;
  risk: RiskLevel;
  chargesCount: number;
  balance: number;
}

export interface AgingBucket {
  debtors: number;
  balance: number;
}

export interface AgingReport {
  today: string;
  total: AgingBucket;
  byRisk: Record<RiskLevel, AgingBucket>;
  debtors: Debtor[];
}

export interface CountAndAmount {
  count: number;
  amount: number;
}

export interface Reconciliation {
  month: string;
  total: CountAndAmount;
  reconciled: CountAndAmount;
  pending: CountAndAmount;
  byMethod: (CountAndAmount & { method: PaymentMethod; label: string })[];
  payments: PaymentListItem[];
}

export interface Expense {
  id: number;
  categoryId: number | null;
  categoryName: string | null;
  description: string;
  amount: number;
  date: string;
  vendor: string | null;
  receiptNo: string | null;
  paymentMethod: string;
  notes: string | null;
  createdAt: string | null;
}

export interface ExpenseFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  from?: string | null;
  to?: string | null;
  categoryId?: number | null;
}

export interface CreateExpenseRequest {
  categoryId?: number;
  description: string;
  amount: number;
  date?: string;
  vendor?: string;
  receiptNo?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
}

export interface TuitionRate {
  gradeId: number;
  conceptId: number | null;
  amount: number;
}

export interface TuitionSchedule {
  academicYear: number;
  rates: TuitionRate[];
}

/** Archivo plano generado por la API (`text/plain` + `Content-Disposition`). */
export interface BankFileDownload {
  fileName: string;
  content: string;
  records: number;
}

/** Grado académico (`GET /api/academic/grades`, solo admin). */
export interface GradeOption {
  id: number;
  name: string;
  level?: string;
}

/** Período de nómina (`GET /api/payroll/periods`). */
export interface PayrollPeriodOption {
  id: number;
  name: string;
  periodLabel: string;
  status: string;
  netTotal: number;
}

/** Factura/nota electrónica DIAN visible en el portal (`GET /e-invoicing/portal/students/:id/documents`). */
export type PortalDianArtifact = 'pdf' | 'xml';
export interface PortalDianDocument {
  id: number;
  documentType: 'fv' | 'nc' | 'nd';
  documentTypeName: string;
  number: string;
  prefix: string;
  issueDate: string;
  totalAmount: number;
  status: string;
  cufe: string | null;
  artifacts: PortalDianArtifact[];
}
export interface PortalDianDocumentPage {
  items: PortalDianDocument[];
  total: number;
  page: number;
  limit: number;
}
