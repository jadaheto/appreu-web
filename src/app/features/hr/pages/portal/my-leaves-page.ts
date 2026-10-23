import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ConfirmService, ToastService } from '../../../../core';
import {
  PageChange,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiModal,
  UiPagination,
  UiStatCard,
} from '../../../../shared/ui';
import { HrStatusBadge } from '../../components/hr-status-badge';
import { LeaveFormValue, LeaveRequestForm } from '../../components/leave-request-form';
import { Leave, LEAVE_TYPE_LABELS, PAY_TREATMENT_LABELS } from '../../data-access/hr.models';
import { apiMessage, shortDate } from '../../data-access/hr-ui';
import { MyEmployeeService } from '../../data-access/my-employee.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Mis permisos: solicitar, ver el estado y cancelar los pendientes. */
@Component({
  selector: 'app-my-leaves-page',
  imports: [
    UiAlert,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiModal,
    UiPagination,
    UiStatCard,
    HrStatusBadge,
    LeaveRequestForm,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Permisos y novedades</h1>
        <p class="page-header__subtitle">
          Solicita permisos y consulta el estado de tus solicitudes.
        </p>
      </div>
      @if (!result.error()) {
        <button ui-button variant="primary" icon="plus" (click)="openRequest()">
          Solicitar permiso
        </button>
      }
    </div>

    @if (result.error()) {
      <ui-alert tone="warning" title="No es posible gestionar permisos">
        {{ apiMessage(result.error()) }}
      </ui-alert>
    } @else {
      <section
        class="grid grid--3"
        style="margin-bottom: var(--space-6)"
        aria-label="Resumen del año"
      >
        <ui-stat-card
          label="Pendientes"
          icon="clock"
          variant="border"
          tone="warning"
          [loading]="dashboard.isLoading()"
          [value]="dash()?.pendingLeaves ?? null"
        />
        <ui-stat-card
          label="Aprobados en el año"
          icon="check-circle"
          variant="border"
          tone="success"
          [loading]="dashboard.isLoading()"
          [value]="dash()?.approvedLeavesThisYear ?? null"
        />
        <ui-stat-card
          label="Días de ausencia en el año"
          icon="calendar"
          variant="border"
          tone="info"
          [loading]="dashboard.isLoading()"
          [value]="dash()?.absenceDaysThisYear ?? null"
        />
      </section>

      <ui-data-table
        caption="Mis solicitudes de permiso"
        [columns]="columns"
        [rows]="rows()"
        [loading]="result.isLoading()"
        [actions]="actions"
        emptyIcon="calendar"
        emptyTitle="No tienes solicitudes"
        emptyMessage="Usa «Solicitar permiso» para crear una."
        (action)="onAction($event)"
      >
        <ng-template uiCell="leaveType" let-row>
          <div>{{ typeLabels[row.leaveType] }}</div>
          <div class="text-muted" style="font-size: var(--text-xs)">
            {{ treatmentLabels[row.payTreatment] }}
          </div>
        </ng-template>
        <ng-template uiCell="reason" let-row>
          <span [attr.title]="row.reason">{{
            row.reason.length > 60 ? row.reason.slice(0, 60) + '…' : row.reason
          }}</span>
          @if (row.decisionNote) {
            <div class="text-muted" style="font-size: var(--text-xs)">
              RR. HH.: {{ row.decisionNote }}
            </div>
          }
        </ng-template>
        <ng-template uiCell="displayStatus" let-row>
          <app-hr-status-badge kind="leave" [status]="row.displayStatus" />
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

    <ui-modal
      [(open)]="requestOpen"
      title="Solicitar permiso"
      description="La solicitud queda pendiente hasta que RR. HH. la apruebe."
    >
      @if (requestError()) {
        <ui-alert tone="error" style="display: block; margin-bottom: var(--space-4)">{{
          requestError()
        }}</ui-alert>
      }
      <app-leave-request-form [busy]="sending()" (submitted)="request($event)">
        <button ui-button type="button" (click)="requestOpen.set(false)">Cancelar</button>
      </app-leave-request-form>
    </ui-modal>
  `,
})
export class MyLeavesPage {
  private readonly me = inject(MyEmployeeService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly apiMessage = apiMessage;
  protected readonly typeLabels: Readonly<Record<string, string>> = LEAVE_TYPE_LABELS;
  protected readonly treatmentLabels: Readonly<Record<string, string>> = PAY_TREATMENT_LABELS;

  protected readonly paging = signal({ page: 1, pageSize: 20 });
  protected readonly result = rxResource({
    params: () => this.paging(),
    stream: ({ params }) => this.me.leaves(params.page, params.pageSize),
  });
  protected readonly rows = computed(() => resourceValue(this.result)?.items ?? []);
  protected readonly total = computed(() => resourceValue(this.result)?.total ?? 0);
  protected readonly dashboard = rxResource({ stream: () => this.me.dashboard() });
  protected readonly dash = computed(() => resourceValue(this.dashboard, null));

  protected readonly columns: TableColumn<Leave>[] = [
    { key: 'leaveType', header: 'Tipo' },
    { key: 'startDate', header: 'Desde', format: (v) => shortDate(v as string) },
    { key: 'endDate', header: 'Hasta', format: (v) => shortDate(v as string), hideBelow: 'sm' },
    { key: 'days', header: 'Días', align: 'end', mono: true },
    { key: 'reason', header: 'Motivo', hideBelow: 'md' },
    { key: 'displayStatus', header: 'Estado' },
  ];
  protected readonly actions: TableAction<Leave>[] = [
    {
      id: 'cancel',
      label: 'Cancelar solicitud',
      icon: 'trash',
      tone: 'danger',
      hidden: (r) => r.status !== 'pending',
    },
  ];

  protected readonly requestOpen = signal(false);
  protected readonly sending = signal(false);
  protected readonly requestError = signal<string | null>(null);
  private readonly form = viewChild(LeaveRequestForm);

  protected changePage(change: PageChange): void {
    this.paging.set({ page: change.page, pageSize: change.pageSize });
  }

  protected openRequest(): void {
    this.requestError.set(null);
    this.form()?.reset();
    this.requestOpen.set(true);
  }

  protected request(value: LeaveFormValue): void {
    this.sending.set(true);
    this.requestError.set(null);
    this.me
      .requestLeave({
        leaveType: value.leaveType,
        startDate: value.startDate,
        endDate: value.endDate,
        reason: value.reason,
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.requestOpen.set(false);
          this.toast.success('Solicitud enviada a RR. HH.');
          this.reload();
        },
        error: (err: unknown) => {
          this.sending.set(false);
          this.requestError.set(apiMessage(err));
        },
      });
  }

  protected async onAction({ row }: TableActionEvent<Leave>): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Cancelar la solicitud?',
      message: `${LEAVE_TYPE_LABELS[row.leaveType]} del ${shortDate(row.startDate)} al ${shortDate(row.endDate)}`,
      confirmLabel: 'Cancelar solicitud',
      cancelLabel: 'Volver',
      tone: 'danger',
    });
    if (!ok) return;
    this.me.cancelLeave(row.id).subscribe({
      next: () => {
        this.toast.success('Solicitud cancelada.');
        this.reload();
      },
      error: (err: unknown) => this.toast.error(apiMessage(err)),
    });
  }

  private reload(): void {
    this.result.reload();
    this.dashboard.reload();
  }
}
