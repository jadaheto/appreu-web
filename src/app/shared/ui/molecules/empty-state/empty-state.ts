import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiIcon } from '../../atoms/icon/icon';

/** Estado vacío: ícono + título + texto + acción proyectada (CTA). */
@Component({
  selector: 'ui-empty-state',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="icon" aria-hidden="true"><ui-icon [name]="icon()" [size]="32" /></span>
    <p class="title">{{ title() }}</p>
    @if (message()) {
      <p class="message">{{ message() }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 2.5rem 1rem;
      gap: 0.5rem;
    }
    .icon {
      display: inline-flex;
      padding: 1rem;
      border-radius: 50%;
      background: var(--color-primary-soft);
      color: var(--color-primary);
      margin-bottom: 0.25rem;
    }
    .title {
      font-weight: 700;
      color: var(--color-text-strong);
      font-size: var(--text-md);
    }
    .message {
      color: var(--color-text-muted);
      max-width: 28rem;
    }
    .actions:empty {
      display: none;
    }
    .actions {
      margin-top: 0.5rem;
    }
  `,
})
export class UiEmptyState {
  readonly icon = input('inbox');
  readonly title = input('Sin resultados');
  readonly message = input('');
}
