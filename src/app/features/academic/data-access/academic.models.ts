/**
 * Contratos del contexto académico tal como los devuelve `apreu-api`
 * (`src/modules/academic/**`: structure, calendar, assessment, attendance, portal).
 */

// ─── Estructura (grados, materias, salones, carga docente) ──────────────────

export const EDUCATION_LEVELS = ['preescolar', 'primaria', 'secundaria', 'media'] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export interface Grade {
  id: number;
  name: string;
  level: EducationLevel;
}

export interface GradeSummary extends Grade {
  subjectsCount: number;
  classroomsCount: number;
  studentsCount: number;
}

export interface GradeInput {
  name: string;
  level?: EducationLevel;
}

export interface Subject {
  id: number;
  gradeId: number;
  name: string;
  code: string;
  area: string | null;
  hoursPerWeek: number;
}

export interface SubjectInput {
  name: string;
  code?: string;
  area?: string;
  hoursPerWeek?: number;
}

export interface GradeCurriculum {
  grade: Grade;
  subjects: Subject[];
}

export interface GroupDirector {
  employeeId: number;
  name: string;
  since: string;
}

export interface Classroom {
  id: number;
  name: string;
  gradeId: number;
  gradeName: string;
  gradeLevel: EducationLevel | null;
  capacity: number;
  academicYear: number;
  studentsCount: number;
  /** Informativo: estudiantes ≥ capacidad (lo calcula la API). */
  isFull: boolean;
  director: GroupDirector | null;
}

export interface ClassroomInput {
  gradeId: number;
  name: string;
  capacity?: number;
  academicYear?: number;
}

export interface Teacher {
  id: number;
  code: string;
  name: string;
  employeeType: string;
}

export interface TeachingAssignment {
  id: number;
  employeeId: number;
  subjectId: number;
  classroomId: number;
  academicYear: number;
}

export interface TeachingLoadLine {
  subject: Subject;
  /** `null` cuando la materia aún no tiene docente. */
  assignmentId: number | null;
  teacher: Teacher | null;
}

export interface ClassroomTeachingLoad {
  classroom: Classroom;
  lines: TeachingLoadLine[];
}

export interface AcademicDashboard {
  academicYear: number;
  totals: { grades: number; classrooms: number; teachingAssignments: number };
  grades: GradeSummary[];
  classrooms: Classroom[];
}

// ─── Calendario (períodos) ──────────────────────────────────────────────────

export type PeriodStatus = 'open' | 'closed' | 'bulletins_generated';

export interface AcademicPeriod {
  id: number;
  name: string;
  academicYear: number;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  closedAt: string | null;
  /** Solo el período abierto acepta notas. */
  acceptsGrades: boolean;
}

export interface PeriodInput {
  name: string;
  startDate: string;
  endDate: string;
  academicYear?: number;
}

export interface GenerateReportCardsResult {
  periodId: number;
  generated: number;
}

// ─── Evaluación (planillas, notas, boletines) ───────────────────────────────

export type PerformanceLevel = 'superior' | 'alto' | 'basico' | 'bajo';

export interface Performance {
  level: PerformanceLevel;
  label: string;
}

export interface GradeSheetRow {
  studentId: number;
  code: string;
  /** "APELLIDO NOMBRE". */
  fullName: string;
  cognitive: number | null;
  procedural: number | null;
  attitudinal: number | null;
  finalScore: number | null;
  passing: boolean | null;
  performance: Performance | null;
  observations: string | null;
}

export interface GradeSheet {
  classroom: { id: number; name: string; academicYear: number };
  subject: { id: number; name: string };
  period: { id: number; name: string; status: PeriodStatus };
  editable: boolean;
  weights: { cognitive: number; procedural: number; attitudinal: number };
  rows: GradeSheetRow[];
}

export interface GradeSheetQuery {
  classroomId: number;
  subjectId: number;
  periodId?: number | null;
}

export interface GradeEntry {
  studentId: number;
  cognitive: number | null;
  procedural: number | null;
  attitudinal: number | null;
  observations: string | null;
}

export interface SaveGradeSheetRequest {
  classroomId: number;
  subjectId: number;
  periodId: number;
  entries: GradeEntry[];
}

export interface GradeLine {
  subjectId: number;
  subjectName: string;
  area: string;
  teacherName: string | null;
  cognitive: number;
  procedural: number;
  attitudinal: number;
  finalScore: number;
  passing: boolean;
  performance: Performance;
  observations: string | null;
}

