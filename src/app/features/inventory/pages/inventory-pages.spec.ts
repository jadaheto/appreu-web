import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { ConfirmService } from '../../../core';
import { provideTestHttp, TEST_API } from '../../../../testing/test-providers';
import { ItemFormDialog } from '../components/item-form-dialog';
import { StockMovementDialog } from '../components/stock-movement-dialog';
import { InventoryItem, StockMovement } from '../data-access/inventory.models';
import { StockAlertsPage } from './alerts/stock-alerts-page';
import { CategoriesPage } from './categories/categories-page';
import { ItemsPage } from './items/items-page';
import { KardexPage } from './kardex/kardex-page';
import { ValuationPage } from './valuation/valuation-page';

const item = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: 1,
  sku: 'UNI-01',
  name: 'Camiseta',
  categoryId: null,
  categoryName: null,
  unit: 'und',
  unitCost: 20000,
  salePrice: 30000,
  stock: 2,
  minStock: 5,
  location: null,
  isActive: true,
  stockStatus: 'low',
  stockValue: 40000,
  ...overrides,
});

const movement = (overrides: Partial<StockMovement> = {}): StockMovement => ({
  id: 1,
  itemId: 1,
  type: 'inicial',
  quantity: 5,
  balanceAfter: 5,
  unitCost: 20000,
  totalCost: 100000,
  reason: null,
  referenceType: null,
  referenceId: null,
  userId: 1,
  createdAt: '2026-10-01T15:00:00Z',
  ...overrides,
});

const apiPage = <T>(items: T[]) => ({ items, total: items.length, page: 1, limit: 20 });
const kpis = { totalItems: 1, inventoryValue: 40000, lowStock: 1, outOfStock: 0 };

/**
 * Deja correr efectos y microtareas sin esperar a que terminen las peticiones
 * pendientes (`whenStable` se cuelga en zoneless si queda una petición abierta).
 */
async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
  }
  fixture.detectChanges();
}

