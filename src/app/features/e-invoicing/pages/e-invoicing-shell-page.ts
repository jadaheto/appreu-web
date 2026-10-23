import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { TabItem, UiTabs } from '../../../shared/ui';

/** Sección de la URL (`/admin/facturacion/<seccion>`) → pestaña. */
const SECTION_TAB: Record<string, string> = {
  '': 'documentos',
  documentos: 'documentos',
  nueva: 'nueva',
  configuracion: 'configuracion',
  habilitacion: 'habilitacion',
  diagnostico: 'diagnostico',
};

const TAB_PATH: Record<string, string> = {
  documentos: '.',
  nueva: 'nueva',
  configuracion: 'configuracion',
  habilitacion: 'habilitacion',
  diagnostico: 'diagnostico',
};

/** Contenedor de `/admin/facturacion`: pestañas de navegación + página hija. */
@Component({
  selector: 'app-e-invoicing-shell-page',
  imports: [UiTabs, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-tabs
      class="no-print"
      ariaLabel="Facturación electrónica"
      [tabs]="tabs"
      [active]="active()"
      (activeChange)="go($event)"
    >
      <div class="content"><router-outlet /></div>
    </ui-tabs>
  `,
  styles: `
    .content {
      padding-top: var(--space-5);
    }
  `,
})
export class EInvoicingShellPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs: TabItem[] = [
    { id: 'documentos', label: 'Documentos', icon: 'document-text' },
    { id: 'nueva', label: 'Emitir factura', icon: 'plus' },
    { id: 'configuracion', label: 'Emisor y numeración', icon: 'cog' },
    { id: 'habilitacion', label: 'Habilitación', icon: 'shield-check' },
    { id: 'diagnostico', label: 'Diagnóstico', icon: 'cpu-chip' },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly active = computed(() => {
    this.url(); // recalcular con cada navegación
    const section = this.route.snapshot.firstChild?.url[0]?.path ?? '';
    return SECTION_TAB[section] ?? 'documentos';
  });

  protected go(tab: string | null): void {
    if (!tab) return;
    void this.router.navigate([TAB_PATH[tab] ?? '.'], { relativeTo: this.route });
  }
}
