import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';
import { ToastService } from '../../../core';
import { UiAlert, UiBadge, UiButton, UiModal } from '../../../shared/ui';
import { AccountHolder, ProvisionedAccount } from '../data-access/students.models';

const HOLDER_LABELS: Record<AccountHolder, string> = {
  student: 'Estudiante',
  guardian: 'Acudiente',
};
/** Cuenta a mostrar: las provisionadas por la API o una contraseña restablecida. */
export type CredentialAccount = Omit<ProvisionedAccount, 'status'> & {
  status: ProvisionedAccount['status'] | 'reset';
};

const STATUS_TEXT: Record<CredentialAccount['status'], string> = {
  created: 'Cuenta creada',
  linked: 'Vinculada a cuenta existente',
  already_linked: 'Ya estaba vinculada',
  skipped: 'No creada',
  reset: 'Contraseña restablecida',
};

/**
 * Muestra **una sola vez** las credenciales temporales devueltas por la API
 * (matrícula, creación de cuentas o reseteo). No se cierra con clic en el fondo.
 */
@Component({
  selector: 'app-credentials-dialog',
  imports: [UiAlert, UiBadge, UiButton, UiModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [(open)]="open"
      [title]="title()"
      description="Cuentas del portal de estudiantes y acudientes"
      [closeOnBackdrop]="false"
    >
      @if (hasPasswords()) {
        <ui-alert tone="warning" title="Copie las contraseñas ahora">
          Por seguridad se muestran una sola vez. Entréguelas al estudiante o acudiente; deberán
          cambiarlas al ingresar.
        </ui-alert>
      }
      <ul class="list">
        @for (a of accounts(); track $index) {
          <li>
            <div class="row">
              <strong>{{ holderLabel(a.holder) }}</strong>
              <ui-badge [tone]="a.status === 'skipped' ? 'warning' : 'success'">{{
                statusText(a.status)
              }}</ui-badge>
            </div>
            @if (a.email) {
              <p>
                Usuario: <span class="font-mono">{{ a.email }}</span>
              </p>
            }
            @if (a.temporaryPassword) {
              <p class="pwd">
                Contraseña temporal:
                <code class="font-mono">{{ a.temporaryPassword }}</code>
                <button
                  ui-button
                  type="button"
                  size="xs"
                  variant="ghost"
                  icon="clipboard"
                  (click)="copy(a)"
                >
                  Copiar
                </button>
              </p>
            }
            @if (a.reason) {
              <p class="reason">{{ a.reason }}</p>
            }
          </li>
        } @empty {
          <li>No se generaron cuentas.</li>
        }
      </ul>
      <ng-container uiModalFooter>
        <button ui-button variant="primary" type="button" (click)="open.set(false)">
          Entendido
        </button>
      </ng-container>
    </ui-modal>
  `,
  styles: `
    .list {
      list-style: none;
      padding: 0;
      margin: 1rem 0 0;
      display: grid;
      gap: 0.75rem;
    }
    li {
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      font-size: var(--text-sm);
    }
    .row {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }
    .pwd {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }
    code {
      background: var(--color-surface-2);
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-sm);
      font-weight: 700;
      color: var(--color-text-strong);
    }
    .reason {
      color: var(--color-warning);
    }
  `,
})
export class CredentialsDialog {
  private readonly toast = inject(ToastService);

  readonly open = model(false);
  readonly accounts = input<readonly CredentialAccount[]>([]);
  readonly title = input('Credenciales del portal');

  protected hasPasswords(): boolean {
    return this.accounts().some((a) => !!a.temporaryPassword);
  }
  protected holderLabel(holder: AccountHolder): string {
    return HOLDER_LABELS[holder] ?? holder;
  }
  protected statusText(status: CredentialAccount['status']): string {
    return STATUS_TEXT[status] ?? status;
  }

  protected async copy(account: CredentialAccount): Promise<void> {
    const text = `Usuario: ${account.email ?? ''}\nContraseña temporal: ${account.temporaryPassword ?? ''}`;
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success('Credenciales copiadas al portapapeles.');
    } catch {
      this.toast.warning('No se pudo copiar; selecciona el texto manualmente.');
    }
  }
}
