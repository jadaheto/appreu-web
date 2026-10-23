import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, map, startWith } from 'rxjs';
import { ConfirmService, ToastService } from '../../../../core';
import {
  CopCurrencyPipe,
  formatCop,
  UiAlert,
  UiButton,
  UiFormField,
  UiInput,
  UiSelect,
  UiTextarea,
} from '../../../../shared/ui';
import { DaneLocationFields } from '../../components/dane-location-fields';
import { blankToUndefined, catalogOptions, errorMessage } from '../../components/e-invoicing-ui';
import {
  createLineForm,
  estimateTotals,
  LineForm,
  LineItemsEditor,
  lineFormToInput,
} from '../../components/line-items-editor';
import { IssueInvoiceRequest, PaymentForm } from '../../data-access/e-invoicing.models';
import { EInvoicingService } from '../../data-access/e-invoicing.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** A crédito la fecha de vencimiento es obligatoria. */
function dueDateRequiredOnCredit(group: AbstractControl): ValidationErrors | null {
  const { form, dueDate } = group.value as { form: PaymentForm | null; dueDate: string };
  return form === '2' && !dueDate ? { dueDateRequired: true } : null;
}

/** Emisión manual de una factura electrónica de venta. */
@Component({
  selector: 'app-e-invoicing-issue-invoice-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CopCurrencyPipe,
    UiAlert,
    UiButton,
    UiFormField,
    UiInput,
    UiSelect,
    UiTextarea,
    DaneLocationFields,
    LineItemsEditor,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './issue-invoice-page.html',
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-6);
    }
    .totals {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-5);
      margin-top: var(--space-4);
      font-size: var(--text-sm);
    }
    .totals strong {
      font-family: var(--font-mono);
      color: var(--color-text-strong);
    }
    .form-actions {
      justify-content: flex-end;
    }
  `,
})
export class IssueInvoicePage {
  private readonly service = inject(EInvoicingService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly idTypes = rxResource({ stream: () => this.service.catalog('id-types') });
  protected readonly vatRegimes = rxResource({ stream: () => this.service.catalog('vat-regimes') });
  protected readonly taxResponsibilities = rxResource({
    stream: () => this.service.catalog('tax-responsibilities'),
  });
  protected readonly paymentForms = rxResource({
    stream: () => this.service.catalog('payment-forms'),
  });
  protected readonly paymentMeans = rxResource({
    stream: () => this.service.catalog('payment-means'),
  });
  protected readonly idTypeOptions = computed(() => catalogOptions(resourceValue(this.idTypes)));
  protected readonly vatOptions = computed(() => catalogOptions(resourceValue(this.vatRegimes)));
  protected readonly taxLevelOptions = computed(() =>
    catalogOptions(resourceValue(this.taxResponsibilities)),
  );
  protected readonly formOptions = computed(() =>
    catalogOptions(resourceValue(this.paymentForms), false),
  );
  protected readonly meansOptions = computed(() =>
    catalogOptions(resourceValue(this.paymentMeans)),
  );

  protected readonly form = new FormGroup({
    customer: new FormGroup({
      idType: new FormControl<string | null>('13', Validators.required),
      idNumber: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9.\- ]{3,30}$/)],
      }),
      name: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(255)],
      }),
      firstName: new FormControl('', { nonNullable: true, validators: Validators.maxLength(100) }),
      familyName: new FormControl('', { nonNullable: true, validators: Validators.maxLength(100) }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.email, Validators.maxLength(200)],
      }),
      phone: new FormControl('', { nonNullable: true, validators: Validators.maxLength(30) }),
      address: new FormControl('', { nonNullable: true, validators: Validators.maxLength(255) }),
      departmentCode: new FormControl<string | null>(null),
      cityCode: new FormControl<string | null>(null),
      vatRegime: new FormControl<string | null>(null),
      taxLevelCode: new FormControl<string | null>(null),
    }),
    lines: new FormArray<LineForm>([createLineForm()]),
    paymentMeans: new FormGroup(
      {
        form: new FormControl<string | null>('1', Validators.required),
        code: new FormControl<string | null>('10', Validators.required),
        dueDate: new FormControl('', { nonNullable: true }),
      },
      { validators: dueDateRequiredOnCredit },
    ),
    notes: new FormControl('', { nonNullable: true, validators: Validators.maxLength(2000) }),
  });

  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly messages = {
    pattern: 'Use entre 3 y 30 letras, números, puntos o guiones.',
  };

  protected readonly paymentForm = toSignal(
    this.form.controls.paymentMeans.controls.form.valueChanges.pipe(
      startWith(this.form.controls.paymentMeans.controls.form.value),
    ),
  );
  /** Totales estimados (solo orientativos; el servidor calcula los definitivos). */
  protected readonly estimate = toSignal(
    this.form.controls.lines.valueChanges.pipe(
      startWith(null),
      map(() => {
        const t = estimateTotals(this.form.controls.lines.controls.map(lineFormToInput));
        return { ...t, total: t.subtotal + t.tax };
      }),
    ),
    { initialValue: { subtotal: 0, tax: 0, total: 0 } },
  );

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const total = this.estimate().total;
    const ok = await this.confirm.ask({
      title: '¿Emitir la factura electrónica?',
      message: `Se firmará y enviará a la DIAN una factura por aproximadamente ${formatCop(total)}. Una factura emitida solo se corrige con notas.`,
      confirmLabel: 'Emitir factura',
    });
    if (!ok) return;
    this.saving.set(true);
    this.serverError.set(null);
    try {
      const doc = await firstValueFrom(this.service.issueInvoice(this.toRequest()));
      this.toast.success(`Factura ${doc.number} emitida.`);
      void this.router.navigate(['../documentos', doc.id], { relativeTo: this.route });
    } catch (err) {
      this.serverError.set(errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  private toRequest(): IssueInvoiceRequest {
    const c = this.form.controls.customer.getRawValue();
    const p = this.form.controls.paymentMeans.getRawValue();
    return {
      customer: {
        name: c.name.trim(),
        idType: c.idType!,
        idNumber: c.idNumber.trim(),
        email: blankToUndefined(c.email),
        phone: blankToUndefined(c.phone),
        address: blankToUndefined(c.address),
        cityCode: c.cityCode ?? undefined,
        firstName: blankToUndefined(c.firstName),
        familyName: blankToUndefined(c.familyName),
        vatRegime: (c.vatRegime as '48' | '49' | null) ?? undefined,
        taxLevelCode: c.taxLevelCode ?? undefined,
      },
      lines: this.form.controls.lines.controls.map(lineFormToInput),
      paymentMeans: {
        form: p.form as PaymentForm,
        code: p.code!,
        dueDate: p.form === '2' ? p.dueDate : undefined,
      },
      notes: blankToUndefined(this.form.controls.notes.value),
    };
  }
}
