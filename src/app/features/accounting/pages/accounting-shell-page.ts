import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouteTab, RouteTabs } from '../components/route-tabs';

/** Contenedor de Contabilidad: sub-navegación + página hija. */
@Component({
  selector: 'app-accounting-shell-page',
  imports: [RouterOutlet, RouteTabs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-route-tabs [tabs]="tabs" ariaLabel="Secciones de contabilidad" />
    <router-outlet />
  `,
})
export class AccountingShellPage {
  protected readonly tabs: RouteTab[] = [
    { label: 'Dashboard', link: '.', icon: 'home', exact: true },
    { label: 'Plan de cuentas', link: 'cuentas', icon: 'squares' },
    { label: 'Terceros', link: 'terceros', icon: 'identification' },
    { label: 'Periodos', link: 'periodos', icon: 'calendar' },
    { label: 'Comprobantes', link: 'asientos', icon: 'document-text' },
    { label: 'Reportes', link: 'reportes', icon: 'chart-bar' },
    { label: 'Contabilización automática', link: 'parametrizacion', icon: 'cog' },
  ];
}
