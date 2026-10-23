import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTestHttp, TEST_API } from '../../../testing/test-providers';
import { TenantService } from '../tenant/tenant.service';
import { BrandingService } from './branding.service';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('aplica data-theme y lo persiste', () => {
    const theme = TestBed.inject(ThemeService);
    theme.mode.set('dark');
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('apreu.theme')).toBe('"dark"');
    expect(theme.isDark()).toBe(true);
    theme.toggle();
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('modo system quita el atributo', () => {
    const theme = TestBed.inject(ThemeService);
    theme.mode.set('system');
    TestBed.tick();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('BrandingService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [...provideTestHttp()] });
  });
  afterEach(() => TestBed.inject(BrandingService).reset());

  it('aplica colores válidos como CSS vars y datos de marca', () => {
    const branding = TestBed.inject(BrandingService);
    branding.apply({
      colorPrimary: '#22cbce',
      colorHeaderBg: 'rojo',
      schoolName: 'Colegio X',
      logoUrl: '/logo.png',
      logoSize: 200,
    });
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--brand-primary')).toBe('#22cbce');
    expect(style.getPropertyValue('--brand-header-bg')).toBe('');
    expect(branding.schoolName()).toBe('Colegio X');
    expect(branding.logoUrl()).toBe('/logo.png');
    expect(branding.logoSize()).toBe(80);
    branding.reset();
    expect(style.getPropertyValue('--brand-primary')).toBe('');
    expect(branding.schoolName()).toBe('Apreu ERP');
  });
});

describe('BrandingService con la API', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [...provideTestHttp()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    TestBed.inject(BrandingService).reset();
  });

  const branding = {
    schoolName: 'Colegio Norte',
    logoUrl: '/media/logo.png',
    logoSize: 48,
    colorPrimary: '#123456',
    colorHeaderBg: '#ffffff',
    colorHeaderBar: '#654321',
    academicYear: 2027,
  };

  it('carga la marca del tenant activo y la recarga al cambiar de colegio', () => {
    const tenant = TestBed.inject(TenantService);
    const service = TestBed.inject(BrandingService);
    tenant.set('colegio-norte');
    service.init();
    TestBed.tick();
    const req = http.expectOne(`${TEST_API}/institution/branding`);
    expect(req.request.headers.get('X-Tenant')).toBe('colegio-norte');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(branding);
    expect(service.schoolName()).toBe('Colegio Norte');
    expect(service.academicYear()).toBe(2027);
    expect(service.loaded()).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--brand-primary')).toBe('#123456');

    tenant.set('otro');
    TestBed.tick();
    http.expectOne(`${TEST_API}/institution/branding`).flush({ ...branding, schoolName: 'Otro' });
    expect(service.schoolName()).toBe('Otro');
  });

  it('si la API falla conserva la marca por defecto', () => {
    TestBed.inject(TenantService).set('colegio-x');
    const service = TestBed.inject(BrandingService);
    service.init();
    TestBed.tick();
    http
      .expectOne(`${TEST_API}/institution/branding`)
      .flush({ message: 'x' }, { status: 404, statusText: 'Not Found' });
    expect(service.schoolName()).toBe('Apreu ERP');
    expect(service.loaded()).toBe(false);
  });

  it('sin tenant no consulta la API', () => {
    TestBed.inject(BrandingService).init();
    TestBed.tick();
    http.expectNone(`${TEST_API}/institution/branding`);
  });
});
