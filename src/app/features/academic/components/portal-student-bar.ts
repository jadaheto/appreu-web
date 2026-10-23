import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  UiAlert,
  UiAvatar,
  UiEmptyState,
  UiSelect,
  UiSpinner,
  type SelectOption,
} from '../../../shared/ui';
import { PortalContextService } from '../data-access/portal-context.service';

/**
 * Estudiante activo del portal estudiante/acudiente. Para acudientes con
 * varios hijos muestra un selector; el estudiante elegido se conserva entre
 * páginas (`PortalContextService`).
 */
@Component({
  selector: 'app-portal-student-bar',
  imports: [FormsModule, UiAlert, UiAvatar, UiEmptyState, UiSelect, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ctx.context.isLoading() && !ctx.students().length) {
      <div class="bar"><ui-spinner size="sm" label="Cargando estudiantes…" /></div>
    } @else if (ctx.context.error()) {
      <ui-alert tone="error" title="No se pudo cargar el estudiante">
        Intenta recargar la página.
      </ui-alert>
    } @else if (!ctx.students().length) {
      <section class="ui-card">
        <ui-empty-state
          icon="users"
          title="Sin estudiantes vinculados"
          message="Tu usuario no tiene estudiantes activos asociados. Comunícate con la institución."
        />
      </section>
    } @else if (ctx.selected(); as s) {
      <div class="bar ui-card">
        <ui-avatar [name]="s.fullName" size="md" />
        <div class="who">
          <p class="name">{{ s.fullName }}</p>
          <p class="text-muted meta">
            Código {{ s.code }}
            @if (s.placement; as p) {
              · {{ p.gradeName }} · Salón {{ p.classroomName }} · {{ p.academicYear }}
            }
          </p>
        </div>
        @if (ctx.students().length > 1) {
          <label class="picker">
            <span class="sr-only">Estudiante</span>
            <ui-select
              ariaLabel="Seleccionar estudiante"
              [placeholder]="null"
              [options]="options()"
              [ngModel]="ctx.selectedId()"
              (ngModelChange)="ctx.select($event)"
            />
          </label>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: var(--space-5);
    }
    .bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }
    .who {
      flex: 1 1 14rem;
      min-width: 0;
    }
    .name {
      font-weight: 700;
      color: var(--color-text-strong);
    }
    .meta {
      font-size: var(--text-sm);
    }
    .picker {
      flex: 0 1 18rem;
    }
  `,
})
export class PortalStudentBar {
  protected readonly ctx = inject(PortalContextService);
  protected readonly options = computed<SelectOption<number>[]>(() =>
    this.ctx.students().map((s) => ({
      value: s.id,
      label: s.placement ? `${s.fullName} · ${s.placement.gradeName}` : s.fullName,
    })),
  );
}
