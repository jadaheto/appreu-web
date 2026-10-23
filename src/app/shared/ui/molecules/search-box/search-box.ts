import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { UiIcon } from '../../atoms/icon/icon';

/**
 * Caja de búsqueda con antirrebote. `value` es bidireccional; `search` se
 * emite tras `debounce` ms sin escribir (o al presionar Enter).
 */
@Component({
  selector: 'ui-search-box',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap" role="search">
      <ui-icon name="magnifying-glass" [size]="18" class="lead" />
      <input
        type="search"
        [value]="value()"
        [attr.placeholder]="placeholder()"
        [attr.aria-label]="ariaLabel() || placeholder()"
        (input)="onInput($any($event.target).value)"
        (keydown.enter)="flush()"
      />
      @if (value()) {
        <button type="button" class="clear" aria-label="Limpiar búsqueda" (click)="clear()">
          <ui-icon name="x-mark" [size]="16" />
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 12rem;
    }
    .wrap {
      display: flex;
      align-items: center;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      transition:
        border-color 0.15s,
        box-shadow 0.15s;
    }
    .wrap:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-ring);
    }
    .lead {
      margin-left: 0.85rem;
      color: var(--color-text-subtle);
    }
    input {
      flex: 1;
      min-width: 0;
      border: 0;
      outline: 0;
      background: transparent;
      padding: 0.6rem 0.75rem;
      font-size: var(--text-sm);
      color: var(--color-text-strong);
    }
    input::-webkit-search-cancel-button {
      display: none;
    }
    .clear {
      border: 0;
      background: transparent;
      color: var(--color-text-subtle);
      padding: 0 0.75rem;
      cursor: pointer;
      display: inline-flex;
    }
  `,
})
export class UiSearchBox {
  readonly value = model('');
  readonly placeholder = input('Buscar…');
  readonly ariaLabel = input('');
  readonly debounce = input(300);
  readonly search = output<string>();

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.cancel());
  }

  protected onInput(text: string): void {
    this.value.set(text);
    this.cancel();
    this.timer = setTimeout(() => this.flush(), this.debounce());
  }

  protected flush(): void {
    this.cancel();
    this.search.emit(this.value().trim());
  }

  protected clear(): void {
    this.value.set('');
    this.flush();
  }

  private cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
