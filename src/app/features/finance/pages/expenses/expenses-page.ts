import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../../core';
import {
  DateRange,
  formatCop,
  PageChange,
  SelectOption,
  TableColumn,
  UiAlert,
  UiButton,
  UiDataTable,
  UiDateRange,
  UiEmptyState,
  UiFilterBar,
  UiFormField,
  UiInput,
  UiModal,
  UiPagination,
  UiSearchBox,
  UiSelect,
  UiTextarea,
} from '../../../../shared/ui';
import {
  errorMessage,
  formatDay,
  PAYMENT_METHOD_OPTIONS,
  todayIso,
} from '../../data-access/finance-labels';
import type { Expense, ExpenseCategory, ExpenseFilters } from '../../data-access/finance.models';
import { FinanceService } from '../../data-access/finance.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** `/admin/finanzas/gastos` — registro y consulta de gastos, y sus categorías. */
@Component({
  selector: 'app-expenses-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    UiAlert,
    UiButton,
    UiDataTable,
    UiDateRange,
    UiEmptyState,
    UiFilterBar,
    UiFormField,
    UiInput,
    UiModal,
    UiPagination,
    UiSearchBox,
    UiSelect,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './expenses-page.html',
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-5);
    }
    .layout {
      display: grid;
      gap: var(--space-5);
    }
    @media (min-width: 1024px) {
      .layout {
        grid-template-columns: minmax(0, 3fr) minmax(16rem, 1fr);
        align-items: start;
      }
    }
    .cats {
      list-style: none;
      padding: 0;
      margin: 0 0 var(--space-4);
    }
    .cats li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.4rem 0;
      border-bottom: 1px solid var(--color-border-soft);
    }
    .cat-form {
      display: flex;
      gap: 0.5rem;
      align-items: flex-end;
    }
    .cat-form ui-form-field {
      flex: 1;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
    }
  `,
})
export class ExpensesPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly finance = inject(FinanceService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly categories = rxResource({ stream: () => this.finance.expenseCategories() });
  protected readonly categoryOptions = computed<SelectOption<number>[]>(() =>
    (resourceValue(this.categories) ?? []).map((c) => ({ value: c.id, label: c.name })),
  );
  protected readonly methodOptions = PAYMENT_METHOD_OPTIONS.map((o) => ({
    value: o.value as string,
    label: o.label,
  }));

  protected readonly filters = signal<ExpenseFilters>({ page: 1, pageSize: 20 });
  protected readonly draft = {
    search: signal(''),
    range: signal<DateRange>({ from: null, to: null }),
    categoryId: signal<number | null>(null),
  };
  protected readonly list = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.finance.expenses(params),
  });
  protected readonly rows = computed(() => resourceValue(this.list)?.items ?? []);
  protected readonly pageTotal = computed(() => this.rows().reduce((t, e) => t + e.amount, 0));
  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return !!(f.search || f.from || f.to || f.categoryId);
  });
  protected readonly cop = formatCop;

  protected readonly columns: TableColumn<Expense>[] = [
    { key: 'date', header: 'Fecha', format: (v) => formatDay(v as string) },
    { key: 'description', header: 'Descripción' },
    {
      key: 'categoryName',
      header: 'Categoría',
      hideBelow: 'md',
      format: (v) => (v as string) || 'Sin categoría',
    },
    { key: 'vendor', header: 'Proveedor', hideBelow: 'lg', format: (v) => (v as string) || '—' },
    {
      key: 'receiptNo',
      header: 'Soporte',
      hideBelow: 'lg',
      mono: true,
      format: (v) => (v as string) || '—',
    },
    {
      key: 'amount',
      header: 'Monto',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
  ];

  protected applyFilters(): void {
    const r = this.draft.range();
    this.filters.set({
      page: 1,
      pageSize: this.filters().pageSize,
      search: this.draft.search().trim() || undefined,
      from: r.from,
      to: r.to,
      categoryId: this.draft.categoryId(),
    });
  }

  protected clearFilters(): void {
    this.draft.search.set('');
    this.draft.range.set({ from: null, to: null });
    this.draft.categoryId.set(null);
    this.applyFilters();
  }

  protected onPage(e: PageChange): void {
    this.filters.update((f) => ({ ...f, page: e.page, pageSize: e.pageSize }));
  }

  // ── Nuevo gasto ────────────────────────────────────────────
  protected readonly modalOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly today = todayIso();
  protected readonly form = this.fb.group({
    description: ['', [Validators.required, Validators.maxLength(255)]],
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    date: [todayIso(), Validators.required],
    categoryId: this.fb.control<number | null>(null),
    paymentMethod: this.fb.control<string | null>('efectivo'),
    vendor: ['', Validators.maxLength(200)],
    receiptNo: ['', Validators.maxLength(100)],
    notes: ['', Validators.maxLength(2000)],
  });
  protected readonly amountMessages = { min: 'El monto debe ser mayor a cero.' };

  protected openNew(): void {
    this.form.reset({ date: todayIso(), paymentMethod: 'efectivo' });
    this.formError.set(null);
    this.modalOpen.set(true);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.finance
      .createExpense({
        description: v.description.trim(),
        amount: Number(v.amount),
        date: v.date || undefined,
        categoryId: v.categoryId ?? undefined,
        paymentMethod: v.paymentMethod ?? undefined,
        vendor: v.vendor.trim() || undefined,
        receiptNo: v.receiptNo.trim() || undefined,
        notes: v.notes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.modalOpen.set(false);
          this.toast.success('Gasto registrado.');
          this.list.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(errorMessage(err));
        },
      });
  }

  // ── Categorías ─────────────────────────────────────────────
  protected readonly editing = signal<ExpenseCategory | null>(null);
  protected readonly categoryForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
  });
  protected readonly savingCategory = signal(false);

  protected editCategory(c: ExpenseCategory): void {
    this.editing.set(c);
    this.categoryForm.setValue({ name: c.name });
  }

  protected cancelEdit(): void {
    this.editing.set(null);
    this.categoryForm.reset();
  }

  protected saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    const name = this.categoryForm.getRawValue().name.trim();
    const current = this.editing();
    this.savingCategory.set(true);
    const req = current
      ? this.finance.renameExpenseCategory(current.id, name)
      : this.finance.createExpenseCategory(name);
    req.subscribe({
      next: () => {
        this.savingCategory.set(false);
        this.toast.success(current ? 'Categoría renombrada.' : 'Categoría creada.');
        this.cancelEdit();
        this.categories.reload();
        if (current) this.list.reload();
      },
      error: (err) => {
        this.savingCategory.set(false);
        this.toast.error(errorMessage(err));
      },
    });
  }
}
