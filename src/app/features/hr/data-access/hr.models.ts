/**
 * Modelos del contexto RR. HH. / Nómina / Stickers. Reflejan los read models de
 * `apreu-api/src/modules/hr/application/**` (las fechas llegan como ISO string).
 */
import type { SelectOption } from '../../../shared/ui';

// ───────────────────────── Catálogos ─────────────────────────

export const EMPLOYEE_TYPES = [
  'docente',
  'administrativo',
  'directivo',
  'servicios',
  'otro',
] as const;
export type EmployeeType = (typeof EMPLOYEE_TYPES)[number];

export const EMPLOYEE_STATUSES = [
  'active',
  'inactive',
  'suspended',
  'retired',
  'on_leave',
] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const CONTRACT_TYPES = ['indefinido', 'fijo', 'obra', 'prestacion'] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const DOCUMENT_TYPES = ['cc', 'pa', 'ext'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const GENDERS = ['M', 'F', 'O'] as const;
export type Gender = (typeof GENDERS)[number];

export const BANK_ACCOUNT_TYPES = ['ahorros', 'corriente'] as const;
export type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number];

export const ARL_RISK_CLASSES = [1, 2, 3, 4, 5] as const;
export type ArlRiskClass = (typeof ARL_RISK_CLASSES)[number];

export const LEAVE_TYPES = [
  'vacaciones',
  'licencia_medica',
  'licencia_maternidad',
  'licencia_paternidad',
  'licencia_no_remunerada',
  'permiso_sindical',
  'calamidad',
  'comision',
  'otro',
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];
export type LeaveDisplayStatus = LeaveStatus | 'taken';
export type LeavePayTreatment = 'paid' | 'incapacity' | 'unpaid' | 'worked';

export const PAY_FREQUENCIES = ['monthly', 'biweekly'] as const;
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

export const PAYROLL_PERIOD_STATUSES = [
  'draft',
  'calculated',
  'approved',
  'paid',
  'cancelled',
] as const;
export type PayrollPeriodStatus = (typeof PAYROLL_PERIOD_STATUSES)[number];
export type PayrollPaymentStatus = 'pending' | 'paid' | 'cancelled';

export const NOVELTY_TYPES = [
  'overtime',
  'bonus_salary',
  'bonus_non_salary',
  'libranza',
  'sindicato',
  'embargo',
  'other_deduction',
] as const;
export type NoveltyType = (typeof NOVELTY_TYPES)[number];

export const STICKER_COLORS = ['yellow', 'red', 'green', 'blue', 'purple'] as const;
export type StickerColor = (typeof STICKER_COLORS)[number];
export const STICKER_PRIORITIES = ['normal', 'urgent'] as const;
export type StickerPriority = (typeof STICKER_PRIORITIES)[number];
export const STICKER_FILTERS = ['all', 'unread', 'urgent'] as const;
export type StickerFilter = (typeof STICKER_FILTERS)[number];

// ───────────────────────── Etiquetas ─────────────────────────

export const EMPLOYEE_TYPE_LABELS: Record<EmployeeType, string> = {
  docente: 'Docente',
  administrativo: 'Administrativo',
  directivo: 'Directivo',
  servicios: 'Servicios generales',
  otro: 'Otro',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
  retired: 'Retirado',
  on_leave: 'En licencia',
};

/** Transiciones permitidas por la API (`STATUS_TRANSITIONS`); el retiro es una operación aparte. */
export const EMPLOYEE_STATUS_TRANSITIONS: Record<EmployeeStatus, readonly EmployeeStatus[]> = {
  active: ['on_leave', 'suspended', 'inactive'],
  on_leave: ['active'],
  suspended: ['active'],
  inactive: ['active'],
  retired: [],
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  indefinido: 'Término indefinido',
  fijo: 'Término fijo',
  obra: 'Obra o labor',
  prestacion: 'Prestación de servicios',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  cc: 'Cédula de ciudadanía',
  pa: 'Pasaporte',
  ext: 'Cédula de extranjería',
};

export const GENDER_LABELS: Record<Gender, string> = { M: 'Masculino', F: 'Femenino', O: 'Otro' };

