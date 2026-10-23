import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiButton } from '../../atoms/button/button';
import { UiIcon } from '../../atoms/icon/icon';

/**
 * Contenido de un diálogo de confirmación (se coloca dentro de `ui-modal`).
 * `ConfirmService` del core lo usa para las confirmaciones globales.
 */
@Component({
  selector: 'ui-confirm-dialog',
  imports: [UiButton, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <span class="icon" [class.danger]="tone() === 'danger'" aria-hidden="true">
        <ui-icon
          [name]="tone() === 'danger' ? 'exclamation-triangle' : 'information-circle'"
          [size]="24"
        />
      </span>
      <div>
        <h2 class="title">{{ title() }}</h2>
        @if (message()) {
          <p class="message">{{ message() }}</p>
        }
      </div>
    </div>
    <div class="actions">
      <button ui-button variant="secondary" type="button" (click)="cancelled.emit()">
        {{ cancelLabel() }}
      </button>
      <button
        ui-button
        type="button"
        [variant]="tone() === 'danger' ? 'danger' : 'primary'"
        [loading]="busy()"
        (click)="confirmed.emit()"
      >
        {{ confirmLabel() }}
      </button>
    </div>
  `,
  styles: `
    .head {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }
    .icon {
      display: inline-flex;
      padding: 0.6rem;
      border-radius: 50%;
      background: var(--color-primary-soft);
      color: var(--color-primary);
    }
    .icon.danger {
      background: var(--color-danger-bg);
      color: var(--color-danger);
    }
    .title {
      font-size: var(--text-lg);
    }
    .message {
      margin-top: 0.375rem;
      color: var(--color-text-muted);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      flex-wrap: wrap;
    }
  `,
})
export class UiConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly tone = input<'primary' | 'danger'>('primary');
  readonly busy = input(false, { transform: booleanAttribute });
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
