import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiButton } from '../../atoms/button/button';

/**
 * Barra de filtros: proyecta los campos (`ui-search-box`, `ui-select`,
 * `ui-date-range`…) y ofrece "Filtrar" (submit/Enter) y "Limpiar".
 *
 * ```html
 * <ui-filter-bar [showClear]="hayFiltros()" (apply)="buscar()" (clear)="limpiar()">
 *   <ui-search-box [(value)]="q" />
 *   <ui-select [options]="roles" [(ngModel)]="rol" placeholder="Todos los roles" />
 * </ui-filter-bar>
 * ```
 */
@Component({
  selector: 'ui-filter-bar',
  imports: [UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form
      role="search"
      [attr.aria-label]="ariaLabel()"
      (submit)="$event.preventDefault(); apply.emit()"
    >
      <div class="fields"><ng-content /></div>
      <div class="actions">
        <ng-content select="[uiFilterActions]" />
        @if (showClear()) {
          <button ui-button type="button" variant="ghost" icon="x-mark" (click)="clear.emit()">
            {{ clearLabel() }}
          </button>
        }
        @if (showApply()) {
          <button ui-button type="submit" variant="primary" icon="funnel">
            {{ applyLabel() }}
          </button>
        }
      </div>
    </form>
  `,
  styles: `
    :host {
      display: block;
      background: var(--color-surface);
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      padding: 1rem;
    }
    form {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem;
    }
    .fields {
      flex: 1 1 20rem;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem;
    }
    .fields > ::ng-deep * {
      flex: 1 1 12rem;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  `,
})
export class UiFilterBar {
  readonly applyLabel = input('Filtrar');
  readonly clearLabel = input('Limpiar');
  readonly showApply = input(true, { transform: booleanAttribute });
  readonly showClear = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input('Filtros');
  readonly apply = output<void>();
  readonly clear = output<void>();
}