export const BANK_ACCOUNT_TYPE_LABELS: Record<BankAccountType, string> = {
  ahorros: 'Ahorros',
  corriente: 'Corriente',
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacaciones: 'Vacaciones',
  licencia_medica: 'Incapacidad / licencia médica',
  licencia_maternidad: 'Licencia de maternidad',
  licencia_paternidad: 'Licencia de paternidad',
  licencia_no_remunerada: 'Licencia no remunerada',
  permiso_sindical: 'Permiso sindical',
  calamidad: 'Calamidad doméstica',
  comision: 'Comisión de servicios',
  otro: 'Otro',
};

export const LEAVE_STATUS_LABELS: Record<LeaveDisplayStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  taken: 'Disfrutado',
};

export const PAY_TREATMENT_LABELS: Record<LeavePayTreatment, string> = {
  paid: 'Remunerado',
  incapacity: 'Incapacidad (2/3)',
  unpaid: 'No remunerado',
  worked: 'Cuenta como laborado',
};

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  monthly: 'Mensual',
  biweekly: 'Quincenal',
};

export const PERIOD_STATUS_LABELS: Record<PayrollPeriodStatus, string> = {
  draft: 'Borrador',
  calculated: 'Liquidado',
  approved: 'Aprobado',
  paid: 'Pagado',
  cancelled: 'Anulado',
};

export const PAYMENT_STATUS_LABELS: Record<PayrollPaymentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  cancelled: 'Anulado',
};

export const NOVELTY_TYPE_LABELS: Record<NoveltyType, string> = {
  overtime: 'Horas extra y recargos',
  bonus_salary: 'Bonificación salarial',
  bonus_non_salary: 'Bonificación no salarial',
  libranza: 'Libranza',
  sindicato: 'Cuota sindical',
  embargo: 'Embargo',
  other_deduction: 'Otro descuento',
};

/** Novedades que restan del neto. */
export const DEDUCTION_NOVELTIES: readonly NoveltyType[] = [
  'libranza',
  'sindicato',
  'embargo',
  'other_deduction',
];

export const STICKER_COLOR_LABELS: Record<StickerColor, string> = {
  yellow: 'Amarillo',
  red: 'Rojo',
  green: 'Verde',
  blue: 'Azul',
  purple: 'Morado',
};

export const STICKER_PRIORITY_LABELS: Record<StickerPriority, string> = {
  normal: 'Normal',
  urgent: 'Urgente',
};

/** Convierte un mapa de etiquetas en opciones de `ui-select`. */
export function optionsOf<K extends string | number>(
  values: readonly K[],
  labels: Record<K, string>,
): SelectOption<K>[] {
  return values.map((value) => ({ value, label: labels[value] }));
}

/** Tono del `ui-badge` para estados del contexto que no están en `STATUS_TONES`. */
export const HR_STATUS_TONES: Record<
  string,
  'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'info'
> = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'danger',
  retired: 'neutral',
  on_leave: 'warning',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
  taken: 'info',
  draft: 'neutral',
  calculated: 'info',
  paid: 'success',
};

// ───────────────────────── Paginación ─────────────────────────

/** Respuesta paginada de `apreu-api` (`Paginated<T>`). */
export interface ApiPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ───────────────────────── Empleados ─────────────────────────

export interface EmployeeSummary {
  id: number;
  code: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  employeeType: EmployeeType;
  position: string | null;
  department: string | null;
  contractType: ContractType;
  hireDate: string | null;
  baseSalary: number;
  status: EmployeeStatus;
  hasUserAccount: boolean;
}

export interface Employee extends EmployeeSummary {
  userId: number | null;
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  birthDate: string | null;
  gender: Gender;
  address: string | null;
  integralSalary: boolean;
  recurringDeductions: {
    libranza: number;
    sindicato: number;
    embargo: number;
    embargoIsAlimony: boolean;
  };
  bankAccount: { bankName: string | null; number: string | null; type: BankAccountType };
  socialSecurity: {
    eps: string | null;
    pensionFund: string | null;
    arl: string | null;
    arlRiskClass: ArlRiskClass;
  };
  withholding: {
    hasDependents: boolean;
    prepaidHealth: number;
    housingInterest: number;
    voluntaryPension: number;
  };
  retirementDate: string | null;
  retirementReason: string | null;
  createdAt: string | null;
}

export interface EmployeeKpis {
  active: number;
  onLeave: number;
  byType: Record<EmployeeType, number>;
}

export interface EmployeeFilters {
  search?: string;
  type?: EmployeeType | null;
  status?: EmployeeStatus | null;
  page: number;
  pageSize: number;
}

