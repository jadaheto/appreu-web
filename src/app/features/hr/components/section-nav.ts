import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UiIcon } from '../../../shared/ui';

export interface SectionLink {
  label: string;
  route: string;
  icon?: string;
  exact?: boolean;
}

/**
 * Navegación secundaria por enlaces (pestañas tipo píldora enlazadas a rutas).
 * Candidata a `shared/ui` (molécula `RouteTabs`): `ui-tabs` solo maneja estado local.
 */
@Component({
  selector: 'app-section-nav',
  imports: [RouterLink, RouterLinkActive, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav [attr.aria-label]="ariaLabel()">
      @for (link of links(); track link.route) {
        <a
          [routerLink]="link.route"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: link.exact ?? false }"
          ariaCurrentWhenActive="page"
        >
          @if (link.icon) {
            <ui-icon [name]="link.icon" [size]="16" />
          }
          {{ link.label }}
        </a>
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: var(--space-5);
    }
    nav {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      padding: 0.25rem;
      border-radius: var(--radius-md);
      background: var(--color-surface);
      border: 1px solid var(--color-border-soft);
    }
    a {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.9rem;
      border-radius: var(--radius-sm);
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-weight: 600;
      text-decoration: none;
    }
    a:hover {
      color: var(--color-primary);
    }
    a.active {
      background: var(--gradient-primary);
      color: #fff;
    }
  `,
})
export class SectionNav {
  readonly links = input.required<readonly SectionLink[]>();
  readonly ariaLabel = input('Secciones');
}
