import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  convertToParamMap,
  Route,
  Router,
  RouterStateSnapshot,
  UrlSegment,
  UrlTree,
} from '@angular/router';
import { makeUser, provideTestHttp } from '../../../../testing/test-providers';
import { TenantService } from '../../tenant/tenant.service';
import { tenantRouteGuard } from '../../tenant/tenant-route.guard';
import type { AuthUser } from '../auth.models';
import { SessionStore } from '../session.store';
import { authGuard, authMatchGuard } from './auth.guard';
import { guestGuard } from './guest.guard';
import { homeRedirectGuard } from './home-redirect.guard';
import { moduleGuard } from './module.guard';
import { portalGuard } from './portal.guard';
import { roleGuard } from './role.guard';

const route = (data: Record<string, unknown> = {}, params: Record<string, string> = {}) =>
  ({ data, paramMap: convertToParamMap(params) }) as unknown as ActivatedRouteSnapshot;
const state = (url: string) => ({ url }) as RouterStateSnapshot;

function run<T>(fn: () => T): T {
  return TestBed.runInInjectionContext(fn);
}

function urlOf(result: unknown): string {
  expect(result).toBeInstanceOf(UrlTree);
  return TestBed.inject(Router).serializeUrl(result as UrlTree);
}

describe('guards', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
  });

  function login(user: Partial<AuthUser> = {}) {
    TestBed.inject(SessionStore).set({
      token: 't',
      expiresAt: Date.now() + 60_000,
      tenant: null,
      user: makeUser(user),
    });
  }

  describe('authGuard', () => {
    it('sin sesión redirige al login con returnUrl', () => {
      expect(urlOf(run(() => authGuard(route(), state('/admin/usuarios'))))).toBe(
        '/login?returnUrl=%2Fadmin%2Fusuarios',
      );
    });
    it('con sesión deja pasar', () => {
      login();
      expect(run(() => authGuard(route(), state('/admin')))).toBe(true);
    });
    it('canMatch sin sesión redirige', () => {
      const segments = [new UrlSegment('admin', {})];
      expect(urlOf(run(() => authMatchGuard({} as Route, segments)))).toBe(
        '/login?returnUrl=%2Fadmin',
      );
    });
  });

  describe('guestGuard', () => {
    it('deja pasar anónimos y envía a su portal a los autenticados', () => {
      expect(run(() => guestGuard(route(), state('/login')))).toBe(true);
      login({ role: 'student', portal: 'student' });
      expect(urlOf(run(() => guestGuard(route(), state('/login'))))).toBe('/portal-estudiante');
    });
  });

  describe('homeRedirectGuard', () => {
    it('redirige según el portal del usuario', () => {
      expect(urlOf(run(() => homeRedirectGuard(route(), state('/'))))).toBe('/login');
      login({ role: 'teacher', portal: 'employee' });
      expect(urlOf(run(() => homeRedirectGuard(route(), state('/'))))).toBe('/portal-empleado');
    });
  });

  describe('roleGuard', () => {
    it('permite roles listados y superadmin', () => {
      login({ role: 'finance' });
      expect(run(() => roleGuard('admin', 'finance')(route(), state('/x')))).toBe(true);
      login({ role: 'superadmin' });
      expect(run(() => roleGuard('admin')(route(), state('/x')))).toBe(true);
    });
    it('deniega con 403 y lee roles de route.data', () => {
      login({ role: 'hr' });
      expect(urlOf(run(() => roleGuard()(route({ roles: ['admin'] }), state('/x'))))).toBe(
        '/acceso-denegado',
      );
    });
    it('sin sesión envía al login', () => {
      expect(urlOf(run(() => roleGuard('admin')(route(), state('/x'))))).toBe('/login');
    });
  });

  describe('portalGuard', () => {
    it('deja pasar al portal propio y redirige a los demás', () => {
      login({ role: 'parent', portal: 'student' });
      expect(run(() => portalGuard('student')(route(), state('/portal-estudiante')))).toBe(true);
      expect(urlOf(run(() => portalGuard('admin')(route(), state('/admin'))))).toBe(
        '/portal-estudiante',
      );
    });
  });

  describe('moduleGuard', () => {
    it('usa la matriz local de roles como fallback', () => {
      login({ role: 'finance' });
      expect(run(() => moduleGuard('finance')(route(), state('/x')))).toBe(true);
      expect(urlOf(run(() => moduleGuard('users')(route(), state('/x'))))).toBe('/acceso-denegado');
    });
  });

  describe('tenantRouteGuard', () => {
    it('fija el tenant de la ruta y redirige al login', () => {
      const result = run(() =>
        tenantRouteGuard(route({}, { tenant: 'san-jose' }), state('/san-jose/login')),
      );
      expect(urlOf(result)).toBe('/login');
      expect(TestBed.inject(TenantService).slug()).toBe('san-jose');
    });
    it('descarta la sesión de otro colegio', () => {
      TestBed.inject(SessionStore).set({
        token: 't',
        expiresAt: Date.now() + 60_000,
        tenant: 'otro',
        user: makeUser(),
      });
      run(() => tenantRouteGuard(route({}, { tenant: 'san-jose' }), state('/san-jose')));
      expect(TestBed.inject(SessionStore).session()).toBeNull();
    });
    it('slug inválido → no encontrado', () => {
      expect(
        urlOf(run(() => tenantRouteGuard(route({}, { tenant: 'Mal_Slug' }), state('/x')))),
      ).toBe('/no-encontrado');
    });
  });
});
