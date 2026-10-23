import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  formatCop,
  formatDateEs,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiEmptyState,
  UiPagination,
  UiSpinner,
  UiStatCard,
} from '../../../../shared/ui';
import { PortalStudentContext, PortalStudentPicker } from '../../components/portal-student-context';
import {
  CHARGE_STATUS_LABELS,
  CHARGE_STATUS_TONES,
  errorMessage,
  formatDay,
  methodLabel,
  monthLabel,
} from '../../data-access/finance-labels';
import type {
  Charge,
  PaymentListItem,
  PortalDianArtifact,
  PortalDianDocument,
} from '../../data-access/finance.models';
import { ToastService } from '../../../../core';
import { FinanceService, saveFile } from '../../data-access/finance.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/**
 * `/portal-estudiante/facturas` — facturas electrónicas DIAN del estudiante
 * (`GET /api/e-invoicing/portal/students/:id/documents`, descarga PDF/XML),
 * cuentas de cobro y recibos de caja imprimibles.
 */
const DIAN_STATUS_LABELS: Record<string, string> = {
  accepted: 'Aceptada',
  sent: 'Enviada',
  pending: 'En validación',
  error: 'Con error',
};

@Component({
  selector: 'app-portal-invoices-page',
  imports: [
    RouterLink,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiEmptyState,
    UiPagination,
    UiSpinner,
    UiStatCard,
    PortalStudentPicker,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Mis facturas</h1>
        <p class="page-header__subtitle">
          Facturas electrónicas, cuentas de cobro y recibos{{
            ctx.current() ? ' de ' + ctx.current()!.fullName : ''
          }}.
        </p>
      </div>
      <app-portal-student-picker
        [students]="ctx.list()"
        [selected]="ctx.current()?.id ?? null"
        (selectedChange)="ctx.select($event)"
      />
    </div>

    @if (ctx.students.isLoading()) {
      <div class="center"><ui-spinner size="lg" /></div>
    } @else if (ctx.students.error()) {
      <ui-alert tone="error">{{ err(ctx.students.error()) }}</ui-alert>
    } @else if (!ctx.current()) {
      <div class="ui-card">
        <ui-empty-state
          icon="user"
          title="Sin estudiantes vinculados"
          message="Comunícate con la institución."
        />
      </div>
    } @else if (statement.isLoading() && !st()) {
      <div class="center"><ui-spinner size="lg" /></div>
    } @else if (statement.error()) {
      <ui-alert tone="error">{{ err(statement.error()) }}</ui-alert>
    } @else if (st(); as s) {
      <section class="kpis mb" aria-label="Resumen">
        <ui-stat-card
          label="Pendientes"
          icon="clock"
          tone="warning"
          [value]="s.summary.pendingCount"
          [hint]="'Saldo ' + cop(s.summary.balance)"
        />
        <ui-stat-card
          label="Pagadas"
          icon="check-circle"
          tone="success"
          [value]="s.summary.paidCount"
          [hint]="'Pagado ' + cop(s.summary.totalPaid)"
        />
        <ui-stat-card
          label="Total facturado"
          icon="document-text"
          tone="primary"
          [value]="cop(s.summary.totalCharged)"
        />
      </section>

      <section class="ui-card mb" aria-labelledby="inv-dian">
        <h2 class="ui-card__title" id="inv-dian">Facturas electrónicas DIAN</h2>
        @if (dian.isLoading() && !dianPage()) {
          <div class="center"><ui-spinner /></div>
        } @else if (dian.error()) {
          <ui-alert tone="error">{{ err(dian.error()) }}</ui-alert>
        } @else if (dianPage()?.items?.length) {
          <ui-data-table
            [columns]="dianColumns"
            [rows]="dianPage()!.items"
            caption="Facturas electrónicas DIAN"
          >
            <ng-template uiCell="status" let-row>
              <ui-badge [tone]="row.status === 'accepted' ? 'success' : 'info'">{{
                dianStatus(row.status)
              }}</ui-badge>
            </ng-template>
            <ng-template uiCell="files" let-row>
              @for (a of row.artifacts; track a) {
                <button
                  ui-button
                  size="sm"
                  variant="ghost"
                  [icon]="a === 'pdf' ? 'document-text' : 'document-check'"
                  [loading]="downloading() === row.id + a"
                  [attr.aria-label]="'Descargar ' + a.toUpperCase() + ' de ' + row.number"
                  (click)="download(row, a)"
                >
                  {{ a.toUpperCase() }}
                </button>
              } @empty {
                <small class="text-muted">En validación</small>
              }
            </ng-template>
          </ui-data-table>
          @if (dianPage()!.total > dianPage()!.limit) {
            <ui-pagination
              [page]="dianPageNumber()"
              [pageSize]="dianPage()!.limit"
              [total]="dianPage()!.total"
              [pageSizeOptions]="[]"
              (pageChange)="dianPageNumber.set($event.page)"
            />
          }
        } @else {
          <ui-empty-state
            icon="document-check"
            title="Sin facturas electrónicas"
            message="Las facturas aparecen aquí cuando la DIAN las valida."
          />
        }
      </section>

      <section class="ui-card mb" aria-labelledby="inv-charges">
        <h2 class="ui-card__title" id="inv-charges">Cuentas de cobro</h2>
        <ui-data-table
          [columns]="chargeColumns"
          [rows]="charges()"
          caption="Cuentas de cobro"
          emptyTitle="Sin cuentas de cobro"
        >
          <ng-template uiCell="description" let-row>
            {{ row.description }}
            <small class="text-muted">{{ month(row.period) }}</small>
          </ng-template>
          <ng-template uiCell="status" let-row>
            <ui-badge [tone]="chargeTone(row)">{{ chargeLabel(row) }}</ui-badge>
          </ng-template>
          <ng-template uiCell="doc" let-row>
            <a
              ui-button
              size="sm"
              variant="ghost"
              icon="eye"
              [routerLink]="['cobros', row.id, 'documento']"
              [attr.aria-label]="'Ver cuenta de cobro ' + row.description"
              >Ver</a
            >
          </ng-template>
        </ui-data-table>
      </section>

      <section class="ui-card" aria-labelledby="inv-receipts">
        <h2 class="ui-card__title" id="inv-receipts">Recibos de pago</h2>
        @if (s.payments.length) {
          <ui-data-table [columns]="paymentColumns" [rows]="s.payments" caption="Recibos de pago">
            <ng-template uiCell="receipt" let-row>
              <a
                ui-button
                size="sm"
                variant="ghost"
                icon="printer"
                [routerLink]="['recibos', row.receiptNumber]"
                [attr.aria-label]="'Ver recibo ' + row.receiptNumber"
                >Recibo</a
              >
            </ng-template>
          </ui-data-table>
        } @else {
          <ui-empty-state icon="banknotes" title="Sin pagos registrados" />
        }
      </section>
    }
  `,
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-5);
    }
    .kpis {
      display: grid;
      gap: var(--space-4);
      grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
    }
    .center {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }
    small {
      display: block;
    }
  `,
})
export class PortalInvoicesPage {
  private readonly finance = inject(FinanceService);
  protected readonly ctx = inject(PortalStudentContext);

  protected readonly statement = rxResource({
    params: () => this.ctx.current()?.id,
    stream: ({ params }) => this.finance.accountStatement(params),
  });
  protected readonly st = computed(() => resourceValue(this.statement, null));

  private readonly toast = inject(ToastService);
  protected readonly dianPageNumber = signal(1);
  protected readonly downloading = signal<string | null>(null);
  protected readonly dian = rxResource({
    params: () => {
      const id = this.ctx.current()?.id;
      return id ? { id, page: this.dianPageNumber() } : undefined;
    },
    stream: ({ params }) => this.finance.portalDianDocuments(params.id, params.page),
  });
  protected readonly dianPage = computed(() => resourceValue(this.dian, null));
  protected readonly dianColumns: TableColumn<PortalDianDocument>[] = [
    { key: 'number', header: 'Número', mono: true },
    { key: 'documentTypeName', header: 'Tipo', hideBelow: 'md' },
    { key: 'issueDate', header: 'Fecha', format: (v) => formatDay(v as string) },
    {
      key: 'totalAmount',
      header: 'Total',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
    { key: 'status', header: 'Estado' },
    { key: 'files', header: 'Archivos', align: 'end' },
  ];

  protected dianStatus(status: string): string {
    return DIAN_STATUS_LABELS[status] ?? status;
  }

  protected download(doc: PortalDianDocument, artifact: PortalDianArtifact): void {
    const studentId = this.ctx.current()?.id;
    if (!studentId) return;
    this.downloading.set(doc.id + artifact);
    this.finance.portalDianArtifact(studentId, doc.id, artifact).subscribe({
      next: (blob) => {
        saveFile(blob, `${doc.number}.${artifact}`);
        this.downloading.set(null);
      },
      error: (e: unknown) => {
        this.downloading.set(null);
        this.toast.error(errorMessage(e));
      },
    });
  }
  protected readonly charges = computed(() =>
    (this.st()?.charges ?? [])
      .filter((c) => c.status !== 'cancelled')
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate)),
  );
  protected readonly cop = formatCop;
  protected readonly month = monthLabel;

  protected readonly chargeColumns: TableColumn<Charge>[] = [
    {
      key: 'id',
      header: 'N.º',
      mono: true,
      width: '6rem',
      format: (v) => String(v).padStart(6, '0'),
    },
    { key: 'description', header: 'Concepto' },
    {
      key: 'dueDate',
      header: 'Vencimiento',
      hideBelow: 'md',
      format: (v) => formatDay(v as string),
    },
    {
      key: 'netAmount',
      header: 'Monto',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
    {
      key: 'paidAmount',
      header: 'Pagado',
      align: 'end',
      mono: true,
      hideBelow: 'md',
      format: (v) => formatCop(v as number),
    },
    {
      key: 'pendingAmount',
      header: 'Saldo',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
    { key: 'status', header: 'Estado' },
    { key: 'doc', header: 'Documento', align: 'end' },
  ];
  protected readonly paymentColumns: TableColumn<PaymentListItem>[] = [
    { key: 'paidAt', header: 'Fecha', format: (v) => formatDateEs(v as string) },
    { key: 'receiptNumber', header: 'Recibo', mono: true },
    {
      key: 'concepts',
      header: 'Concepto(s)',
      hideBelow: 'md',
      format: (v) => (v as string[]).join(', ') || '—',
    },
    {
      key: 'amount',
      header: 'Monto',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
    },
    { key: 'method', header: 'Medio', hideBelow: 'md', format: (v) => methodLabel(v as string) },
    { key: 'receipt', header: 'Recibo', align: 'end' },
  ];

  protected chargeTone(c: Charge) {
    return c.isOverdue && c.pendingAmount > 0 ? 'danger' : CHARGE_STATUS_TONES[c.status];
  }
  protected chargeLabel(c: Charge): string {
    return c.isOverdue && c.pendingAmount > 0 ? 'Vencido' : CHARGE_STATUS_LABELS[c.status];
  }
  protected err(e: unknown): string {
    return errorMessage(e);
  }
}