describe('Inventario: páginas', () => {
  let http: HttpTestingController;
  let confirmAnswer = true;
  let navigate: ReturnType<typeof vi.fn>;

  function setup<T>(
    cmp: new () => T,
    params: Record<string, string> = {},
    query: Record<string, string> = {},
  ) {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestHttp(),
        { provide: ConfirmService, useValue: { ask: () => Promise.resolve(confirmAnswer) } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(params),
              queryParamMap: convertToParamMap(query),
            },
            paramMap: of(convertToParamMap(params)),
          },
        },
      ],
    });
    navigate = vi.fn().mockResolvedValue(true);
    TestBed.inject(Router).navigate = navigate as unknown as Router['navigate'];
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(cmp);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const button = (root: ParentNode, label: string) => {
    const btn = root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    if (!btn) throw new Error(`No se encontró el botón «${label}»`);
    return btn;
  };

  beforeEach(() => (confirmAnswer = true));
  afterEach(() => http.verify());

  // ---- Ítems ----
  async function loadItems(fixture: ComponentFixture<unknown>, items = [item()]) {
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/inventory/items`).flush(apiPage(items));
    http.expectOne(`${TEST_API}/inventory/kpis`).flush(kpis);
    http.expectOne(`${TEST_API}/inventory/categories`).flush([{ id: 2, name: 'Uniformes' }]);
    await settle(fixture);
  }

  it('ítems: KPIs, listado y filtro de alertas desde la tarjeta', async () => {
    const { fixture, el } = setup(ItemsPage);
    await loadItems(fixture);
    expect(el.textContent).toContain('Camiseta');
    expect(el.textContent).toContain('Stock bajo');
    expect(el.textContent).toContain('40.000');

    button(el, 'Filtrar ítems sin stock').click();
    await settle(fixture);
    const req = http.expectOne((r) => r.url === `${TEST_API}/inventory/items`);
    expect(req.request.params.get('alert')).toBe('out');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(apiPage([]));
    await settle(fixture);
    expect(el.textContent).toContain('No hay ítems');
  });

  it('ítems: el query param ?alerta=low filtra desde la primera consulta', async () => {
    const { fixture } = setup(ItemsPage, {}, { alerta: 'low' });
    await settle(fixture);
    const req = http.expectOne((r) => r.url === `${TEST_API}/inventory/items`);
    expect(req.request.params.get('alert')).toBe('low');
    req.flush(apiPage([]));
    http.expectOne(`${TEST_API}/inventory/kpis`).flush(kpis);
    http.expectOne(`${TEST_API}/inventory/categories`).flush([]);
    await settle(fixture);
  });

  it('ítems: búsqueda y filtros combinados; limpiar los quita', async () => {
    const { fixture } = setup(ItemsPage);
    await loadItems(fixture);
    const page = fixture.componentInstance as unknown as {
      search: { set(v: string): void };
      categoryId: { set(v: number): void };
      includeInactive: { set(v: boolean): void };
      apply(): void;
      clear(): void;
    };
    page.search.set('  cam ');
    page.categoryId.set(2);
    page.includeInactive.set(true);
    page.apply();
    await settle(fixture);
    let req = http.expectOne((r) => r.url === `${TEST_API}/inventory/items`);
    expect(req.request.params.get('search')).toBe('cam');
    expect(req.request.params.get('categoryId')).toBe('2');
    expect(req.request.params.get('includeInactive')).toBe('true');
    req.flush(apiPage([]));
    await settle(fixture);

    page.clear();
    await settle(fixture);
    req = http.expectOne((r) => r.url === `${TEST_API}/inventory/items`);
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
    req.flush(apiPage([]));
    await settle(fixture);
  });

  it('ítems: desactiva tras confirmar y refresca listado y KPIs', async () => {
    const { fixture, el } = setup(ItemsPage);
    await loadItems(fixture);

    confirmAnswer = false;
    button(el, 'Desactivar ítem').click();
    await settle(fixture);
    http.expectNone(`${TEST_API}/inventory/items/1`);

    confirmAnswer = true;
    button(el, 'Desactivar ítem').click();
    await settle(fixture);
    const del = http.expectOne(`${TEST_API}/inventory/items/1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);
    http.expectOne((r) => r.url === `${TEST_API}/inventory/items`).flush(apiPage([]));
    http.expectOne(`${TEST_API}/inventory/kpis`).flush({ ...kpis, totalItems: 0 });
    await settle(fixture);
  });

  it('ítems: "Ver kárdex" navega a los movimientos del ítem', async () => {
    const { fixture, el } = setup(ItemsPage);
    await loadItems(fixture);
    button(el, 'Ver kárdex').click();
    expect(navigate).toHaveBeenCalledWith(['/admin/inventario', 'items', 1, 'movimientos']);
  });

  it('ítems: un ítem inactivo no ofrece movimientos ni edición', async () => {
    const { fixture, el } = setup(ItemsPage);
    await loadItems(fixture, [item({ isActive: false })]);
    expect(el.querySelector('button[aria-label="Registrar movimiento"]')).toBeNull();
    expect(el.querySelector('button[aria-label="Editar ítem"]')).toBeNull();
    expect(el.querySelector('button[aria-label="Ver kárdex"]')).not.toBeNull();
  });

  // ---- Kárdex ----
  async function loadKardex(fixture: ComponentFixture<unknown>) {
    await settle(fixture);
    http.expectOne(`${TEST_API}/inventory/items/1`).flush(item());
    http
      .expectOne((r) => r.url === `${TEST_API}/inventory/items/1/movements`)
      .flush(
        apiPage([
          movement({
            id: 2,
            type: 'salida',
            quantity: -3,
            balanceAfter: 2,
            totalCost: 60000,
            reason: 'Venta',
            createdAt: '2026-10-10T15:00:00Z',
          }),
          movement(),
        ]),
      );
    http.expectOne(`${TEST_API}/inventory/categories`).flush([]);
    await settle(fixture);
  }

  it('kárdex: muestra los movimientos con signo', async () => {
    const { fixture, el } = setup(KardexPage, { id: '1' });
    await loadKardex(fixture);
    expect(el.textContent).toContain('Kárdex: Camiseta');
    expect(el.textContent).toContain('-3');
    expect(el.textContent).toContain('+5');
    expect(el.textContent).toContain('Stock inicial');
    expect(el.textContent).toContain('Venta');
  });

  it('kárdex: paginar consulta la página pedida', async () => {
    const { fixture } = setup(KardexPage, { id: '1' });
    await loadKardex(fixture);
    (
      fixture.componentInstance as unknown as {
        onPage(c: { page: number; pageSize: number }): void;
      }
    ).onPage({ page: 2, pageSize: 20 });
    await settle(fixture);
    const req = http.expectOne((r) => r.url === `${TEST_API}/inventory/items/1/movements`);
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ items: [], total: 22, page: 2, limit: 20 });
    await settle(fixture);
  });

  it('kárdex: tras registrar un movimiento recarga ítem y kárdex una sola vez', async () => {
    const { fixture } = setup(KardexPage, { id: '1' });
    await loadKardex(fixture);
    (fixture.componentInstance as unknown as { refresh(): void }).refresh();
    await settle(fixture);
    http.expectOne(`${TEST_API}/inventory/items/1`).flush(item({ stock: 7 }));
    const reloads = http.match((r) => r.url === `${TEST_API}/inventory/items/1/movements`);
    expect(reloads.length).toBe(1);
    expect(reloads[0].request.params.get('page')).toBe('1');
    reloads[0].flush(apiPage([]));
    await settle(fixture);
  });

  it('kárdex: error al cargar el ítem', async () => {
    const { fixture, el } = setup(KardexPage, { id: '1' });
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/inventory/items/1`)
      .flush(
        { statusCode: 404, code: 'NOT_FOUND', message: 'Ítem no encontrado' },
        { status: 404, statusText: 'Not Found' },
      );
    http.expectOne((r) => r.url === `${TEST_API}/inventory/items/1/movements`).flush(apiPage([]));
    http.expectOne(`${TEST_API}/inventory/categories`).flush([]);
    await settle(fixture);
    expect(el.textContent).toContain('No se pudo cargar el ítem');
  });

  // ---- Diálogo de movimiento ----
  type MovementApi = {
    form: {
      patchValue(v: object): void;
      valid: boolean;
      controls: { reason: { setValue(v: string): void }; type: { setValue(v: string): void } };
    };
    save(): Promise<void>;
    serverError(): string | null;
  };

  async function openMovement(type: 'entrada' | 'salida' | 'ajuste') {
    const ctx = setup(StockMovementDialog);
    ctx.fixture.componentRef.setInput('item', item());
    ctx.fixture.componentRef.setInput('initialType', type);
    ctx.fixture.componentInstance.open.set(true);
    await settle(ctx.fixture);
    return { ...ctx, dialog: ctx.fixture.componentInstance as unknown as MovementApi };
  }

  it('movimiento: el ajuste exige motivo', async () => {
    const { fixture, dialog } = await openMovement('ajuste');
    dialog.form.patchValue({ quantity: 4 });
    expect(dialog.form.valid).toBe(false);
    dialog.form.controls.reason.setValue('Conteo físico');
    expect(dialog.form.valid).toBe(true);
    const saving = dialog.save();
    const req = http.expectOne(`${TEST_API}/inventory/items/1/movements`);
    expect(req.request.body).toEqual({ type: 'ajuste', quantity: 4, reason: 'Conteo físico' });
    req.flush({
      item: item({ stock: 4 }),
      movement: {},
      message: 'Ajuste de 2 unidades registrada. Stock actual: 4',
    });
    await saving;
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('movimiento: la entrada envía costo unitario; cantidad entera y ≥ 1', async () => {
    const { dialog } = await openMovement('entrada');
    dialog.form.patchValue({ quantity: 0 });
    expect(dialog.form.valid).toBe(false);
    dialog.form.patchValue({ quantity: 1.5 });
    expect(dialog.form.valid).toBe(false);
    dialog.form.patchValue({ quantity: 10, unitCost: 18000 });
    expect(dialog.form.valid).toBe(true);
    const saving = dialog.save();
    const req = http.expectOne(`${TEST_API}/inventory/items/1/movements`);
    expect(req.request.body).toEqual({ type: 'entrada', quantity: 10, unitCost: 18000 });
    req.flush({ item: item({ stock: 12 }), movement: {}, message: 'Entrada registrada.' });
    await saving;
  });

  it('movimiento: la salida no envía costo y muestra el error de la API', async () => {
    const { dialog } = await openMovement('entrada');
    dialog.form.controls.type.setValue('salida');
    dialog.form.patchValue({ quantity: 9, unitCost: 1000 });
    const saving = dialog.save();
    const req = http.expectOne(`${TEST_API}/inventory/items/1/movements`);
    expect(req.request.body).toEqual({ type: 'salida', quantity: 9 });
    req.flush(
      { statusCode: 422, code: 'UNPROCESSABLE', message: 'Stock insuficiente: disponible 2.' },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await saving;
    expect(dialog.serverError()).toBe('Stock insuficiente: disponible 2.');
  });

  // ---- Diálogo de ítem ----
  type ItemFormApi = {
    form: { patchValue(v: object): void; valid: boolean };
    save(): Promise<void>;
  };

  it('ítem: crear envía stock inicial; editar no', async () => {
    const { fixture } = setup(ItemFormDialog);
    fixture.componentInstance.open.set(true);
    await settle(fixture);
    const dialog = fixture.componentInstance as unknown as ItemFormApi;
    expect(dialog.form.valid).toBe(false);
    dialog.form.patchValue({
      name: ' Pantalón ',
      sku: 'UNI-02',
      unitCost: 30000,
      salePrice: 45000,
      initialStock: 10,
    });
    let saving = dialog.save();
    let req = http.expectOne(`${TEST_API}/inventory/items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      name: 'Pantalón',
      sku: 'UNI-02',
      categoryId: null,
      unit: 'und',
      unitCost: 30000,
      salePrice: 45000,
      minStock: 5,
      initialStock: 10,
    });
    req.flush(item({ id: 2 }));
    await saving;
    expect(fixture.componentInstance.open()).toBe(false);

    fixture.componentRef.setInput('item', item({ location: 'Bodega 1' }));
    fixture.componentInstance.open.set(true);
    await settle(fixture);
    dialog.form.patchValue({ salePrice: 32000 });
    saving = dialog.save();
    req = http.expectOne(`${TEST_API}/inventory/items/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.initialStock).toBeUndefined();
    expect(req.request.body.salePrice).toBe(32000);
    expect(req.request.body.location).toBe('Bodega 1');
    req.flush(item({ salePrice: 32000 }));
    await saving;
  });

  // ---- Categorías ----
  it('categorías: lista, crea y elimina tras confirmar', async () => {
    const { fixture, el } = setup(CategoriesPage);
    await settle(fixture);
    http.expectOne(`${TEST_API}/inventory/categories`).flush([{ id: 1, name: 'Uniformes' }]);
    await settle(fixture);
    expect(el.textContent).toContain('Uniformes');

    const page = fixture.componentInstance as unknown as {
      openForm(): void;
      form: { setValue(v: object): void };
      save(): Promise<void>;
      open(): boolean;
    };
    page.openForm();
    page.form.setValue({ name: '  Útiles  ' });
    const saving = page.save();
    const post = http.expectOne(`${TEST_API}/inventory/categories`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ name: 'Útiles' });
    post.flush({ id: 2, name: 'Útiles' });
    await saving;
    expect(page.open()).toBe(false);
    await settle(fixture);
    http.expectOne(`${TEST_API}/inventory/categories`).flush([
      { id: 1, name: 'Uniformes' },
      { id: 2, name: 'Útiles' },
    ]);
    await settle(fixture);

    button(el, 'Eliminar').click();
    await settle(fixture);
    const del = http.expectOne(`${TEST_API}/inventory/categories/1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
    await settle(fixture);
    http.expectOne(`${TEST_API}/inventory/categories`).flush([{ id: 2, name: 'Útiles' }]);
  });

  it('categorías: renombrar muestra el error de la API (nombre duplicado)', async () => {
    const { fixture } = setup(CategoriesPage);
    await settle(fixture);
    http.expectOne(`${TEST_API}/inventory/categories`).flush([{ id: 1, name: 'Uniformes' }]);
    const page = fixture.componentInstance as unknown as {
      openForm(c: { id: number; name: string }): void;
      form: { setValue(v: object): void };
      save(): Promise<void>;
      serverError(): string | null;
      open(): boolean;
    };
    page.openForm({ id: 1, name: 'Uniformes' });
    page.form.setValue({ name: 'Útiles' });
    const saving = page.save();
    const req = http.expectOne(`${TEST_API}/inventory/categories/1`);
    expect(req.request.method).toBe('PATCH');
    req.flush(
      { statusCode: 409, code: 'CONFLICT', message: 'Ya existe una categoría con ese nombre.' },
      { status: 409, statusText: 'Conflict' },
    );
    await saving;
    expect(page.serverError()).toBe('Ya existe una categoría con ese nombre.');
    expect(page.open()).toBe(true);
  });

  // ---- Alertas ----
  it('alertas: separa agotados y stock bajo; la acción abre el registro de entrada', async () => {
    const { fixture, el } = setup(StockAlertsPage);
    await settle(fixture);
    http.expectOne(`${TEST_API}/inventory/alerts`).flush({
      outOfStock: [item({ id: 3, name: 'Cuaderno', stock: 0, stockStatus: 'out' })],
      lowStock: [item(), item({ id: 4, name: 'Lápiz' })],
    });
    await settle(fixture);
    expect(el.querySelector('#out-title')?.textContent).toContain('Agotados (1)');
    expect(el.querySelector('#low-title')?.textContent).toContain('Stock bajo (2)');
    expect(el.textContent).toContain('Cuaderno');

    button(el, 'Registrar entrada').click();
    await settle(fixture);
    const page = fixture.componentInstance as unknown as {
      moveOpen(): boolean;
      moving(): InventoryItem | null;
    };
    expect(page.moveOpen()).toBe(true);
    expect(page.moving()?.id).toBe(3);

    button(el, 'Ver kárdex').click();
    expect(navigate).toHaveBeenCalledWith(['/admin/inventario', 'items', 3, 'movimientos']);
  });

  // ---- Valoración ----
  it('valoración: totales, tabla por categoría e imprimible', async () => {
    const { fixture, el } = setup(ValuationPage);
    await settle(fixture);
    http.expectOne(`${TEST_API}/inventory/valuation`).flush({
      categories: [
        { categoryId: 1, categoryName: 'Uniformes', items: 2, units: 10, value: 200000 },
        { categoryId: null, categoryName: 'Sin categoría', items: 1, units: 0, value: 0 },
      ],
      totalUnits: 10,
      totalValue: 200000,
    });
    await settle(fixture);
    expect(el.querySelector('ui-stat-card .value')?.textContent).toContain('200.000');
    expect(el.querySelectorAll('table.simple-table tbody tr').length).toBe(2);
    expect(el.textContent).toContain('Sin categoría');
    expect(el.querySelector('ui-printable-sheet')).not.toBeNull();
    expect(el.querySelector('ui-donut-chart')).not.toBeNull();
  });

  it('valoración: estado vacío sin ítems con stock', async () => {
    const { fixture, el } = setup(ValuationPage);
    await settle(fixture);
    http
      .expectOne(`${TEST_API}/inventory/valuation`)
      .flush({ categories: [], totalUnits: 0, totalValue: 0 });
    await settle(fixture);
    expect(el.textContent).toContain('No hay ítems activos con stock');
    expect(el.querySelector('ui-donut-chart')).toBeNull();
  });
});
