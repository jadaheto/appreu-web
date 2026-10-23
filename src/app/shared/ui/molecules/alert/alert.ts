import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { UiIcon } from '../../atoms/icon/icon';

export type AlertTone = 'success' | 'error' | 'warning' | 'info';

const ICON: Record<AlertTone, string> = {
  success: 'check-circle',
  error: 'exclamation-circle',
  warning: 'exclamation-triangle',
  info: 'information-circle',
};

/**
 * Banner de mensaje (éxito/error/aviso/info). Con `autoDismiss` (ms) emite
 * `dismissed` solo; con `dismissible` muestra el botón de cerrar.
 */
@Component({
  selector: 'ui-alert',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-alert',
    '[class]': '"ui-alert--" + tone()',
    '[attr.role]': 'tone() === "error" || tone() === "warning" ? "alert" : "status"',
  },
  template: `
    <ui-icon [name]="icon()" [size]="20" class="icon" />
    <div class="content">
      @if (title()) {
        <p class="title">{{ title() }}</p>
      }
      <div class="message"><ng-content /></div>
    </div>
    @if (dismissible()) {
      <button type="button" class="close" aria-label="Cerrar mensaje" (click)="dismissed.emit()">
        <ui-icon name="x-mark" [size]="16" />
      </button>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--a-border);
      background: var(--a-bg);
      color: var(--a-fg);
      font-size: var(--text-sm);
      animation: ui-fade-in 0.25s ease both;
    }
    :host(.ui-alert--success) {
      --a-bg: var(--color-success-bg);
      --a-fg: var(--color-success);
      --a-border: var(--color-success-border);
    }
    :host(.ui-alert--error) {
      --a-bg: var(--color-danger-bg);
      --a-fg: var(--color-danger);
      --a-border: var(--color-danger-border);
    }
    :host(.ui-alert--warning) {
      --a-bg: var(--color-warning-bg);
      --a-fg: var(--color-warning);
      --a-border: var(--color-warning-border);
    }
    :host(.ui-alert--info) {
      --a-bg: var(--color-info-bg);
      --a-fg: var(--color-info);
      --a-border: var(--color-info-border);
    }
    .icon {
      margin-top: 0.05rem;
    }
    .content {
      flex: 1;
      min-width: 0;
    }
    .title {
      font-weight: 700;
      margin-bottom: 0.125rem;
    }
    .close {
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      opacity: 0.7;
      padding: 0;
    }
    .close:hover {
      opacity: 1;
    }
  `,
})
export class UiAlert {
  readonly tone = input<AlertTone>('info');
  readonly title = input('');
  readonly dismissible = input(false, { transform: booleanAttribute });
  /** Milisegundos para cerrarse solo (0 = no). */
  readonly autoDismiss = input(0);
  readonly dismissed = output<void>();

  protected readonly icon = computed(() => ICON[this.tone()]);

  constructor() {
    let timer: ReturnType<typeof setTimeout> | null = null;
    effect((onCleanup) => {
      const ms = this.autoDismiss();
      if (ms > 0) {
        timer = setTimeout(() => this.dismissed.emit(), ms);
        onCleanup(() => timer && clearTimeout(timer));
      }
    });
    inject(DestroyRef).onDestroy(() => timer && clearTimeout(timer));
  }
}
