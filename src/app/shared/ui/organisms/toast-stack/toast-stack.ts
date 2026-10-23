import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiIcon } from '../../atoms/icon/icon';

export interface UiToast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
}

const ICONS: Record<UiToast['type'], string> = {
  success: 'check-circle',
  error: 'exclamation-circle',
  warning: 'exclamation-triangle',
  info: 'information-circle',
};

/** Pila de toasts (arriba a la derecha). El estado lo maneja `ToastService`. */
@Component({
  selector: 'ui-toast-stack',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="region" aria-live="polite" aria-relevant="additions">
      @for (t of toasts(); track t.id) {
        <div
          class="toast"
          [class]="'toast toast--' + t.type"
          [attr.role]="t.type === 'error' ? 'alert' : 'status'"
        >
          <ui-icon [name]="icons[t.type]" [size]="20" class="icon" />
          <div class="text">
            @if (t.title) {
              <p class="title">{{ t.title }}</p>
            }
            <p>{{ t.message }}</p>
          </div>
          <button
            type="button"
            class="close"
            aria-label="Cerrar notificación"
            (click)="dismiss.emit(t.id)"
          >
            <ui-icon name="x-mark" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .region {
      position: fixed;
      top: 1rem;
      right: 1rem;
      left: 1rem;
      z-index: var(--z-toast);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.5rem;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      width: 100%;
      max-width: 24rem;
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.85rem 1rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border-soft);
      border-left: 4px solid var(--t);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      animation: ui-fade-in-up 0.25s ease both;
      color: var(--color-text);
    }
    .toast--success {
      --t: var(--color-success);
    }
    .toast--error {
      --t: var(--color-danger);
    }
    .toast--warning {
      --t: var(--color-warning);
    }
    .toast--info {
      --t: var(--color-info);
    }
    .icon {
      color: var(--t);
    }
    .text {
      flex: 1;
      min-width: 0;
      font-size: var(--text-sm);
    }
    .title {
      font-weight: 700;
      color: var(--color-text-strong);
    }
    .close {
      border: 0;
      background: transparent;
      color: var(--color-text-subtle);
      cursor: pointer;
      display: inline-flex;
      padding: 0;
    }
  `,
})
export class UiToastStack {
  readonly toasts = input<readonly UiToast[]>([]);
  readonly dismiss = output<number>();
  protected readonly icons = ICONS;
}
