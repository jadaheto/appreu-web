import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { toApiError, ToastService } from '../../../../core';
import {
  type SelectOption,
  UiAlert,
  UiBadge,
  UiButton,
  UiEmptyState,
  UiFormField,
  UiSelect,
  UiSpinner,
} from '../../../../shared/ui';
import { GradeValue } from '../../components/grade-value';
import { PerformanceBadge } from '../../components/performance-badge';
import { periodStatusLabel, periodStatusTone } from '../../data-access/academic.labels';
import type { GradeEntry, GradeSheet } from '../../data-access/academic.models';
import { AssessmentService } from '../../data-access/assessment.service';
import { PeriodsService } from '../../data-access/periods.service';
import { TeacherPortalService } from '../../data-access/teacher-portal.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const MAX_OBSERVATIONS = 500;

/** Nota 0.0–5.0 con máximo un decimal (vacío = sin nota). */
export function scoreValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value as number | null;
  if (v === null || v === undefined || (v as unknown) === '') return null;
  if (typeof v !== 'number' || Number.isNaN(v)) return { score: true };
  if (v < 0 || v > 5) return { score: true };
  if (Math.abs(v * 10 - Math.round(v * 10)) > 1e-9) return { score: true };
  return null;
}

type RowForm = FormGroup<{
  studentId: FormControl<number>;
  cognitive: FormControl<number | null>;
  procedural: FormControl<number | null>;
  attitudinal: FormControl<number | null>;
  observations: FormControl<string>;
}>;

const COMPONENTS = [
  { key: 'cognitive', label: 'Cognitivo' },
  { key: 'procedural', label: 'Procedimental' },
  { key: 'attitudinal', label: 'Actitudinal' },
] as const;

/**
 * Planilla de notas del docente (legacy `academic/grades_entry.php`): elige
 * asignación (salón + materia) y período; registra cognitivo (60 %),
 * procedimental (30 %) y actitudinal (10 %) con guardado masivo. La nota
 * definitiva y el desempeño los calcula la API al guardar.
 */
