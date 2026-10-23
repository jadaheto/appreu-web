import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  formatCop,
  PageChange,
  TableColumn,
  UiAlert,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiPagination,
  UiStatCard,
} from '../../../../shared/ui';
import { HrStatusBadge } from '../../components/hr-status-badge';
import type { PayslipSummary } from '../../data-access/hr.models';
import { apiMessage, shortDate } from '../../data-access/hr-ui';
import { MyEmployeeService } from '../../data-access/my-employee.service';
import { resourceValue } from '../../../../core/resource/resource-value';

export const PORTAL_BASE = '/portal-empleado';

/** Mis desprendibles (solo períodos aprobados o pagados). */
@Component({
  selector: 'app-my-payslips-page',
  imports: [
    RouterLink,
    UiAlert,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiPagination,
    UiStatCard,
    HrStatusBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Desprendibles de pago</h1>
        <p class="page-header__subtitle">Consulta e imprime tus desprendibles de nómina.</p>
      </div>
      <a ui-button variant="secondary" icon="user" [routerLink]="[base, 'mis-datos']">Mis datos</a>
    </div>

    @if (result.error()) {
      <ui-alert tone="warning" title="No es posible mostrar tus desprendibles">
        {{ apiMessage(result.error()) }}
      </ui-alert>
    } @else {
      <section class="grid grid--3" style="margin-bottom: var(--space-6)" aria-label="Resumen">
        <ui-stat-card
          label="Último neto pagado"
          icon="banknotes"
          variant="border"
          tone="success"
          [loading]="dashboard.isLoading()"
          [value]="last() ? cop(last()!.net) : '—'"
          [hint]="last()?.periodName ?? 'Sin pagos aún'"
        />
        <ui-stat-card
          label="Meses vinculado"
          icon="calendar"
          variant="border"
          tone="primary"
          [loading]="dashboard.isLoading()"
          [value]="dash()?.monthsEmployed ?? null"
        />
        <ui-stat-card
          label="Salario base"
          icon="wallet"
          variant="border"
          tone="info"
          [loading]="dashboard.isLoading()"
          [value]="dash() ? cop(dash()!.employee.baseSalary) : null"
        />
      </section>

      <ui-data-table
        caption="Mis desprendibles"
        [columns]="columns"
        [rows]="rows()"
        [loading]="result.isLoading()"
        trackBy="paymentId"
        rowClickable
        emptyIcon="banknotes"
        emptyTitle="Aún no tienes desprendibles"
        emptyMessage="Aparecerán cuando RR. HH. apruebe la nómina."
        (rowClick)="open($event)"
      >
        <ng-template uiCell="periodName" let-row>
          <strong>{{ row.periodName }}</strong>
          <div class="text-muted" style="font-size: var(--text-xs)">{{ row.periodLabel }}</div>
        </ng-template>
        <ng-template uiCell="status" let-row>
          <app-hr-status-badge kind="payment" [status]="row.status" />
        </ng-template>
        <ng-template uiCell="open" let-row>
          <a
            ui-button
            size="sm"
            variant="ghost"
            icon="printer"
            [routerLink]="[base, 'desprendibles', row.paymentId]"
            >Ver</a
          >
        </ng-template>
        <ui-pagination
          uiTableFooter
          [page]="paging().page"
          [pageSize]="paging().pageSize"
          [total]="total()"
          (pageChange)="changePage($event)"
        />
      </ui-data-table>
    }
  `,
})
export class MyPayslipsPage {
  private readonly me = inject(MyEmployeeService);
  private readonly router = inject(Router);

  protected readonly base = PORTAL_BASE;
  protected readonly cop = formatCop;
  protected readonly apiMessage = apiMessage;
  protected readonly paging = signal({ page: 1, pageSize: 12 });
  protected readonly result = rxResource({
    params: () => this.paging(),
    stream: ({ params }) => this.me.payslips(params.page, params.pageSize),
  });
  protected readonly rows = computed(() => resourceValue(this.result)?.items ?? []);
  protected readonly total = computed(() => resourceValue(this.result)?.total ?? 0);
  protected readonly dashboard = rxResource({ stream: () => this.me.dashboard() });
  protected readonly dash = computed(() => resourceValue(this.dashboard, null));
  protected readonly last = computed(() => this.dash()?.lastPayslip ?? null);

  protected readonly columns: TableColumn<PayslipSummary>[] = [
    { key: 'periodName', header: 'Período' },
    {
      key: 'paymentDate',
      header: 'Fecha de pago',
      format: (v) => shortDate(v as string),
      hideBelow: 'md',
    },
    {
      key: 'gross',
      header: 'Devengado',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
      hideBelow: 'md',
    },
    {
      key: 'totalDeductions',
      header: 'Deducciones',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
      hideBelow: 'lg',
    },
    { key: 'net', header: 'Neto', align: 'end', mono: true, format: (v) => formatCop(v as number) },
    { key: 'status', header: 'Estado', hideBelow: 'sm' },
    { key: 'open', header: '', align: 'end' },
  ];

  protected changePage(change: PageChange): void {
    this.paging.set({ page: change.page, pageSize: change.pageSize });
  }

  protected open(row: PayslipSummary): void {
    void this.router.navigate([PORTAL_BASE, 'desprendibles', row.paymentId]);
  }
}
