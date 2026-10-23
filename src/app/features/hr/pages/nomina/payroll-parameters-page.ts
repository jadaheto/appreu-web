import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, ToastService } from '../../../../core';
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiCheckbox,
  UiFormField,
  UiInput,
  UiSelect,
  UiSpinner,
} from '../../../../shared/ui';
import type { PayrollParameters, PayrollParametersRequest } from '../../data-access/hr.models';
import { apiMessage } from '../../data-access/hr-ui';
import { PayrollService } from '../../data-access/payroll.service';
import { PAYROLL_BASE } from '../rrhh/hr-links';
import { resourceValue } from '../../../../core/resource/resource-value';

const rate = () => [Validators.min(0), Validators.max(100)];

/**
 * Parámetros legales de nómina por año (SMMLV, auxilio de transporte, UVT,
 * tasas de aportes y exoneración). Solo el administrador los modifica; la API
 * los bloquea si el año ya tiene nóminas pagadas.
 */
@Component({
  selector: 'app-payroll-parameters-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    UiAlert,
    UiBadge,
    UiButton,
    UiCheckbox,
    UiFormField,
    UiInput,
    UiSelect,
    UiSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payroll-parameters-page.html',
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-5);
    }
    .section-title {
      font-weight: 700;
      margin: var(--space-6) 0 var(--space-3);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--space-6);
    }
  `,
})
export class PayrollParametersPage {
  private readonly payroll = inject(PayrollService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly base = PAYROLL_BASE;
  protected readonly canEdit = computed(() => this.auth.hasRole('admin'));
  private readonly currentYear = new Date().getFullYear();
  protected readonly yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: this.currentYear + 1 - i,
    label: String(this.currentYear + 1 - i),
  }));
  protected readonly year = signal(this.currentYear);

  protected readonly params = rxResource({
    params: () => this.year(),
    stream: ({ params }) => this.payroll.parameters(params),
  });
  protected readonly data = computed(() => resourceValue(this.params, null));
  protected readonly loadError = computed(() =>
    this.params.error() ? apiMessage(this.params.error()) : null,
  );

  protected readonly form = this.fb.group({
    minimumWage: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    transportAllowance: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
    uvt: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    healthEmployee: this.fb.control<number | null>(null, rate()),
    pensionEmployee: this.fb.control<number | null>(null, rate()),
    healthEmployer: this.fb.control<number | null>(null, rate()),
    pensionEmployer: this.fb.control<number | null>(null, rate()),
    sena: this.fb.control<number | null>(null, rate()),
    icbf: this.fb.control<number | null>(null, rate()),
    ccf: this.fb.control<number | null>(null, rate()),
    arl1: this.fb.control<number | null>(null, rate()),
    arl2: this.fb.control<number | null>(null, rate()),
    arl3: this.fb.control<number | null>(null, rate()),
    arl4: this.fb.control<number | null>(null, rate()),
    arl5: this.fb.control<number | null>(null, rate()),
    employerContributionExemption: this.fb.control(false),
  });
  protected readonly arlClasses = [1, 2, 3, 4, 5] as const;

  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const p = this.data();
      const editable = this.canEdit();
      untracked(() => {
        if (p) this.patch(p);
        if (editable) this.form.enable();
        else this.form.disable();
      });
    });
  }

  private patch(p: PayrollParameters): void {
    const arl = p.rates.arl as Record<string, number>;
    this.form.reset({
      minimumWage: p.minimumWage,
      transportAllowance: p.transportAllowance,
      uvt: p.uvt,
      healthEmployee: p.rates.healthEmployee,
      pensionEmployee: p.rates.pensionEmployee,
      healthEmployer: p.rates.healthEmployer,
      pensionEmployer: p.rates.pensionEmployer,
      sena: p.rates.sena,
      icbf: p.rates.icbf,
      ccf: p.rates.ccf,
      arl1: arl['1'] ?? null,
      arl2: arl['2'] ?? null,
      arl3: arl['3'] ?? null,
      arl4: arl['4'] ?? null,
      arl5: arl['5'] ?? null,
      employerContributionExemption: p.employerContributionExemption,
    });
    this.serverError.set(null);
  }

  protected changeYear(year: number | null): void {
    if (year) this.year.set(year);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const n = (x: number | null) => (x === null ? undefined : Number(x));
    const dto: PayrollParametersRequest = {
      minimumWage: Number(v.minimumWage),
      transportAllowance: Number(v.transportAllowance),
      uvt: Number(v.uvt),
      rates: {
        healthEmployee: n(v.healthEmployee),
        pensionEmployee: n(v.pensionEmployee),
        healthEmployer: n(v.healthEmployer),
        pensionEmployer: n(v.pensionEmployer),
        sena: n(v.sena),
        icbf: n(v.icbf),
        ccf: n(v.ccf),
        arl: { 1: n(v.arl1), 2: n(v.arl2), 3: n(v.arl3), 4: n(v.arl4), 5: n(v.arl5) } as never,
      },
      employerContributionExemption: v.employerContributionExemption,
    };
    this.saving.set(true);
    this.serverError.set(null);
    this.payroll.saveParameters(this.year(), dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(`Parámetros de ${this.year()} guardados.`);
        this.params.reload();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.serverError.set(apiMessage(err));
      },
    });
  }
}
