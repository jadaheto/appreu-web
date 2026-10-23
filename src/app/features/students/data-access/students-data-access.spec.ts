import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { IncidentsService } from './incidents.service';
import { PortalContextStore } from './portal-context.store';
import { CertificateView, compact, StudentSummaryView } from './students.models';
import { AcademicCatalogService, GuardiansService, StudentsService } from './students.service';

const summary = (id: number, fullName: string): StudentSummaryView => ({
  id,
  code: `EST${id}`,
  fullName,
  firstName: fullName.split(' ')[0],
  lastName: fullName.split(' ')[1] ?? '',
  initials: 'XX',
  email: null,
  gender: 'F',
  status: 'active',
  scholarshipPct: 0,
  photoAvailable: false,
  placement: null,
  guardian: null,
});

describe('data-access de estudiantes', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('compact quita vacíos y recorta textos', () => {
    expect(compact({ a: ' x ', b: '', c: null, d: undefined, e: 0, f: false })).toEqual({
      a: 'x',
      e: 0,
      f: false,
    });
  });

  describe('StudentsService', () => {
    it('lista con filtros y traduce limit → pageSize', async () => {
      const promise = firstValueFrom(
        TestBed.inject(StudentsService).list({
          search: 'ana',
          status: 'active',
          gradeId: null,
          classroomId: 4,
          year: 2026,
          page: 2,
          pageSize: 20,
        }),
      );
      const req = http.expectOne((r) => r.url === `${TEST_API}/students`);
      expect(req.request.params.get('search')).toBe('ana');
      expect(req.request.params.get('classroomId')).toBe('4');
      expect(req.request.params.get('limit')).toBe('20');
      expect(req.request.params.has('gradeId')).toBe(false);
      req.flush({ items: [summary(1, 'Ana Pérez')], total: 21, page: 2, limit: 20 });
      expect(await promise).toEqual({
        items: [summary(1, 'Ana Pérez')],
        total: 21,
        page: 2,
        pageSize: 20,
      });
    });

    it('matrícula: compacta estudiante y acudiente', () => {
      TestBed.inject(StudentsService)
        .enroll({
          student: { firstName: 'Ana', lastName: 'Pérez', documentNumber: '123', email: '' },
          guardian: { firstName: 'Luis', lastName: 'Pérez', documentNumber: '99', phone: '' },
          createPortalAccounts: true,
        })
        .subscribe();
      const req = http.expectOne(`${TEST_API}/students`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        student: { firstName: 'Ana', lastName: 'Pérez', documentNumber: '123' },
        guardian: { firstName: 'Luis', lastName: 'Pérez', documentNumber: '99' },
        createPortalAccounts: true,
      });
      req.flush({});
    });

    it('actualización: classroomId null quita el salón', () => {
      TestBed.inject(StudentsService)
        .update(3, { firstName: 'Ana', lastName: 'Pérez', documentNumber: '1', classroomId: null })
        .subscribe();
      const req = http.expectOne(`${TEST_API}/students/3`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({
        firstName: 'Ana',
        lastName: 'Pérez',
        documentNumber: '1',
        classroomId: null,
      });
      req.flush({});
    });

    it('foto: sube FormData y devuelve null si no hay foto', async () => {
      const service = TestBed.inject(StudentsService);
      service.uploadPhoto(3, new File(['x'], 'a.png', { type: 'image/png' })).subscribe();
      const put = http.expectOne(`${TEST_API}/students/3/photo`);
      expect(put.request.method).toBe('PUT');
      expect((put.request.body as FormData).get('photo')).toBeInstanceOf(File);
      put.flush(null);

      const promise = firstValueFrom(service.photo(3));
      http
        .expectOne(`${TEST_API}/students/3/photo`)
        .flush(new Blob(), { status: 404, statusText: 'Not Found' });
      expect(await promise).toBeNull();
    });

    it('certificados: solicitud, aprobación, anulación y documento', () => {
      const service = TestBed.inject(StudentsService);
      service.requestCertificate(3, '').subscribe();
      const reqCert = http.expectOne(`${TEST_API}/students/3/certificate-requests`);
      expect(reqCert.request.body).toEqual({});
      reqCert.flush({});
      service.approveCertificate(8).subscribe();
      http.expectOne(`${TEST_API}/certificates/8/approve`).flush({});
      service.cancelCertificate(8, 'Duplicado').subscribe();
      expect(http.expectOne(`${TEST_API}/certificates/8/cancel`).request.body).toEqual({
        reason: 'Duplicado',
      });
      service.certificateDocument(8).subscribe();
      http.expectOne(`${TEST_API}/certificates/8/document`).flush({});
      service.idCard(3).subscribe();
      http.expectOne(`${TEST_API}/students/3/id-card`).flush({});
    });

    it('certificado en PDF: GET /certificates/:id/pdf como blob y descarga con nombre .pdf', async () => {
      const service = TestBed.inject(StudentsService);
      service.certificatePdf(8).subscribe();
      const raw = http.expectOne(`${TEST_API}/certificates/8/pdf`);
      expect(raw.request.responseType).toBe('blob');
      raw.flush(new Blob(['%PDF']));

      const names: string[] = [];
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
      const spy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        names.push(this.download);
      });
      const done = firstValueFrom(
        service.downloadCertificatePdf({
          id: 9,
          verificationCode: 'ZX-99',
          snapshot: { studentName: 'José Núñez' },
        } as CertificateView),
      );
      http.expectOne(`${TEST_API}/certificates/9/pdf`).flush(new Blob(['%PDF']));
      await done;
      expect(names).toEqual(['certificado-estudio-jose-nunez-zx-99.pdf']);
      spy.mockRestore();
    });

    it('verificación pública: 404 → null', async () => {
      const promise = firstValueFrom(TestBed.inject(StudentsService).verifyCertificate(' AB-12 '));
      http
        .expectOne(`${TEST_API}/public/certificates/verify/AB-12`)
        .flush({ statusCode: 404, message: 'No existe' }, { status: 404, statusText: 'Not Found' });
      expect(await promise).toBeNull();
    });
  });

  it('GuardiansService: búsqueda por documento, 404 → null', async () => {
    const promise = firstValueFrom(TestBed.inject(GuardiansService).findByDocument(' 99 '));
    const req = http.expectOne((r) => r.url === `${TEST_API}/guardians`);
    expect(req.request.params.get('documentNumber')).toBe('99');
    req.flush({ statusCode: 404, message: 'No existe' }, { status: 404, statusText: 'Not Found' });
    expect(await promise).toBeNull();
  });

  it('AcademicCatalogService: si falla devuelve lista vacía', async () => {
    const promise = firstValueFrom(TestBed.inject(AcademicCatalogService).classrooms(2026));
    const req = http.expectOne((r) => r.url === `${TEST_API}/academic/classrooms`);
    expect(req.request.params.get('year')).toBe('2026');
    req.flush({ message: 'x' }, { status: 500, statusText: 'Error' });
    expect(await promise).toEqual([]);
  });

  describe('IncidentsService', () => {
    it('bandeja con filtros, KPIs, detalle y revisión', () => {
      const service = TestBed.inject(IncidentsService);
      service.list({ status: 'pending', type: null, page: 1, pageSize: 20 }).subscribe();
      const list = http.expectOne((r) => r.url === `${TEST_API}/incidents`);
      expect(list.request.params.get('status')).toBe('pending');
      expect(list.request.params.has('type')).toBe(false);
      list.flush({ items: [], total: 0, page: 1, limit: 20 });

      service.kpis().subscribe();
      http.expectOne(`${TEST_API}/incidents/kpis`).flush({});
      service.get(5).subscribe();
      http.expectOne(`${TEST_API}/incidents/5`).flush({});

      service.review(5, 'approved', '').subscribe();
      const review = http.expectOne(`${TEST_API}/incidents/5/review`);
      expect(review.request.body).toEqual({ action: 'approved' });
      review.flush({});

      service
        .create({ title: 'Baja', type: 'baja_estudiante', priority: 'high', description: '' })
        .subscribe();
      expect(http.expectOne(`${TEST_API}/incidents`).request.body).toEqual({
        title: 'Baja',
        type: 'baja_estudiante',
        priority: 'high',
      });
    });

    it('portal: lista y reporta las del estudiante', () => {
      const service = TestBed.inject(IncidentsService);
      service.forStudent(3, 2, 10).subscribe();
      const list = http.expectOne((r) => r.url === `${TEST_API}/portal/students/3/incidents`);
      expect(list.request.params.get('page')).toBe('2');
      expect(list.request.params.get('limit')).toBe('10');
      list.flush({ items: [], total: 0, page: 2, limit: 10 });

      service.report(3, { title: 'Incapacidad', type: 'incapacidad' }).subscribe();
      const post = http.expectOne(`${TEST_API}/portal/students/3/incidents`);
      expect(post.request.method).toBe('POST');
      expect(post.request.body).toEqual({ title: 'Incapacidad', type: 'incapacidad' });
    });
  });

  it('PortalContextStore: elige el primer hijo y recuerda la selección', async () => {
    TestBed.inject(SessionStore).set({
      token: 't',
      expiresAt: Date.now() + 60_000,
      tenant: null,
      user: makeUser({ id: 9, role: 'parent', portal: 'student' }),
    });
    const store = TestBed.inject(PortalContextStore);
    TestBed.tick();
    http
      .expectOne(`${TEST_API}/portal/context`)
      .flush({ role: 'parent', students: [summary(3, 'Ana Pérez'), summary(4, 'Luis Pérez')] });
    await new Promise((r) => setTimeout(r));
    expect(store.hasMany()).toBe(true);
    expect(store.selectedId()).toBe(3);
    store.select(4);
    expect(store.selectedId()).toBe(4);
    expect(sessionStorage.getItem('apreu.portal.student')).toContain('4');
  });
});
