import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService, PORTAL_HOME, TenantService, toApiError } from '../../../../core';
import { UiAlert, UiAuthLayout, UiButton, UiFormField, UiInput } from '../../../../shared/ui';

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/**
 * Inicio de sesión. Si el colegio no viene del subdominio, pide su código
 * (slug), que viaja en `X-Tenant`. Tras el login redirige al portal del usuario
 * (o a `returnUrl` si pertenece a ese portal).
 */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, UiAuthLayout, UiAlert, UiButton, UiFormField, UiInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.html',
  styles: `
    form {
      display: grid;
      gap: 1.1rem;
    }
    .tenant {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.6rem 0.9rem;
      border-radius: var(--radius-md);
      background: var(--color-primary-soft);
      font-size: var(--text-sm);
    }
    .tenant strong {
      font-family: var(--font-mono);
      color: var(--color-primary);
    }
    .change {
      border: 0;
      background: none;
      color: var(--color-primary);
      font-weight: 600;
      cursor: pointer;
      font-size: var(--text-xs);
    }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly tenant = inject(TenantService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly editingTenant = signal(!this.tenant.hasTenant());
  protected readonly expired = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('reason') === 'expired')),
    { initialValue: false },
  );
  protected readonly showTenantField = computed(
    () => !this.tenant.isLocked() && this.editingTenant(),
  );

  protected readonly form = inject(NonNullableFormBuilder).group({
    tenant: [this.tenant.slug() ?? '', [Validators.pattern(SLUG_PATTERN)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required]],
  });

  protected readonly tenantMessages = {
    pattern: 'Usa solo letras minúsculas, números y guiones (ej. colegio-san-jose).',
    required: 'Indica el código de tu colegio.',
  };

  constructor() {
    if (this.showTenantField()) this.form.controls.tenant.addValidators(Validators.required);
  }

  protected changeTenant(): void {
    this.editingTenant.set(true);
    this.form.controls.tenant.addValidators(Validators.required);
    this.form.controls.tenant.updateValueAndValidity();
  }

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { tenant, email, password } = this.form.getRawValue();
    if (this.showTenantField() && !this.tenant.set(tenant)) {
      this.error.set('El código del colegio no es válido.');
      return;
    }

    this.loading.set(true);
    this.auth.login({ email: email.trim(), password }).subscribe({
      next: (user) => {
        this.loading.set(false);
        const home = PORTAL_HOME[user.portal];
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const target = returnUrl && returnUrl.startsWith(home) ? returnUrl : home;
        void this.router.navigateByUrl(target);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const apiError = toApiError(err);
        this.error.set(
          apiError.status === 401 ? 'Correo o contraseña incorrectos.' : apiError.message,
        );
      },
    });
  }
}
