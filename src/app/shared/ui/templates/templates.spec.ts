import { Component, signal, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UiAdminLayout } from './admin-layout/admin-layout';
import { UiAuthLayout } from './auth-layout/auth-layout';
import { UiEmployeePortalLayout } from './employee-portal-layout/employee-portal-layout';
import { UiStudentPortalLayout } from './student-portal-layout/student-portal-layout';

describe('UiAuthLayout', () => {
  @Component({
    imports: [UiAuthLayout],
    template: `<ui-auth-layout title="Iniciar Sesión"><form id="f"></form></ui-auth-layout>`,
  })
  class Host {}

  it('muestra marca, título, contenido y pie', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.name')?.textContent).toBe('Apreu');
    expect(el.querySelector('.subtitle')?.textContent).toContain('Sistema de Gestión Escolar');
    expect(el.querySelector('h1')?.textContent).toBe('Iniciar Sesión');
    expect(el.querySelector('.card #f')).not.toBeNull();
    expect(el.querySelector('footer')?.textContent).toContain(String(new Date().getFullYear()));
  });
});

@Component({
  imports: [UiAdminLayout, UiEmployeePortalLayout, UiStudentPortalLayout],
  template: `
    @switch (kind()) {
      @case ('admin') {
        <ui-admin-layout
          [sections]="sections"
          [user]="user"
          pageTitle="Dashboard"
          tag="Año Lectivo 2026"
          (logout)="events.push('logout')"
        >
          <button uiTopbarActions id="quick">+ Nuevo</button>
          <p id="page">Contenido</p>
        </ui-admin-layout>
      }
      @case ('employee') {
        <ui-employee-portal-layout [sections]="sections" [user]="user" pageTitle="Mi Portal"
          ><p id="page">E</p></ui-employee-portal-layout
        >
      }
      @default {
        <ui-student-portal-layout [sections]="sections" [user]="user" pageTitle="Mi Portal">
          <div uiShellBanner id="banner">Hijo: Ana</div>
          <p id="page">S</p>
        </ui-student-portal-layout>
      }
    }
  `,
})
class ShellHost {
  kind = signal<'admin' | 'employee' | 'student'>('admin');
  sections = [{ items: [{ key: 'dashboard', label: 'Inicio', icon: 'home', route: '/x' }] }];
  user = { name: 'Ana Pérez', roleLabel: 'Administrador' };
  events: string[] = [];
}

describe('layouts de portal', () => {
  function setup(kind: 'admin' | 'employee' | 'student') {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ShellHost as Type<ShellHost>);
    fixture.componentInstance.kind.set(kind);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('admin: sidebar, topbar con acciones proyectadas y contenido', () => {
    const { fixture, el } = setup('admin');
    expect(el.querySelector('ui-sidebar .tag')?.textContent).toContain('2026');
    expect(el.querySelector('ui-topbar .title')?.textContent).toBe('Dashboard');
    expect(el.querySelector('ui-topbar #quick')).not.toBeNull();
    expect(el.querySelector('main #page')).not.toBeNull();
    (el.querySelector('ui-sidebar .logout') as HTMLButtonElement).click();
    expect(fixture.componentInstance.events).toEqual(['logout']);
  });

  it('abre y cierra el menú móvil con overlay', () => {
    const { fixture, el } = setup('employee');
    expect(el.querySelector('.overlay')).toBeNull();
    (el.querySelector('ui-topbar .burger') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('ui-sidebar')?.classList).toContain('open');
    (el.querySelector('.overlay') as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelector('ui-sidebar')?.classList).not.toContain('open');
    expect(el.querySelector('main #page')?.textContent).toBe('E');
  });

  it('estudiante: proyecta el banner de contexto', () => {
    const { el } = setup('student');
    expect(el.querySelector('#banner')).not.toBeNull();
    expect(el.querySelector('ui-student-portal-layout')?.classList).toContain('portal-student');
  });
});
