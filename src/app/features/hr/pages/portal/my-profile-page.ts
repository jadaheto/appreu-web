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
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../../core';
import {
  CopCurrencyPipe,
  UiAlert,
  UiAvatar,
  UiButton,
  UiFormField,
  UiInput,
  UiSpinner,
  UiTextarea,
} from '../../../../shared/ui';
import { HrStatusBadge } from '../../components/hr-status-badge';
import {
  BANK_ACCOUNT_TYPE_LABELS,
  CONTRACT_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
  Employee,
  EMPLOYEE_TYPE_LABELS,
} from '../../data-access/hr.models';
import { apiMessage, shortDate } from '../../data-access/hr-ui';
import { MyEmployeeService } from '../../data-access/my-employee.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/**
 * "Mis datos": información laboral de solo lectura y formulario de contacto
 * (celular, correo, dirección). Banco y deducciones solo los cambia RR. HH.
 */
@Component({
  selector: 'app-my-profile-page',
  imports: [
    ReactiveFormsModule,
    CopCurrencyPipe,
    UiAlert,
    UiAvatar,
    UiButton,
    UiFormField,
    UiInput,
    UiSpinner,
    UiTextarea,
    HrStatusBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-profile-page.html',
  styles: `
    .hero {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }
    dl.info {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
      gap: var(--space-4);
    }
    dl.info dt {
      font-size: var(--text-xs);
      text-transform: uppercase;
      color: var(--color-text-subtle);
    }
    dl.info dd {
      margin: 0;
      font-weight: 600;
      color: var(--color-text-strong);
    }
    .full {
      grid-column: 1 / -1;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--space-5);
    }
  `,
})
export class MyProfilePage {
  private readonly me = inject(MyEmployeeService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly apiMessage = apiMessage;
  protected readonly shortDate = shortDate;
  protected readonly typeLabels: Readonly<Record<string, string>> = EMPLOYEE_TYPE_LABELS;
  protected readonly contractLabels: Readonly<Record<string, string>> = CONTRACT_TYPE_LABELS;
  protected readonly docLabels: Readonly<Record<string, string>> = DOCUMENT_TYPE_LABELS;
  protected readonly accountLabels: Readonly<Record<string, string>> = BANK_ACCOUNT_TYPE_LABELS;

  protected readonly profile = rxResource({ stream: () => this.me.profile() });
  protected readonly data = signal<Employee | null>(null);
  protected readonly loadError = computed(() =>
    this.profile.error() ? apiMessage(this.profile.error()) : null,
  );

  protected readonly form = this.fb.group({
    phone: this.fb.control('', Validators.maxLength(20)),
    email: this.fb.control('', [Validators.email, Validators.maxLength(150)]),
    address: this.fb.control('', Validators.maxLength(500)),
  });
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const e = resourceValue(this.profile, null);
      if (e) untracked(() => this.setEmployee(e));
    });
  }

  private setEmployee(e: Employee): void {
    this.data.set(e);
    this.form.reset({ phone: e.phone ?? '', email: e.email ?? '', address: e.address ?? '' });
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.serverError.set(null);
    this.me
      .updateContact({
        phone: v.phone.trim() || undefined,
        email: v.email.trim() || undefined,
        address: v.address.trim() || undefined,
      })
      .subscribe({
        next: (e) => {
          this.saving.set(false);
          this.setEmployee(e);
          this.toast.success('Datos de contacto actualizados.');
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.serverError.set(apiMessage(err));
        },
      });
  }
}
