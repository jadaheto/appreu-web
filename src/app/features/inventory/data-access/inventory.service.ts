import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient, Page } from '../../../core';
import {
  ApiPaginated,
  CreateItemRequest,
  InventoryCategory,
  InventoryItem,
  InventoryKpis,
  InventoryValuation,
  ItemFilters,
  ItemRequest,
  StockAlerts,
  StockMovement,
  StockMovementRequest,
  StockMovementResult,
} from './inventory.models';

const toPage = <T>(p: ApiPaginated<T>): Page<T> => ({
  items: p.items,
  total: p.total,
  page: p.page,
  pageSize: p.limit,
});

/** Cliente HTTP de `/api/inventory/**` (solo administradores). */
@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly api = inject(ApiClient);

  items(filters: ItemFilters = {}): Observable<Page<InventoryItem>> {
    const { pageSize, ...rest } = filters;
    return this.api
      .get<ApiPaginated<InventoryItem>>('inventory/items', { params: { ...rest, limit: pageSize } })
      .pipe(map(toPage));
  }
  item(id: number): Observable<InventoryItem> {
    return this.api.get<InventoryItem>(`inventory/items/${id}`);
  }
  createItem(dto: CreateItemRequest): Observable<InventoryItem> {
    return this.api.post<InventoryItem>('inventory/items', dto);
  }
  updateItem(id: number, dto: ItemRequest): Observable<InventoryItem> {
    return this.api.patch<InventoryItem>(`inventory/items/${id}`, dto);
  }
  deactivateItem(id: number): Observable<void> {
    return this.api.delete<void>(`inventory/items/${id}`);
  }
  registerMovement(itemId: number, dto: StockMovementRequest): Observable<StockMovementResult> {
    return this.api.post<StockMovementResult>(`inventory/items/${itemId}/movements`, dto);
  }
  movements(
    itemId: number,
    page: { page?: number; pageSize?: number } = {},
  ): Observable<Page<StockMovement>> {
    return this.api
      .get<ApiPaginated<StockMovement>>(`inventory/items/${itemId}/movements`, {
        params: { page: page.page, limit: page.pageSize },
      })
      .pipe(map(toPage));
  }

  categories(): Observable<InventoryCategory[]> {
    return this.api.get<InventoryCategory[]>('inventory/categories');
  }
  createCategory(name: string): Observable<InventoryCategory> {
    return this.api.post<InventoryCategory>('inventory/categories', { name });
  }
  renameCategory(id: number, name: string): Observable<InventoryCategory> {
    return this.api.patch<InventoryCategory>(`inventory/categories/${id}`, { name });
  }
  deleteCategory(id: number): Observable<void> {
    return this.api.delete<void>(`inventory/categories/${id}`);
  }

  kpis(): Observable<InventoryKpis> {
    return this.api.get<InventoryKpis>('inventory/kpis');
  }
  alerts(): Observable<StockAlerts> {
    return this.api.get<StockAlerts>('inventory/alerts');
  }
  valuation(): Observable<InventoryValuation> {
    return this.api.get<InventoryValuation>('inventory/valuation');
  }
}
