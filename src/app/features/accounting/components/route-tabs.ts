import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UiIcon } from '../../../shared/ui';

export interface RouteTab {
  label: string;
  /** Ruta relativa al componente que declara las pestañas. */
  link: string;
  icon?: string;
  exact?: boolean;
}

/**
 * Sub-navegación por rutas (pestañas enlazadas con `routerLinkActive`).
 * Candidato a promoverse a `shared/ui` como `ui-route-tabs`.
 */
@Component({
  selector: 'app-route-tabs',
  imports: [RouterLink, RouterLinkActive, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="tabs no-print" [attr.aria-label]="ariaLabel()">
      @for (tab of tabs(); track tab.link) {
        <a
          class="tab"
          [routerLink]="tab.link"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: tab.exact ?? false }"
          ariaCurrentWhenActive="page"
        >
          @if (tab.icon) {
            <ui-icon [name]="tab.icon" [size]="16" />
          }
          <span>{{ tab.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: var(--space-6);
    }
    .tabs {
      display: flex;
      gap: 0.25rem;
      overflow-x: auto;
      border-bottom: 1px solid var(--color-border-soft);
      scrollbar-width: thin;
    }
    .tab {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.65rem 0.9rem;
      white-space: nowrap;
      font-weight: 600;
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      text-decoration: none;
    }
    .tab:hover {
      color: var(--color-text);
    }
    .tab:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: -2px;
    }
    .tab.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }
  `,
})
export class RouteTabs {
  readonly tabs = input.required<readonly RouteTab[]>();
  readonly ariaLabel = input('Secciones');
}
