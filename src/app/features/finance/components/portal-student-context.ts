import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injectable,
  input,
  model,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { SelectOption, UiSelect } from '../../../shared/ui';
import type { BillingStudent } from '../data-access/finance.models';
import { FinanceService } from '../data-access/finance.service';
import { resourceValue } from '../../../core/resource/resource-value';

const STORAGE_KEY = 'apreu.finance.portalStudent';

function readStored(): number | null {
  try {
    const v = Number(sessionStorage.getItem(STORAGE_KEY));
    return Number.isInteger(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/**
 * Estudiantes vinculados al usuario del portal (`GET /api/finance/portal/students`)
 * y el seleccionado (acudientes con varios hijos). Se provee en las rutas de "Pagos" y
 * "Facturas" del portal; la elección se recuerda en `sessionStorage`.
 */
@Injectable()
export class PortalStudentContext {
  private readonly finance = inject(FinanceService);
  private readonly preferred = signal<number | null>(readStored());

  readonly students = rxResource({ stream: () => this.finance.myStudents() });
  readonly list = computed(() => resourceValue(this.students, []));
  /** Estudiante activo: el elegido si sigue vinculado; si no, el primero. */
  readonly current = computed<BillingStudent | null>(() => {
    const list = this.list();
    return list.find((s) => s.id === this.preferred()) ?? list[0] ?? null;
  });

  select(id: number | null): void {
    this.preferred.set(id);
    try {
      if (id) sessionStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      /* almacenamiento no disponible */
    }
  }
}

/** Selector de hijo (solo se muestra si hay más de un estudiante vinculado). */
@Component({
  selector: 'app-portal-student-picker',
  imports: [FormsModule, UiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (students().length > 1) {
      <label class="picker">
        <span>Estudiante</span>
        <ui-select
          ariaLabel="Seleccionar estudiante"
          [placeholder]="null"
          [options]="options()"
          [ngModel]="selected()"
          (ngModelChange)="selected.set($event)"
        />
      </label>
    }
  `,
  styles: `
    .picker {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: var(--color-text-muted);
    }
    ui-select {
      min-width: 14rem;
    }
  `,
})
export class PortalStudentPicker {
  readonly students = input<readonly BillingStudent[]>([]);
  readonly selected = model<number | null>(null);
  protected readonly options = computed<SelectOption<number>[]>(() =>
    this.students().map((s) => ({
      value: s.id,
      label: `${s.fullName}${s.gradeName ? ' · ' + s.gradeName : ''}`,
    })),
  );
}
