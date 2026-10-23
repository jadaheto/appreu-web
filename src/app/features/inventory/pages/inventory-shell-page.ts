import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouteTab, RouteTabs } from '../components/route-tabs';

/** Contenedor de Inventario: sub-navegación + página hija. */
@Component({
  selector: 'app-inventory-shell-page',
  imports: [RouterOutlet, RouteTabs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-route-tabs [tabs]="tabs" ariaLabel="Secciones de inventario" />
    <router-outlet />
  `,
})
export class InventoryShellPage {
  protected readonly tabs: RouteTab[] = [
    { label: 'Ítems', link: '.', icon: 'cube', exact: true },
    { label: 'Alertas', link: 'alertas', icon: 'exclamation-triangle' },
    { label: 'Valoración', link: 'valoracion', icon: 'chart-bar' },
    { label: 'Categorías', link: 'categorias', icon: 'tag' },
  ];
}
