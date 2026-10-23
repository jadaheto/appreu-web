import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, ToastService, toApiError } from '../../../../core';
import {
  matchFieldsValidator,
  UiAlert,
  UiButton,
  UiFormField,
  UiInput,
} from '../../../../shared/ui';
import {
  PASSWORD_ERROR_MESSAGES,
  strongPasswordValidator,
} from '../../data-access/password-policy';

/** Cambio de la contraseña propia (`PATCH /api/auth/password`). Se muestra dentro del portal. */
@Component({
  selector: 'app-change-password-page',
  imports: [ReactiveFormsModule, UiAlert, UiButton, UiFormField, UiInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Cambiar contraseña</h1>
        <p class="page-header__subtitle">Usa al menos 8 caracteres combinando letras y números.</p>
      </div>
    </div>
    <section class="ui-card wrap">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (error()) {
          <ui-alert tone="error" dismissible (dismissed)="error.set(null)">{{ error() }}</ui-alert>
        }
        <ui-form-field label="Contraseña actual" required>
          <ui-input
            formControlName="currentPassword"
            type="password"
            autocomplete="current-password"
          />
        </ui-form-field>
        <ui-form-field label="Nueva contraseña" required [errorMessages]="messages">
          <ui-input formControlName="newPassword" type="password" autocomplete="new-password" />
        </ui-form-field>
        <ui-form-field label="Confirmar nueva contraseña" required [errorMessages]="messages">
          <ui-input formControlName="confirmPassword" type="password" autocomplete="new-password" />
        </ui-form-field>
        <div class="actions">
          <button ui-button type="button" variant="secondary" (click)="back()">Cancelar</button>
          <button
            ui-button
            type="submit"
            variant="primary"
            icon="lock-closed"
            [loading]="loading()"
          >
            Actualizar contraseña
          </button>
        </div>
      </form>
    </section>
  `,
  styles: `
    .wrap {
      max-width: 32rem;
    }
    form {
      display: grid;
      gap: 1.1rem;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
  `,
})
export class ChangePasswordPage {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly messages = PASSWORD_ERROR_MESSAGES;

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, strongPasswordValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: matchFieldsValidator('newPassword', 'confirmPassword') },
  );

  protected submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.loading.set(true);
    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        this.form.reset();
        this.toast.success('Tu contraseña se actualizó correctamente.');
        this.back();
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const apiError = toApiError(err);
        this.error.set(
          apiError.status === 401 ? 'La contraseña actual no es correcta.' : apiError.message,
        );
      },
    });
  }

  protected back(): void {
    void this.router.navigateByUrl(this.auth.homeUrl());
  }
}
