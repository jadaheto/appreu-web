import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, timer, switchMap } from 'rxjs';
import { uniqueId, UiAvatar, UiIcon, UiSpinner } from '../../../shared/ui';
import type { BillingStudent } from '../data-access/finance.models';
import { FinanceService } from '../data-access/finance.service';
import { resourceValue } from '../../../core/resource/resource-value';

/**
 * Buscador de estudiantes con autocompletado (nombre, código o documento),
 * accesible como `combobox` + `listbox`. Reemplaza el `<select>` del legacy.
 */
@Component({
  selector: 'app-student-search',
  imports: [UiAvatar, UiIcon, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <ui-icon name="magnifying-glass" [size]="18" class="lead" />
      <input
        type="search"
        role="combobox"
        autocomplete="off"
        [id]="inputId"
        [attr.aria-label]="label()"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="listId"
        [attr.aria-activedescendant]="activeId()"
        aria-autocomplete="list"
        [placeholder]="placeholder()"
        [value]="term()"
        (input)="onInput($event)"
        (keydown)="onKeydown($event)"
        (focus)="focused.set(true)"
        (blur)="onBlur()"
      />
      @if (results.isLoading()) {
        <ui-spinner size="sm" class="trail" />
      }
    </div>
    @if (open()) {
      <ul class="list" role="listbox" [id]="listId" [attr.aria-label]="label()">
        @for (s of items(); track s.id; let i = $index) {
          <li
            role="option"
            [id]="listId + '-' + i"
            [attr.aria-selected]="i === active()"
            [class.active]="i === active()"
            (mousedown)="$event.preventDefault(); pick(s)"
          >
            <ui-avatar [name]="s.fullName" size="sm" />
            <span class="info">
              <strong>{{ s.fullName }}</strong>
              <small class="text-muted">
                {{ s.code }}{{ s.gradeName ? ' · ' + s.gradeName : '' }}
                {{ s.documentNumber ? ' · Doc. ' + s.documentNumber : '' }}
              </small>
            </span>
          </li>
        } @empty {
          <li class="empty" role="presentation">
            {{ results.isLoading() ? 'Buscando…' : 'Sin coincidencias' }}
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
    }
    .wrap {
      display: flex;
      align-items: center;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    .wrap:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-soft);
    }
    .lead {
      margin-left: 0.75rem;
      color: var(--color-text-subtle);
    }
    .trail {
      margin-right: 0.75rem;
    }
    input {
      flex: 1;
      min-width: 0;
      border: 0;
      outline: 0;
      background: transparent;
      padding: 0.625rem 0.75rem;
      color: var(--color-text-strong);
      font: inherit;
    }
    .list {
      position: absolute;
      z-index: 30;
      left: 0;
      right: 0;
      margin-top: 0.25rem;
      max-height: 20rem;
      overflow: auto;
      list-style: none;
      padding: 0.25rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-card);
    }
    li[role='option'] {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }
    li.active,
    li[role='option']:hover {
      background: var(--color-primary-soft);
    }
    .info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .empty {
      padding: 0.75rem;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
  `,
})
export class StudentSearch {
  private readonly finance = inject(FinanceService);

  readonly label = input('Buscar estudiante');
  readonly placeholder = input('Nombre, código o documento…');
  readonly selected = output<BillingStudent>();

  protected readonly inputId = uniqueId('student-search');
  protected readonly listId = `${this.inputId}-list`;
  protected readonly term = signal('');
  protected readonly focused = signal(false);
  protected readonly active = signal(-1);

  protected readonly results = rxResource({
    params: () => this.term().trim(),
    stream: ({ params }) =>
      params.length < 2
        ? of([] as BillingStudent[])
        : timer(250).pipe(switchMap(() => this.finance.searchStudents(params, 10))),
  });
  protected readonly items = computed(() => resourceValue(this.results, []));
  protected readonly open = computed(() => this.focused() && this.term().trim().length >= 2);
  protected readonly activeId = computed(() =>
    this.open() && this.active() >= 0 ? `${this.listId}-${this.active()}` : null,
  );

  protected onInput(event: Event): void {
    this.term.set((event.target as HTMLInputElement).value);
    this.active.set(-1);
    this.focused.set(true);
  }

  protected onBlur(): void {
    this.focused.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const list = this.items();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focused.set(true);
      this.active.set(Math.min(this.active() + 1, list.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.active.set(Math.max(this.active() - 1, 0));
    } else if (event.key === 'Enter') {
      const s = list[this.active()] ?? (list.length === 1 ? list[0] : undefined);
      if (s) {
        event.preventDefault();
        this.pick(s);
      }
    } else if (event.key === 'Escape') {
      this.focused.set(false);
    }
  }

  protected pick(student: BillingStudent): void {
    this.selected.emit(student);
    this.term.set('');
    this.active.set(-1);
    this.focused.set(false);
  }
}
