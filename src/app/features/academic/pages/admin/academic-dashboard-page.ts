import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ConfirmService, toApiError, ToastService } from '../../../../core';
import {
  type SelectOption,
  type TabItem,
  type TableAction,
  type TableActionEvent,
  type TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiFormField,
  UiInput,
  UiModal,
  UiSelect,
  UiStatCard,
  UiTabs,
} from '../../../../shared/ui';
import {
  isAutoToasted,
  LEVEL_LABELS,
  LEVEL_OPTIONS,
  levelLabel,
} from '../../data-access/academic.labels';
import type { Classroom, EducationLevel, GradeSummary } from '../../data-access/academic.models';
import { AcademicStructureService } from '../../data-access/structure.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/**
 * Gestión académica (legacy `academic/index.php`): KPIs del año lectivo,
 * grados con su plan de estudios y salones con director de grupo y capacidad.
 */
@Component({
  selector: 'app-academic-dashboard-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFormField,
    UiInput,
    UiModal,
    UiSelect,
    UiStatCard,
    UiTabs,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './academic-dashboard-page.html',
  styles: `
    .mb {
      margin-bottom: var(--space-6);
    }
    .year {
      min-width: 9rem;
    }
    .full {
      color: var(--color-danger);
      font-weight: 700;
    }
    .muted {
      color: var(--color-text-subtle);
      font-style: italic;
    }
    .form {
      display: grid;
      gap: var(--space-4);
    }
  `,
})
export class AcademicDashboardPage {
  private readonly structure = inject(AcademicStructureService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly year = signal<number | null>(null);
  protected readonly data = rxResource({
    params: () => ({ year: this.year() }),
    stream: ({ params }) => this.structure.dashboard(params.year),
  });
  protected readonly dashboard = computed(() => resourceValue(this.data, null));
  protected readonly currentYear = computed(() => this.dashboard()?.academicYear ?? null);
  protected readonly yearOptions = computed<SelectOption<number>[]>(() => {
    const y = this.currentYear() ?? new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1].map((v) => ({ value: v, label: String(v) }));
  });

  protected readonly tab = signal<string | null>('grades');
  protected readonly tabs = computed<TabItem[]>(() => [
    {
      id: 'grades',
      label: 'Grados y plan de estudios',
      icon: 'academic-cap',
      badge: this.dashboard()?.grades.length ?? null,
    },
    {
      id: 'classrooms',
      label: 'Salones / grupos',
      icon: 'building',
      badge: this.dashboard()?.classrooms.length ?? null,
    },
  ]);

  protected readonly gradeColumns: TableColumn<GradeSummary>[] = [
    { key: 'name', header: 'Grado', sortable: true },
    { key: 'level', header: 'Nivel', sortable: true },
    { key: 'subjectsCount', header: 'Materias', align: 'center', mono: true },
    { key: 'classroomsCount', header: 'Salones', align: 'center', mono: true, hideBelow: 'sm' },
    { key: 'studentsCount', header: 'Alumnos', align: 'center', mono: true },
  ];
  protected readonly gradeActions: TableAction<GradeSummary>[] = [
    { id: 'curriculum', label: 'Plan de estudios', icon: 'document-text' },
    { id: 'edit', label: 'Editar grado', icon: 'pencil' },
    { id: 'delete', label: 'Eliminar grado', icon: 'trash', tone: 'danger' },
  ];

  protected readonly classroomColumns: TableColumn<Classroom>[] = [
    { key: 'name', header: 'Salón', sortable: true },
    { key: 'gradeName', header: 'Grado', sortable: true },
    {
      key: 'director',
      header: 'Director de grupo',
      value: (c) => c.director?.name ?? '',
      hideBelow: 'md',
    },
    { key: 'capacity', header: 'Cap.', align: 'center', mono: true, hideBelow: 'sm' },
    { key: 'studentsCount', header: 'Alumnos', align: 'center', sortable: true },
  ];
  protected readonly classroomActions: TableAction<Classroom>[] = [
    { id: 'director', label: 'Asignar director', icon: 'user' },
    { id: 'load', label: 'Carga académica', icon: 'briefcase' },
    { id: 'edit', label: 'Editar salón', icon: 'pencil' },
    { id: 'delete', label: 'Eliminar salón', icon: 'trash', tone: 'danger' },
  ];

  protected readonly levelLabel = levelLabel;
  protected readonly levelOptions = LEVEL_OPTIONS;
  protected readonly gradeOptions = computed<SelectOption<number>[]>(() =>
    (this.dashboard()?.grades ?? []).map((g) => ({
      value: g.id,
      label: `${g.name} (${LEVEL_LABELS[g.level] ?? g.level})`,
    })),
  );

