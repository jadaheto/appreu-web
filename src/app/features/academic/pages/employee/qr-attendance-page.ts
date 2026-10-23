import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { of } from 'rxjs';
import { toApiError, ToastService } from '../../../../core';
import {
  type SelectOption,
  type TabItem,
  UiAlert,
  UiBadge,
  UiButton,
  UiEmptyState,
  UiFormField,
  UiIcon,
  UiInput,
  UiSelect,
  UiSpinner,
  UiTabs,
} from '../../../../shared/ui';
import { QrScanner } from '../../components/qr-scanner';
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_OPTIONS,
  attendanceTone,
  todayIso,
} from '../../data-access/academic.labels';
import type { AttendanceStatus } from '../../data-access/academic.models';
import { AssessmentService } from '../../data-access/assessment.service';
import { AttendanceService } from '../../data-access/attendance.service';
import { PeriodsService } from '../../data-access/periods.service';
import { TeacherPortalService } from '../../data-access/teacher-portal.service';
import { resourceValue } from '../../../../core/resource/resource-value';

interface FeedItem {
  id: number;
  ok: boolean;
  title: string;
  detail: string;
  time: string;
}

const FAILED_ITEM_TTL_MS = 6000;
const MAX_FEED = 60;

/**
 * Asistencia por QR del carnet (legacy `employee/qr_scanner.php`) y pase de
 * lista manual. El QR firmado se lee con la cámara (`BarcodeDetector`) o se
 * escribe/pega (también sirve con lectores USB); la API valida firma, año y
 * salón, y toma el docente del token.
 */
@Component({
  selector: 'app-qr-attendance-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    UiAlert,
    UiBadge,
    UiButton,
    UiEmptyState,
    UiFormField,
    UiIcon,
    UiInput,
    UiSelect,
    UiSpinner,
    UiTabs,
    QrScanner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './qr-attendance-page.html',
  styleUrl: './qr-attendance-page.scss',
})
export class QrAttendancePage {
  private readonly portal = inject(TeacherPortalService);
  private readonly attendance = inject(AttendanceService);
  private readonly assessment = inject(AssessmentService);
  private readonly periodsApi = inject(PeriodsService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  protected readonly assignments = rxResource({ stream: () => this.portal.myAssignments() });
  protected readonly assignmentOptions = computed<SelectOption<string>[]>(() =>
    resourceValue(this.assignments, []).map((a) => ({
      value: `${a.classroom.id}:${a.subject.id}`,
      label: `${a.subject.name} — ${a.classroom.name}`,
    })),
  );
  protected readonly selectedKey = signal<string | null>(null);
  protected readonly selection = computed(() => {
    const key = this.selectedKey();
    if (!key) return null;
    const [classroomId, subjectId] = key.split(':').map(Number);
    return { classroomId, subjectId };
  });

  protected readonly tab = signal<string | null>('qr');
  protected readonly tabs: TabItem[] = [
    { id: 'qr', label: 'Lector QR', icon: 'qr-code' },
    { id: 'manual', label: 'Lista manual', icon: 'clipboard' },
  ];

  // ─── QR ──────────────────────────────────────────────────────────────────
  protected readonly codeForm = this.fb.group({
    rawQr: ['', [Validators.required, Validators.maxLength(200)]],
  });
  protected readonly registering = signal(false);
  protected readonly feed = signal<FeedItem[]>([]);
  protected readonly presentCount = computed(() => this.feed().filter((f) => f.ok).length);
  private nextId = 1;
  private readonly queue: string[] = [];

  // ─── Manual ──────────────────────────────────────────────────────────────
  protected readonly today = todayIso();
  protected readonly date = signal(this.today);
  protected readonly statusOptions = ATTENDANCE_OPTIONS;
  protected readonly statusLabels = ATTENDANCE_LABELS;
  protected readonly tone = attendanceTone;
  protected readonly periods = rxResource({ stream: () => this.periodsApi.list() });
  /** Lista del salón: la API no expone un roster para el docente; se usa la planilla de notas. */
  protected readonly roster = rxResource({
    params: () => {
      const sel = this.selection();
      if (!sel || this.tab() !== 'manual' || !this.periods.hasValue()) return undefined;
      const list = this.periods.value();
      const period = list.find((p) => p.acceptsGrades) ?? list[list.length - 1];
      return { ...sel, periodId: period?.id ?? null };
    },
    stream: ({ params }) => (params.periodId ? this.assessment.gradeSheet(params) : of(null)),
  });
  protected readonly rosterRows = computed(() =>
    this.roster.hasValue() ? (resourceValue(this.roster)?.rows ?? []) : [],
  );
  protected readonly marks = signal<Record<number, AttendanceStatus>>({});
  protected readonly savingManual = signal(false);
  protected readonly manualError = signal<string | null>(null);
  protected readonly markCounts = computed(() => {
    const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const row of this.rosterRows()) counts[this.marks()[row.studentId] ?? 'present']++;
    return counts;
  });

