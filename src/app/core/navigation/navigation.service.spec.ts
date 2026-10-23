import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { makeUser, provideTestHttp, TEST_API } from '../../../testing/test-providers';
import type { AuthUser } from '../auth/auth.models';
import { AuthService } from '../auth/auth.service';
import { SessionStore } from '../auth/session.store';
import { MENU } from './menu.config';
import { filterMenu, NavigationService } from './navigation.service';

const keys = (sections: { items: { key: string }[] }[]) =>
  sections.flatMap((s) => s.items.map((i) => i.key));

describe('NavigationService', () => {
  let nav: NavigationService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    nav = TestBed.inject(NavigationService);
  });

  function login(user: Partial<AuthUser>) {
    TestBed.inject(SessionStore).set({
      token: 't',
      expiresAt: Date.now() + 60_000,
      tenant: null,
      user: makeUser(user),
    });
  }

  it('sin sesión no hay menú', () => {
    expect(nav.menu()).toEqual([]);
  });

  it('superadmin ve todo el menú administrativo', () => {
    login({ role: 'superadmin', portal: 'admin' });
    expect(keys(nav.menu())).toEqual(keys(MENU.admin));
    expect(nav.usingApiPermissions()).toBe(false);
  });

  it('finance ve solo sus módulos (matriz local)', () => {
    login({ role: 'finance', portal: 'admin' });
    const visible = keys(nav.menu());
    expect(visible).toContain('dashboard');
    expect(visible).toContain('finance');
    expect(visible).toContain('accounting');
    expect(visible).not.toContain('users');
    expect(visible).not.toContain('hr');
    expect(visible).not.toContain('ai-logs');
  });

  it('teacher ve las opciones de docencia; employee no', () => {
    login({ role: 'teacher', portal: 'employee' });
    expect(keys(nav.menu())).toContain('grades');
    login({ role: 'employee', portal: 'employee' });
    expect(keys(nav.menu())).not.toContain('grades');
    expect(keys(nav.menu())).toContain('payslips');
  });

  it('los permisos de la API tienen prioridad sobre los roles', () => {
    login({ role: 'admin', portal: 'admin' });
    TestBed.inject(AuthService).loadPermissions().subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne(`${TEST_API}/auth/permissions`)
      .flush({ modules: ['users'] });
    expect(keys(nav.menu())).toEqual(['dashboard', 'users']);
    expect(nav.usingApiPermissions()).toBe(true);
    expect(nav.canAccess('users')).toBe(true);
    expect(nav.canAccess('finance')).toBe(false);
  });

  it('filterMenu elimina secciones vacías', () => {
    const result = filterMenu(MENU.student, 'parent', null);
    expect(result.every((s) => s.items.length > 0)).toBe(true);
    expect(keys(result)).not.toContain('ai-history');
    expect(filterMenu(MENU.admin, null, null)).toEqual([]);
  });
});