@Component({
  selector: 'app-grade-entry-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    UiAlert,
    UiBadge,
    UiButton,
    UiEmptyState,
    UiFormField,
    UiSelect,
    UiSpinner,
    GradeValue,
    PerformanceBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grade-entry-page.html',
  styleUrl: './grade-entry-page.scss',
})
export class GradeEntryPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly portal = inject(TeacherPortalService);
  private readonly assessment = inject(AssessmentService);
  private readonly periodsApi = inject(PeriodsService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly components = COMPONENTS;
  protected readonly maxObservations = MAX_OBSERVATIONS;
  protected readonly statusLabel = periodStatusLabel;
  protected readonly statusTone = periodStatusTone;

  private readonly query = toSignal(
    this.route.queryParamMap.pipe(
      map((q) => ({
        classroomId: Number(q.get('classroomId')) || null,
        subjectId: Number(q.get('subjectId')) || null,
        periodId: Number(q.get('periodId')) || null,
      })),
    ),
    { initialValue: { classroomId: null, subjectId: null, periodId: null } },
  );

  protected readonly assignments = rxResource({ stream: () => this.portal.myAssignments() });
  protected readonly periods = rxResource({ stream: () => this.periodsApi.list() });

  protected readonly assignmentOptions = computed<SelectOption<string>[]>(() =>
    resourceValue(this.assignments, []).map((a) => ({
      value: `${a.classroom.id}:${a.subject.id}`,
      label: `${a.subject.name} — ${a.classroom.name} (${a.classroom.gradeName})`,
    })),
  );
  protected readonly periodOptions = computed<SelectOption<number>[]>(() =>
    resourceValue(this.periods, []).map((p) => ({
      value: p.id,
      label: `${p.name} (${periodStatusLabel(p.status)})`,
    })),
  );
  protected readonly openPeriod = computed(
    () => resourceValue(this.periods, []).find((p) => p.acceptsGrades) ?? null,
  );

  protected readonly selectedKey = computed(() => {
    const q = this.query();
    return q.classroomId && q.subjectId ? `${q.classroomId}:${q.subjectId}` : null;
  });
  protected readonly selectedPeriodId = computed(() => this.query().periodId);

  protected readonly sheet = rxResource({
    params: () => {
      const q = this.query();
      return q.classroomId && q.subjectId
        ? { classroomId: q.classroomId, subjectId: q.subjectId, periodId: q.periodId }
        : undefined;
    },
    stream: ({ params }) => this.assessment.gradeSheet(params),
  });
  protected readonly data = computed<GradeSheet | null>(() =>
    this.sheet.hasValue() ? (resourceValue(this.sheet) ?? null) : null,
  );

  protected readonly form = new FormArray<RowForm>([]);
  private readonly formVersion = signal(0);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly dirtyCount = computed(() => {
    this.formVersion();
    return this.form.controls.filter((c) => c.dirty).length;
  });
  protected readonly invalid = computed(() => {
    this.formVersion();
    return this.form.invalid;
  });

  constructor() {
    this.form.events.subscribe(() => this.formVersion.update((v) => v + 1));
    effect(() => {
      const sheet = this.data();
      untracked(() => this.buildForm(sheet));
    });
    // Preselecciona la única asignación del docente.
    effect(() => {
      const list = resourceValue(this.assignments, []);
      if (list.length === 1 && !untracked(this.selectedKey)) {
        untracked(() => this.selectAssignment(`${list[0].classroom.id}:${list[0].subject.id}`));
      }
    });
  }

  protected selectAssignment(key: string | null): void {
    const [classroomId, subjectId] = key ? key.split(':').map(Number) : [null, null];
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { classroomId, subjectId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected selectPeriod(periodId: number | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { periodId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected hasError(index: number, key: string): boolean {
    const c = this.form.at(index)?.get(key);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  protected save(): void {
    const sheet = this.data();
    if (!sheet?.editable) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formVersion.update((v) => v + 1);
      this.toast.warning('Revisa las notas marcadas: deben estar entre 0.0 y 5.0 con un decimal.');
      return;
    }
    const existing = new Set(
      sheet.rows.filter((r) => r.finalScore !== null).map((r) => r.studentId),
    );
    const entries: GradeEntry[] = this.form.controls
      .map((c) => c.getRawValue())
      .filter(
        (v) =>
          existing.has(v.studentId) ||
          v.cognitive !== null ||
          v.procedural !== null ||
          v.attitudinal !== null ||
          v.observations.trim() !== '',
      )
      .map((v) => ({
        studentId: v.studentId,
        cognitive: v.cognitive,
        procedural: v.procedural,
        attitudinal: v.attitudinal,
        observations: v.observations.trim() || null,
      }));
    if (!entries.length) {
      this.toast.info('No hay notas para guardar.');
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    this.assessment
      .saveGradeSheet({
        classroomId: sheet.classroom.id,
        subjectId: sheet.subject.id,
        periodId: sheet.period.id,
        entries,
      })
      .subscribe({
        next: (r) => {
          this.saving.set(false);
          this.toast.success(`Se guardaron ${r.saved} calificaciones.`);
          this.sheet.reload();
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.saveError.set(toApiError(err).message);
        },
      });
  }

  protected discard(): void {
    this.buildForm(this.data());
  }

  private buildForm(sheet: GradeSheet | null): void {
    this.form.clear({ emitEvent: false });
    for (const row of sheet?.rows ?? []) {
      const score = (v: number | null) =>
        new FormControl<number | null>(v, { validators: scoreValidator });
      this.form.push(
        new FormGroup({
          studentId: new FormControl(row.studentId, { nonNullable: true }),
          cognitive: score(row.cognitive),
          procedural: score(row.procedural),
          attitudinal: score(row.attitudinal),
          observations: new FormControl(row.observations ?? '', {
            nonNullable: true,
            validators: Validators.maxLength(MAX_OBSERVATIONS),
          }),
        }),
        { emitEvent: false },
      );
    }
    if (sheet && !sheet.editable) this.form.disable({ emitEvent: false });
    else this.form.enable({ emitEvent: false });
    this.form.markAsPristine();
    this.formVersion.update((v) => v + 1);
  }
}
