/** Modelos del contexto Inventario (read models de `apreu-api/src/modules/inventory`). */

export type StockStatus = 'out' | 'low' | 'ok';
export type StockAlertFilter = 'any' | 'low' | 'out';
export type StockMovementType = 'inicial' | 'entrada' | 'salida' | 'ajuste';
export type ManualMovementType = Exclude<StockMovementType, 'inicial'>;

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  categoryId: number | null;
  categoryName: string | null;
  unit: string;
  unitCost: number;
  salePrice: number;
  stock: number;
  minStock: number;
  location: string | null;
  isActive: boolean;
  stockStatus: StockStatus;
  stockValue: number;
}

export interface InventoryCategory {
  id: number;
  name: string;
}

export interface StockMovement {
  id: number;
  itemId: number;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  unitCost: number;
  totalCost: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  userId: number | null;
  createdAt: string;
}

export interface ItemFilters {
  search?: string;
  categoryId?: number | null;
  alert?: StockAlertFilter | null;
  includeInactive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ItemRequest {
  name: string;
  sku: string;
  categoryId?: number | null;
  unit?: string;
  unitCost: number;
  salePrice: number;
  minStock: number;
  location?: string;
}

export interface CreateItemRequest extends ItemRequest {
  /** Se registra como movimiento "inicial". */
  initialStock?: number;
}

export interface StockMovementRequest {
  type: ManualMovementType;
  /** Unidades (entrada/salida) o stock contado (ajuste). */
  quantity: number;
  /** Solo entradas: recalcula el costo promedio. */
  unitCost?: number;
  reason?: string;
}

export interface StockMovementResult {
  item: InventoryItem;
  movement: StockMovement;
  message: string;
}

export interface InventoryKpis {
  totalItems: number;
  inventoryValue: number;
  lowStock: number;
  outOfStock: number;
}

export interface StockAlerts {
  outOfStock: InventoryItem[];
  lowStock: InventoryItem[];
}

export interface InventoryValuation {
  categories: {
    categoryId: number | null;
    categoryName: string;
    items: number;
    units: number;
    value: number;
  }[];
  totalUnits: number;
  totalValue: number;
}

export interface ApiPaginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  inicial: 'Stock inicial',
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  out: 'Sin stock',
  low: 'Stock bajo',
  ok: 'OK',
};

export const STOCK_STATUS_TONES: Record<StockStatus, 'danger' | 'warning' | 'success'> = {
  out: 'danger',
  low: 'warning',
  ok: 'success',
};

export const INVENTORY_BASE = '/admin/inventario';
