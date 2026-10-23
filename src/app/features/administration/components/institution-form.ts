import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrandingService, ToastService, toApiError } from '../../../core';
import {
  SelectOption,
  UiAlert,
  UiButton,
  UiFormField,
  UiInput,
  UiSelect,
  UiSpinner,
} from '../../../shared/ui';
import {
  DOCUMENT_TYPES,
  InstitutionProfile,
  LOGO_EXTENSIONS,
  LOGO_MAX_BYTES,
  nitCheckDigit,
  PERSON_TYPES,
  UpdateInstitutionRequest,
} from '../data-access/administration.models';
import { InstitutionService } from '../data-access/institution.service';

const TAX_CODE = /^[A-Z0-9]{1,3}(-[A-Z0-9]{1,4}){0,2}$/;

/** Separa la lista de responsabilidades tributarias (`O-13, O-15`). */
export function parseTaxCodes(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/[\s,;]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
}

export function validateLogo(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!LOGO_EXTENSIONS.includes(ext)) return 'Formato no permitido. Usa PNG, JPG o WebP.';
  if (file.size > LOGO_MAX_BYTES) return 'El logo supera el máximo de 2 MB.';
  return null;
}

const blank = (v: string): string | null => (v.trim() ? v.trim() : null);

/** Datos de la institución (RUT, ubicación, contacto de facturación) y logo. */
@Component({
  selector: 'app-institution-form',
  imports: [ReactiveFormsModule, UiAlert, UiButton, UiFormField, UiInput, UiSelect, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './institution-form.html',
  styleUrl: '../pages/admin.scss',
  styles: `
    .logo {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-5);
    }
    .logo__box {
      width: 8rem;
      height: 8rem;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: var(--color-surface-2);
      color: var(--color-text-subtle);
      font-size: var(--text-xs);
      text-align: center;
    }
    .logo__box img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .dv {
      display: flex;
      align-items: flex-end;
      gap: var(--space-3);
    }
    .dv ui-form-field {
      flex: 1;
    }
    .dv__value {
      min-width: 3rem;
      height: 2.6rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-md);
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-size: 1.25rem;
      font-weight: 700;
    }
    h3 {
      font-size: var(--text-sm);
      font-weight: 700;
      margin: var(--space-6) 0 var(--space-3);
    }
  `,
})
export class InstitutionForm implements OnInit {
  private readonly institution = inject(InstitutionService);
  private readonly toast = inject(ToastService);
  private readonly branding = inject(BrandingService);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Solo el administrador modifica los datos (finanzas y RR. HH. los consultan). */
  readonly canEdit = input(false);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly profile = signal<InstitutionProfile | null>(null);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly logoSrc = signal<string | null>(null);
  protected readonly logoError = signal<string | null>(null);

  protected readonly documentOptions: SelectOption<string>[] = DOCUMENT_TYPES.map((d) => ({
    value: d,
    label: d,
  }));
  protected readonly personOptions: SelectOption<string>[] = PERSON_TYPES.map((p) => ({
    value: p,
    label: p === 'juridica' ? 'Persona jurídica' : 'Persona natural',
  }));

  protected readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.maxLength(200)]),
    documentType: this.fb.control('NIT', Validators.required),
    nit: this.fb.control('', [Validators.required, Validators.pattern(/^[\d.\s]{5,15}(-\d)?$/)]),
    personType: this.fb.control('juridica', Validators.required),
    department: this.fb.control('', Validators.maxLength(100)),
    departmentDaneCode: this.fb.control('', Validators.pattern(/^\d{1,2}$/)),
    city: this.fb.control('', Validators.maxLength(100)),
    cityDaneCode: this.fb.control('', Validators.pattern(/^\d{1,5}$/)),
    address: this.fb.control('', Validators.maxLength(255)),
    postalCode: this.fb.control('', Validators.pattern(/^\d{1,6}$/)),
    phone: this.fb.control('', Validators.maxLength(20)),
    email: this.fb.control('', [Validators.email, Validators.maxLength(150)]),
    taxResponsibilities: this.fb.control('', (c) => {
      const invalid = parseTaxCodes(c.value ?? '').filter((code) => !TAX_CODE.test(code));
      return invalid.length ? { taxCodes: invalid.join(', ') } : null;
    }),
    daneCode: this.fb.control('', Validators.maxLength(20)),
    resolutionNumber: this.fb.control('', Validators.maxLength(50)),
    rectorName: this.fb.control('', Validators.maxLength(150)),
    billingContactName: this.fb.control('', Validators.maxLength(150)),
    billingContactPhone: this.fb.control('', Validators.maxLength(20)),
    billingContactEmail: this.fb.control('', [Validators.email, Validators.maxLength(150)]),
  });
  protected readonly nitMessages = {
    pattern: 'Escribe solo los dígitos del NIT (sin DV o con «-DV»).',
  };
  protected readonly taxMessages = { taxCodes: (v: unknown) => `Códigos inválidos: ${String(v)}.` };
  protected readonly daneMessages = { pattern: 'Solo dígitos.' };

  private readonly nitValue = toSignal(this.form.controls.nit.valueChanges, { initialValue: '' });
  /** DV calculado mientras se escribe; el oficial lo devuelve la API al guardar. */
  protected readonly dvPreview = computed(() => nitCheckDigit(this.nitValue().split('-')[0]));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revokeLogo());
  }

  ngOnInit(): void {
    if (!this.canEdit()) this.form.disable();
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.institution.profile().subscribe({
      next: (p) => {
        this.loading.set(false);
        this.patch(p);
      },
      error: (err) => {
        this.loading.set(false);
        const e = toApiError(err);
        // 404: el colegio aún no registró sus datos → formulario vacío.
        if (e.status !== 404) this.loadError.set(e.message);
      },
    });
  }

  private patch(p: InstitutionProfile): void {
    this.profile.set(p);
    this.form.reset({
      name: p.name,
      documentType: p.documentType,
      nit: p.nit,
      personType: p.personType,
      department: p.department ?? '',
      departmentDaneCode: p.departmentDaneCode ?? '',
      city: p.city ?? '',
      cityDaneCode: p.cityDaneCode ?? '',
      address: p.address ?? '',
      postalCode: p.postalCode ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      taxResponsibilities: p.taxResponsibilities.join(', '),
      daneCode: p.daneCode ?? '',
      resolutionNumber: p.resolutionNumber ?? '',
      rectorName: p.rectorName ?? '',
      billingContactName: p.billingContact.name ?? '',
      billingContactPhone: p.billingContact.phone ?? '',
      billingContactEmail: p.billingContact.email ?? '',
    });
    if (p.logoUrl) this.loadLogo();
  }

  private loadLogo(): void {
    this.institution.logo().subscribe({
      next: (blob) => {
        this.revokeLogo();
        this.logoSrc.set(URL.createObjectURL(blob));
      },
      error: () => this.logoSrc.set(null),
    });
  }

  private revokeLogo(): void {
    const src = this.logoSrc();
    if (src) URL.revokeObjectURL(src);
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving() || !this.canEdit()) return;
    const v = this.form.getRawValue();
    const dto: UpdateInstitutionRequest = {
      name: v.name.trim(),
      nit: v.nit.replace(/[.\s]/g, ''),
      documentType: v.documentType,
      personType: v.personType,
      address: blank(v.address),
      phone: blank(v.phone),
      email: blank(v.email),
      city: blank(v.city),
      cityDaneCode: blank(v.cityDaneCode),
      department: blank(v.department),
      departmentDaneCode: blank(v.departmentDaneCode),
      postalCode: blank(v.postalCode),
      taxResponsibilities: parseTaxCodes(v.taxResponsibilities),
      daneCode: blank(v.daneCode),
      resolutionNumber: blank(v.resolutionNumber),
      rectorName: blank(v.rectorName),
      billingContactName: blank(v.billingContactName),
      billingContactPhone: blank(v.billingContactPhone),
      billingContactEmail: blank(v.billingContactEmail),
    };
    this.saving.set(true);
    this.institution.update(dto).subscribe({
      next: (p) => {
        this.saving.set(false);
        this.patch(p);
        this.branding.apply({ schoolName: p.name });
        this.toast.success(`Datos de la institución guardados (NIT ${p.nitFormatted}).`);
      },
      error: (err) => {
        this.saving.set(false);
        const e = toApiError(err);
        if (!(
          e.status === 0 ||
          e.status === 403 ||
          e.status === 429 ||
          e.status >= 500 ||
          e.status === 401
        ))
          this.toast.error(e.message);
      },
    });
  }

  protected uploadLogo(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const error = validateLogo(file);
    this.logoError.set(error);
    if (error) return;
    this.uploading.set(true);
    this.institution.uploadLogo(file).subscribe({
      next: (p) => {
        this.uploading.set(false);
        this.profile.set(p);
        this.revokeLogo();
        this.logoSrc.set(URL.createObjectURL(file));
        this.toast.success('Logo actualizado.');
      },
      error: (err) => {
        this.uploading.set(false);
        this.logoError.set(toApiError(err).message);
      },
    });
  }
}