  constructor() {
    effect(() => {
      const list = resourceValue(this.assignments, []);
      if (list.length === 1 && !untracked(this.selectedKey)) {
        this.selectedKey.set(`${list[0].classroom.id}:${list[0].subject.id}`);
      }
    });
    effect(() => {
      this.rosterRows();
      untracked(() => this.marks.set({}));
    });
    inject(DestroyRef).onDestroy(() => this.timers.forEach((t) => clearTimeout(t)));
  }

  protected changeAssignment(key: string | null): void {
    this.selectedKey.set(key);
    this.feed.set([]);
  }

  protected onDetected(raw: string): void {
    this.register(raw);
  }

  protected submitCode(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }
    this.register(this.codeForm.getRawValue().rawQr.trim());
    this.codeForm.reset();
  }

  private register(rawQr: string): void {
    const sel = this.selection();
    if (!sel) {
      this.toast.warning('Selecciona la materia y el salón antes de escanear.');
      return;
    }
    if (this.registering()) {
      this.queue.push(rawQr);
      return;
    }
    this.registering.set(true);
    this.attendance.registerQr({ rawQr, ...sel }).subscribe({
      next: (r) => {
        this.push({
          ok: true,
          title: `${r.student.firstName} ${r.student.lastName}`,
          detail: r.student.documentNumber
            ? `Doc. ${r.student.documentNumber}`
            : 'Asistencia registrada',
          time: r.time,
        });
        this.beep();
        this.next();
      },
      error: (err: unknown) => {
        this.push({
          ok: false,
          title: 'Escaneo inválido',
          detail: toApiError(err).message,
          time: new Date().toTimeString().slice(0, 8),
        });
        this.next();
      },
    });
  }

  private next(): void {
    this.registering.set(false);
    const pending = this.queue.shift();
    if (pending) this.register(pending);
  }

  private push(item: Omit<FeedItem, 'id'>): void {
    const entry: FeedItem = { ...item, id: this.nextId++ };
    this.feed.update((list) => [entry, ...list].slice(0, MAX_FEED));
    if (!entry.ok) {
      const t = setTimeout(() => {
        this.feed.update((list) => list.filter((f) => f.id !== entry.id));
        this.timers.delete(t);
      }, FAILED_ITEM_TTL_MS);
      this.timers.add(t);
    }
  }

  /** Tono corto de confirmación (Web Audio); silencioso si no está disponible. */
  private beep(): void {
    try {
      const Ctx = (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      osc.onended = () => void ctx.close();
    } catch {
      /* sin audio */
    }
  }

  // ─── Manual ──────────────────────────────────────────────────────────────

  protected statusOf(studentId: number): AttendanceStatus {
    return this.marks()[studentId] ?? 'present';
  }

  protected mark(studentId: number, status: AttendanceStatus | null): void {
    this.marks.update((m) => ({ ...m, [studentId]: status ?? 'present' }));
  }

  protected markAll(status: AttendanceStatus): void {
    const next: Record<number, AttendanceStatus> = {};
    for (const row of this.rosterRows()) next[row.studentId] = status;
    this.marks.set(next);
  }

  protected saveManual(): void {
    const sel = this.selection();
    const rows = this.rosterRows();
    if (!sel || !rows.length) return;
    if (!this.date() || this.date() > this.today) {
      this.manualError.set('La fecha no puede ser futura.');
      return;
    }
    this.savingManual.set(true);
    this.manualError.set(null);
    this.attendance
      .registerManual({
        ...sel,
        date: this.date(),
        entries: rows.map((r) => ({ studentId: r.studentId, status: this.statusOf(r.studentId) })),
      })
      .subscribe({
        next: (r) => {
          this.savingManual.set(false);
          this.toast.success(`Asistencia guardada para ${r.saved} estudiantes.`);
        },
        error: (err: unknown) => {
          this.savingManual.set(false);
          this.manualError.set(toApiError(err).message);
        },
      });
  }
}
