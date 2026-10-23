import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
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
  UiDataTable,
  UiFormField,
  UiInput,
  UiModal,
  UiSelect,
} from '../../../../shared/ui';
import {
  formatIsoDate,
  isAutoToasted,
  periodStatusLabel,
  periodStatusTone,
} from '../../data-access/academic.labels';
import type { AcademicPeriod } from '../../data-access/academic.models';
import { PeriodsService } from '../../data-access/periods.service';
import { resourceValue } from '../../../../core/resource/resource-value';

function dateOrder(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as string;
  const end = group.get('endDate')?.value as string;
  return start && end && start > end ? { dateRange: true } : null;
}

/**
 * Períodos académicos (legacy `academic/periods.php` + `close_period.php`):
 * crear/editar/eliminar, cerrar y reabrir, y generar los boletines del período.
 * Las transiciones de estado las valida la API.
 */
@Component({
  selector: 'app-periods-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFormField,
    UiInput,
    UiModal,
    UiSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Períodos académicos</h1>
        <p class="page-header__subtitle">
          Calendario del año lectivo {{ shownYear() }}. Solo el período abierto acepta notas.
        </p>
      </div>
      <div class="cluster">
        <ui-select
          class="year"
          ariaLabel="Año lectivo"
          placeholder="Año vigente"
          [options]="yearOptions"
          [ngModel]="year()"
          (ngModelChange)="year.set($event)"
        />
        <button ui-button type="button" variant="primary" icon="plus" (click)="open(null)">
          Nuevo período
        </button>
      </div>
    </div>

    @if (lastResult(); as r) {
      <ui-alert
        tone="success"
        title="Boletines generados"
        dismissible
        (dismissed)="lastResult.set(null)"
        class="mb"
      >
        Se generaron {{ r.generated }} boletines para {{ r.periodName }}. Ya están disponibles para
        estudiantes, acudientes y directores de grupo.
      </ui-alert>
    }

    @if (data.error()) {
      <ui-alert tone="error" title="No se pudieron cargar los períodos">
        {{ data.error()?.message }}
      </ui-alert>
    } @else {
      <ui-data-table
        caption="Períodos académicos"
        [columns]="columns"
        [rows]="periods()"
        [loading]="data.isLoading()"
        [actions]="actions"
        emptyTitle="Sin períodos"
        emptyMessage="Crea el primer período del año lectivo."
        emptyIcon="calendar"
        (action)="onAction($event)"
      >
        <ng-template uiCell="range" let-row>
          <span class="font-mono">{{ fmt(row.startDate) }} → {{ fmt(row.endDate) }}</span>
        </ng-template>
        <ng-template uiCell="status" let-row>
          <ui-badge [tone]="statusTone(row.status)" dot>{{ statusLabel(row.status) }}</ui-badge>
        </ng-template>
        <ng-template uiCell="bulletins" let-row>
          @switch (row.status) {
            @case ('bulletins_generated') {
              <span class="cluster tight">
                <ui-badge tone="success">Generados</ui-badge>
                <button
                  ui-button
                  type="button"
                  size="xs"
                  variant="ghost"
                  icon="arrows-up-down"
                  [loading]="generating() === row.id"
                  (click)="generate(row)"
                >
                  Regenerar
                </button>
              </span>
            }
            @case ('closed') {
              <button
                ui-button
                type="button"
                size="sm"
                variant="primary"
                icon="document-check"
                [loading]="generating() === row.id"
                (click)="generate(row)"
              >
                Generar ahora
              </button>
            }
            @default {
              <span class="text-muted">Esperando cierre</span>
            }
          }
        </ng-template>
      </ui-data-table>
    }

    <ui-modal [(open)]="modal" [title]="editing() ? 'Editar período' : 'Nuevo período'" size="sm">
      <form id="period-form" class="form" [formGroup]="form" (ngSubmit)="save()">
        @if (formError()) {
          <ui-alert tone="error">{{ formError() }}</ui-alert>
        }
        <ui-form-field label="Nombre" required>
          <ui-input formControlName="name" placeholder="Primer Período" [maxlength]="50" />
        </ui-form-field>
        <ui-form-field label="Fecha de inicio" required>
          <ui-input type="date" formControlName="startDate" />
        </ui-form-field>
        <ui-form-field
          label="Fecha de fin"
          required
          [error]="
            form.hasError('dateRange') && form.touched
              ? 'La fecha de fin debe ser posterior a la de inicio.'
              : null
          "
        >
          <ui-input type="date" formControlName="endDate" />
        </ui-form-field>
        @if (!editing()) {
          <p class="text-muted hint">
            El período se crea abierto solo si no hay otro abierto en el año.
          </p>
        }
      </form>
      <ng-container uiModalFooter>
        <button ui-button type="button" variant="ghost" (click)="modal.set(false)">Cancelar</button>
        <button ui-button type="submit" form="period-form" variant="primary" [loading]="saving()">
          Guardar
        </button>
      </ng-container>
    </ui-modal>
  `,
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-5);
    }
    .year {
      min-width: 9rem;
    }
    .tight {
      gap: var(--space-2);
    }
    .form {
      display: grid;
      gap: var(--space-4);
    }
    .hint {
      font-size: var(--text-sm);
    }
  `,
})
export class PeriodsPage {
  private readonly periodsApi = inject(PeriodsService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly year = signal<number | null>(null);
  protected readonly data = rxResource({
    params: () => ({ year: this.year() }),
    stream: ({ params }) => this.periodsApi.list(params.year),
  });
  protected readonly periods = computed(() => resourceValue(this.data, []));
  protected readonly shownYear = computed(
    () => this.year() ?? this.periods()[0]?.academicYear ?? '',
  );
  protected readonly yearOptions: SelectOption<number>[] = (() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1].map((v) => ({ value: v, label: String(v) }));
  })();

  protected readonly statusLabel = periodStatusLabel;
  protected readonly statusTone = periodStatusTone;
  protected readonly fmt = formatIsoDate;

  protected readonly columns: TableColumn<AcademicPeriod>[] = [
    { key: 'name', header: 'Nombre', sortable: true },
    {
      key: 'range',
      header: 'Rango de fechas',
      value: (p) => p.startDate,
      sortable: true,
      hideBelow: 'sm',
    },
    { key: 'status', header: 'Estado' },
    { key: 'bulletins', header: 'Boletines' },
  ];
  protected readonly actions: TableAction<AcademicPeriod>[] = [
    {
      id: 'close',
      label: 'Cerrar período',
      icon: 'lock-closed',
      hidden: (p) => p.status !== 'open',
    },
    {
      id: 'reopen',
      label: 'Reabrir período',
      icon: 'arrow-left',
      hidden: (p) => p.status === 'open',
    },
    { id: 'edit', label: 'Editar período', icon: 'pencil' },
    { id: 'delete', label: 'Eliminar período', icon: 'trash', tone: 'danger' },
  ];

  protected readonly modal = signal(false);
  protected readonly editing = signal<AcademicPeriod | null>(null);
  protected readonly saving = signal(false);
  protected readonly generating = signal<number | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly lastResult = signal<{ generated: number; periodName: string } | null>(null);
  protected readonly form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.maxLength(50)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    },
    { validators: dateOrder },
  );

  protected open(period: AcademicPeriod | null): void {
    this.editing.set(period);
    this.formError.set(null);
    this.form.reset({
      name: period?.name ?? '',
      startDate: period?.startDate?.slice(0, 10) ?? '',
      endDate: period?.endDate?.slice(0, 10) ?? '',
    });
    this.modal.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const dto = { name: v.name.trim(), startDate: v.startDate, endDate: v.endDate };
    const period = this.editing();
    const request = period
      ? this.periodsApi.update(period.id, dto)
      : this.periodsApi.create({ ...dto, academicYear: this.year() ?? undefined });
    this.saving.set(true);
    this.formError.set(null);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.toast.success(period ? 'Período actualizado.' : 'Período creado.');
        this.data.reload();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.formError.set(toApiError(err).message);
      },
    });
  }

  protected async generate(period: AcademicPeriod): Promise<void> {
    const regenerate = period.status === 'bulletins_generated';
    const ok = await this.confirm.ask({
      title: regenerate
        ? `¿Regenerar los boletines de ${period.name}?`
        : `¿Generar los boletines de ${period.name}?`,
      message:
        'Se calcularán los promedios de todos los estudiantes con notas en este período y los boletines quedarán disponibles en los portales.',
      confirmLabel: regenerate ? 'Regenerar' : 'Generar boletines',
    });
    if (!ok) return;
    this.generating.set(period.id);
    this.periodsApi.generateReportCards(period.id).subscribe({
      next: (r) => {
        this.generating.set(null);
        this.lastResult.set({ generated: r.generated, periodName: period.name });
        this.toast.success(`${r.generated} boletines generados.`);
        this.data.reload();
      },
      error: (err: unknown) => {
        this.generating.set(null);
        this.notifyError(err);
      },
    });
  }

  protected async onAction({ action, row }: TableActionEvent<AcademicPeriod>): Promise<void> {
    switch (action) {
      case 'edit':
        this.open(row);
        return;
      case 'close':
        if (
          await this.confirm.ask({
            title: `¿Cerrar ${row.name}?`,
            message: 'Los docentes ya no podrán registrar ni modificar notas en este período.',
            confirmLabel: 'Cerrar período',
            tone: 'danger',
          })
        )
          this.mutate(this.periodsApi.close(row.id), 'Período cerrado.');
        return;
      case 'reopen':
        if (
          await this.confirm.ask({
            title: `¿Reabrir ${row.name}?`,
            message:
              'Si hay otro período abierto en el año se cerrará. Los boletines generados deberán regenerarse si cambian las notas.',
            confirmLabel: 'Reabrir',
          })
        )
          this.mutate(this.periodsApi.reopen(row.id), 'Período reabierto.');
        return;
      case 'delete':
        if (
          await this.confirm.ask({
            title: `¿Eliminar ${row.name}?`,
            message: 'Solo se pueden eliminar períodos sin calificaciones.',
            confirmLabel: 'Eliminar',
            tone: 'danger',
          })
        )
          this.mutate(this.periodsApi.remove(row.id), 'Período eliminado.');
        return;
    }
  }

  private mutate(request: Observable<unknown>, success: string): void {
    request.subscribe({
      next: () => {
        this.toast.success(success);
        this.data.reload();
      },
      error: (err: unknown) => this.notifyError(err),
    });
  }

  private notifyError(err: unknown): void {
    const e = toApiError(err);
    if (!isAutoToasted(e.status)) this.toast.error(e.message);
  }
}
