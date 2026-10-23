import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  UiFilterBar,
  UiSelect,
  UiStatCard,
  StatTone,
} from '../../../../shared/ui';
import {
  errorMessage,
  formatDay,
  RISK_HINTS,
  RISK_LABELS,
  RISK_OPTIONS,
  RISK_TONES,
} from '../../data-access/finance-labels';
import { RISK_LEVELS, type Debtor, type RiskLevel } from '../../data-access/finance.models';
import { FinanceService } from '../../data-access/finance.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const STAT_TONES: Record<RiskLevel, StatTone> = {
  critico: 'danger',
  alto: 'warning',
  medio: 'info',
  bajo: 'success',
};

/** `/admin/finanzas/cartera` — cartera vencida por deudor con nivel de riesgo (semáforo). */
@Component({
  selector: 'app-aging-page',
  imports: [
    FormsModule,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFilterBar,
    UiSelect,
    UiStatCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Control de cartera</h1>
        <p class="page-header__subtitle">
          Deudores con cobros vencidos{{ report()?.today ? ' al ' + fmtDay(report()!.today) : '' }}.
        </p>
      </div>
      <button ui-button icon="printer" class="no-print" (click)="print()">Imprimir</button>
    </div>

    @if (aging.error()) {
      <ui-alert tone="error" class="mb">{{ error() }}</ui-alert>
    }

    <section class="kpis mb" aria-label="Cartera por nivel de riesgo">
      <ui-stat-card
        label="Total cartera"
        icon="wallet"
        tone="primary"
        [loading]="aging.isLoading()"
        [value]="report() ? cop(report()!.total.balance) : null"
        [hint]="report() ? report()!.total.debtors + ' deudores' : ''"
      />
      @for (level of levels; track level) {
        <ui-stat-card
          [label]="riskLabel[level] + ' (' + riskHint[level] + ')'"
          variant="border"
          [tone]="statTone[level]"
          [loading]="aging.isLoading()"
          [value]="report() ? cop(report()!.byRisk[level].balance) : null"
          [hint]="report() ? report()!.byRisk[level].debtors + ' deudores' : ''"
        />
      }
    </section>

    <ui-filter-bar
      class="mb no-print"
      [showClear]="!!risk() || !!gradeId()"
      [showApply]="false"
      (clear)="clear()"
    >
      <ui-select
        ariaLabel="Nivel de riesgo"
        placeholder="Todos los niveles"
        [options]="riskOptions"
        [ngModel]="risk()"
        (ngModelChange)="risk.set($event)"
        name="risk"
      />
      @if (gradeOptions().length) {
        <ui-select
          ariaLabel="Grado"
          placeholder="Todos los grados"
          [options]="gradeOptions()"
          [ngModel]="gradeId()"
          (ngModelChange)="gradeId.set($event)"
          name="grade"
        />
      }
    </ui-filter-bar>

    <ui-data-table
      [columns]="columns"
      [rows]="report()?.debtors ?? []"
      [loading]="aging.isLoading()"
      [actions]="actions"
      trackBy="studentId"
      caption="Deudores"
      emptyIcon="check-circle"
      emptyTitle="¡Sin cartera vencida!"
      emptyMessage="No hay estudiantes con cobros vencidos para este filtro."
      (action)="onAction($event)"
    >
      <ng-template uiCell="studentName" let-row>
        <strong>{{ row.studentName }}</strong>
        <small class="text-muted font-mono">{{ row.studentCode }}</small>
      </ng-template>
      <ng-template uiCell="daysOverdue" let-row>
        <span class="font-mono days" [attr.data-risk]="row.risk">{{ row.daysOverdue }}</span>
      </ng-template>
      <ng-template uiCell="risk" let-row>
        <ui-badge [tone]="toneOf(row)" dot>{{ labelOf(row) }}</ui-badge>
      </ng-template>
    </ui-data-table>
  `,
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-5);
    }
    .kpis {
      display: grid;
      gap: var(--space-4);
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    }
    small {
      display: block;
    }
    .days {
      font-weight: 700;
    }
    .days[data-risk='critico'] {
      color: var(--color-danger);
    }
    .days[data-risk='alto'] {
      color: var(--color-warning);
    }
    .days[data-risk='medio'] {
      color: var(--color-info);
    }
  `,
})
export class AgingPage {
  private readonly finance = inject(FinanceService);
  private readonly router = inject(Router);

  protected readonly risk = signal<RiskLevel | null>(null);
  protected readonly gradeId = signal<number | null>(null);
  protected readonly aging = rxResource({
    params: () => ({ risk: this.risk(), gradeId: this.gradeId() }),
    stream: ({ params }) => this.finance.aging(params),
  });
  protected readonly report = computed(() => resourceValue(this.aging, null));
  protected readonly grades = rxResource({ stream: () => this.finance.grades() });
  protected readonly gradeOptions = computed<SelectOption<number>[]>(() =>
    (resourceValue(this.grades) ?? []).map((g) => ({ value: g.id, label: g.name })),
  );

  protected readonly levels = RISK_LEVELS;
  protected readonly riskLabel = RISK_LABELS;
  protected readonly riskHint = RISK_HINTS;
  protected readonly statTone = STAT_TONES;
  protected readonly riskOptions = RISK_OPTIONS;
  protected readonly cop = formatCop;
  protected readonly fmtDay = formatDay;

  protected readonly columns: TableColumn<Debtor>[] = [
    { key: 'position', header: '#', width: '3rem', mono: true },
    { key: 'studentName', header: 'Estudiante' },
    {
      key: 'gradeName',
      header: 'Grado / grupo',
      hideBelow: 'md',
      value: (r) => [r.gradeName, r.classroomName].filter(Boolean).join(' · ') || '—',
    },
    {
      key: 'oldestDueDate',
      header: 'Vencido desde',
      hideBelow: 'lg',
      format: (v) => formatDay(v as string),
    },
    { key: 'daysOverdue', header: 'Días', align: 'end', sortable: true },
    { key: 'risk', header: 'Riesgo' },
    { key: 'chargesCount', header: '# Cobros', align: 'end', mono: true, hideBelow: 'md' },
    {
      key: 'balance',
      header: 'Saldo vencido',
      align: 'end',
      mono: true,
      sortable: true,
      format: (v) => formatCop(v as number),
    },
  ];
  protected readonly actions: TableAction<Debtor>[] = [
    { id: 'collect', label: 'Cobrar en caja', icon: 'banknotes' },
    { id: 'statement', label: 'Estado de cuenta', icon: 'eye' },
  ];

  protected toneOf(d: Debtor) {
    return RISK_TONES[d.risk];
  }
  protected labelOf(d: Debtor): string {
    return RISK_LABELS[d.risk];
  }

  protected error(): string {
    return errorMessage(this.aging.error());
  }

  protected clear(): void {
    this.risk.set(null);
    this.gradeId.set(null);
  }

  protected onAction(e: TableActionEvent<Debtor>): void {
    const path = e.action === 'collect' ? '/admin/finanzas/caja' : '/admin/finanzas/estado-cuenta';
    void this.router.navigate([path], { queryParams: { studentId: e.row.studentId } });
  }

  protected print(): void {
    window.print();
  }
}
