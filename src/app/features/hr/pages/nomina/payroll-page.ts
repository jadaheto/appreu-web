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
import { Router, RouterLink } from '@angular/router';
import { AuthService, ToastService } from '../../../../core';
import {
  formatCop,
  PageChange,
  TableColumn,
  UiAlert,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiFilterBar,
  UiFormField,
  UiInput,
  UiModal,
  UiPagination,
  UiSelect,
  UiStatCard,
} from '../../../../shared/ui';
import { HrStatusBadge } from '../../components/hr-status-badge';
import { SectionNav } from '../../components/section-nav';
import {
  optionsOf,
  PAY_FREQUENCIES,
  PAY_FREQUENCY_LABELS,
  PayFrequency,
  PAYROLL_PERIOD_STATUSES,
  PayrollPeriod,
  PayrollPeriodFilters,
  PayrollPeriodStatus,
  PERIOD_STATUS_LABELS,
} from '../../data-access/hr.models';
import { apiMessage, isoDate, isoMonth, shortDate } from '../../data-access/hr-ui';
import { PayrollService } from '../../data-access/payroll.service';
import { HR_LINKS, PAYROLL_BASE } from '../rrhh/hr-links';
import { resourceValue } from '../../../../core/resource/resource-value';

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function periodDates(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as string;
  const end = group.get('endDate')?.value as string;
  return start && end && end < start ? { dateRange: true } : null;
}

/** Nómina: KPIs del mes, períodos (filtros año/estado) y creación de períodos. */
@Component({
  selector: 'app-payroll-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    UiAlert,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFilterBar,
    UiFormField,
    UiInput,
    UiModal,
    UiPagination,
    UiSelect,
    UiStatCard,
    HrStatusBadge,
    SectionNav,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payroll-page.html',
})
export class PayrollPage {
  private readonly payroll = inject(PayrollService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly base = PAYROLL_BASE;
  protected readonly links = HR_LINKS;
  protected readonly cop = formatCop;
  protected readonly apiMessage = apiMessage;
  protected readonly frequencyLabels: Readonly<Record<string, string>> = PAY_FREQUENCY_LABELS;
  protected readonly canManage = computed(() => this.auth.hasRole('admin', 'hr'));
  protected readonly showHrLinks = computed(() => this.auth.hasRole('admin', 'hr'));

  // KPIs del mes
  protected readonly month = signal(isoMonth());
  protected readonly kpis = rxResource({
    params: () => (/^\d{4}-\d{2}$/.test(this.month()) ? this.month() : undefined),
    stream: ({ params }) => this.payroll.kpis(params),
  });
  protected readonly kpi = computed(() => resourceValue(this.kpis, null));

  // Períodos
  private readonly currentYear = new Date().getFullYear();
  protected readonly yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: this.currentYear + 1 - i,
    label: String(this.currentYear + 1 - i),
  }));
  protected readonly statusOptions = optionsOf(PAYROLL_PERIOD_STATUSES, PERIOD_STATUS_LABELS);
  protected readonly filterForm = this.fb.group({
    year: this.fb.control<number | null>(this.currentYear),
    status: this.fb.control<PayrollPeriodStatus | null>(null),
  });
  protected readonly filters = signal<PayrollPeriodFilters>({
    year: this.currentYear,
    page: 1,
    pageSize: 12,
  });
  protected readonly result = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.payroll.periods(params),
  });
  protected readonly rows = computed(() => resourceValue(this.result)?.items ?? []);
  protected readonly total = computed(() => resourceValue(this.result)?.total ?? 0);
  protected readonly hasFilters = computed(
    () => this.filters().year !== this.currentYear || !!this.filters().status,
  );

  protected readonly columns: TableColumn<PayrollPeriod>[] = [
    { key: 'name', header: 'Período' },
    {
      key: 'dates',
      header: 'Fechas',
      value: (r) => `${shortDate(r.startDate)} — ${shortDate(r.endDate)}`,
      hideBelow: 'md',
    },
    {
      key: 'paymentDate',
      header: 'Fecha de pago',
      format: (v) => shortDate(v as string),
      hideBelow: 'lg',
    },
    {
      key: 'grossTotal',
      header: 'Bruto',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
      hideBelow: 'lg',
    },
    { key: 'deductionsTotal', header: 'Deducciones', align: 'end', mono: true, hideBelow: 'md' },
    { key: 'netTotal', header: 'Neto', align: 'end', mono: true },
    { key: 'status', header: 'Estado' },
  ];

  // Crear período
  protected readonly frequencyOptions = optionsOf(PAY_FREQUENCIES, PAY_FREQUENCY_LABELS);
  protected readonly createOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly createForm = this.fb.group(
    {
      name: this.fb.control('', Validators.maxLength(100)),
      frequency: this.fb.control<PayFrequency>('monthly', Validators.required),
      startDate: this.fb.control('', Validators.required),
      endDate: this.fb.control('', Validators.required),
      paymentDate: this.fb.control('', Validators.required),
    },
    { validators: periodDates },
  );

  protected applyFilters(): void {
    const v = this.filterForm.getRawValue();
    this.filters.update((f) => ({ ...f, year: v.year, status: v.status, page: 1 }));
  }

  protected clearFilters(): void {
    this.filterForm.reset({ year: this.currentYear, status: null });
    this.applyFilters();
  }

  protected changePage(change: PageChange): void {
    this.filters.update((f) => ({ ...f, page: change.page, pageSize: change.pageSize }));
  }

  protected open(row: PayrollPeriod): void {
    void this.router.navigate([PAYROLL_BASE, 'periodos', row.id]);
  }

  /** Valores por defecto del legacy: mes actual, pago el día 28 (o el último si es menor). */
  protected openCreate(): void {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const last = new Date(y, m + 1, 0);
    this.createForm.reset({
      name: `Nómina ${MONTH_NAMES[m]} ${y}`,
      frequency: 'monthly',
      startDate: isoDate(new Date(y, m, 1)),
      endDate: isoDate(last),
      paymentDate: isoDate(new Date(y, m, Math.min(28, last.getDate()))),
    });
    this.createError.set(null);
    this.createOpen.set(true);
  }

  protected create(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.getRawValue();
    this.creating.set(true);
    this.createError.set(null);
    this.payroll
      .createPeriod({
        name: v.name.trim() || undefined,
        frequency: v.frequency,
        startDate: v.startDate,
        endDate: v.endDate,
        paymentDate: v.paymentDate,
      })
      .subscribe({
        next: (period) => {
          this.creating.set(false);
          this.createOpen.set(false);
          this.toast.success('Período creado en borrador. Registre novedades y liquide.');
          void this.router.navigate([PAYROLL_BASE, 'periodos', period.id]);
        },
        error: (err: unknown) => {
          this.creating.set(false);
          this.createError.set(apiMessage(err));
        },
      });
  }
}
