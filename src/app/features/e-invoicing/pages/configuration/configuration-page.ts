import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { firstValueFrom, startWith } from 'rxjs';
import { AuthService, ToastService } from '../../../../core';
import {
  formatDateEs,
  SelectOption,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiCheckbox,
  UiDataTable,
  UiFormField,
  UiInput,
  UiModal,
  UiSelect,
  UiSpinner,
} from '../../../../shared/ui';
import { DaneLocationFields } from '../../components/dane-location-fields';
import { blankToUndefined, catalogOptions, errorMessage } from '../../components/e-invoicing-ui';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  DianEnvironment,
  DocumentType,
  ENVIRONMENT_LABELS,
  IssuerConfig,
  RegisterResolutionRequest,
  Resolution,
  UpdateIssuerConfigRequest,
  UpdateResolutionRequest,
} from '../../data-access/e-invoicing.models';
import { EInvoicingService } from '../../data-access/e-invoicing.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const optional = (max: number) =>
  new FormControl('', { nonNullable: true, validators: Validators.maxLength(max) });

function rangeOrder(group: AbstractControl): ValidationErrors | null {
  const { rangeFrom, rangeTo } = group.value as {
    rangeFrom: number | null;
    rangeTo: number | null;
  };
  return rangeFrom && rangeTo && rangeTo < rangeFrom ? { rangeOrder: true } : null;
}

function invoiceNeedsResolution(group: AbstractControl): ValidationErrors | null {
  const { docType, resolutionNumber } = group.value as {
    docType: DocumentType | null;
    resolutionNumber: string;
  };
  return docType === 'fv' && !resolutionNumber?.trim() ? { resolutionRequired: true } : null;
}

