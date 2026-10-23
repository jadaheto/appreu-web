/**
 * Modelos del contexto de estudiantes, acudientes, certificados e incidencias.
 * Reflejan los read models de `apreu-api/src/modules/students/application`
 * (`views.ts`, assemblers y casos de uso). Las fechas llegan como ISO string.
 */
import type { BadgeTone, SelectOption } from '../../../shared/ui';

// ---------------------------------------------------------------- Catálogos

export const STUDENT_STATUSES = [
  'active',
  'inactive',
  'graduated',
  'withdrawn',
  'suspended',
] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const STUDENT_DOCUMENT_TYPES = ['TI', 'CC', 'CE', 'PP', 'RC'] as const;
export type StudentDocumentType = (typeof STUDENT_DOCUMENT_TYPES)[number];

export const GUARDIAN_DOCUMENT_TYPES = ['cc', 'ti', 'ce', 'pa', 'rc'] as const;
export type GuardianDocumentType = (typeof GUARDIAN_DOCUMENT_TYPES)[number];

export const RELATIONSHIPS = ['padre', 'madre', 'abuelo', 'abuela', 'tio', 'tia', 'otro'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const GENDERS = ['M', 'F', 'O'] as const;
export type Gender = (typeof GENDERS)[number];

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

export const INCIDENT_TYPES = [
  'incapacidad',
  'salida_clase',
  'firma_libro',
  'izada_bandera',
  'baja_estudiante',
  'ajuste_pago',
  'cierre_caja',
  'otra',
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];
/** Tipos que un estudiante/acudiente puede reportar (el cierre de caja es solo del personal). */
export const PORTAL_INCIDENT_TYPES: readonly IncidentType[] = INCIDENT_TYPES.filter(
  (t) => t !== 'cierre_caja',
);

export const INCIDENT_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type IncidentPriority = (typeof INCIDENT_PRIORITIES)[number];

export const INCIDENT_STATUSES = [
  'pending',
  'in_review',
  'approved',
  'rejected',
  'closed',
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];
export type ReviewAction = Exclude<IncidentStatus, 'pending'>;

/**
 * Transiciones que el backend permite (dominio `incident.ts`). Solo se usan para
 * decidir qué botones mostrar; la API valida igualmente.
 */
export const REVIEW_TRANSITIONS: Record<IncidentStatus, readonly ReviewAction[]> = {
  pending: ['in_review', 'approved', 'rejected'],
  in_review: ['approved', 'rejected'],
  approved: ['closed'],
  rejected: ['closed'],
  closed: [],
};

export const CERTIFICATE_STATUSES = ['pending', 'approved', 'generated', 'cancelled'] as const;
export type CertificateStatus = (typeof CERTIFICATE_STATUSES)[number];
export const CERTIFICATE_TYPES = ['certificado_estudiantil'] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

/** Tamaño máximo y formatos aceptados para la foto (`domain/student-photo.ts`). */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

// ---------------------------------------------------------------- Etiquetas

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  graduated: 'Graduado',
  withdrawn: 'Retirado',
  suspended: 'Suspendido',
};
export const STUDENT_STATUS_TONES: Record<StudentStatus, BadgeTone> = {
  active: 'success',
  inactive: 'neutral',
  graduated: 'info',
  withdrawn: 'warning',
  suspended: 'danger',
};

export const STUDENT_DOCUMENT_LABELS: Record<StudentDocumentType, string> = {
  TI: 'Tarjeta de identidad',
  RC: 'Registro civil',
  CC: 'Cédula de ciudadanía',
  PP: 'Pasaporte',
  CE: 'Cédula de extranjería',
};
export const GUARDIAN_DOCUMENT_LABELS: Record<GuardianDocumentType, string> = {
  cc: 'Cédula de ciudadanía',
  ti: 'Tarjeta de identidad',
  ce: 'Cédula de extranjería',
  pa: 'Pasaporte',
  rc: 'Registro civil',
};
export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  padre: 'Padre',
  madre: 'Madre',
  abuelo: 'Abuelo',
  abuela: 'Abuela',
  tio: 'Tío',
  tia: 'Tía',
  otro: 'Otro',
};
export const GENDER_LABELS: Record<Gender, string> = { M: 'Masculino', F: 'Femenino', O: 'Otro' };

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  incapacidad: 'Incapacidad',
  salida_clase: 'Salida de clase',
  firma_libro: 'Firma de libro',
  izada_bandera: 'Izada de bandera',
  baja_estudiante: 'Baja de estudiante',
  ajuste_pago: 'Ajuste de pago',
  cierre_caja: 'Cierre de caja',
  otra: 'Otra',
};
export const INCIDENT_PRIORITY_LABELS: Record<IncidentPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};
export const INCIDENT_PRIORITY_TONES: Record<IncidentPriority, BadgeTone> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};
export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  pending: 'Pendiente',
  in_review: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  closed: 'Cerrada',
};
export const INCIDENT_STATUS_TONES: Record<IncidentStatus, BadgeTone> = {
  pending: 'warning',
  in_review: 'info',
  approved: 'success',
  rejected: 'danger',
  closed: 'neutral',
};
export const REVIEW_ACTION_LABELS: Record<ReviewAction, string> = {
  in_review: 'Marcar en revisión',
  approved: 'Aprobar',
  rejected: 'Rechazar',
  closed: 'Cerrar',
};

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  pending: 'Solicitado',
  approved: 'Aprobado',
  generated: 'Generado',
  cancelled: 'Anulado',
};
export const CERTIFICATE_STATUS_TONES: Record<CertificateStatus, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  generated: 'success',
  cancelled: 'neutral',
};
export const CERTIFICATE_TYPE_LABELS: Record<CertificateType, string> = {
  certificado_estudiantil: 'Certificado estudiantil',
};

