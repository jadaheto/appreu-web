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
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, map, Observable } from 'rxjs';
import { BrandingService, ToastService } from '../../../../core';
import {
  formatCop,
  PageChange,
  SelectOption,
  UiAlert,
  UiButton,
  UiEmptyState,
  UiFilterBar,
  UiFormField,
  UiInput,
  UiPagination,
  UiPrintableSheet,
  UiSelect,
  UiSpinner,
} from '../../../../shared/ui';
import { DayPipe, formatDay } from '../../components/day.pipe';
import { saveBlob } from '../../components/download';
import { notifyError } from '../../components/notify-error';
import {
  AccountLevel,
  AuxiliaryLedger,
  BalanceSheet,
  ExportableReport,
  ReportFormat,
  GeneralJournal,
  GeneralLedger,
  IncomeStatement,
  ReportQuery,
  TrialBalance,
  VoucherType,
} from '../../data-access/accounting.models';
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNTING_BASE,
  isoDate,
  monthRange,
  VOUCHER_TYPE_OPTIONS,
} from '../../data-access/accounting.labels';
import { AccountingService } from '../../data-access/accounting.service';
import { resourceValue } from '../../../../core/resource/resource-value';

export type ReportSlug =
  'balance-prueba' | 'diario' | 'mayor' | 'auxiliar' | 'resultados' | 'balance-general';

interface ReportDef {
  slug: ReportSlug;
  label: string;
  api: ExportableReport;
  description: string;
}

export const REPORTS: readonly ReportDef[] = [
  {
    slug: 'balance-prueba',
    label: 'Balance de prueba',
    api: 'trial-balance',
    description: 'Saldos iniciales, movimientos y saldos finales por cuenta.',
  },
  {
    slug: 'diario',
    label: 'Libro diario',
    api: 'journal',
    description: 'Asientos contabilizados en orden cronológico con sus líneas.',
  },
  {
    slug: 'mayor',
    label: 'Libro mayor',
    api: 'ledger',
    description: 'Saldos por cuenta según su naturaleza.',
  },
  {
    slug: 'auxiliar',
    label: 'Libro auxiliar',
    api: 'auxiliary',
    description: 'Movimientos de una cuenta (y tercero) con saldo acumulado.',
  },
  {
    slug: 'resultados',
    label: 'Estado de resultados',
    api: 'income-statement',
    description: 'Ingresos, costos, gastos y utilidad del rango.',
  },
  {
    slug: 'balance-general',
    label: 'Balance general',
    api: 'balance-sheet',
    description: 'Activo, pasivo y patrimonio a una fecha de corte.',
  },
];

type ReportData =
  | { kind: 'balance-prueba'; data: TrialBalance }
  | { kind: 'diario'; data: GeneralJournal }
  | { kind: 'mayor'; data: GeneralLedger }
  | { kind: 'auxiliar'; data: AuxiliaryLedger }
  | { kind: 'resultados'; data: IncomeStatement }
  | { kind: 'balance-general'; data: BalanceSheet };

interface AppliedQuery extends ReportQuery {
  slug: ReportSlug;
}