/** Emisor DIAN (RUT, ubicación, software) y resoluciones de numeración. */
@Component({
  selector: 'app-e-invoicing-configuration-page',
  imports: [
    ReactiveFormsModule,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiCheckbox,
    UiDataTable,
    UiFormField,
    UiInput,
    UiModal,
    UiSelect,
    UiSpinner,
    DaneLocationFields,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuration-page.html',
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-6);
    }
    .mb-top {
      margin-top: var(--space-5);
    }
    .checks {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3) var(--space-5);
    }
    fieldset {
      border: 0;
      padding: 0;
      margin: 0;
    }
    legend {
      font-weight: 600;
      font-size: var(--text-sm);
      margin-bottom: var(--space-2);
    }
    .form-actions {
      justify-content: flex-end;
      margin-top: var(--space-5);
    }
    .center {
      display: flex;
      justify-content: center;
      padding: var(--space-6);
    }
  `,
})
export class ConfigurationPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly service = inject(EInvoicingService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  /** `PUT /config` y la gestión de numeraciones son solo para administradores. */
  protected readonly canEdit = computed(() => this.auth.hasRole('admin'));

  protected readonly config = rxResource({ stream: () => this.service.config() });
  protected readonly resolutions = rxResource({ stream: () => this.service.resolutions() });
  protected readonly responsibilities = rxResource({
    stream: () => this.service.catalog('tax-responsibilities'),
  });
  protected readonly vatRegimes = rxResource({ stream: () => this.service.catalog('vat-regimes') });
  protected readonly vatOptions = computed(() => catalogOptions(resourceValue(this.vatRegimes)));

  protected readonly personTypeOptions: SelectOption<string>[] = [
    { value: '1', label: 'Persona jurídica' },
    { value: '2', label: 'Persona natural' },
  ];
  protected readonly environmentOptions: SelectOption<string>[] = (['1', '2'] as const).map(
    (e) => ({
      value: e,
      label: ENVIRONMENT_LABELS[e],
    }),
  );
  protected readonly namingOptions: SelectOption<string>[] = [
    { value: 'annex', label: 'Anexo técnico (recomendado)' },
    { value: 'legacy', label: 'Legado' },
  ];
  protected readonly docTypeOptions: SelectOption<DocumentType>[] = DOCUMENT_TYPES.map((t) => ({
    value: t,
    label: DOCUMENT_TYPE_LABELS[t],
  }));

  protected readonly form = new FormGroup({
    businessName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    nit: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{5,15}$/)],
    }),
    personType: new FormControl<string | null>('1', Validators.required),
    firstName: optional(100),
    familyName: optional(100),
    taxResponsibilities: new FormControl<string[]>([], { nonNullable: true }),
    vatRegime: new FormControl<string | null>('49', Validators.required),
    address: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(255)],
    }),
    departmentCode: new FormControl<string | null>(null),
    cityCode: new FormControl<string | null>(null, Validators.required),
    postalCode: optional(10),
    contactName: optional(150),
    phone: optional(30),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(150)],
    }),
    softwareId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(64)],
    }),
    softwarePin: optional(64),
    environment: new FormControl<string | null>('2', Validators.required),
    testSetId: optional(64),
    autoInvoiceOnPayment: new FormControl(false, { nonNullable: true }),
    fileNaming: new FormControl<string | null>('annex', Validators.required),
    providerCode: new FormControl('000', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{3}$/)],
    }),
  });
  protected readonly personType = toSignal(
    this.form.controls.personType.valueChanges.pipe(startWith(this.form.controls.personType.value)),
  );
  protected readonly selectedResponsibilities = toSignal(
    this.form.controls.taxResponsibilities.valueChanges.pipe(
      startWith(this.form.controls.taxResponsibilities.value),
    ),
    { initialValue: [] as string[] },
  );
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly messages = {
    pattern: 'Solo números (sin dígito de verificación).',
  };

  constructor() {
    effect(() => {
      const cfg = resourceValue(this.config);
      if (cfg) this.patch(cfg);
    });
    effect(() => {
      if (this.canEdit()) this.form.enable({ emitEvent: false });
      else this.form.disable({ emitEvent: false });
    });
  }

  protected toggleResponsibility(code: string, checked: boolean): void {
    const current = this.form.controls.taxResponsibilities.value;
    const next = checked ? [...new Set([...current, code])] : current.filter((c) => c !== code);
    this.form.controls.taxResponsibilities.setValue(next);
    this.form.controls.taxResponsibilities.markAsDirty();
  }

  protected async save(): Promise<void> {
    if (!this.canEdit()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const dto: UpdateIssuerConfigRequest = {
      businessName: v.businessName.trim(),
      nit: v.nit.trim(),
      personType: v.personType as '1' | '2',
      firstName: v.personType === '2' ? blankToUndefined(v.firstName) : undefined,
      familyName: v.personType === '2' ? blankToUndefined(v.familyName) : undefined,
      taxResponsibilities: v.taxResponsibilities.join(';'),
      vatRegime: v.vatRegime as '48' | '49',
      address: v.address.trim(),
      cityCode: v.cityCode ?? undefined,
      postalCode: blankToUndefined(v.postalCode),
      contactName: blankToUndefined(v.contactName),
      phone: blankToUndefined(v.phone),
      email: v.email.trim(),
      softwareId: v.softwareId.trim(),
      softwarePin: blankToUndefined(v.softwarePin),
      environment: v.environment as DianEnvironment,
      testSetId: blankToUndefined(v.testSetId),
      autoInvoiceOnPayment: v.autoInvoiceOnPayment,
      fileNaming: v.fileNaming as 'annex' | 'legacy',
      providerCode: v.providerCode,
    };
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await firstValueFrom(this.service.updateConfig(dto));
      this.config.value.set(updated);
      this.toast.success('Configuración del emisor guardada.');
    } catch (err) {
      this.saveError.set(errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  private patch(cfg: IssuerConfig): void {
    this.form.reset({
      businessName: cfg.businessName,
      nit: cfg.nit,
      personType: cfg.personType,
      firstName: cfg.firstName ?? '',
      familyName: cfg.familyName ?? '',
      taxResponsibilities: (cfg.taxResponsibilities ?? '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean),
      vatRegime: cfg.vatRegime,
      address: cfg.address,
      departmentCode: cfg.location?.departmentCode || null,
      cityCode: cfg.location?.cityCode || null,
      postalCode: cfg.postalCode ?? '',
      contactName: cfg.contactName ?? '',
      phone: cfg.phone ?? '',
      email: cfg.email ?? '',
      softwareId: cfg.softwareId,
      softwarePin: '',
      environment: cfg.environment,
      testSetId: cfg.testSetId ?? '',
      autoInvoiceOnPayment: cfg.autoInvoiceOnPayment,
      fileNaming: cfg.fileNaming,
      providerCode: cfg.providerCode,
    });
    if (!this.canEdit()) this.form.disable({ emitEvent: false });
  }

  // ----- Resoluciones -----

  protected readonly resolutionColumns: TableColumn<Resolution>[] = [
    { key: 'docType', header: 'Tipo', format: (v) => DOCUMENT_TYPE_LABELS[v as DocumentType] },
    { key: 'prefix', header: 'Prefijo', mono: true },
    {
      key: 'range',
      header: 'Rango',
      mono: true,
      value: (r) => `${r.rangeFrom} – ${r.rangeTo}`,
    },
    { key: 'current', header: 'Actual', mono: true, align: 'end' },
    { key: 'remaining', header: 'Disponibles', mono: true, align: 'end' },
    {
      key: 'resolutionNumber',
      header: 'Resolución',
      hideBelow: 'md',
      format: (v) => (v as string) ?? '—',
    },
    {
      key: 'validity',
      header: 'Vigencia',
      hideBelow: 'lg',
      value: (r) =>
        r.validFrom || r.validTo
          ? `${formatDateEs(r.validFrom)} – ${formatDateEs(r.validTo)}`
          : '—',
    },
    { key: 'environment', header: 'Ambiente', hideBelow: 'md' },
    { key: 'active', header: 'Estado' },
  ];
  protected readonly resolutionActions: TableAction<Resolution>[] = [
    { id: 'edit', label: 'Editar numeración', icon: 'pencil' },
  ];
  protected envLabel(env: string): string {
    return ENVIRONMENT_LABELS[env as DianEnvironment] ?? env;
  }

  protected readonly registerOpen = signal(false);
  protected readonly editing = signal<Resolution | null>(null);
  protected readonly resolutionError = signal<string | null>(null);
  protected readonly resolutionSaving = signal(false);

  protected readonly registerForm = new FormGroup(
    {
      docType: new FormControl<DocumentType | null>('fv', Validators.required),
      prefix: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^[A-Za-z0-9]{1,4}$/)],
      }),
      rangeFrom: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
      rangeTo: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
      resolutionNumber: optional(50),
      validFrom: new FormControl('', { nonNullable: true }),
      validTo: new FormControl('', { nonNullable: true }),
      technicalKey: optional(255),
      environment: new FormControl<string | null>('2', Validators.required),
    },
    { validators: [rangeOrder, invoiceNeedsResolution] },
  );
  protected readonly editForm = new FormGroup({
    rangeTo: new FormControl<number | null>(null, [Validators.min(1)]),
    resolutionNumber: optional(50),
    validFrom: new FormControl('', { nonNullable: true }),
    validTo: new FormControl('', { nonNullable: true }),
    technicalKey: optional(255),
    active: new FormControl(true, { nonNullable: true }),
  });
  protected readonly prefixMessages = { pattern: 'De 1 a 4 letras o números.' };

  protected openRegister(): void {
    this.registerForm.reset({
      docType: 'fv',
      environment: resourceValue(this.config)?.environment ?? '2',
    });
    this.resolutionError.set(null);
    this.registerOpen.set(true);
  }

  protected onResolutionAction(event: TableActionEvent<Resolution>): void {
    if (event.action !== 'edit' || !this.canEdit()) return;
    const r = event.row;
    this.editForm.reset({
      rangeTo: r.rangeTo,
      resolutionNumber: r.resolutionNumber ?? '',
      validFrom: r.validFrom ?? '',
      validTo: r.validTo ?? '',
      technicalKey: '',
      active: r.active,
    });
    this.resolutionError.set(null);
    this.editing.set(r);
  }

  protected async register(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    const v = this.registerForm.getRawValue();
    const dto: RegisterResolutionRequest = {
      docType: v.docType!,
      prefix: v.prefix.trim().toUpperCase(),
      rangeFrom: Number(v.rangeFrom),
      rangeTo: Number(v.rangeTo),
      resolutionNumber: blankToUndefined(v.resolutionNumber),
      validFrom: blankToUndefined(v.validFrom),
      validTo: blankToUndefined(v.validTo),
      technicalKey: blankToUndefined(v.technicalKey),
      environment: v.environment as DianEnvironment,
    };
    await this.saveResolution(
      this.service.registerResolution(dto),
      'Numeración registrada y activada.',
      () => this.registerOpen.set(false),
    );
  }

  protected async update(): Promise<void> {
    const r = this.editing();
    if (!r) return;
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.getRawValue();
    const dto: UpdateResolutionRequest = {
      rangeTo: v.rangeTo && v.rangeTo !== r.rangeTo ? Number(v.rangeTo) : undefined,
      resolutionNumber: blankToUndefined(v.resolutionNumber),
      validFrom: blankToUndefined(v.validFrom),
      validTo: blankToUndefined(v.validTo),
      technicalKey: blankToUndefined(v.technicalKey),
      active: v.active !== r.active ? v.active : undefined,
    };
    await this.saveResolution(
      this.service.updateResolution(r.id, dto),
      'Numeración actualizada.',
      () => this.editing.set(null),
    );
  }

  private async saveResolution(
    request$: ReturnType<EInvoicingService['registerResolution']>,
    success: string,
    close: () => void,
  ): Promise<void> {
    this.resolutionSaving.set(true);
    this.resolutionError.set(null);
    try {
      await firstValueFrom(request$);
      close();
      this.toast.success(success);
      this.resolutions.reload();
    } catch (err) {
      this.resolutionError.set(errorMessage(err));
    } finally {
      this.resolutionSaving.set(false);
    }
  }
}
