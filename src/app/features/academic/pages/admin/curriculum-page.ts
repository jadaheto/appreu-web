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
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmService, toApiError, ToastService } from '../../../../core';
import {
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
  UiInput,
  UiModal,
} from '../../../../shared/ui';
import { isAutoToasted, levelLabel } from '../../data-access/academic.labels';
import type { Subject } from '../../data-access/academic.models';
import { AcademicStructureService } from '../../data-access/structure.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Plan de estudios de un grado (legacy `academic/subjects.php`). */
@Component({
  selector: 'app-curriculum-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiChip,
    UiDataTable,
    UiFormField,
    UiInput,
    UiModal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Plan de estudios: {{ curriculum()?.grade?.name ?? '…' }}</h1>
        <p class="page-header__subtitle">
          @if (curriculum(); as c) {
            Nivel {{ levelLabel(c.grade.level) }} · {{ c.subjects.length }} materias ·
            {{ totalHours() }} horas semanales
          } @else {
            Materias del grado
          }
        </p>
      </div>
      <div class="cluster">
        <a ui-button variant="ghost" icon="arrow-left" routerLink="/admin/academico">Volver</a>
        <button ui-button type="button" variant="primary" icon="plus" (click)="open(null)">
          Nueva materia
        </button>
      </div>
    </div>

    @if (grades.hasValue() && grades.value().length > 1) {
      <nav class="chips" aria-label="Grados">
        @for (g of val(grades); track g.id) {
          <button ui-chip type="button" [active]="g.id === gradeId()" (click)="goTo(g.id)">
            {{ g.name }}
          </button>
        }
      </nav>
    }

    @if (data.error()) {
      <ui-alert tone="error" title="No se pudo cargar el plan de estudios">
        {{ data.error()?.message }}
      </ui-alert>
    } @else {
      <ui-data-table
        caption="Materias del grado"
        [columns]="columns"
        [rows]="curriculum()?.subjects ?? []"
        [loading]="data.isLoading()"
        [actions]="actions"
        emptyTitle="Sin materias"
        emptyMessage="Agrega la primera materia del plan de estudios."
        emptyIcon="document-text"
        (action)="onAction($event)"
      >
        <ng-template uiCell="area" let-value="value">
          <ui-badge tone="neutral">{{ value || 'General' }}</ui-badge>
        </ng-template>
      </ui-data-table>
    }

    <ui-modal [(open)]="modal" [title]="editing() ? 'Editar materia' : 'Nueva materia'">
      <form id="subject-form" class="form" [formGroup]="form" (ngSubmit)="save()">
        @if (formError()) {
          <ui-alert tone="error">{{ formError() }}</ui-alert>
        }
        <ui-form-field label="Nombre" required>
          <ui-input formControlName="name" placeholder="Ej: Matemáticas" [maxlength]="150" />
        </ui-form-field>
        <div class="grid grid--2">
          <ui-form-field label="Código" hint="Opcional, se guarda en mayúsculas">
            <ui-input formControlName="code" placeholder="MAT01" [maxlength]="20" mono />
          </ui-form-field>
          <ui-form-field label="Intensidad horaria" hint="Horas por semana (1–20)" required>
            <ui-input type="number" formControlName="hoursPerWeek" [min]="1" [max]="20" mono />
          </ui-form-field>
        </div>
        <ui-form-field label="Área" hint="Ej: Ciencias, Humanidades. Vacío = General">
          <ui-input formControlName="area" placeholder="Ciencias" [maxlength]="100" />
        </ui-form-field>
      </form>
      <ng-container uiModalFooter>
        <button ui-button type="button" variant="ghost" (click)="modal.set(false)">Cancelar</button>
        <button ui-button type="submit" form="subject-form" variant="primary" [loading]="saving()">
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
    .form {
      display: grid;
      gap: var(--space-4);
    }
  `,
})
export class CurriculumPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly structure = inject(AcademicStructureService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Parámetro de ruta `:gradeId` (component input binding). */
  readonly gradeId = input.required({ transform: numberAttribute });

  protected readonly data = rxResource({
    params: () => this.gradeId(),
    stream: ({ params }) => this.structure.curriculum(params),
  });
  protected readonly grades = rxResource({ stream: () => this.structure.grades() });
  protected readonly curriculum = computed(() => resourceValue(this.data, null));
  protected readonly totalHours = computed(() =>
    (this.curriculum()?.subjects ?? []).reduce((sum, s) => sum + s.hoursPerWeek, 0),
  );
  protected readonly levelLabel = levelLabel;

  protected readonly columns: TableColumn<Subject>[] = [
    { key: 'code', header: 'Código', mono: true, width: '8rem', hideBelow: 'sm' },
    { key: 'name', header: 'Materia', sortable: true },
    { key: 'area', header: 'Área', sortable: true },
    {
      key: 'hoursPerWeek',
      header: 'H. semanales',
      align: 'center',
      mono: true,
      format: (v) => `${v} h`,
    },
  ];
  protected readonly actions: TableAction<Subject>[] = [
    { id: 'edit', label: 'Editar materia', icon: 'pencil' },
    { id: 'delete', label: 'Eliminar materia', icon: 'trash', tone: 'danger' },
  ];

  protected readonly modal = signal(false);
  protected readonly editing = signal<Subject | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    code: ['', Validators.maxLength(20)],
    area: ['', Validators.maxLength(100)],
    hoursPerWeek: this.fb.control<number | null>(1, [
      Validators.required,
      Validators.min(1),
      Validators.max(20),
    ]),
  });

  protected goTo(id: number): void {
    void this.router.navigate(['/admin/academico/grados', id, 'materias']);
  }

  protected open(subject: Subject | null): void {
    this.editing.set(subject);
    this.formError.set(null);
    this.form.reset({
      name: subject?.name ?? '',
      code: subject?.code ?? '',
      area: subject?.area ?? '',
      hoursPerWeek: subject?.hoursPerWeek ?? 1,
    });
    this.modal.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const dto = {
      name: v.name.trim(),
      code: v.code.trim().toUpperCase() || undefined,
      area: v.area.trim() || undefined,
      hoursPerWeek: v.hoursPerWeek ?? 1,
    };
    const subject = this.editing();
    this.saving.set(true);
    this.formError.set(null);
    (subject
      ? this.structure.updateSubject(subject.id, dto)
      : this.structure.addSubject(this.gradeId(), dto)
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.toast.success(subject ? 'Materia actualizada.' : 'Materia agregada.');
        this.data.reload();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.formError.set(toApiError(err).message);
      },
    });
  }

  protected async onAction({ action, row }: TableActionEvent<Subject>): Promise<void> {
    if (action === 'edit') {
      this.open(row);
      return;
    }
    const ok = await this.confirm.ask({
      title: `¿Eliminar la materia "${row.name}"?`,
      message: 'Solo se pueden eliminar materias sin notas ni docentes asignados.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    this.structure.deleteSubject(row.id).subscribe({
      next: () => {
        this.toast.success('Materia eliminada.');
        this.data.reload();
      },
      error: (err: unknown) => {
        const e = toApiError(err);
        if (!isAutoToasted(e.status)) this.toast.error(e.message);
      },
    });
  }
}
