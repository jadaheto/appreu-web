import { Routes } from '@angular/router';

/** Rutas solo de desarrollo: catálogo de componentes en `/dev/ui`. */
export const DEV_ROUTES: Routes = [
  {
    path: 'dev/ui',
    title: 'Catálogo UI',
    loadComponent: () => import('./pages/ui-catalog/ui-catalog-page').then((m) => m.UiCatalogPage),
  },
];
