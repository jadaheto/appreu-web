import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UiIcon } from '../../../shared/ui';

export interface FinanceSection {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

export const FINANCE_SECTIONS: readonly FinanceSection[] = [
  { path: '.', label: 'Resumen', icon: 'chart-bar', exact: true },
  { path: 'caja', label: 'Caja', icon: 'banknotes' },
  { path: 'cobros', label: 'Cobros', icon: 'document-text' },
  { path: 'pagos', label: 'Pagos', icon: 'wallet' },
  { path: 'cartera', label: 'Cartera', icon: 'exclamation-triangle' },
  { path: 'estado-cuenta', label: 'Estado de cuenta', icon: 'user' },
  { path: 'gastos', label: 'Gastos', icon: 'calculator' },
  { path: 'conciliacion', label: 'Conciliación', icon: 'check-circle' },
  { path: 'archivos-bancarios', label: 'Archivos bancarios', icon: 'download' },
  { path: 'conceptos', label: 'Conceptos y tarifas', icon: 'tag' },
];

/** Contenedor de `/admin/finanzas`: navegación por secciones + página activa. */
@Component({
  selector: 'app-finance-shell-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="sections no-print" aria-label="Secciones de finanzas">
      @for (s of sections; track s.path) {
        <a
          [routerLink]="s.path"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: !!s.exact }"
          ariaCurrentWhenActive="page"
        >
          <ui-icon [name]="s.icon" [size]="18" />
          <span>{{ s.label }}</span>
        </a>
      }
    </nav>
    <router-outlet />
  `,
  styles: `
    .sections {
      display: flex;
      gap: 0.25rem;
      overflow-x: auto;
      margin-bottom: var(--space-6);
      border-bottom: 1px solid var(--color-border-soft);
      scrollbar-width: thin;
    }
    a {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 0.9rem;
      white-space: nowrap;
      color: var(--color-text-muted);
      font-weight: 600;
      font-size: var(--text-sm);
      text-decoration: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    a:hover {
      color: var(--color-primary);
    }
    a.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }
    a:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: -2px;
    }
  `,
})
export class FinanceShellPage {
  protected readonly sections = FINANCE_SECTIONS;
}