/** Cuerpo de `POST/PUT hr/employees` (`EmployeeDataDto`). */
export interface EmployeeData {
  firstName: string;
  lastName: string;
  documentType: DocumentType;
  documentNumber: string;
  birthDate?: string | null;
  gender: Gender;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  employeeType: EmployeeType;
  position?: string | null;
  department?: string | null;
  hireDate?: string | null;
  contractType: ContractType;
  baseSalary: number;
  integralSalary?: boolean;
  fixedLibranza?: number;
  fixedSindicato?: number;
  fixedEmbargo?: number;
  embargoIsAlimony?: boolean;
  bankName?: string | null;
  bankAccount?: string | null;
  accountType?: BankAccountType;
  eps?: string | null;
  pensionFund?: string | null;
  arl?: string | null;
  arlRiskClass?: number;
  withholdingDependents?: boolean;
  withholdingPrepaidHealth?: number;
  withholdingHousingInterest?: number;
  voluntaryPension?: number;
}

export interface RegisterEmployeeRequest extends EmployeeData {
  createUserAccount?: boolean;
}

export interface EmployeeAccountResult {
  userId: number;
  email: string;
  /** `false` cuando se vinculó una cuenta existente. */
  created: boolean;
  /** Se muestra una sola vez para entregarla al empleado. */
  temporaryPassword: string | null;
}

export interface RegisterEmployeeResult {
  employee: Employee;
  account: EmployeeAccountResult | null;
}

export interface RetireEmployeeRequest {
  retirementDate: string;
  reason: string;
}

// ───────────────────────── Documentos ─────────────────────────

export interface InstitutionProfile {
  name: string;
  nit: string | null;
  nitVerificationDigit: string | null;
  city: string | null;
  address: string | null;
  rectorName: string | null;
  logo: string | null;
}

export interface PayslipLine {
  label: string;
  amount: number;
}

export interface PayslipDocument {
  institution: InstitutionProfile;
  paymentId: number;
  status: string;
  period: {
    id: number;
    name: string;
    label: string;
    startDate: string;
    endDate: string;
    paymentDate: string;
  };
  employee: {
    fullName: string;
    code: string;
    document: string;
    position: string | null;
    department: string | null;
    contract: string;
    bank: { name: string | null; type: string; maskedAccount: string | null };
  };
  workedDays: number;
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  grossTotal: number;
  deductionsTotal: number;
  net: number;
  netInWords: string;
  employerContributions: PayslipLine[];
}

export interface PayslipSummary {
  paymentId: number;
  periodId: number;
  periodName: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  paymentDate: string | null;
  gross: number;
  totalDeductions: number;
  net: number;
  status: PayrollPaymentStatus;
}

export interface EmploymentCertificateContent {
  institution: InstitutionProfile;
  employeeName: string;
  documentLabel: string;
  documentNumber: string;
  position: string | null;
  department: string | null;
  contractLabel: string;
  hireDate: string | null;
  retirementDate: string | null;
  currentlyEmployed: boolean;
  salary: number | null;
  salaryInWords: string | null;
  addressee: string | null;
  issuedOn: string;
  verificationCode: string;
}

export interface IssuedCertificate {
  verificationCode: string;
  issuedAt: string;
  content: EmploymentCertificateContent;
}

/** Respuesta pública de `GET /hr/documents/verify/{code}` (sin datos salariales). */
export interface HrDocumentVerification {
  code: string;
  /** Hoy solo `employment_certificate`. */
  type: string;
  employeeName: string;
  issuedAt: string;
  institutionName: string;
}

export const HR_DOCUMENT_TYPE_LABELS: Readonly<Record<string, string>> = {
  employment_certificate: 'Certificado laboral',
};

export interface IssueCertificateRequest {
  includeSalary?: boolean;
  addressee?: string;
}

export interface IncomeCertificate {
  year: number;
  employee: { id: number; fullName: string; document: string };
  payments: number;
  grossPayments: number;
  mandatoryContributions: {
    health: number;
    pension: number;
    solidarityFund: number;
    total: number;
  };
  withholding: number;
  netPaid: number;
  note: string;
}

// ───────────────────────── Permisos ─────────────────────────

export interface Leave {
  id: number;
  employeeId: number;
  employeeName: string | null;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  displayStatus: LeaveDisplayStatus;
  payTreatment: LeavePayTreatment;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string | null;
}

