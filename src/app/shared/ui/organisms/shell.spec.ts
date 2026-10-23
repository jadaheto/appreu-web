import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UiNavSection, UiUserSummary } from '../models';
import { UiFilterBar } from './filter-bar/filter-bar';
import { UiSidebar } from './sidebar/sidebar';
import { UiToast, UiToastStack } from './toast-stack/toast-stack';
import { UiTopbar } from './topbar/topbar';

const SECTIONS: UiNavSection[] = [
  { items: [{ key: 'dashboard', label: 'Dashboard', icon: 'home', route: '/admin', exact: true }] },
  {
    title: 'Finanzas',
    items: [
      {
        key: 'finance',
        label: 'Finanzas & Caja',
        icon: 'banknotes',
        route: '/admin/finanzas',
        badge: 3,
      },
    ],
  },
];
const USER: UiUserSummary = {
  name: 'Ana Pérez',
  email: 'ana@apreu.co',
  roleLabel: 'Administrador',
};

describe('UiSidebar', () => {
  @Component({
    imports: [UiSidebar],
    template: `<ui-sidebar
      [sections]="sections"
      [user]="user"
      [brand]="{ name: 'Apreu', subtitle: 'Portal Administrativo' }"
      tag="Año Lectivo 2026"
      [open]="open()"
      (logout)="events.push('logout')"
      (closeRequest)="events.push('close')"
      (navigate)="events.push($event)"
    />`,
  })
  class Host {
    sections = SECTIONS;
    user = USER;
    open = signal(false);
    events: string[] = [];
  }

  it('lista secciones, badges, usuario y emite eventos', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const links = Array.from(el.querySelectorAll('nav a')) as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/admin', '/admin/finanzas']);
    expect(el.querySelector('.section')?.textContent).toBe('Finanzas');
    expect(el.querySelector('.badge')?.textContent).toBe('3');
    expect(el.querySelector('.tag')?.textContent).toContain('2026');
    expect(el.querySelector('.uname')?.textContent).toBe('Ana Pérez');
    (el.querySelector('.logout') as HTMLButtonElement).click();
    (el.querySelector('.close') as HTMLButtonElement).click();
    expect(fixture.componentInstance.events).toEqual(['logout', 'close']);
    fixture.componentInstance.open.set(true);
    fixture.detectChanges();
    expect(el.querySelector('ui-sidebar')?.classList).toContain('open');
  });
});

describe('UiTopbar', () => {
  @Component({
    imports: [UiTopbar],
    template: `<ui-topbar
      title="Dashboard"
      subtitle="jueves, 16 de octubre de 2026"
      [user]="user"
      [notificationsCount]="2"
      (logout)="events.push('logout')"
      (changePassword)="events.push('password')"
      (themeToggle)="events.push('theme')"
      (menuToggle)="events.push('menu')"
    />`,
  })
  class Host {
    user = USER;
    events: string[] = [];
  }

  it('muestra título, notificaciones y el menú de usuario', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.title')?.textContent).toBe('Dashboard');
    expect(el.querySelector('.bell .dot')).not.toBeNull();
    expect(el.querySelector('.bell')?.getAttribute('aria-label')).toContain('2 sin leer');

    const userBtn = el.querySelector('.user-btn') as HTMLButtonElement;
    expect(userBtn.getAttribute('aria-expanded')).toBe('false');
    userBtn.click();
    fixture.detectChanges();
    expect(userBtn.getAttribute('aria-expanded')).toBe('true');
    const items = el.querySelectorAll('[role=menuitem]');
    (items[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('[role=menu]')).toBeNull();
    userBtn.click();
    fixture.detectChanges();
    (el.querySelectorAll('[role=menuitem]')[1] as HTMLButtonElement).click();
    (el.querySelector('.burger') as HTMLButtonElement).click();
    expect(fixture.componentInstance.events).toEqual(['password', 'logout', 'menu']);
  });

  it('cierra el menú al hacer clic fuera', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.user-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(el.querySelector('[role=menu]')).toBeNull();
  });
});

describe('UiFilterBar', () => {
  @Component({
    imports: [UiFilterBar],
    template: `<ui-filter-bar
      [showClear]="true"
      (apply)="events.push('apply')"
      (clear)="events.push('clear')"
      ><input id="q"
    /></ui-filter-bar>`,
  })
  class Host {
    events: string[] = [];
  }

  it('emite apply al enviar y clear al limpiar', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('form')?.getAttribute('role')).toBe('search');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    (el.querySelector('button[type=button]') as HTMLButtonElement).click();
    expect(fixture.componentInstance.events).toEqual(['apply', 'clear']);
  });
});

describe('UiToastStack', () => {
  @Component({
    imports: [UiToastStack],
    template: `<ui-toast-stack [toasts]="toasts" (dismiss)="dismissed = $event" />`,
  })
  class Host {
    toasts: UiToast[] = [
      { id: 1, type: 'success', message: 'Guardado' },
      { id: 2, type: 'error', message: 'Falló', title: 'Error' },
    ];
    dismissed = 0;
  }

  it('renderiza cada toast con su rol y permite cerrarlo', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const toasts = fixture.nativeElement.querySelectorAll('.toast');
    expect(toasts.length).toBe(2);
    expect(toasts[0].getAttribute('role')).toBe('status');
    expect(toasts[1].getAttribute('role')).toBe('alert');
    (toasts[1].querySelector('.close') as HTMLButtonElement).click();
    expect(fixture.componentInstance.dismissed).toBe(2);
  });
});
