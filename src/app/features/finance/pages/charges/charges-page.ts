import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmService, ToastService } from '../../../../core';
import {
  CopCurrencyPipe,
  formatCop,
  PageChange,
  SelectOption,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiCheckbox,
  UiDataTable,
  UiFilterBar,
  UiFormField,
  UiInput,
  UiPagination,
  UiProgressBar,
  UiSearchBox,
  UiSelect,
  UiTabs,
  UiTextarea,
  TabItem,
} from '../../../../shared/ui';
import { StudentSearch } from '../../components/student-search';
import {
  categoryLabel,
  CHARGE_STATUS_LABELS,
  CHARGE_STATUS_OPTIONS,
  CHARGE_STATUS_TONES,
  currentMonth,
  errorMessage,
  formatDay,
  monthLabel,
} from '../../data-access/finance-labels';
import type {
  BillingStudent,
  ChargeBatchRequest,
  ChargeBatchSummary,
  ChargeFilters,
  ChargeListItem,
  ChargeStatus,
  ChargeSummaryRow,
} from '../../data-access/finance.models';
import { FinanceService } from '../../data-access/finance.service';
import { resourceValue } from '../../../../core/resource/resource-value';

type ChargesTab = 'listado' | 'masivo' | 'individual' | 'resumen';

/**
 * `/admin/finanzas/cobros` — listado con filtros y anulación, generación masiva
 * con previsualización, cargo individual y resumen de recaudo por concepto/mes.
 */