export interface StudentGrades {
  student: { id: number; code: string; fullName: string };
  academicYear: number;
  periods: { id: number; name: string; status: PeriodStatus }[];
  selectedPeriodId: number | null;
  lines: GradeLine[];
  average: number | null;
  averagePerformance: Performance | null;
  passing: boolean | null;
}

export interface ReportCardSummary {
  periodId: number;
  periodName: string;
  academicYear: number;
  startDate: string;
  endDate: string;
  averageScore: number;
  passing: boolean;
  performance: Performance;
  generatedAt: string;
  viewCount: number;
  lastViewedAt: string | null;
  documentPath: string;
}

export interface ReportCardDocument {
  institution: { name: string; nit: string | null; address: string | null; logo: string | null };
  student: { id: number; code: string; fullName: string; documentNumber: string | null };
  classroom: { name: string; gradeName: string } | null;
  groupDirectorName: string | null;
  period: { id: number; name: string; academicYear: number; startDate: string; endDate: string };
  lines: GradeLine[];
  averageScore: number;
  averagePerformance: Performance;
  passing: boolean;
  absences: number;
  generatedAt: string;
  viewCount: number;
}

export interface GroupReportCardRow {
  studentId: number;
  code: string;
  fullName: string;
  averageScore: number | null;
  passing: boolean | null;
  viewCount: number;
  status: 'generated' | 'pending';
}

export interface GroupReportCards {
  classroom: { id: number; name: string };
  period: { id: number; name: string };
  totals: {
    students: number;
    generated: number;
    groupAverage: number | null;
    topStudent: { studentId: number; fullName: string; averageScore: number } | null;
  };
  rows: GroupReportCardRow[];
}

// ─── Asistencia ─────────────────────────────────────────────────────────────

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'excused'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export type AttendanceSource = 'qr' | 'manual' | string;

export interface AttendanceRecord {
  id: number;
  date: string;
  time: string;
  status: AttendanceStatus;
  source: AttendanceSource;
  student: { id: number; fullName: string; code: string; documentNumber: string | null } | null;
  classroomName: string | null;
  subjectName: string | null;
  teacherName: string | null;
}

export type AttendanceTotals = Record<AttendanceStatus, number>;

export interface QrAttendanceRequest {
  rawQr: string;
  subjectId: number;
  classroomId: number;
}

export interface QrAttendanceResult {
  recordId: number;
  student: { id: number; firstName: string; lastName: string; documentNumber: string | null };
  date: string;
  time: string;
}

export interface ManualAttendanceRequest {
  classroomId: number;
  subjectId: number;
  date?: string;
  entries: { studentId: number; status: AttendanceStatus }[];
}

export interface DailyAttendanceQuery {
  date?: string | null;
  classroomId?: number | null;
  page?: number;
  limit?: number;
}

export interface DailyAttendanceReport {
  date: string;
  totals: AttendanceTotals;
  records: { items: AttendanceRecord[]; total: number; page: number; limit: number };
}

export interface StudentAttendance {
  student: { id: number; code: string; fullName: string };
  month: string;
  summary: AttendanceTotals & { daysAttended: number; totalRecords: number };
  /** Últimos registros (cualquier mes), más recientes primero. */
  recent: AttendanceRecord[];
}

// ─── Portal docente / director ──────────────────────────────────────────────

export interface MyTeachingAssignment {
  assignmentId: number;
  academicYear: number;
  classroom: { id: number; name: string; gradeName: string };
  subject: { id: number; name: string; area: string | null; hoursPerWeek: number };
  studentsCount: number;
}

export interface DirectorStudentRow {
  studentId: number;
  code: string;
  fullName: string;
  gender: 'M' | 'F' | 'O';
  documentType: string | null;
  documentNumber: string | null;
  phone: string | null;
}

export interface DirectorDashboard {
  classroom: Classroom;
  month: string;
  totals: {
    students: number;
    boys: number;
    girls: number;
    monthlyAbsences: number;
    critical: boolean;
  };
  students: DirectorStudentRow[];
}

// ─── Portal estudiante / acudiente (módulo students) ────────────────────────

export interface PortalStudent {
  id: number;
  code: string;
  fullName: string;
  firstName: string;
  lastName: string;
  initials: string;
  status: string;
  placement: {
    classroomId: number;
    classroomName: string;
    gradeId: number;
    gradeName: string;
    gradeLevel: string;
    academicYear: number;
  } | null;
}

export interface PortalContext {
  role: string;
  students: PortalStudent[];
}
