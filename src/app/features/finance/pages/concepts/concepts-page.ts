import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, ConfirmService, ToastService } from '../../../../core';
import {
  formatCop,
  SelectOption,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiEmptyState,
  UiFormField,
  UiInput,
  UiModal,
  UiSelect,
  UiTabs,
  UiTextarea,
  TabItem,
} from '../../../../shared/ui';
import { CATEGORY_OPTIONS, categoryLabel, errorMessage } from '../../data-access/finance-labels';
import type {
  BillingConcept,
  ConceptCategory,
  TuitionRate,
} from '../../data-access/finance.models';
import { FinanceService } from '../../data-access/finance.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** `/admin/finanzas/conceptos` — conceptos de cobro y tarifas (mensualidades) por grado. */
@Component({
  selector: 'app-concepts-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiEmptyState,
    UiFormField,
    UiInput,
    UiModal,
    UiSelect,
    UiTabs,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './concepts-page.html',
  styles: `
    .panel {
      padding-top: var(--space-5);
    }
    .mb {
      display: block;
      margin-bottom: var(--space-5);
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }
    .year {
      width: 9rem;
    }
    .rates {
      width: 100%;
      border-collapse: collapse;
    }
    .rates th,
    .rates td {
      padding: 0.4rem;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--color-border-soft);
    }
    .rates th {
      font-size: var(--text-xs);
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .scroll {
      overflow-x: auto;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
    }
    small {
      display: block;
    }
  `,
})
export class ConceptsPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly finance = inject(FinanceService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;

  /** Crear/editar conceptos y tarifas es exclusivo del administrador (la API lo valida). */
  protected readonly isAdmin = computed(
    () => this.auth.role() !== null && this.auth.hasRole('admin'),
  );

  protected readonly tabs: TabItem[] = [
    { id: 'conceptos', label: 'Conceptos de cobro', icon: 'tag' },
    { id: 'tarifas', label: 'Tarifas por grado', icon: 'academic-cap' },
  ];
  protected readonly tab = signal<string | null>('conceptos');

  // ── Conceptos ──────────────────────────────────────────────
  protected readonly concepts = rxResource({ stream: () => this.finance.concepts() });
  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly category = categoryLabel;
  protected readonly columns: TableColumn<BillingConcept>[] = [
    { key: 'name', header: 'Nombre', sortable: true },
    {
      key: 'code',
      header: 'Código',
      mono: true,
      hideBelow: 'md',
      format: (v) => (v as string) || '—',
    },
    {
      key: 'category',
      header: 'Categoría',
      hideBelow: 'md',
      format: (v) => categoryLabel(v as string),
    },
    {
      key: 'amount',
      header: 'Monto base',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
    { key: 'taxRate', header: 'IVA %', align: 'end', mono: true, hideBelow: 'lg' },
    { key: 'isActive', header: 'Estado' },
  ];
  protected readonly actions = computed<TableAction<BillingConcept>[]>(() =>
    this.isAdmin()
      ? [
          { id: 'edit', label: 'Editar', icon: 'pencil' },
          {
            id: 'deactivate',
            label: 'Desactivar',
            icon: 'eye-slash',
            tone: 'danger',
            hidden: (c) => !c.isActive,
          },
          { id: 'activate', label: 'Activar', icon: 'eye', hidden: (c) => c.isActive },
        ]
      : [],
  );

  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<BillingConcept | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    code: ['', Validators.maxLength(30)],
    category: this.fb.control<ConceptCategory | null>('pension'),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    taxRate: this.fb.control<number | null>(0, [Validators.min(0), Validators.max(100)]),
    description: ['', Validators.maxLength(255)],
  });

  protected openNew(): void {
    this.editing.set(null);
    this.form.reset({ category: 'pension', taxRate: 0 });
    this.formError.set(null);
    this.modalOpen.set(true);
  }

  protected async onAction(e: TableActionEvent<BillingConcept>): Promise<void> {
    const c = e.row;
    if (e.action === 'edit') {
      this.editing.set(c);
      this.form.reset({
        name: c.name,
        code: c.code ?? '',
        category: c.category,
        amount: c.amount,
        taxRate: c.taxRate,
        description: c.description ?? '',
      });
      this.formError.set(null);
      this.modalOpen.set(true);
      return;
    }
    const active = e.action === 'activate';
    if (!active) {
      const ok = await this.confirm.ask({
        title: `¿Desactivar "${c.name}"?`,
        message: 'No se podrá usar para nuevos cobros. Los cobros existentes no cambian.',
        confirmLabel: 'Desactivar',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.finance.setConceptActive(c.id, active).subscribe({
      next: () => {
        this.toast.success(active ? 'Concepto activado.' : 'Concepto desactivado.');
        this.concepts.reload();
      },
      error: (err) => this.toast.error(errorMessage(err)),
    });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const dto = {
      name: v.name.trim(),
      code: v.code.trim() || undefined,
      category: v.category ?? undefined,
      amount: Number(v.amount),
      taxRate: v.taxRate ?? 0,
      description: v.description.trim() || undefined,
    };
    const current = this.editing();
    this.saving.set(true);
    (current
      ? this.finance.updateConcept(current.id, dto)
      : this.finance.createConcept(dto)
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(current ? 'Concepto actualizado.' : 'Concepto creado.');
        this.concepts.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(errorMessage(err));
      },
    });
  }

  // ── Tarifas por grado ──────────────────────────────────────
  protected readonly year = signal<number | null>(null);
  protected readonly yearDraft = signal<number | null>(new Date().getFullYear());
  protected readonly schedule = rxResource({
    params: () => ({ year: this.year() }),
    stream: ({ params }) => this.finance.tuition(params.year),
  });
  protected readonly grades = rxResource({ stream: () => this.finance.grades() });
  protected readonly gradeOptions = computed<SelectOption<number>[]>(() =>
    (resourceValue(this.grades) ?? []).map((g) => ({ value: g.id, label: g.name })),
  );
  protected readonly gradeName = computed(() => {
    const map = new Map((resourceValue(this.grades) ?? []).map((g) => [g.id, g.name]));
    return (id: number | null) => (id ? (map.get(id) ?? `Grado #${id}`) : '—');
  });
  protected readonly rateConceptOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'General (todas las mensualidades)' },
    ...(resourceValue(this.concepts) ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]);
  protected readonly rates = this.fb.array<ReturnType<ConceptsPage['rateGroup']>>([]);
  protected readonly ratesForm = this.fb.group({ rates: this.rates });
  protected readonly savingRates = signal(false);
  protected readonly ratesError = signal<string | null>(null);
  protected readonly loadedYear = computed(
    () => resourceValue(this.schedule)?.academicYear ?? null,
  );

  constructor() {
    // Sincroniza la tabla editable cuando llega el tarifario del año.
    effect(() => {
      const s = resourceValue(this.schedule);
      untracked(() => this.loadRates(s?.rates ?? []));
    });
  }

  protected rateGroup(
    gradeId: number | null = null,
    conceptId: number | null = null,
    amount: number | null = null,
  ) {
    return this.fb.group({
      gradeId: this.fb.control<number | null>(gradeId, [Validators.required, Validators.min(1)]),
      conceptId: this.fb.control<number | null>(conceptId),
      amount: this.fb.control<number | null>(amount, [Validators.required, Validators.min(0.01)]),
    });
  }

  /** Copia las tarifas recibidas a la tabla editable. */
  protected loadRates(rates: TuitionRate[] = resourceValue(this.schedule)?.rates ?? []): void {
    this.rates.clear();
    rates.forEach((r) => this.rates.push(this.rateGroup(r.gradeId, r.conceptId, r.amount)));
    if (!this.isAdmin()) this.rates.disable();
    this.rates.markAsPristine();
  }

  protected consultYear(): void {
    const y = this.yearDraft();
    if (y && y >= 2000 && y <= 2100) this.year.set(y);
  }

  protected addRate(): void {
    this.rates.push(this.rateGroup());
  }

  protected removeRate(index: number): void {
    this.rates.removeAt(index);
    this.rates.markAsDirty();
  }

  protected async saveRates(): Promise<void> {
    this.ratesError.set(null);
    const year = this.loadedYear();
    if (!year) return;
    if (this.rates.invalid) {
      this.rates.markAllAsTouched();
      this.ratesError.set('Revisa las filas: grado y monto mayor a cero son obligatorios.');
      return;
    }
    const ok = await this.confirm.ask({
      title: `Guardar tarifas ${year}`,
      message: 'Se reemplazarán todas las tarifas del año por las de la tabla.',
      confirmLabel: 'Guardar',
    });
    if (!ok) return;
    const rates = this.rates.getRawValue().map((r) => ({
      gradeId: Number(r.gradeId),
      conceptId: r.conceptId ?? null,
      amount: Number(r.amount),
    }));
    this.savingRates.set(true);
    this.finance.saveTuition(year, rates).subscribe({
      next: () => {
        this.savingRates.set(false);
        this.toast.success(`Tarifas ${year} guardadas.`);
        this.schedule.reload();
      },
      error: (err) => {
        this.savingRates.set(false);
        this.ratesError.set(errorMessage(err));
      },
    });
  }
}
