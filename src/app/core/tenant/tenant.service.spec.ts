import { TestBed } from '@angular/core/testing';
import { provideTestConfig } from '../../../testing/test-providers';
import { TenantService } from './tenant.service';

describe('TenantService', () => {
  function create(overrides = {}) {
    TestBed.configureTestingModule({ providers: [provideTestConfig(overrides)] });
    return TestBed.inject(TenantService);
  }

  beforeEach(() => sessionStorage.clear());

  it('resuelve el tenant desde el subdominio y lo bloquea', () => {
    const service = create();
    expect(service.resolve({ hostname: 'colegio-a.apreu.test', pathname: '/login' })).toBe(
      'colegio-a',
    );
    expect(service.source()).toBe('subdomain');
    expect(service.isLocked()).toBe(true);
    expect(service.set('otro')).toBe(false);
    expect(service.slug()).toBe('colegio-a');
  });

  it('ignora subdominios reservados o anidados', () => {
    const service = create();
    expect(service.fromHostname('www.apreu.test')).toBeNull();
    expect(service.fromHostname('a.b.apreu.test')).toBeNull();
    expect(service.fromHostname('localhost')).toBeNull();
  });

  it('resuelve desde el primer segmento de la ruta si no es una ruta propia', () => {
    const service = create();
    expect(service.resolve({ hostname: 'localhost', pathname: '/san-jose/login' })).toBe(
      'san-jose',
    );
    expect(service.source()).toBe('path');
    expect(service.fromPathname('/admin/usuarios')).toBeNull();
    expect(service.fromPathname('/login')).toBeNull();
  });

  it('persiste en sessionStorage y lo recupera', () => {
    const first = create();
    first.set('colegio-b');
    expect(sessionStorage.getItem('apreu.tenant')).toBe('"colegio-b"');
    TestBed.resetTestingModule();
    const second = create();
    expect(second.resolve({ hostname: 'localhost', pathname: '/admin' })).toBe('colegio-b');
    expect(second.source()).toBe('storage');
  });

  it('usa defaultTenant como último recurso', () => {
    const service = create({ defaultTenant: 'demo' });
    expect(service.resolve({ hostname: 'localhost', pathname: '/' })).toBe('demo');
    expect(service.source()).toBe('default');
  });

  it('valida y normaliza slugs', () => {
    const service = create();
    expect(service.set('  Colegio-X ')).toBe(true);
    expect(service.slug()).toBe('colegio-x');
    expect(service.set('mal slug!')).toBe(false);
    expect(service.set('admin')).toBe(false);
    service.clear();
    expect(service.slug()).toBeNull();
    expect(sessionStorage.getItem('apreu.tenant')).toBeNull();
  });
});