/** Reportes contables con filtros, vista imprimible y exportación CSV, Excel y PDF (calculados por la API). */
@Component({
  selector: 'app-reports-page',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    DayPipe,
    UiAlert,
    UiButton,
    UiEmptyState,
    UiFilterBar,
    UiFormField,
    UiInput,
    UiPagination,
    UiPrintableSheet,
    UiSelect,
    UiSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reports-page.html',
  styleUrls: ['../accounting-page.scss', './reports-page.scss'],
})
export class ReportsPage {
  private readonly accounting = inject(AccountingService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly branding = inject(BrandingService);

  protected readonly cop = formatCop;
  protected readonly today = new Date().toLocaleString('es-CO');
  protected readonly typeLabels: Readonly<Record<string, string>> = ACCOUNT_TYPE_LABELS;
  protected readonly reports = REPORTS;
  protected readonly reportOptions: SelectOption<ReportSlug>[] = REPORTS.map((r) => ({
    value: r.slug,
    label: r.label,
  }));
  protected readonly levelOptions: SelectOption<AccountLevel>[] = [
    { value: 1, label: '1 · Clase' },
    { value: 2, label: '2 · Grupo' },
    { value: 3, label: '3 · Cuenta' },
    { value: 4, label: '4 · Subcuenta' },
    { value: 5, label: '5 · Auxiliar' },
  ];
  protected readonly voucherOptions = VOUCHER_TYPE_OPTIONS;

  protected readonly slug = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => this.normalize(p.get('tipo')))),
    { initialValue: 'balance-prueba' as ReportSlug },
  );
  protected readonly def = computed(() => REPORTS.find((r) => r.slug === this.slug())!);

  // Filtros editables
  private readonly month = monthRange();
  protected readonly from = signal(this.month.from);
  protected readonly to = signal(this.month.to);
  protected readonly asOf = signal(isoDate(new Date()));
  protected readonly level = signal<AccountLevel | null>(null);
  protected readonly accountId = signal<number | null>(null);
  protected readonly thirdPartyId = signal<number | null>(null);
  protected readonly voucherType = signal<VoucherType | null>(null);

  protected readonly applied = signal<AppliedQuery | null>(null);
  /** Formato que se está exportando (deshabilita los demás botones). */
  protected readonly exporting = signal<ReportFormat | null>(null);

  protected readonly accounts = rxResource({ stream: () => this.accounting.accounts() });
  protected readonly accountOptions = computed<SelectOption<number>[]>(() =>
    resourceValue(this.accounts, [])
      .filter((a) => this.slug() !== 'auxiliar' || a.isTransactional)
      .map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
  );
  protected readonly parties = rxResource({
    params: () => (this.slug() === 'auxiliar' ? true : undefined),
    stream: () => this.accounting.thirdParties({ pageSize: 200 }),
  });
  protected readonly partyOptions = computed<SelectOption<number>[]>(() =>
    (resourceValue(this.parties)?.items ?? []).map((p) => ({
      value: p.id,
      label: `${p.name} (${p.document})`,
    })),
  );

  protected readonly report = rxResource({
    params: () => this.applied() ?? undefined,
    stream: ({ params }) => this.load(params),
  });
  protected readonly result = computed(() => resourceValue(this.report, null));
  protected readonly trial = computed(() => this.pick<TrialBalance>('balance-prueba'));
  protected readonly journal = computed(() => this.pick<GeneralJournal>('diario'));
  protected readonly ledger = computed(() => this.pick<GeneralLedger>('mayor'));
  protected readonly auxiliary = computed(() => this.pick<AuxiliaryLedger>('auxiliar'));
  protected readonly income = computed(() => this.pick<IncomeStatement>('resultados'));
  protected readonly sheet = computed(() => this.pick<BalanceSheet>('balance-general'));

  protected readonly validation = computed<string | null>(() => {
    const s = this.slug();
    if (s === 'balance-general') return this.asOf() ? null : 'Indica la fecha de corte.';
    if (!this.from() || !this.to()) return 'Indica el rango de fechas.';
    if (this.from() > this.to()) return 'La fecha final debe ser posterior a la inicial.';
    if (s === 'auxiliar' && !this.accountId()) return 'Selecciona la cuenta del libro auxiliar.';
    return null;
  });

  protected readonly subtitle = computed(() => {
    const q = this.applied();
    if (!q) return '';
    return q.slug === 'balance-general'
      ? `A ${formatDay(q.asOf)}`
      : `Del ${formatDay(q.from)} al ${formatDay(q.to)}`;
  });

  constructor() {
    // Al cambiar de reporte se limpia el resultado y, si los filtros bastan, se genera.
    effect(() => {
      this.slug();
      untracked(() => {
        this.applied.set(null);
        if (!this.validation()) this.generate();
      });
    });
  }

  protected onReportChange(slug: ReportSlug | null): void {
    if (slug) void this.router.navigate([ACCOUNTING_BASE, 'reportes', slug]);
  }

  protected generate(): void {
    if (this.validation()) return;
    this.applied.set({ ...this.query(), page: 1, pageSize: 50 });
  }

  protected clear(): void {
    this.from.set(this.month.from);
    this.to.set(this.month.to);
    this.asOf.set(isoDate(new Date()));
    this.level.set(null);
    this.accountId.set(null);
    this.thirdPartyId.set(null);
    this.voucherType.set(null);
    this.applied.set(null);
  }

  protected onPage(change: PageChange): void {
    this.applied.update((q) => (q ? { ...q, page: change.page, pageSize: change.pageSize } : q));
  }

  protected async exportAs(format: ReportFormat): Promise<void> {
    const q = this.applied();
    if (!q || this.exporting()) return;
    const def = REPORTS.find((r) => r.slug === q.slug)!;
    this.exporting.set(format);
    try {
      const blob = await firstValueFrom(this.accounting.exportReport(def.api, q, format));
      const suffix = q.slug === 'balance-general' ? q.asOf : `${q.from}_${q.to}`;
      saveBlob(blob, `${q.slug}-${suffix}.${format}`);
      this.toast.success('Reporte exportado.');
    } catch (e) {
      notifyError(this.toast, e);
    } finally {
      this.exporting.set(null);
    }
  }

  protected str(v: unknown): string {
    return typeof v === 'string' ? v : '';
  }

  protected amountClass(v: number): string {
    return v < 0 ? 'neg' : '';
  }

  private pick<T>(kind: ReportSlug): T | null {
    const r = this.result();
    return r && r.kind === kind ? (r.data as T) : null;
  }

  private query(): AppliedQuery {
    const slug = this.slug();
    return {
      slug,
      from: this.from(),
      to: this.to(),
      asOf: slug === 'balance-general' ? this.asOf() : undefined,
      level: slug === 'balance-prueba' ? this.level() : null,
      accountId: slug === 'mayor' || slug === 'auxiliar' ? this.accountId() : null,
      thirdPartyId: slug === 'auxiliar' ? this.thirdPartyId() : null,
      type: slug === 'diario' ? this.voucherType() : null,
    };
  }

  private load(q: AppliedQuery): Observable<ReportData> {
    switch (q.slug) {
      case 'balance-prueba':
        return this.accounting
          .trialBalance(q)
          .pipe(map((data) => ({ kind: q.slug, data }) as ReportData));
      case 'diario':
        return this.accounting
          .generalJournal(q)
          .pipe(map((data) => ({ kind: q.slug, data }) as ReportData));
      case 'mayor':
        return this.accounting
          .generalLedger(q)
          .pipe(map((data) => ({ kind: q.slug, data }) as ReportData));
      case 'auxiliar':
        return this.accounting
          .auxiliaryLedger(q)
          .pipe(map((data) => ({ kind: q.slug, data }) as ReportData));
      case 'resultados':
        return this.accounting
          .incomeStatement(q)
          .pipe(map((data) => ({ kind: q.slug, data }) as ReportData));
      case 'balance-general':
        return this.accounting
          .balanceSheet(q.asOf!)
          .pipe(map((data) => ({ kind: q.slug, data }) as ReportData));
    }
  }

  private normalize(value: string | null): ReportSlug {
    return (REPORTS.find((r) => r.slug === value)?.slug ?? 'balance-prueba') as ReportSlug;
  }
}
