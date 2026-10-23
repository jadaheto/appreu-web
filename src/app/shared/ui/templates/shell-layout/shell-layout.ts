import { DOCUMENT } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  Directive,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { UiBrand, UiNavSection, UiUserSummary } from '../../models';
import { UiSidebar } from '../../organisms/sidebar/sidebar';
import { UiTopbar } from '../../organisms/topbar/topbar';

/** Entradas/salidas comunes a los layouts con menú (admin, empleado, estudiante). */
@Directive()
export abstract class ShellLayoutApi {
  readonly sections = input<readonly UiNavSection[]>([]);
  readonly brand = input<UiBrand>({ name: 'Apreu' });
  readonly user = input<UiUserSummary | null>(null);
  readonly tag = input('');
  readonly pageTitle = input('');
  readonly pageSubtitle = input('');
  readonly notificationsCount = input(0);
  readonly darkMode = input(false, { transform: booleanAttribute });

  readonly logout = output<void>();
  readonly changePassword = output<void>();
  readonly themeToggle = output<void>();
  readonly notificationsClick = output<void>();
}

/**
 * Esqueleto del área autenticada: sidebar fijo (off-canvas en móvil con
 * overlay), topbar sticky y contenido. Los layouts de cada portal lo envuelven.
 */
@Component({
  selector: 'ui-shell-layout',
  imports: [UiSidebar, UiTopbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'sidebarOpen.set(false)' },
  template: `
    <a class="skip" href="#contenido-principal">Saltar al contenido</a>
    <ui-sidebar
      [sections]="sections()"
      [brand]="brand()"
      [user]="user()"
      [tag]="tag()"
      [open]="sidebarOpen()"
      (closeRequest)="sidebarOpen.set(false)"
      (navigate)="sidebarOpen.set(false)"
      (logout)="logout.emit()"
    />
    @if (sidebarOpen()) {
      <div class="overlay" aria-hidden="true" (click)="sidebarOpen.set(false)"></div>
    }
    <div class="main-col">
      <ui-topbar
        [title]="pageTitle()"
        [subtitle]="pageSubtitle()"
        [user]="user()"
        [notificationsCount]="notificationsCount()"
        [darkMode]="darkMode()"
        (menuToggle)="sidebarOpen.set(true)"
        (logout)="logout.emit()"
        (changePassword)="changePassword.emit()"
        (themeToggle)="themeToggle.emit()"
        (notificationsClick)="notificationsClick.emit()"
      >
        <ng-content select="[uiTopbarActions]" />
      </ui-topbar>
      <ng-content select="[uiShellBanner]" />
      <main id="contenido-principal" tabindex="-1">
        <ng-content />
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      background: var(--color-bg);
    }
    .main-col {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    @media (min-width: 1024px) {
      .main-col {
        margin-left: var(--sidebar-width);
      }
    }
    main {
      flex: 1;
      padding: var(--space-6);
      outline: none;
      width: 100%;
      max-width: 100rem;
    }
    @media (max-width: 639px) {
      main {
        padding: var(--space-4);
      }
    }
    .overlay {
      position: fixed;
      inset: 0;
      z-index: calc(var(--z-sidebar) - 1);
      background: rgb(0 0 0 / 0.4);
    }
    @media (min-width: 1024px) {
      .overlay {
        display: none;
      }
    }
    .skip {
      position: absolute;
      left: -999px;
      top: 0.5rem;
      z-index: var(--z-toast);
      background: var(--color-surface);
      padding: 0.5rem 1rem;
      border-radius: var(--radius-sm);
    }
    .skip:focus {
      left: 0.5rem;
    }
    @media print {
      .main-col {
        margin: 0;
      }
      main {
        padding: 0;
      }
      ui-sidebar,
      ui-topbar,
      .overlay,
      .skip {
        display: none !important;
      }
    }
  `,
})
export class UiShellLayout extends ShellLayoutApi {
  protected readonly sidebarOpen = signal(false);

  constructor() {
    super();
    const document = inject(DOCUMENT);
    effect(() => document.body.classList.toggle('ui-scroll-locked', this.sidebarOpen()));
  }
}