/** Etiqueta segura para valores que pueden venir fuera del catálogo. */
export function labelOf<K extends string>(
  labels: Record<K, string>,
  value: string | null | undefined,
): string {
  if (!value) return '—';
  return (labels as Record<string, string>)[value] ?? value;
}
export function toneOf<K extends string>(
  tones: Record<K, BadgeTone>,
  value: string | null | undefined,
): BadgeTone {
  return (value && (tones as Record<string, BadgeTone>)[value]) || 'neutral';
}

/** Opciones para `ui-select` a partir de un catálogo y sus etiquetas. */
export function optionsOf<K extends string>(
  values: readonly K[],
  labels: Record<K, string>,
): SelectOption<K>[] {
  return values.map((value) => ({ value, label: labels[value] }));
}

/** `true` si el certificado se puede imprimir (aprobado o generado). */
export function isPrintable(certificate: Pick<CertificateView, 'status'>): boolean {
  return certificate.status === 'approved' || certificate.status === 'generated';
}

// ---------------------------------------------------------------- Read models

export interface PlacementView {
  classroomId: number;
  classroomName: string;
  gradeId: number;
  gradeName: string;
  gradeLevel: string;
  academicYear: number;
}

export interface GuardianView {
  id: number;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  relationship: string;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  occupation: string | null;
  hasPortalAccount: boolean;
}

export interface GuardianDetailView extends GuardianView {
  students: { id: number; code: string; fullName: string; status: string }[];
}

export interface StudentSummaryView {
  id: number;
  code: string;
  fullName: string;
  firstName: string;
  lastName: string;
  initials: string;
  email: string | null;
  gender: string;
  status: string;
  scholarshipPct: number;
  photoAvailable: boolean;
  placement: PlacementView | null;
  guardian: { id: number; fullName: string; mobile: string | null } | null;
}

export interface StudentView extends StudentSummaryView {
  documentType: string;
  documentNumber: string | null;
  birthDate: string | null;
  bloodType: string | null;
  address: string | null;
  city: string | null;
  neighborhood: string | null;
  phone: string | null;
  eps: string | null;
  notes: string | null;
  enrollmentDate: string | null;
  academicYear: number | null;
  hasPortalAccount: boolean;
  guardianDetails: GuardianView | null;
}

