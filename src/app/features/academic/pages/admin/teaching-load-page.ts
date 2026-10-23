import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ConfirmService, toApiError, ToastService } from '../../../../core';
import {
  type SelectOption,
  type TableAction,
  type TableActionEvent,
  type TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiChip,
  UiDataTable,
  UiFormField,
  UiModal,
  UiSelect,
} from '../../../../shared/ui';
import { isAutoToasted } from '../../data-access/academic.labels';
import type { TeachingLoadLine } from '../../data-access/academic.models';
import { AcademicStructureService } from '../../data-access/structure.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Carga académica de un salón: materias del grado con su docente (legacy `academic/assignments.php`). */
@Component({
  selector: 'app-teaching-load-page',
  imports: [
    FormsModule,
    RouterLink,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiChip,
    UiDataTable,
    UiFormField,
    UiModal,
    UiSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Carga académica: {{ load()?.classroom?.name ?? '…' }}</h1>
        <p class="page-header__subtitle">
          @if (load(); as l) {
            {{ l.classroom.gradeName }} · Año lectivo {{ l.classroom.academicYear }} · Director:
            {{ l.classroom.director?.name ?? 'sin asignar' }}
          } @else {
            Docentes por materia del salón
          }
        </p>
      </div>
      <div class="cluster">
        <a ui-button variant="ghost" icon="arrow-left" routerLink="/admin/academico">Volver</a>
        <button
          ui-button
          type="button"
          variant="primary"
          icon="plus"
          [disabled]="!unassigned().length"
          (click)="open(null)"
        >
          Asignar docente
        </button>
      </div>
    </div>

    @if (classrooms.hasValue() && classrooms.value().length > 1) {
      <nav class="chips" aria-label="Salones">
        @for (c of val(classrooms); track c.id) {
          <button ui-chip type="button" [active]="c.id === classroomId()" (click)="goTo(c.id)">
            {{ c.name }} ({{ c.gradeName }})
          </button>
        }
      </nav>
    }

    @if (unassigned().length && load()) {
      <ui-alert tone="warning" class="mb">
        {{ unassigned().length }} materia(s) del plan de estudios sin docente asignado.
      </ui-alert>
    }

    @if (data.error()) {
      <ui-alert tone="error" title="No se pudo cargar la carga académica">
        {{ data.error()?.message }}
      </ui-alert>
    } @else {
      <ui-data-table
        caption="Carga académica"
        [columns]="columns"
        [rows]="load()?.lines ?? []"
        [trackBy]="trackLine"
        [loading]="data.isLoading()"
        [actions]="actions"
        [rowClass]="rowClass"
        emptyTitle="El grado no tiene materias"
        emptyMessage="Agrega materias al plan de estudios del grado para asignar docentes."
        emptyIcon="briefcase"
        (action)="onAction($event)"
      >
        <ng-template uiCell="area" let-value="value">
          <ui-badge tone="neutral">{{ value || 'General' }}</ui-badge>
        </ng-template>
        <ng-template uiCell="teacher" let-row>
          @if (row.teacher) {
            <span class="teacher">{{ row.teacher.name }}</span>
            <span class="code font-mono">{{ row.teacher.code }}</span>
          } @else {
            <ui-badge tone="warning" dot>Sin docente</ui-badge>
          }
        </ng-template>
      </ui-data-table>
    }

    <ui-modal
      [(open)]="modal"
      [title]="editing() ? 'Cambiar docente' : 'Asignar docente'"
      [description]="load() ? 'Salón ' + load()!.classroom.name : ''"
      size="sm"
    >
      <div class="form">
        @if (formError()) {
          <ui-alert tone="error">{{ formError() }}</ui-alert>
        }
        <ui-form-field
          label="Materia"
          required
          [error]="touched() && !subjectId() ? 'Selecciona la materia.' : null"
        >
          <ui-select
            [options]="subjectOptions()"
            placeholder="Seleccione la materia…"
            [ngModel]="subjectId()"
            (ngModelChange)="subjectId.set($event)"
            [disabled]="!!editing()"
          />
        </ui-form-field>
        <ui-form-field
          label="Docente"
          required
          [hint]="teachers.isLoading() ? 'Cargando docentes…' : ''"
          [error]="touched() && !employeeId() ? 'Selecciona el docente.' : null"
        >
          <ui-select
            [options]="teacherOptions()"
            placeholder="Seleccione el docente…"
            [ngModel]="employeeId()"
            (ngModelChange)="employeeId.set($event)"
          />
        </ui-form-field>
      </div>
      <ng-container uiModalFooter>
        <button ui-button type="button" variant="ghost" (click)="modal.set(false)">Cancelar</button>
        <button ui-button type="button" variant="primary" [loading]="saving()" (click)="save()">
          Guardar
        </button>
      </ng-container>
    </ui-modal>
  `,
  styles: `
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-5);
    }
    .mb {
      display: block;
      margin-bottom: var(--space-4);
    }
    .teacher {
      display: block;
      font-weight: 600;
    }
    .code {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .form {
      display: grid;
      gap: var(--space-4);
    }
  `,
})
export class TeachingLoadPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly structure = inject(AcademicStructureService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  /** Parámetro de ruta `:classroomId`. */
  readonly classroomId = input.required({ transform: numberAttribute });

  protected readonly data = rxResource({
    params: () => this.classroomId(),
    stream: ({ params }) => this.structure.teachingLoad(params),
  });
  protected readonly load = computed(() => resourceValue(this.data, null));
  protected readonly classrooms = rxResource({
    params: () => this.load()?.classroom.academicYear,
    stream: ({ params }) => this.structure.classrooms(params),
  });
  protected readonly teachers = rxResource({
    params: () => (this.modal() ? true : undefined),
    stream: () => this.structure.teachers(),
  });
  protected readonly unassigned = computed(() =>
    (this.load()?.lines ?? []).filter((l) => l.assignmentId === null),
  );

  protected readonly columns: TableColumn<TeachingLoadLine>[] = [
    { key: 'subject', header: 'Materia', sortable: true, value: (l) => l.subject.name },
    { key: 'area', header: 'Área', value: (l) => l.subject.area, hideBelow: 'sm' },
    { key: 'teacher', header: 'Docente asignado', value: (l) => l.teacher?.name ?? '' },
    {
      key: 'hours',
      header: 'Intensidad',
      align: 'center',
      mono: true,
      value: (l) => l.subject.hoursPerWeek,
      format: (v) => `${v} h/s`,
      hideBelow: 'md',
    },
  ];
  protected readonly actions: TableAction<TeachingLoadLine>[] = [
    {
      id: 'assign',
      label: 'Asignar docente',
      icon: 'plus',
      hidden: (l) => l.assignmentId !== null,
    },
    {
      id: 'change',
      label: 'Cambiar docente',
      icon: 'pencil',
      hidden: (l) => l.assignmentId === null,
    },
    {
      id: 'remove',
      label: 'Quitar asignación',
      icon: 'trash',
      tone: 'danger',
      hidden: (l) => l.assignmentId === null,
    },
  ];
  protected readonly trackLine = (l: TeachingLoadLine) => l.subject.id;
  protected readonly rowClass = (l: TeachingLoadLine) =>
    l.assignmentId === null ? 'is-muted' : null;

  protected readonly modal = signal(false);
  protected readonly editing = signal<TeachingLoadLine | null>(null);
  protected readonly subjectId = signal<number | null>(null);
  protected readonly employeeId = signal<number | null>(null);
  protected readonly touched = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly subjectOptions = computed<SelectOption<number>[]>(() => {
    const editing = this.editing();
    const lines = editing ? [editing] : this.unassigned();
    return lines.map((l) => ({
      value: l.subject.id,
      label: `${l.subject.name} (${l.subject.area || 'General'})`,
    }));
  });
  protected readonly teacherOptions = computed<SelectOption<number>[]>(() =>
    resourceValue(this.teachers, []).map((t) => ({
      value: t.id,
      label: `${t.name} (${t.code})`,
    })),
  );

  protected goTo(id: number): void {
    void this.router.navigate(['/admin/academico/salones', id, 'carga']);
  }

  protected open(line: TeachingLoadLine | null): void {
    this.editing.set(line && line.assignmentId !== null ? line : null);
    this.subjectId.set(line?.subject.id ?? null);
    this.employeeId.set(line?.teacher?.id ?? null);
    this.touched.set(false);
    this.formError.set(null);
    this.modal.set(true);
  }

  protected save(): void {
    this.touched.set(true);
    const subjectId = this.subjectId();
    const employeeId = this.employeeId();
    if (!subjectId || !employeeId) return;
    const editing = this.editing();
    const request: Observable<unknown> = editing
      ? this.structure.changeTeacher(editing.assignmentId!, employeeId)
      : this.structure.assignTeacher({ employeeId, subjectId, classroomId: this.classroomId() });
    this.saving.set(true);
    this.formError.set(null);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.toast.success(editing ? 'Docente actualizado.' : 'Docente asignado.');
        this.data.reload();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.formError.set(toApiError(err).message);
      },
    });
  }

  protected async onAction({ action, row }: TableActionEvent<TeachingLoadLine>): Promise<void> {
    if (action === 'assign' || action === 'change') {
      this.open(row);
      return;
    }
    const ok = await this.confirm.ask({
      title: `¿Quitar a ${row.teacher?.name ?? 'el docente'} de ${row.subject.name}?`,
      message: 'La materia quedará sin docente en este salón.',
      confirmLabel: 'Quitar',
      tone: 'danger',
    });
    if (!ok || row.assignmentId === null) return;
    this.structure.removeAssignment(row.assignmentId).subscribe({
      next: () => {
        this.toast.success('Asignación eliminada.');
        this.data.reload();
      },
      error: (err: unknown) => {
        const e = toApiError(err);
        if (!isAutoToasted(e.status)) this.toast.error(e.message);
      },
    });
  }
}