  // ─── Modal grado ─────────────────────────────────────────────────────────
  protected readonly gradeModal = signal(false);
  protected readonly editingGrade = signal<GradeSummary | null>(null);
  protected readonly gradeForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    level: this.fb.control<EducationLevel>('primaria', Validators.required),
  });

  // ─── Modal salón ─────────────────────────────────────────────────────────
  protected readonly classroomModal = signal(false);
  protected readonly editingClassroom = signal<Classroom | null>(null);
  protected readonly classroomForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    gradeId: this.fb.control<number | null>(null, Validators.required),
    capacity: this.fb.control<number | null>(30, [
      Validators.required,
      Validators.min(1),
      Validators.max(100),
    ]),
    academicYear: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(2000),
      Validators.max(2100),
    ]),
  });

  // ─── Modal director ──────────────────────────────────────────────────────
  protected readonly directorFor = signal<Classroom | null>(null);
  protected readonly directorModal = computed(() => this.directorFor() !== null);
  protected readonly directorId = signal<number | null>(null);
  protected readonly teachers = rxResource({
    params: () => (this.directorFor() ? true : undefined),
    stream: () => this.structure.teachers(),
  });
  protected readonly teacherOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: '— Ninguno / quitar director —' },
    ...resourceValue(this.teachers, []).map((t) => ({
      value: t.id,
      label: `${t.name} (${t.code})`,
    })),
  ]);

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected changeYear(year: number | null): void {
    this.year.set(year);
  }

  protected openGrade(grade: GradeSummary | null): void {
    this.editingGrade.set(grade);
    this.formError.set(null);
    this.gradeForm.reset({ name: grade?.name ?? '', level: grade?.level ?? 'primaria' });
    this.gradeModal.set(true);
  }

  protected saveGrade(): void {
    if (this.gradeForm.invalid) {
      this.gradeForm.markAllAsTouched();
      return;
    }
    const dto = this.gradeForm.getRawValue();
    const grade = this.editingGrade();
    this.run(
      grade ? this.structure.updateGrade(grade.id, dto) : this.structure.createGrade(dto),
      grade ? 'Grado actualizado.' : 'Grado creado.',
      () => this.gradeModal.set(false),
    );
  }

  protected openClassroom(classroom: Classroom | null): void {
    this.editingClassroom.set(classroom);
    this.formError.set(null);
    this.classroomForm.reset({
      name: classroom?.name ?? '',
      gradeId: classroom?.gradeId ?? null,
      capacity: classroom?.capacity ?? 30,
      academicYear: classroom?.academicYear ?? this.currentYear(),
    });
    this.classroomModal.set(true);
  }

  protected saveClassroom(): void {
    if (this.classroomForm.invalid) {
      this.classroomForm.markAllAsTouched();
      return;
    }
    const v = this.classroomForm.getRawValue();
    const dto = {
      name: v.name.trim(),
      gradeId: v.gradeId!,
      capacity: v.capacity!,
      academicYear: v.academicYear!,
    };
    const classroom = this.editingClassroom();
    this.run(
      classroom
        ? this.structure.updateClassroom(classroom.id, dto)
        : this.structure.createClassroom(dto),
      classroom ? 'Salón actualizado.' : 'Salón creado.',
      () => this.classroomModal.set(false),
    );
  }

  protected openDirector(classroom: Classroom): void {
    this.formError.set(null);
    this.directorId.set(classroom.director?.employeeId ?? null);
    this.directorFor.set(classroom);
  }

  protected closeDirector(): void {
    this.directorFor.set(null);
  }

  protected saveDirector(): void {
    const classroom = this.directorFor();
    if (!classroom) return;
    const id = this.directorId();
    this.run(
      this.structure.assignDirector(classroom.id, id),
      id ? 'Director de grupo asignado.' : 'Director de grupo retirado.',
      () => this.closeDirector(),
    );
  }

  protected async onGradeAction({ action, row }: TableActionEvent<GradeSummary>): Promise<void> {
    if (action === 'curriculum') {
      void this.router.navigate(['/admin/academico/grados', row.id, 'materias']);
    } else if (action === 'edit') {
      this.openGrade(row);
    } else if (action === 'delete') {
      const ok = await this.confirm.ask({
        title: `¿Eliminar el grado "${row.name}"?`,
        message: 'Solo se pueden eliminar grados sin salones ni materias.',
        confirmLabel: 'Eliminar',
        tone: 'danger',
      });
      if (ok) this.run(this.structure.deleteGrade(row.id), 'Grado eliminado.', undefined, true);
    }
  }

  protected async onClassroomAction({ action, row }: TableActionEvent<Classroom>): Promise<void> {
    if (action === 'director') this.openDirector(row);
    else if (action === 'load')
      void this.router.navigate(['/admin/academico/salones', row.id, 'carga']);
    else if (action === 'edit') this.openClassroom(row);
    else if (action === 'delete') {
      const ok = await this.confirm.ask({
        title: `¿Eliminar el salón "${row.name}"?`,
        message: 'Solo se pueden eliminar salones sin estudiantes activos ni carga académica.',
        confirmLabel: 'Eliminar',
        tone: 'danger',
      });
      if (ok) this.run(this.structure.deleteClassroom(row.id), 'Salón eliminado.', undefined, true);
    }
  }

  /** Ejecuta una mutación: toast de éxito, recarga y errores en el modal (o toast). */
  private run(
    request: Observable<unknown>,
    success: string,
    done?: () => void,
    toastErrors = false,
  ): void {
    this.saving.set(true);
    this.formError.set(null);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(success);
        done?.();
        this.data.reload();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const error = toApiError(err);
        if (!toastErrors) this.formError.set(error.message);
        else if (!isAutoToasted(error.status)) this.toast.error(error.message);
      },
    });
  }
}