export interface LeaveFilters {
  status?: LeaveStatus | null;
  employeeId?: number | null;
  from?: string | null;
  to?: string | null;
  page: number;
  pageSize: number;
}

export interface RequestLeaveRequest {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface HrRequestLeaveRequest extends RequestLeaveRequest {
  employeeId: number;
}

// ───────────────────────── Nómina ─────────────────────────

export interface PayrollRates {
  healthEmployee: number;
  pensionEmployee: number;
  healthEmployer: number;
  pensionEmployer: number;
  sena: number;
  icbf: number;
  ccf: number;
  arl: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface PayrollParameters {
  year: number;
  source: 'configured' | 'legal-default';
  minimumWage: number;
  transportAllowance: number;
  uvt: number;
  rates: PayrollRates;
  employerContributionExemption: boolean;
}

export interface PayrollParametersRequest {
  minimumWage: number;
  transportAllowance: number;
  uvt: number;
  rates?: Partial<PayrollRates>;
  employerContributionExemption?: boolean;
}

export interface PayrollPeriod {
  id: number;
  name: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  paymentDate: string;
  frequency: PayFrequency;
  year: number;
  status: PayrollPeriodStatus;
  grossTotal: number;
  deductionsTotal: number;
  netTotal: number;
  calculatedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  cancellationReason: string | null;
  createdAt: string | null;
}

export interface PayrollPayment {
  id: number;
  periodId: number;
  employeeId: number;
  employeeCode: string | null;
  employeeName: string | null;
  documentNumber: string | null;
  status: PayrollPaymentStatus;
  workedDays: number;
  ibc: number;
  earnings: {
    basicSalary: number;
    leavePay: number;
    transportAllowance: number;
    overtime: number;
    bonuses: number;
    gross: number;
  };
  deductions: {
    health: number;
    pension: number;
    solidarityFund: number;
    withholding: number;
    libranza: number;
    sindicato: number;
    embargo: number;
    other: number;
    total: number;
  };
  employer: {
    health: number;
    pension: number;
    arl: number;
    sena: number;
    icbf: number;
    ccf: number;
    total: number;
  };
  net: number;
  notes: string[];
}

export interface PayrollNovelty {
  id: number;
  employeeId: number;
  employeeName: string | null;
  type: NoveltyType;
  amount: number;
  description: string | null;
  createdAt: string | null;
}

export interface PayrollPeriodDetail {
  period: PayrollPeriod;
  payments: PayrollPayment[];
  novelties: PayrollNovelty[];
  employerCostTotal: number;
}

export interface CalculatePayrollResult {
  period: PayrollPeriod;
  payslips: number;
  /** Ajustes de deducciones y novedades ignoradas, por empleado. */
  warnings: { employeeId: number; messages: string[] }[];
}

export interface PayrollKpis {
  month: string;
  employees: number;
  gross: number;
  deductions: number;
  net: number;
}

export interface PayrollPeriodFilters {
  year?: number | null;
  status?: PayrollPeriodStatus | null;
  page: number;
  pageSize: number;
}

export interface CreatePayrollPeriodRequest {
  name?: string;
  startDate: string;
  endDate: string;
  paymentDate: string;
  frequency: PayFrequency;
}

export interface RegisterNoveltyRequest {
  employeeId: number;
  type: NoveltyType;
  amount: number;
  description?: string;
}

// ───────────────────────── Portal del empleado ─────────────────────────

export interface MyDashboard {
  employee: EmployeeSummary;
  monthsEmployed: number;
  lastPayslip: PayslipSummary | null;
  pendingLeaves: number;
  approvedLeavesThisYear: number;
  absenceDaysThisYear: number;
}

export interface ContactInfoRequest {
  phone?: string;
  email?: string;
  address?: string;
}

// ───────────────────────── Stickers ─────────────────────────

export interface Sticker {
  id: number;
  employeeId: number;
  employeeName: string | null;
  title: string;
  content: string | null;
  color: StickerColor;
  priority: StickerPriority;
  isRead: boolean;
  readAt: string | null;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string | null;
}

export interface StickerStats {
  total: number;
  unread: number;
  urgent: number;
}

export interface StickerListFilters {
  filter: StickerFilter;
  employeeId?: number | null;
  page: number;
  pageSize: number;
}

export interface CreateStickerRequest {
  employeeId: number;
  title: string;
  content?: string;
  color?: StickerColor;
  priority?: StickerPriority;
}
