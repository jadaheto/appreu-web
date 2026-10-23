import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiError, SessionStore, ToastService } from '../../../core';
import { makeUser, provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { EmployeesService } from './employees.service';
import { LeavesService } from './leaves.service';
import { MyEmployeeService } from './my-employee.service';
import { PayrollService } from './payroll.service';
import { StickersService } from './stickers.service';
import { HrDocumentsService } from './hr-documents.service';
import { pdfFileName } from './hr-download';
import { apiMessage, isoDate, longDate, shortDate } from './hr-ui';

describe('servicios de RR. HH.', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    TestBed.inject(SessionStore).set({
      token: 't',
      expiresAt: Date.now() + 60_000,
      tenant: null,
      user: makeUser(),
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('EmployeesService', () => {
    it('lista con filtros y mapea `limit` a `pageSize`', async () => {
      const svc = TestBed.inject(EmployeesService);
      const promise = firstValueFrom(
        svc.list({ search: 'ana', type: 'docente', status: null, page: 2, pageSize: 20 }),
      );
      const req = http.expectOne((r) => r.url === `${TEST_API}/hr/employees`);
      expect(req.request.params.get('search')).toBe('ana');
      expect(req.request.params.get('type')).toBe('docente');
      expect(req.request.params.has('status')).toBe(false);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('20');
      req.flush({ items: [{ id: 1 }], total: 21, page: 2, limit: 20 });
      const page = await promise;
      expect(page).toEqual({ items: [{ id: 1 }], total: 21, page: 2, pageSize: 20 });
    });

    it('opciones de empleados activos "Nombre (código)"', async () => {
      const promise = firstValueFrom(TestBed.inject(EmployeesService).activeOptions());
      const req = http.expectOne((r) => r.url === `${TEST_API}/hr/employees`);
      expect(req.request.params.get('status')).toBe('active');
      req.flush({
        items: [{ id: 7, fullName: 'Ana Pérez', code: 'EMP0007' }],
        total: 1,
        page: 1,
        limit: 200,
      });
      expect(await promise).toEqual([{ value: 7, label: 'Ana Pérez (EMP0007)' }]);
    });

    it('registra, actualiza, cambia estado y retira', () => {
      const svc = TestBed.inject(EmployeesService);
      svc.register({ firstName: 'A' } as never).subscribe();
      expect(http.expectOne(`${TEST_API}/hr/employees`).request.method).toBe('POST');
      svc.update(3, { firstName: 'B' } as never).subscribe();
      expect(http.expectOne(`${TEST_API}/hr/employees/3`).request.method).toBe('PUT');
      svc.changeStatus(3, 'suspended').subscribe();
      const status = http.expectOne(`${TEST_API}/hr/employees/3/status`);
      expect(status.request.method).toBe('PATCH');
      expect(status.request.body).toEqual({ status: 'suspended' });
      svc.retire(3, { retirementDate: '2026-03-31', reason: 'Renuncia' }).subscribe();
      const retire = http.expectOne(`${TEST_API}/hr/employees/3/retirement`);
      expect(retire.request.body).toEqual({ retirementDate: '2026-03-31', reason: 'Renuncia' });
    });

    it('certificados del empleado (laboral e ingresos)', () => {
      const svc = TestBed.inject(EmployeesService);
      svc.issueEmploymentCertificate(4, { includeSalary: false }).subscribe();
      const cert = http.expectOne(`${TEST_API}/hr/employees/4/certificates/employment`);
      expect(cert.request.body).toEqual({ includeSalary: false });
      svc.incomeCertificate(4, 2025).subscribe();
      const income = http.expectOne(
        (r) => r.url === `${TEST_API}/hr/employees/4/income-certificate`,
      );
      expect(income.request.params.get('year')).toBe('2025');
    });
  });

  describe('LeavesService', () => {
    it('filtra la bandeja y decide solicitudes', () => {
      const svc = TestBed.inject(LeavesService);
      svc
        .list({
          status: 'pending',
          employeeId: 5,
          from: '2026-01-01',
          to: null,
          page: 1,
          pageSize: 20,
        })
        .subscribe();
      const list = http.expectOne((r) => r.url === `${TEST_API}/hr/leaves`);
      expect(list.request.params.get('status')).toBe('pending');
      expect(list.request.params.get('employeeId')).toBe('5');
      expect(list.request.params.get('from')).toBe('2026-01-01');
      expect(list.request.params.has('to')).toBe(false);
      list.flush({ items: [], total: 0, page: 1, limit: 20 });

      svc.approve(9).subscribe();
      expect(http.expectOne(`${TEST_API}/hr/leaves/9/approve`).request.body).toEqual({});
      svc.reject(9, 'Sin soporte').subscribe();
      expect(http.expectOne(`${TEST_API}/hr/leaves/9/reject`).request.body).toEqual({
        reason: 'Sin soporte',
      });
      svc.cancel(9).subscribe();
      expect(http.expectOne(`${TEST_API}/hr/leaves/9/cancel`).request.method).toBe('POST');
    });
  });

  describe('PayrollService', () => {
    it('recorre la máquina de estados del período', () => {
      const svc = TestBed.inject(PayrollService);
      svc.calculate(2).subscribe();
      http.expectOne(`${TEST_API}/payroll/periods/2/calculate`);
      svc.approve(2).subscribe();
      http.expectOne(`${TEST_API}/payroll/periods/2/approve`);
      svc.pay(2).subscribe();
      http.expectOne(`${TEST_API}/payroll/periods/2/pay`);
      svc.cancel(2, 'Error').subscribe();
      expect(http.expectOne(`${TEST_API}/payroll/periods/2/cancel`).request.body).toEqual({
        reason: 'Error',
      });
      svc.removeNovelty(2, 8).subscribe();
      expect(http.expectOne(`${TEST_API}/payroll/periods/2/novelties/8`).request.method).toBe(
        'DELETE',
      );
    });

    it('KPIs por mes y parámetros por año', () => {
      const svc = TestBed.inject(PayrollService);
      svc.kpis('2026-03').subscribe();
      expect(
        http.expectOne((r) => r.url === `${TEST_API}/payroll/kpis`).request.params.get('month'),
      ).toBe('2026-03');
      svc.saveParameters(2026, { minimumWage: 1, transportAllowance: 1, uvt: 1 }).subscribe();
      expect(http.expectOne(`${TEST_API}/payroll/parameters/2026`).request.method).toBe('PUT');
    });

    it('no muestra toast automático en mutaciones (la página maneja el 403 de segregación)', async () => {
      const toast = TestBed.inject(ToastService);
      const promise = firstValueFrom(TestBed.inject(PayrollService).approve(2)).catch((e) => e);
      http.expectOne(`${TEST_API}/payroll/periods/2/approve`).flush(
        {
          statusCode: 403,
          code: 'FORBIDDEN',
          message: 'Quien liquida la nómina no puede aprobarla.',
        },
        { status: 403, statusText: 'Forbidden' },
      );
      const err = await promise;
      expect(err).toBeInstanceOf(ApiError);
      expect(apiMessage(err)).toContain('no puede aprobarla');
      expect(toast.toasts().length).toBe(0);
    });
  });

  describe('MyEmployeeService y StickersService', () => {
    it('autoservicio sobre /me/employee', () => {
      const svc = TestBed.inject(MyEmployeeService);
      svc.updateContact({ phone: '300' }).subscribe();
      const contact = http.expectOne(`${TEST_API}/me/employee/contact`);
      expect(contact.request.method).toBe('PATCH');
      svc
        .requestLeave({
          leaveType: 'calamidad',
          startDate: '2026-01-01',
          endDate: '2026-01-02',
          reason: 'x',
        })
        .subscribe();
      expect(http.expectOne(`${TEST_API}/me/employee/leaves`).request.method).toBe('POST');
      svc.payslip(11).subscribe();
      http.expectOne(`${TEST_API}/me/employee/payslips/11`);
    });

    it('stickers: filtro, leído y eliminar', () => {
      const svc = TestBed.inject(StickersService);
      svc.list({ filter: 'unread', page: 1, pageSize: 24 }).subscribe();
      expect(
        http.expectOne((r) => r.url === `${TEST_API}/stickers`).request.params.get('filter'),
      ).toBe('unread');
      svc.markRead(3).subscribe();
      expect(http.expectOne(`${TEST_API}/stickers/3/read`).request.method).toBe('PATCH');
      svc.remove(3).subscribe();
      expect(http.expectOne(`${TEST_API}/stickers/3`).request.method).toBe('DELETE');
    });
  });

  describe('documentos PDF de RR. HH.', () => {
    it('desprendibles en PDF (admin y portal) como blob', () => {
      TestBed.inject(PayrollService).payslipPdf(11).subscribe();
      const admin = http.expectOne(`${TEST_API}/payroll/payslips/11/document`);
      expect(admin.request.responseType).toBe('blob');
      admin.flush(new Blob(['%PDF']));
      TestBed.inject(MyEmployeeService).payslipPdf(12).subscribe();
      const mine = http.expectOne(`${TEST_API}/me/employee/payslips/12/document`);
      expect(mine.request.responseType).toBe('blob');
      mine.flush(new Blob(['%PDF']));
    });

    it('certificado de ingresos en PDF con el año (RR. HH. y portal)', () => {
      TestBed.inject(EmployeesService).incomeCertificatePdf(5, 2025).subscribe();
      const admin = http.expectOne(
        (r) => r.url === `${TEST_API}/hr/employees/5/income-certificate/document`,
      );
      expect(admin.request.params.get('year')).toBe('2025');
      expect(admin.request.responseType).toBe('blob');
      admin.flush(new Blob(['%PDF']));
      TestBed.inject(MyEmployeeService).incomeCertificatePdf(2024).subscribe();
      const mine = http.expectOne(
        (r) => r.url === `${TEST_API}/me/employee/income-certificate/document`,
      );
      expect(mine.request.params.get('year')).toBe('2024');
      expect(mine.request.responseType).toBe('blob');
      mine.flush(new Blob(['%PDF']));
    });

    it('certificado laboral expedido en PDF por código', () => {
      TestBed.inject(HrDocumentsService).documentPdf('LAB 1').subscribe();
      const req = http.expectOne(`${TEST_API}/hr/documents/LAB%201/document`);
      expect(req.request.responseType).toBe('blob');
      expect(req.request.headers.get('Authorization')).toBe('Bearer t');
      req.flush(new Blob(['%PDF']));
    });

    it('verificación pública: sin Authorization, sin toast y `null` en 404', async () => {
      const svc = TestBed.inject(HrDocumentsService);
      const toast = TestBed.inject(ToastService);
      const ok = firstValueFrom(svc.verify(' LAB-1 '));
      const req = http.expectOne(`${TEST_API}/hr/documents/verify/LAB-1`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      const view = {
        code: 'LAB-1',
        type: 'employment_certificate',
        employeeName: 'Ana Pérez',
        issuedAt: '2026-10-20T10:00:00Z',
        institutionName: 'Colegio Demo',
      };
      req.flush(view);
      await expect(ok).resolves.toEqual(view);

      const missing = firstValueFrom(svc.verify('NOPE'));
      http
        .expectOne(`${TEST_API}/hr/documents/verify/NOPE`)
        .flush({ message: 'No existe' }, { status: 404, statusText: 'Not Found' });
      await expect(missing).resolves.toBeNull();
      expect(toast.toasts().length).toBe(0);
      expect(TestBed.inject(SessionStore).session()).not.toBeNull();
    });

    it('pdfFileName normaliza tildes y espacios', () => {
      expect(pdfFileName('desprendible', 'Nómina marzo 2026', 'Ana Pérez')).toBe(
        'desprendible-nomina-marzo-2026-ana-perez.pdf',
      );
      expect(pdfFileName(null, '')).toBe('documento.pdf');
    });
  });

  it('utilidades de fecha', () => {
    expect(shortDate('2026-03-05')).toBe('05/03/2026');
    expect(longDate('2026-10-16')).toBe('16 de octubre de 2026');
    expect(isoDate(new Date(2026, 0, 9))).toBe('2026-01-09');
    expect(shortDate(null)).toBe('—');
  });
});
