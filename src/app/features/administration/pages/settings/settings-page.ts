import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core';
import { TabItem, UiAlert, UiSpinner, UiTabs } from '../../../../shared/ui';
import { InstitutionForm } from '../../components/institution-form';
import { SettingsSectionForm } from '../../components/settings-section-form';
import { InstitutionService } from '../../data-access/institution.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const INSTITUTION_TAB = 'institution';

const SECTION_ICONS: Record<string, string> = {
  academic: 'academic-cap',
  'invoice-email': 'envelope',
  payments: 'wallet',
  payroll: 'briefcase',
  branding: 'sun',
  modules: 'squares',
  integrations: 'chat-bubble',
  ai: 'cpu-chip',
};

/**
 * `/admin/configuracion`: datos de la institución y pestañas generadas desde
 * `GET /api/institution/settings` (solo las secciones que el rol puede editar).
 * La configuración DIAN vive en el feature de facturación electrónica.
 */
@Component({
  selector: 'app-settings-page',
  imports: [InstitutionForm, SettingsSectionForm, UiAlert, UiSpinner, UiTabs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Configuración del sistema</h1>
        <p class="page-header__subtitle">Parámetros generales de la institución.</p>
      </div>
    </div>

    @if (catalog.error()) {
      <ui-alert tone="error" title="No se pudo cargar la configuración" class="mb">
        Intenta recargar la página.
      </ui-alert>
    }

    <ui-tabs
      variant="vertical"
      ariaLabel="Secciones de configuración"
      [tabs]="tabs()"
      [active]="active()"
      (activeChange)="select($event)"
    >
      <div class="ui-card panel">
        @if (active() === institutionTab) {
          <app-institution-form [canEdit]="isAdmin()" />
        } @else if (current(); as section) {
          <!-- Se recrea el formulario por sección (track por clave) para no mezclar controles. -->
          @for (s of [section]; track s.key) {
            <app-settings-section-form [meta]="s" />
          }
        } @else if (catalog.isLoading()) {
          <ui-spinner size="lg" />
        }
      </div>
    </ui-tabs>
  `,
  styles: `
    .mb {
      margin-bottom: var(--space-6);
    }
    .panel {
      min-width: 0;
    }
  `,
})
export class SettingsPage {
  private readonly institution = inject(InstitutionService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Query param `?tab=` (enlaces desde otros módulos, p. ej. `?tab=ai`). */
  readonly tab = input<string | null>(null);

  protected readonly institutionTab = INSTITUTION_TAB;
  protected readonly isAdmin = computed(() => this.auth.hasRole('admin'));
  protected readonly catalog = rxResource({ stream: () => this.institution.catalog() });

  protected readonly tabs = computed<TabItem[]>(() => [
    { id: INSTITUTION_TAB, label: 'Institución / RUT', icon: 'building' },
    ...(resourceValue(this.catalog) ?? []).map((s) => ({
      id: s.key,
      label: s.label,
      icon: SECTION_ICONS[s.key] ?? 'cog',
    })),
  ]);

  protected readonly active = linkedSignal<string>(() => {
    const wanted = this.tab();
    // Mientras carga el catálogo se respeta `?tab=`: evita mostrar (y cargar) la
    // pestaña de institución un instante antes de saltar a la sección pedida.
    if (wanted && this.catalog.isLoading()) return wanted;
    const ids = this.tabs().map((t) => t.id);
    return wanted && ids.includes(wanted) ? wanted : INSTITUTION_TAB;
  });

  protected readonly current = computed(
    () => (resourceValue(this.catalog) ?? []).find((s) => s.key === this.active()) ?? null,
  );

  protected select(id: string | null): void {
    const tab = id ?? INSTITUTION_TAB;
    this.active.set(tab);
    void this.router.navigate([], {
      queryParams: { tab: tab === INSTITUTION_TAB ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
