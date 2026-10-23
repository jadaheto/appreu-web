import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTestHttp, TEST_API } from '../../../testing/test-providers';
import { ApiClient, isApiUrl, toHttpParams } from './api-client';

describe('ApiClient', () => {
  let api: ApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    api = TestBed.inject(ApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('antepone apiUrl a rutas relativas', () => {
    expect(api.url('auth/me')).toBe(`${TEST_API}/auth/me`);
    expect(api.url('/auth/me')).toBe(`${TEST_API}/auth/me`);
    expect(api.url('https://otro.test/x')).toBe('https://otro.test/x');
  });

  it('hace GET con parámetros limpios', () => {
    let body: unknown;
    api
      .get('users', { params: { q: 'ana', page: 2, role: null, empty: '' } })
      .subscribe((r) => (body = r));
    const req = http.expectOne((r) => r.url === `${TEST_API}/users`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('ana');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.has('role')).toBe(false);
    expect(req.request.params.has('empty')).toBe(false);
    req.flush({ ok: true });
    expect(body).toEqual({ ok: true });
  });

  it('envía POST, PUT, PATCH y DELETE', () => {
    api.post('a', { x: 1 }).subscribe();
    api.put('b', { y: 2 }).subscribe();
    api.patch('c').subscribe();
    api.delete('d').subscribe();
    expect(http.expectOne(`${TEST_API}/a`).request.body).toEqual({ x: 1 });
    expect(http.expectOne(`${TEST_API}/b`).request.method).toBe('PUT');
    expect(http.expectOne(`${TEST_API}/c`).request.method).toBe('PATCH');
    expect(http.expectOne(`${TEST_API}/d`).request.method).toBe('DELETE');
  });

  it('descarga binarios como Blob', () => {
    api.download('files/1').subscribe();
    const req = http.expectOne(`${TEST_API}/files/1`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']));
  });
});

describe('helpers http', () => {
  it('isApiUrl compara el prefijo', () => {
    expect(isApiUrl('http://api.test/api/x', 'http://api.test/api')).toBe(true);
    expect(isApiUrl('/assets/i18n.json', 'http://api.test/api')).toBe(false);
  });

  it('toHttpParams serializa arreglos y fechas', () => {
    const params = toHttpParams({ ids: [1, 2], at: new Date('2026-01-02T00:00:00Z'), flag: false });
    expect(params.getAll('ids')).toEqual(['1', '2']);
    expect(params.get('at')).toBe('2026-01-02T00:00:00.000Z');
    expect(params.get('flag')).toBe('false');
  });
});
