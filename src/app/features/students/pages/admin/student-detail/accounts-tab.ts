import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ConfirmService, ToastService } from '../../../../../core';
import { UiAlert, UiBadge, UiButton } from '../../../../../shared/ui';
import { CredentialAccount, CredentialsDialog } from '../../../components/credentials-dialog';
import { AccountHolder, StudentView } from '../../../data-access/students.models';
import { StudentsService } from '../../../data-access/students.service';

interface AccountRow {
  holder: AccountHolder;
  title: string;
  name: string;
  linked: boolean;
  hint: string;
}

/**
 * Pestaña "Cuentas del portal": crea/vincula las cuentas faltantes y genera
 * contraseñas temporales (se muestran una sola vez).
 */
@Component({
  selector: 'app-student-accounts-tab',
  imports: [CredentialsDialog, UiAlert, UiBadge, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="ui-card__title">Cuentas del portal</h2>
    <div class="grid grid--2">
      @for (row of rows(); track row.holder) {
        <article class="account">
          <div class="head">
            <div>
              <p class="title">{{ row.title }}</p>
              <p class="text-muted">{{ row.name }}</p>
            </div>
            @if (row.linked) {
              <ui-badge tone="success" dot>Activa</ui-badge>
            } @else {
              <ui-badge tone="warning" dot>Sin cuenta</ui-badge>
            }
          </div>
          <p class="hint">{{ row.hint }}</p>
          @if (row.linked) {
            <button
              ui-button
              type="button"
              size="sm"
              icon="key"
              [loading]="busy() === row.holder"
              (click)="reset(row)"
            >
              Generar contraseña temporal
            </button>
          }
        </article>
      }
    </div>
    @if (missing()) {
      <ui-alert tone="info" title="Hay cuentas pendientes" class="gap">
        Los estudiantes migrados del sistema anterior pueden no tener cuenta. Crea o vincula las
        cuentas faltantes; las ya vinculadas no se modifican.
      </ui-alert>
      <button
        ui-button
        type="button"
        variant="primary"
        icon="plus"
        [loading]="busy() === 'provision'"
        (click)="provision()"
      >
        Crear / vincular cuentas
      </button>
    }
    <app-credentials-dialog [(open)]="dialogOpen" [accounts]="accounts()" />
  `,
  styles: `
    .account {
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: grid;
      gap: 0.75rem;
      justify-items: start;
    }
    .head {
      display: flex;
      justify-content: space-between;
      width: 100%;
      gap: 0.5rem;
    }
    .title {
      font-weight: 700;
    }
    .hint {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .gap {
      display: flex;
      margin: 1.25rem 0 0.75rem;
    }
  `,
})
export class AccountsTab {
  private readonly students = inject(StudentsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly student = input.required<StudentView>();
  readonly changed = output<void>();

  protected readonly busy = signal<AccountHolder | 'provision' | null>(null);
  protected readonly dialogOpen = signal(false);
  protected readonly accounts = signal<CredentialAccount[]>([]);

  protected readonly rows = computed<AccountRow[]>(() => {
    const s = this.student();
    const g = s.guardianDetails;
    const rows: AccountRow[] = [
      {
        holder: 'student',
        title: 'Estudiante',
        name: s.fullName,
        linked: s.hasPortalAccount,
        hint: s.email
          ? `Inicia sesión con ${s.email} (o su código si el correo está en uso).`
          : `Inicia sesión con ${s.code.toLowerCase()}@apreu.co.`,
      },
    ];
    if (g) {
      rows.push({
        holder: 'guardian',
        title: 'Acudiente',
        name: g.fullName,
        linked: g.hasPortalAccount,
        hint: g.email
          ? `Inicia sesión con ${g.email}.`
          : 'Sin correo registrado: no se puede crear su cuenta.',
      });
    }
    return rows;
  });
  protected readonly missing = computed(() => this.rows().some((r) => !r.linked));

  protected provision(): void {
    this.busy.set('provision');
    this.students.provisionAccounts(this.student().id).subscribe({
      next: (accounts) => {
        this.busy.set(null);
        this.accounts.set(accounts);
        this.dialogOpen.set(true);
        this.changed.emit();
      },
      error: () => this.busy.set(null),
    });
  }

  protected async reset(row: AccountRow): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Generar una contraseña temporal para ${row.name}?`,
      message: 'La contraseña actual dejará de funcionar de inmediato.',
      confirmLabel: 'Generar',
      tone: 'danger',
    });
    if (!ok) return;
    this.busy.set(row.holder);
    this.students.resetPortalPassword(this.student().id, row.holder).subscribe({
      next: (res) => {
        this.busy.set(null);
        this.toast.success('Contraseña temporal generada.');
        this.accounts.set([
          {
            holder: row.holder,
            status: 'reset',
            userId: null,
            email: res.email,
            temporaryPassword: res.temporaryPassword,
            reason: null,
          },
        ]);
        this.dialogOpen.set(true);
      },
      error: () => this.busy.set(null),
    });
  }
}