export interface IncidentView {
  id: number;
  studentId: number | null;
  requestedBy: number | null;
  reviewedBy: number | null;
  type: string;
  priority: string;
  title: string;
  description: string | null;
  reviewNotes: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface IncidentDetailView extends IncidentView {
  studentName: string | null;
  requestedByName: string | null;
  reviewedByName: string | null;
}

export type IncidentKpis = Record<IncidentStatus, number>;

export interface CertificateSnapshot {
  studentName: string;
  studentCode: string;
  documentType: string;
  documentNumber: string | null;
  gradeName: string | null;
  classroomName: string | null;
  academicYear: number;
  studentStatus: string;
  enrollmentDate: string | null;
}

export interface CertificateView {
  id: number;
  studentId: number;
  type: string;
  status: string;
  paymentId: number | null;
  notes: string | null;
  verificationCode: string | null;
  issuedAt: string | null;
  snapshot: CertificateSnapshot | null;
}

export interface CertificateDocumentView {
  certificate: CertificateView;
  institution: {
    name: string;
    nit: string;
    city: string;
    logo: string | null;
    signature: string | null;
    rectorName: string;
  };
  text: { title: string; paragraphs: string[]; issuedOn: string };
}

export interface CertificateVerificationView {
  valid: boolean;
  status: string;
  type: string;
  schoolName: string;
  studentName: string | null;
  document: string | null;
  gradeName: string | null;
  academicYear: number | null;
  issuedAt: string | null;
}

export interface FinancialSummary {
  charged: number;
  paid: number;
  balance: number;
  overdueCount: number;
}

export interface PendingCharge {
  chargeId: number;
  concept: string;
  category: string | null;
  description: string;
  dueDate: string;
  netAmount: number;
  applied: number;
  pending: number;
  status: string;
  isOverdue: boolean;
}

export interface PaymentRecord {
  paymentId: number;
  receiptNumber: string | null;
  amount: number;
  method: string;
  paidAt: string;
  status: string;
  reference: string | null;
  notes: string | null;
  concepts: string[];
}

export interface StudentFinancialView {
  summary: FinancialSummary;
  pendingCharges: PendingCharge[];
  payments: PaymentRecord[];
}

/** Ficha 360 (`GET /students/:id`). */
export interface StudentProfileView {
  student: StudentView;
  finance: FinancialSummary & { recentPayments: PaymentRecord[] };
  incidents: IncidentDetailView[];
  certificates: CertificateView[];
}

export interface StudentIdCardView {
  institution: { name: string; nit: string; city: string; logo: string | null; logoSize: number };
  academicYear: number;
  student: {
    id: number;
    fullName: string;
    initials: string;
    code: string;
    documentType: string;
    documentNumber: string | null;
    bloodType: string | null;
    status: string;
    photoAvailable: boolean;
    placement: PlacementView | null;
  };
  guardian: { fullName: string; mobile: string | null } | null;
  /** Texto firmado `APREU1|tenant|studentId|year|firma`; el QR se dibuja en el cliente. */
  qr: string;
}

export type AccountHolder = 'student' | 'guardian';
export interface ProvisionedAccount {
  holder: AccountHolder;
  status: 'created' | 'linked' | 'already_linked' | 'skipped';
  userId: number | null;
  email: string | null;
  temporaryPassword: string | null;
  reason: string | null;
}
export interface ResetPasswordResult {
  email: string;
  temporaryPassword: string;
}

export interface EnrollStudentResult {
  student: StudentView;
  guardianReused: boolean;
  accounts: ProvisionedAccount[];
}

export interface PortalContextView {
  role: string;
  students: StudentSummaryView[];
}

/** Catálogo académico (contexto `academic`). */
export interface GradeOption {
  id: number;
  name: string;
  level: string;
}
export interface ClassroomOption {
  id: number;
  name: string;
  gradeId: number;
  gradeName: string;
  academicYear: number;
  capacity: number;
  studentsCount: number;
  isFull: boolean;
}

// ---------------------------------------------------------------- Entradas

export interface StudentFilters {
  search?: string | null;
  status?: StudentStatus | null;
  gradeId?: number | null;
  classroomId?: number | null;
  year?: number | null;
  page: number;
  pageSize: number;
}

export interface StudentDetailsInput {
  firstName: string;
  lastName: string;
  documentType?: StudentDocumentType;
  documentNumber: string;
  birthDate?: string;
  gender?: Gender;
  bloodType?: BloodType;
  address?: string;
  city?: string;
  neighborhood?: string;
  phone?: string;
  email?: string;
  eps?: string;
  scholarshipPct?: number;
  notes?: string;
}

export interface GuardianDetailsInput {
  documentType?: GuardianDocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  relationship?: Relationship;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  occupation?: string;
}

export interface EnrollStudentInput {
  student: StudentDetailsInput;
  classroomId?: number;
  enrollmentDate?: string;
  guardianId?: number;
  guardian?: GuardianDetailsInput;
  createPortalAccounts?: boolean;
}

export interface UpdateStudentInput extends StudentDetailsInput {
  /** `null` quita el salón; omitido lo conserva. */
  classroomId?: number | null;
}

export interface IncidentFilters {
  status?: IncidentStatus | null;
  type?: IncidentType | null;
  studentId?: number | null;
  page: number;
  pageSize: number;
}

export interface CreateIncidentInput {
  type?: IncidentType;
  priority?: IncidentPriority;
  title: string;
  description?: string;
  studentId?: number;
}

export interface ReportIncidentInput {
  type?: IncidentType;
  title: string;
  description?: string;
}

/** Elimina claves con `undefined`, `null` o texto vacío (la API rechaza `''` en campos con formato). */
export function compact<T extends object>(value: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    result[key] = typeof v === 'string' ? v.trim() : v;
  }
  return result as T;
}

/** Logo institucional: solo se muestra si es una URL utilizable por el navegador. */
export function usableImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return /^(https?:|data:image\/|\/)/i.test(value) ? value : null;
}
