import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, of } from 'rxjs';
import { UiButton, UiSearchBox, UiSpinner } from '../../../shared/ui';
import { StudentsService } from '../data-access/students.service';
import { resourceValue } from '../../../core/resource/resource-value';

export interface PickedStudent {
  id: number;
  fullName: string;
  code: string;
}

/**
 * Autocompletar de estudiantes (nombre, código o documento) sobre
 * `GET /api/students?search=`. Valor bidireccional `[(value)]`.
 */
@Component({
  selector: 'app-student-picker',
  imports: [UiButton, UiSearchBox, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (value(); as v) {
      <div class="picked">
        <span
          ><strong>{{ v.fullName }}</strong> <span class="font-mono muted">{{ v.code }}</span></span
        >
        @if (!locked()) {
          <button
            ui-button
            type="button"
            size="xs"
            variant="ghost"
            icon="x-mark"
            (click)="value.set(null)"
          >
            Quitar
          </button>
        }
      </div>
    } @else {
      <ui-search-box
        [placeholder]="placeholder()"
        [ariaLabel]="ariaLabel()"
        (search)="query.set($event)"
      />
      @if (query().length >= 2) {
        <div class="results" role="listbox" [attr.aria-label]="'Resultados para ' + query()">
          @if (results.isLoading()) {
            <ui-spinner size="sm" />
          } @else {
            @for (s of val(results) ?? []; track s.id) {
              <button
                type="button"
                role="option"
                aria-selected="false"
                class="option"
                (click)="value.set({ id: s.id, fullName: s.fullName, code: s.code })"
              >
                <span>{{ s.fullName }}</span>
                <span class="font-mono muted">{{ s.code }}</span>
              </button>
            } @empty {
              <p class="muted empty">Sin coincidencias.</p>
            }
          }
        </div>
      }
    }
  `,
  styles: `
    .picked {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface-2);
      font-size: var(--text-sm);
    }
    .muted {
      color: var(--color-text-muted);
      font-size: var(--text-xs);
    }
    .results {
      margin-top: 0.35rem;
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius-md);
      max-height: 14rem;
      overflow: auto;
      padding: 0.25rem;
    }
    .option {
      display: flex;
      width: 100%;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.45rem 0.6rem;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-text);
      font-size: var(--text-sm);
      text-align: left;
      cursor: pointer;
    }
    .option:hover,
    .option:focus-visible {
      background: var(--color-surface-hover);
    }
    .empty {
      padding: 0.5rem;
    }
  `,
})
export class StudentPicker {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly students = inject(StudentsService);

  readonly value = model<PickedStudent | null>(null);
  readonly locked = input(false);
  readonly placeholder = input('Buscar por nombre, código o documento…');
  readonly ariaLabel = input('Buscar estudiante');

  protected readonly query = signal('');
  protected readonly results = rxResource({
    params: () => this.query(),
    stream: ({ params }) =>
      params.length < 2
        ? of([])
        : this.students
            .list({ search: params, page: 1, pageSize: 8 })
            .pipe(map((page) => page.items)),
  });
}
