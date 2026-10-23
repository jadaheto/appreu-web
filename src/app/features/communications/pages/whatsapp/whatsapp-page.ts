import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, ConfirmService, ToastService } from '../../../../core';
import {
  CopCurrencyPipe,
  DateEsPipe,
  PageChange,
  SelectOption,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiChip,
  UiDataTable,
  UiFormField,
  UiInput,
  UiPagination,
  UiSearchBox,
  UiSelect,
  UiStatCard,
  UiTextarea,
} from '../../../../shared/ui';
import { DeliverySummaryView } from '../../components/delivery-summary';
import { WhatsAppPreview } from '../../components/whatsapp-preview';
import {
  DeliverySummary,
  PaymentOption,
  WHATSAPP_STATUS_LABELS,
  WHATSAPP_STATUSES,
  WhatsAppLog,
  WhatsAppLogQuery,
  WhatsAppStatus,
  WhatsAppTemplate,
} from '../../data-access/communications.models';
import { reportError } from '../../data-access/report-error';
import { WhatsAppService } from '../../data-access/whatsapp.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Normaliza un móvil colombiano: quita separadores y acepta `57` + 10 dígitos o 10 dígitos. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s()+-]/g, '');
}
export const PHONE_PATTERN = /^(57)?\d{10}$/;

