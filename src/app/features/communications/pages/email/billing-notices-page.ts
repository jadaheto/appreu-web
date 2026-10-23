import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmService, ToastService } from '../../../../core';
import {
  CopCurrencyPipe,
  SelectOption,
  UiAlert,
  UiButton,
  UiCheckbox,
  UiFormField,
  UiInput,
  UiSelect,
  UiStatCard,
} from '../../../../shared/ui';
import { DeliverySummaryView } from '../../components/delivery-summary';
import {
  BillingChannel,
  BillingPreview,
  BillingResult,
} from '../../data-access/communications.models';
import { EmailService } from '../../data-access/email.service';
import { reportError } from '../../data-access/report-error';
import { WhatsAppService } from '../../data-access/whatsapp.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const DEFAULT_TEMPLATE = 'cobro_mensual';

export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function atLeastOneChannel(group: AbstractControl): ValidationErrors | null {
  const { email, whatsapp } = group.value as { email: boolean; whatsapp: boolean };
  return email || whatsapp ? null : { noChannel: true };
}

/** `/admin/correos/cobros`: vista previa y envío de los avisos de cobro del mes (correo y/o WhatsApp). */
@Component({
  selector: 'app-billing-notices-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CopCurrencyPipe,
    DeliverySummaryView,
    UiAlert,
    UiButton,
    UiCheckbox,
    UiFormField,
    UiInput,
    UiSelect,
    UiStatCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './billing-notices-page.html',
  styleUrl: '../comms.scss',
})
export class BillingNoticesPage {
  private readonly email = inject(EmailService);
  private readonly whatsapp = inject(WhatsAppService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    month: this.fb.control(currentMonth(), [
      Validators.required,
      Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/),
    ]),
    conceptId: this.fb.control<number | null>(null),
    channels: this.fb.group(
      { email: this.fb.control(true), whatsapp: this.fb.control(true) },
      { validators: atLeastOneChannel },
    ),
    templateName: this.fb.control(DEFAULT_TEMPLATE),
  });

  private readonly channels = toSignal(this.form.controls.channels.valueChanges, {
    initialValue: this.form.controls.channels.getRawValue(),
  });
  protected readonly useWhatsApp = computed(() => !!this.channels().whatsapp);
  protected readonly channelsInvalid = computed(
    () => !this.channels().email && !this.channels().whatsapp,
  );

  private readonly concepts = rxResource({ stream: () => this.email.concepts() });
  private readonly templates = rxResource({ stream: () => this.whatsapp.templates('active') });
  protected readonly conceptOptions = computed<SelectOption<number>[]>(() =>
    (resourceValue(this.concepts) ?? []).map((c) => ({ value: c.id, label: c.name })),
  );
  protected readonly templateOptions = computed<SelectOption<string>[]>(() => {
    const names = (resourceValue(this.templates) ?? []).map((t) => t.name);
    if (!names.includes(DEFAULT_TEMPLATE)) names.unshift(DEFAULT_TEMPLATE);
    return names.map((n) => ({ value: n, label: n }));
  });

  protected readonly preview = signal<BillingPreview | null>(null);
  protected readonly previewing = signal(false);
  protected readonly sending = signal(false);
  protected readonly result = signal<BillingResult | null>(null);

  constructor() {
    // La vista previa deja de ser válida si cambian el mes o el concepto.
    this.form.controls.month.valueChanges.subscribe(() => this.preview.set(null));
    this.form.controls.conceptId.valueChanges.subscribe(() => this.preview.set(null));
  }

  protected loadPreview(): void {
    const { month, conceptId } = this.form.controls;
    month.markAsTouched();
    if (month.invalid) return;
    this.previewing.set(true);
    this.email.billingPreview(month.value, conceptId.value).subscribe({
      next: (p) => {
        this.preview.set(p);
        this.previewing.set(false);
      },
      error: (err) => {
        this.previewing.set(false);
        reportError(this.toast, err);
      },
    });
  }

  protected async send(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.sending()) return;
    const v = this.form.getRawValue();
    const channels: BillingChannel[] = [];
    if (v.channels.email) channels.push('email');
    if (v.channels.whatsapp) channels.push('whatsapp');
    const p = this.preview();
    const ok = await this.confirm.ask({
      title: '¿Enviar los avisos de cobro?',
      message: p
        ? `Se notificarán ${p.charges} cargo(s) pendientes de ${p.month} por ${channels.join(' y ')}.`
        : `Se notificarán los cargos pendientes de ${v.month} por ${channels.join(' y ')}.`,
      confirmLabel: 'Enviar avisos',
    });
    if (!ok) return;

    this.sending.set(true);
    this.result.set(null);
    this.email
      .sendBilling({
        month: v.month,
        conceptId: v.conceptId,
        channels,
        templateName: v.templateName,
      })
      .subscribe({
        next: (res) => {
          this.sending.set(false);
          this.result.set(res);
          this.toast.success(`Avisos procesados: ${res.charges} cargo(s).`);
        },
        error: (err) => {
          this.sending.set(false);
          reportError(this.toast, err);
        },
      });
  }
}
