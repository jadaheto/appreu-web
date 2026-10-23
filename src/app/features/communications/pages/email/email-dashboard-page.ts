import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core';
import {
  BadgeTone,
  DateEsPipe,
  PageChange,
  SelectOption,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiFilterBar,
  UiFormField,
  UiModal,
  UiPagination,
  UiSearchBox,
  UiSelect,
  UiStatCard,
} from '../../../../shared/ui';
import {
  EMAIL_STATUSES,
  EMAIL_TYPE_LABELS,
  EMAIL_TYPE_TONES,
  EMAIL_TYPES,
  EmailLog,
  EmailLogQuery,
  EmailStatus,
  EmailType,
} from '../../data-access/communications.models';
import { EmailService } from '../../data-access/email.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const STATUS_TEXT: Record<EmailStatus, string> = {
  sent: 'Enviado',
  failed: 'Fallido',
  pending: 'Pendiente',
};

/** `/admin/correos`: KPIs e historial de correos con accesos a redactar, cobros y herramientas. */
@Component({
  selector: 'app-email-dashboard-page',
  imports: [
    FormsModule,
    RouterLink,
    DateEsPipe,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFilterBar,
    UiFormField,
    UiModal,
    UiPagination,
    UiSearchBox,
    UiSelect,
    UiStatCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './email-dashboard-page.html',
  styleUrl: '../comms.scss',
})
export class EmailDashboardPage {
  /** Lectura segura de los resources en la plantilla (no lanza en estado de error). */
  protected readonly val = resourceValue;
  private readonly email = inject(EmailService);
  private readonly auth = inject(AuthService);

  protected readonly canBill = computed(() => this.auth.hasRole('admin', 'finance'));
  protected readonly isAdmin = computed(() => this.auth.hasRole('admin'));

  protected readonly kpis = rxResource({ stream: () => this.email.kpis() });

  protected readonly query = signal<EmailLogQuery>({ page: 1, pageSize: 20 });
  protected readonly logs = rxResource({
    params: () => this.query(),
    stream: ({ params }) => this.email.logs(params),
  });

  protected search = '';
  protected type: EmailType | null = null;
  protected status: EmailStatus | null = null;
  protected readonly selected = signal<EmailLog | null>(null);
  protected readonly detailOpen = signal(false);

  protected readonly typeOptions: SelectOption<EmailType>[] = EMAIL_TYPES.map((t) => ({
    value: t,
    label: EMAIL_TYPE_LABELS[t],
  }));
  protected readonly statusOptions: SelectOption<EmailStatus>[] = EMAIL_STATUSES.map((s) => ({
    value: s,
    label: STATUS_TEXT[s],
  }));

  protected readonly columns: TableColumn<EmailLog>[] = [
    { key: 'type', header: 'Tipo', width: '7rem' },
    { key: 'toEmail', header: 'Destinatario' },
    { key: 'subject', header: 'Asunto', hideBelow: 'md' },
    { key: 'status', header: 'Estado', width: '8rem' },
    { key: 'sentByName', header: 'Enviado por', hideBelow: 'lg' },
    { key: 'createdAt', header: 'Fecha', width: '10rem' },
  ];
  protected readonly actions: TableAction<EmailLog>[] = [
    { id: 'view', label: 'Ver detalle', icon: 'eye' },
  ];

  protected readonly hasFilters = computed(() => {
    const q = this.query();
    return !!(q.search || q.type || q.status);
  });

  protected applyFilters(): void {
    this.query.set({
      page: 1,
      pageSize: this.query().pageSize,
      search: this.search.trim() || null,
      type: this.type,
      status: this.status,
    });
  }

  protected onSearch(text: string): void {
    this.search = text;
    this.applyFilters();
  }

  protected clearFilters(): void {
    this.search = '';
    this.type = null;
    this.status = null;
    this.applyFilters();
  }

  protected changePage(change: PageChange): void {
    this.query.update((q) => ({ ...q, page: change.page, pageSize: change.pageSize }));
  }

  protected onAction(event: TableActionEvent<EmailLog>): void {
    if (event.action === 'view') {
      this.selected.set(event.row);
      this.detailOpen.set(true);
    }
  }

  protected typeLabel(type: EmailType): string {
    return EMAIL_TYPE_LABELS[type] ?? type;
  }

  protected typeTone(type: EmailType): BadgeTone {
    return EMAIL_TYPE_TONES[type] ?? 'neutral';
  }

  protected statusText(status: EmailStatus): string {
    return STATUS_TEXT[status] ?? status;
  }
}
