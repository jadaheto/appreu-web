import { Routes } from '@angular/router';

/**
 * `/admin/inventario` — Inventario (solo administradores; el guard lo pone el portal).
 * Propiedad del feature `inventory`.
 */
export default [
  {
    path: '',
    loadComponent: () => import('../pages/inventory-shell-page').then((m) => m.InventoryShellPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Inventario',
        loadComponent: () => import('../pages/items/items-page').then((m) => m.ItemsPage),
      },
      {
        path: 'items/:id/movimientos',
        title: 'Kárdex',
        loadComponent: () => import('../pages/kardex/kardex-page').then((m) => m.KardexPage),
      },
      {
        path: 'alertas',
        title: 'Alertas de stock',
        loadComponent: () =>
          import('../pages/alerts/stock-alerts-page').then((m) => m.StockAlertsPage),
      },
      {
        path: 'valoracion',
        title: 'Valoración del inventario',
        loadComponent: () =>
          import('../pages/valuation/valuation-page').then((m) => m.ValuationPage),
      },
      {
        path: 'categorias',
        title: 'Categorías de inventario',
        loadComponent: () =>
          import('../pages/categories/categories-page').then((m) => m.CategoriesPage),
      },
      {
        path: '**',
        loadComponent: () =>
          import('../../errors/pages/not-found-page').then((m) => m.NotFoundPage),
      },
    ],
  },
] satisfies Routes;
