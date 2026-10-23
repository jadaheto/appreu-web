/**
 * Contratos de los inicios de cada portal:
 * - Admin: `GET /api/dashboard/admin` (`apreu-api/src/modules/dashboard`), widgets según el rol.
 * - Empleado: `GET /api/me/employee/dashboard` (módulo hr).
 * - Estudiante/acudiente: `GET /api/portal/context` + `GET /api/portal/students/:id/dashboard` (módulo students).
 */

// ───────────────────────────── Admin ─────────────────────────────

export interface MonthlyRevenuePoint {
  /** `YYYY-MM` */
  month: string;
  /** Abreviatura en español (`ene`). */
  label: string;
  amount: number;
}

export interface LevelCount {
  level: string;
  total: number;
}

export interface RecentPaymentRow {
  paymentId: number;
  receiptNumber: string | null;
  amount: number;
  method: string | null;
  /** `YYYY-MM-DD HH:mm:ss` (hora local del colegio). */
  paidAt: string | null;
  studentId: number;
  studentName: string;
  studentCode: string;
}

export type DebtRisk = 'low' | 'medium' | 'high' | 'critical';

export interface DebtorRow {
  studentId: number;
  studentName: string;
  studentCode: string;
  gradeName: string | null;
  balance: number;
  oldestDueDate: string;
  daysOverdue: number;
  risk: DebtRisk;
}

/** Widgets financieros (superadmin, admin, finanzas). */
export interface FinanceWidgets {
  todayRevenue: { amount: number; payments: number };
  overdue: { amount: number; debtors: number };
  averageTicket: { amount: number; month: string };
  monthlyRevenue: MonthlyRevenuePoint[];
  recentPayments: RecentPaymentRow[];
  topDebtors: DebtorRow[];
}

/** `GET /api/dashboard/admin`: los widgets que el rol no puede ver llegan en `null`. */
export interface AdminDashboard {
  today: string;
  academicYear: number;
  students: { active: number; total: number; byLevel: LevelCount[] };
  finance: FinanceWidgets | null;
  staff: { activeEmployees: number } | null;
  incidents: { pending: number } | null;
}

// ───────────────────────────── Empleado ─────────────────────────────

export interface EmployeeSummary {
  id: number;
  code: string;
  fullName: string;
  email: string | null;
  position: string | null;
  department: string | null;
  hireDate: string | null;
  status: string;
}

export interface PayslipSummary {
  paymentId: number;
  periodName: string;
  periodLabel: string;
  paymentDate: string | null;
  gross: number;
  totalDeductions: number;
  net: number;
  status: string;
}

/** `GET /api/me/employee/dashboard`. */
export interface EmployeeDashboard {
  employee: EmployeeSummary;
  monthsEmployed: number;
  lastPayslip: PayslipSummary | null;
  pendingLeaves: number;
  approvedLeavesThisYear: number;
  absenceDaysThisYear: number;
}

// ─────────────────────────── Estudiante / acudiente ───────────────────────────

export interface PlacementView {
  classroomId: number;
  classroomName: string;
  gradeId: number;
  gradeName: string;
  gradeLevel: string;
  academicYear: number;
}

export interface StudentSummary {
  id: number;
  code: string;
  fullName: string;
  firstName: string;
  lastName: string;
  initials: string;
  status: string;
  placement: PlacementView | null;
}

/** `GET /api/portal/context`: estudiantes visibles (el propio o los hijos activos). */
export interface PortalContext {
  role: string;
  students: StudentSummary[];
}

export interface IncidentSummary {
  id: number;
  type: string;
  priority: string;
  title: string;
  status: string;
  createdAt: string | null;
}

/** `GET /api/portal/students/:id/dashboard`. */
export interface StudentDashboard {
  student: StudentSummary;
  finance: { charged: number; paid: number; balance: number; overdueCount: number };
  performance: {
    academicYear: number;
    average: number | null;
    percentage: number | null;
    recordCount: number;
  };
  recentIncidents: IncidentSummary[];
}