/** `/admin/whatsapp`: KPIs, historial, envío individual, eventos y confirmaciones de pago. */
@Component({
  selector: 'app-whatsapp-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CopCurrencyPipe,
    DateEsPipe,
    DeliverySummaryView,
    WhatsAppPreview,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiChip,
    UiDataTable,
    UiFormField,
    UiInput,
    UiPagination,
    UiSearchBox,
    UiSelect,
    UiStatCard,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './whatsapp-page.html',
  styleUrl: '../comms.scss',
})
export class WhatsAppPage {
  /** Lectura segura de los resources en la plantilla (no lanza en estado de error). */
  protected readonly val = resourceValue;
  private readonly wa = inject(WhatsAppService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly isAdmin = computed(() => this.auth.hasRole('admin'));
  protected readonly canNotifyEvents = computed(() => this.auth.hasRole('admin', 'hr'));
  protected readonly canConfirmPayments = computed(() => this.auth.hasRole('admin', 'finance'));

  protected readonly kpis = rxResource({ stream: () => this.wa.kpis() });
  protected readonly statuses = WHATSAPP_STATUSES;
  protected readonly statusLabels = WHATSAPP_STATUS_LABELS;

  // ── Historial ──
  protected readonly query = signal<WhatsAppLogQuery>({ page: 1, pageSize: 20 });
  protected readonly logs = rxResource({
    params: () => this.query(),
    stream: ({ params }) => this.wa.logs(params),
  });
  protected readonly columns: TableColumn<WhatsAppLog>[] = [
    { key: 'templateName', header: 'Plantilla' },
    { key: 'studentName', header: 'Alumno', hideBelow: 'md' },
    { key: 'phone', header: 'Teléfono', mono: true },
    { key: 'status', header: 'Estado', width: '8rem' },
    { key: 'createdAt', header: 'Fecha', width: '9rem' },
  ];

  // ── Envío individual ──
  protected readonly templates = rxResource({ stream: () => this.wa.templates('active') });
  protected readonly templateOptions = computed<SelectOption<string>[]>(() =>
    (resourceValue(this.templates) ?? []).map((t) => ({ value: t.name, label: t.name })),
  );
  protected readonly single = this.fb.group({
    phone: this.fb.control('', [Validators.required]),
    templateName: this.fb.control('', Validators.required),
    variables: this.fb.array<FormControl<string>>([]),
  });
  private readonly singleTemplateName = toSignal(this.single.controls.templateName.valueChanges, {
    initialValue: '',
  });
  protected readonly selectedTemplate = computed<WhatsAppTemplate | null>(
    () =>
      (resourceValue(this.templates) ?? []).find((t) => t.name === this.singleTemplateName()) ??
      null,
  );
  private readonly variableValues = toSignal(this.single.controls.variables.valueChanges, {
    initialValue: [] as string[],
  });
  protected readonly previewValues = computed(() => this.variableValues() as string[]);
  protected readonly sendingSingle = signal(false);
  protected readonly phoneMessages = {
    pattern: 'Usa 57 + 10 dígitos o 10 dígitos (ej. 573001234567).',
  };

  // ── Evento ──
  protected readonly event = this.fb.group({
    date: this.fb.control('', Validators.required),
    name: this.fb.control('', [Validators.required, Validators.maxLength(200)]),
    details: this.fb.control('', Validators.maxLength(600)),
  });
  protected readonly sendingEvent = signal(false);
  protected readonly eventResult = signal<DeliverySummary | null>(null);

  // ── Confirmación de pagos ──
  protected readonly paymentSearch = signal('');
  protected readonly payments = rxResource({
    params: () => (this.canConfirmPayments() ? { search: this.paymentSearch() } : undefined),
    stream: ({ params }) => this.wa.recentPayments(params.search),
  });
  protected readonly paymentColumns: TableColumn<PaymentOption>[] = [
    { key: 'receiptNumber', header: 'Recibo', mono: true },
    { key: 'studentName', header: 'Alumno' },
    { key: 'amount', header: 'Monto', align: 'end' },
  ];
  protected readonly paymentActions: TableAction<PaymentOption>[] = [
    { id: 'confirm', label: 'Confirmar pago por WhatsApp', icon: 'chat-bubble' },
  ];
  protected readonly confirming = signal<number | null>(null);

  constructor() {
    this.single.controls.templateName.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((name) => this.buildVariables(name));
    this.single.controls.phone.addValidators((c) =>
      c.value && !PHONE_PATTERN.test(normalizePhone(c.value)) ? { pattern: true } : null,
    );
  }

  protected variableLabel(index: number): string {
    return this.selectedTemplate()?.variables[index] || `Variable {{${index + 1}}}`;
  }

  private buildVariables(name: string): void {
    const template = (resourceValue(this.templates) ?? []).find((t) => t.name === name);
    const count = template?.placeholderCount ?? 0;
    const array = this.single.controls.variables;
    array.clear({ emitEvent: false });
    for (let i = 0; i < count; i++)
      array.push(this.fb.control('', Validators.required), { emitEvent: false });
    array.updateValueAndValidity();
  }

  protected filterStatus(status: WhatsAppStatus | null): void {
    this.query.update((q) => ({ ...q, page: 1, status }));
  }

  protected search(text: string): void {
    this.query.update((q) => ({ ...q, page: 1, search: text || null }));
  }

  protected changePage(change: PageChange): void {
    this.query.update((q) => ({ ...q, page: change.page, pageSize: change.pageSize }));
  }

  private refresh(): void {
    this.kpis.reload();
    this.logs.reload();
  }

  protected async sendSingle(): Promise<void> {
    this.single.markAllAsTouched();
    if (this.single.invalid || this.sendingSingle()) return;
    const v = this.single.getRawValue();
    const phone = normalizePhone(v.phone);
    const ok = await this.confirm.ask({
      title: '¿Enviar el mensaje?',
      message: `Plantilla «${v.templateName}» al número ${phone}.`,
      confirmLabel: 'Enviar',
    });
    if (!ok) return;
    this.sendingSingle.set(true);
    this.wa.send({ phone, templateName: v.templateName, variables: v.variables }).subscribe({
      next: (res) => {
        this.sendingSingle.set(false);
        this.toast.success(`Mensaje enviado a ${res.phone}.`);
        this.single.reset();
        this.single.controls.variables.clear();
        this.refresh();
      },
      error: (err) => {
        this.sendingSingle.set(false);
        reportError(this.toast, err);
        this.refresh();
      },
    });
  }

  protected async sendEvent(): Promise<void> {
    this.event.markAllAsTouched();
    if (this.event.invalid || this.sendingEvent()) return;
    const v = this.event.getRawValue();
    const ok = await this.confirm.ask({
      title: '¿Notificar el evento?',
      message: `Se enviará «${v.name}» a todos los acudientes con móvil registrado.`,
      confirmLabel: 'Notificar',
    });
    if (!ok) return;
    this.sendingEvent.set(true);
    this.eventResult.set(null);
    this.wa
      .notifyEvent({ date: v.date, name: v.name.trim(), details: v.details.trim() })
      .subscribe({
        next: (summary) => {
          this.sendingEvent.set(false);
          this.eventResult.set(summary);
          this.event.reset();
          this.refresh();
        },
        error: (err) => {
          this.sendingEvent.set(false);
          reportError(this.toast, err);
        },
      });
  }

  protected async onPaymentAction(event: TableActionEvent<PaymentOption>): Promise<void> {
    if (event.action !== 'confirm' || this.confirming() !== null) return;
    const p = event.row;
    const ok = await this.confirm.ask({
      title: '¿Confirmar el pago por WhatsApp?',
      message: `Recibo ${p.receiptNumber} de ${p.studentName}. Se notificará al acudiente.`,
      confirmLabel: 'Enviar confirmación',
    });
    if (!ok) return;
    this.confirming.set(p.id);
    this.wa.confirmPayment(p.id).subscribe({
      next: (res) => {
        this.confirming.set(null);
        this.toast.success(`Confirmación enviada a ${res.phone}.`);
        this.refresh();
      },
      error: (err) => {
        this.confirming.set(null);
        reportError(this.toast, err);
      },
    });
  }
}