@Component({
  selector: 'app-charges-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CopCurrencyPipe,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiCheckbox,
    UiDataTable,
    UiFilterBar,
    UiFormField,
    UiInput,
    UiPagination,
    UiProgressBar,
    UiSearchBox,
    UiSelect,
    UiTabs,
    UiTextarea,
    StudentSearch,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './charges-page.html',
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-5);
    }
    .mt {
      display: block;
      margin-top: var(--space-4);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-5);
    }
    .preview {
      display: grid;
      gap: var(--space-3);
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      margin-top: var(--space-4);
    }
    .preview div {
      background: var(--color-surface-2);
      border-radius: var(--radius-md);
      padding: var(--space-3);
    }
    .preview dt {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .preview dd {
      margin: 0;
      font-weight: 700;
      font-family: var(--font-mono);
    }
    .chosen {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      background: var(--color-primary-soft);
      margin-top: var(--space-2);
    }
    .rate {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 8rem;
    }
    .rate ui-progress-bar {
      flex: 1;
    }
    .panel {
      padding-top: var(--space-5);
    }
    small {
      display: block;
    }
  `,
})
export class ChargesPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly finance = inject(FinanceService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly tabs: TabItem[] = [
    { id: 'listado', label: 'Listado', icon: 'document-text' },
    { id: 'masivo', label: 'Generación masiva', icon: 'users' },
    { id: 'individual', label: 'Cargo individual', icon: 'user' },
    { id: 'resumen', label: 'Resumen de recaudo', icon: 'chart-bar' },
  ];
  protected readonly tab = signal<string | null>('listado');

  // ── Catálogos ──────────────────────────────────────────────
  protected readonly concepts = rxResource({ stream: () => this.finance.concepts(true) });
  protected readonly grades = rxResource({ stream: () => this.finance.grades() });
  protected readonly conceptOptions = computed<SelectOption<number>[]>(() =>
    (resourceValue(this.concepts) ?? []).map((c) => ({
      value: c.id,
      label: `${c.name} — ${formatCop(c.amount)}${c.taxRate ? ` + IVA ${c.taxRate} %` : ''}`,
    })),
  );
  protected readonly gradeOptions = computed<SelectOption<number>[]>(() =>
    (resourceValue(this.grades) ?? []).map((g) => ({ value: g.id, label: g.name })),
  );
  protected readonly statusOptions = CHARGE_STATUS_OPTIONS;

  // ── Listado ────────────────────────────────────────────────
  protected readonly filters = signal<ChargeFilters>({ page: 1, pageSize: 20 });
  protected readonly draft = {
    search: signal(''),
    conceptId: signal<number | null>(null),
    status: signal<ChargeStatus | null>(null),
    period: signal<string>(''),
    overdueOnly: signal(false),
  };
  protected readonly list = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.finance.charges(params),
  });
  protected readonly rows = computed(() => resourceValue(this.list)?.items ?? []);
  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return !!(f.search || f.conceptId || f.status || f.period || f.overdueOnly);
  });
  protected readonly columns: TableColumn<ChargeListItem>[] = [
    { key: 'studentName', header: 'Estudiante' },
    { key: 'conceptName', header: 'Concepto' },
    { key: 'period', header: 'Mes', hideBelow: 'md', format: (v) => monthLabel(v as string) },
    { key: 'dueDate', header: 'Vence', hideBelow: 'md', format: (v) => formatDay(v as string) },
    {
      key: 'netAmount',
      header: 'Neto',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
    { key: 'pendingAmount', header: 'Pendiente', align: 'end', mono: true },
    { key: 'status', header: 'Estado' },
  ];
  protected readonly actions: TableAction<ChargeListItem>[] = [
    { id: 'document', label: 'Cuenta de cobro', icon: 'printer' },
    {
      id: 'cashier',
      label: 'Cobrar en caja',
      icon: 'banknotes',
      hidden: (r) => r.pendingAmount <= 0 || r.status === 'cancelled',
    },
    {
      id: 'cancel',
      label: 'Anular cobro',
      icon: 'x-mark',
      tone: 'danger',
      hidden: (r) => r.status === 'cancelled' || r.status === 'paid',
      disabled: (r) => r.paidAmount > 0,
    },
  ];
  protected readonly statusLabel = (s: ChargeStatus) => CHARGE_STATUS_LABELS[s];
  protected readonly statusTone = (r: ChargeListItem) =>
    r.isOverdue && r.status !== 'paid' && r.status !== 'cancelled'
      ? 'danger'
      : CHARGE_STATUS_TONES[r.status];
  protected readonly category = categoryLabel;

  protected applyFilters(): void {
    this.filters.set({
      page: 1,
      pageSize: this.filters().pageSize,
      search: this.draft.search().trim() || undefined,
      conceptId: this.draft.conceptId(),
      status: this.draft.status(),
      period: this.draft.period() || null,
      overdueOnly: this.draft.overdueOnly() || null,
    });
  }

  protected clearFilters(): void {
    this.draft.search.set('');
    this.draft.conceptId.set(null);
    this.draft.status.set(null);
    this.draft.period.set('');
    this.draft.overdueOnly.set(false);
    this.applyFilters();
  }

  protected onPage(e: PageChange): void {
    this.filters.update((f) => ({ ...f, page: e.page, pageSize: e.pageSize }));
  }

  protected async onAction(e: TableActionEvent<ChargeListItem>): Promise<void> {
    const row = e.row;
    if (e.action === 'document') {
      void this.router.navigate(['/admin/finanzas/cobros', row.id, 'documento']);
    } else if (e.action === 'cashier') {
      void this.router.navigate(['/admin/finanzas/caja'], {
        queryParams: { studentId: row.studentId },
      });
    } else if (e.action === 'cancel') {
      const ok = await this.confirm.ask({
        title: '¿Anular este cobro?',
        message: `${row.description} de ${row.studentName} por ${formatCop(row.netAmount)}. Solo se pueden anular cobros sin abonos.`,
        confirmLabel: 'Anular cobro',
        tone: 'danger',
      });
      if (!ok) return;
      this.finance.cancelCharge(row.id).subscribe({
        next: () => {
          this.toast.success('Cobro anulado.');
          this.list.reload();
        },
        error: (err) => this.toast.error(errorMessage(err)),
      });
    }
  }

  // ── Generación masiva ──────────────────────────────────────
  protected readonly batchForm = this.fb.group({
    conceptId: this.fb.control<number | null>(null, Validators.required),
    period: [currentMonth(), Validators.required],
    dueDate: [''],
    gradeId: this.fb.control<number | null>(null),
    customAmount: this.fb.control<number | null>(null, Validators.min(0.01)),
    applyScholarship: [false],
  });
  protected readonly preview = signal<ChargeBatchSummary | null>(null);
  protected readonly batchResult = signal<ChargeBatchSummary | null>(null);
  protected readonly batchError = signal<string | null>(null);
  protected readonly previewing = signal(false);
  protected readonly generating = signal(false);
  protected readonly amountMessages = { min: 'El monto debe ser mayor a cero.' };

  private batchRequest(): ChargeBatchRequest | null {
    if (this.batchForm.invalid) {
      this.batchForm.markAllAsTouched();
      return null;
    }
    const v = this.batchForm.getRawValue();
    return {
      conceptId: v.conceptId!,
      period: v.period,
      dueDate: v.dueDate || undefined,
      gradeId: v.gradeId ?? undefined,
      customAmount: v.customAmount ?? undefined,
      applyScholarship: v.applyScholarship,
    };
  }

  protected runPreview(): void {
    const req = this.batchRequest();
    if (!req) return;
    this.batchError.set(null);
    this.batchResult.set(null);
    this.previewing.set(true);
    this.finance.previewBatch(req).subscribe({
      next: (p) => {
        this.previewing.set(false);
        this.preview.set(p);
      },
      error: (err) => {
        this.previewing.set(false);
        this.preview.set(null);
        this.batchError.set(errorMessage(err));
      },
    });
  }

  protected async generate(): Promise<void> {
    const req = this.batchRequest();
    const p = this.preview();
    if (!req || !p) return;
    const ok = await this.confirm.ask({
      title: 'Generar cobros',
      message: `Se generarán ${p.chargesCount} cobros de "${p.conceptName}" (${monthLabel(p.period)}) por un total de ${formatCop(p.totalNet)}.`,
      confirmLabel: 'Generar',
    });
    if (!ok) return;
    this.generating.set(true);
    this.finance.generateBatch(req).subscribe({
      next: (res) => {
        this.generating.set(false);
        this.preview.set(null);
        this.batchResult.set(res);
        this.toast.success(`${res.chargesCount} cobros generados.`);
        this.list.reload();
        this.summary.reload();
      },
      error: (err) => {
        this.generating.set(false);
        this.batchError.set(errorMessage(err));
      },
    });
  }

  protected resetPreview(): void {
    this.preview.set(null);
  }

  protected readonly monthName = monthLabel;

  // ── Cargo individual ───────────────────────────────────────
  protected readonly student = signal<BillingStudent | null>(null);
  protected readonly individualForm = this.fb.group({
    conceptId: this.fb.control<number | null>(null, Validators.required),
    period: [currentMonth(), Validators.required],
    dueDate: [''],
    description: ['', Validators.maxLength(255)],
    customAmount: this.fb.control<number | null>(null, Validators.min(0.01)),
    applyScholarship: [false],
    allowDuplicate: [false],
  });
  protected readonly individualError = signal<string | null>(null);
  protected readonly creating = signal(false);

  protected createIndividual(): void {
    this.individualError.set(null);
    const s = this.student();
    if (!s) {
      this.individualError.set('Selecciona el estudiante.');
      return;
    }
    if (this.individualForm.invalid) {
      this.individualForm.markAllAsTouched();
      return;
    }
    const v = this.individualForm.getRawValue();
    this.creating.set(true);
    this.finance
      .createCharge({
        studentId: s.id,
        conceptId: v.conceptId!,
        period: v.period,
        dueDate: v.dueDate || undefined,
        description: v.description.trim() || undefined,
        customAmount: v.customAmount ?? undefined,
        applyScholarship: v.applyScholarship,
        allowDuplicate: v.allowDuplicate,
      })
      .subscribe({
        next: (c) => {
          this.creating.set(false);
          this.toast.success(`Cobro creado para ${s.fullName} por ${formatCop(c.netAmount)}.`);
          this.individualForm.reset({
            period: currentMonth(),
            applyScholarship: false,
            allowDuplicate: false,
          });
          this.student.set(null);
          this.list.reload();
        },
        error: (err) => {
          this.creating.set(false);
          this.individualError.set(errorMessage(err));
        },
      });
  }

  // ── Resumen ────────────────────────────────────────────────
  protected readonly summary = rxResource({ stream: () => this.finance.chargesSummary(30) });
  protected readonly summaryColumns: TableColumn<ChargeSummaryRow>[] = [
    { key: 'conceptName', header: 'Concepto' },
    { key: 'period', header: 'Mes', format: (v) => monthLabel(v as string) },
    { key: 'chargesCount', header: 'Cobros', align: 'end', mono: true },
    {
      key: 'totalNet',
      header: 'Monto total',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
    { key: 'paidCount', header: 'Pagados', align: 'end', mono: true, hideBelow: 'md' },
    { key: 'collectedRate', header: '% Recaudo' },
  ];
  protected readonly summaryKey = (r: ChargeSummaryRow) => `${r.conceptId}-${r.period}`;
}
