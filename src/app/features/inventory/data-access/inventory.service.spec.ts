import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestHttp() });
    service = TestBed.inject(InventoryService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lista ítems con filtros y mapea el paginado', async () => {
    const promise = firstValueFrom(
      service.items({ search: 'cam', categoryId: 2, alert: 'low', page: 1, pageSize: 20 }),
    );
    const req = http.expectOne((r) => r.url === `${TEST_API}/inventory/items`);
    expect(req.request.params.get('alert')).toBe('low');
    expect(req.request.params.get('categoryId')).toBe('2');
    expect(req.request.params.get('limit')).toBe('20');
    req.flush({ items: [], total: 0, page: 1, limit: 20 });
    await expect(promise).resolves.toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
  });

  it('registra movimientos de stock', () => {
    service.registerMovement(4, { type: 'ajuste', quantity: 10, reason: 'Conteo' }).subscribe();
    const req = http.expectOne(`${TEST_API}/inventory/items/4/movements`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ type: 'ajuste', quantity: 10, reason: 'Conteo' });
    req.flush({});
  });

  it('consulta el kárdex paginado', () => {
    service.movements(4, { page: 2, pageSize: 10 }).subscribe();
    const req = http.expectOne((r) => r.url === `${TEST_API}/inventory/items/4/movements`);
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ items: [], total: 0, page: 2, limit: 10 });
  });

  it('desactiva ítems con DELETE (borrado lógico)', () => {
    service.deactivateItem(9).subscribe();
    const req = http.expectOne(`${TEST_API}/inventory/items/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('gestiona categorías', () => {
    service.createCategory('Uniformes').subscribe();
    const create = http.expectOne(`${TEST_API}/inventory/categories`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ name: 'Uniformes' });
    create.flush({ id: 1, name: 'Uniformes' });
    service.renameCategory(1, 'Útiles').subscribe();
    const rename = http.expectOne(`${TEST_API}/inventory/categories/1`);
    expect(rename.request.method).toBe('PATCH');
    expect(rename.request.body).toEqual({ name: 'Útiles' });
    rename.flush({ id: 1, name: 'Útiles' });
  });

  it('consulta KPIs, alertas y valoración', () => {
    service.kpis().subscribe();
    service.alerts().subscribe();
    service.valuation().subscribe();
    http.expectOne(`${TEST_API}/inventory/kpis`).flush({});
    http.expectOne(`${TEST_API}/inventory/alerts`).flush({});
    http.expectOne(`${TEST_API}/inventory/valuation`).flush({});
  });
  it('omite filtros vacíos al listar ítems', () => {
    service.items({ search: undefined, categoryId: null, alert: null }).subscribe();
    const req = http.expectOne((r) => r.url === `${TEST_API}/inventory/items`);
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ items: [], total: 0, page: 1, limit: 20 });
  });

  it('consulta, crea y actualiza ítems', () => {
    service.item(3).subscribe();
    expect(http.expectOne(`${TEST_API}/inventory/items/3`).request.method).toBe('GET');

    const dto = { name: 'Camiseta', sku: 'UNI-01', unitCost: 1, salePrice: 2, minStock: 5 };
    service.createItem({ ...dto, initialStock: 10 }).subscribe();
    const create = http.expectOne(`${TEST_API}/inventory/items`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ ...dto, initialStock: 10 });
    create.flush({});

    service.updateItem(3, dto).subscribe();
    const update = http.expectOne(`${TEST_API}/inventory/items/3`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual(dto);
    update.flush({});
  });

  it('mapea el paginado del kárdex (limit → pageSize)', async () => {
    const promise = firstValueFrom(service.movements(4));
    const req = http.expectOne((r) => r.url === `${TEST_API}/inventory/items/4/movements`);
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ items: [], total: 3, page: 1, limit: 20 });
    await expect(promise).resolves.toEqual({ items: [], total: 3, page: 1, pageSize: 20 });
  });

  it('lista y elimina categorías', () => {
    service.categories().subscribe();
    http.expectOne(`${TEST_API}/inventory/categories`).flush([]);
    service.deleteCategory(2).subscribe();
    const req = http.expectOne(`${TEST_API}/inventory/categories/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
