import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UiAlert, UiChip, UiEmptyState, UiSpinner } from '../../../shared/ui';
import { PortalContextStore } from '../data-access/portal-context.store';

/**
 * Envoltorio de las páginas del portal estudiante/acudiente: espera el
 * contexto (`GET /api/portal/context`), muestra el selector de hijo si el
 * acudiente tiene varios y el estado vacío si la cuenta no está vinculada.
 * Las páginas leen el estudiante activo de `PortalContextStore.selectedId()`.
 */
@Component({
  selector: 'app-portal-student-gate',
  imports: [UiAlert, UiChip, UiEmptyState, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.isLoading() && !store.students().length) {
      <div class="center"><ui-spinner size="lg" /></div>
    } @else if (store.error()) {
      <ui-alert tone="error" title="No se pudo cargar tu información">
        Intenta recargar la página. Si el problema continúa, comunícate con la secretaría.
      </ui-alert>
    } @else if (store.unlinked()) {
      <section class="ui-card">
        <ui-empty-state
          icon="user"
          title="No se encontró registro de estudiante"
          message="Tu cuenta no está vinculada a ningún estudiante activo. Comunícate con la secretaría del colegio."
        />
      </section>
    } @else {
      @if (store.hasMany()) {
        <div class="switcher" role="group" aria-label="Seleccionar estudiante">
          <span class="label">Estudiante:</span>
          @for (s of store.students(); track s.id) {
            <button ui-chip [active]="s.id === store.selectedId()" (click)="store.select(s.id)">
              {{ s.fullName }}
            </button>
          }
        </div>
      }
      <ng-content />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .center {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }
    .switcher {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }
    .label {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      font-weight: 600;
    }
    @media print {
      .switcher {
        display: none;
      }
    }
  `,
})
export class PortalStudentGate {
  protected readonly store = inject(PortalContextStore);
}
