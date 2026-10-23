import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface InfoItem {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  /** Ocupa toda la fila. */
  wide?: boolean;
  /** Resalta el valor (p. ej. grupo sanguíneo en rojo). */
  emphasis?: 'danger' | 'success';
}

/**
 * Lista de definición en rejilla (etiqueta pequeña en mayúsculas + valor).
 * Equivale al `DefinitionItem` del análisis 03 §4.0. Candidato a `shared/ui`.
 */
@Component({
  selector: 'app-info-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl [style.--cols]="columns()">
      @for (item of items(); track item.label) {
        <div [class.wide]="item.wide">
          <dt>{{ item.label }}</dt>
          <dd
            [class.font-mono]="item.mono"
            [class.danger]="item.emphasis === 'danger'"
            [class.success]="item.emphasis === 'success'"
          >
            {{
              item.value === null || item.value === undefined || item.value === ''
                ? '—'
                : item.value
            }}
          </dd>
        </div>
      }
    </dl>
  `,
  styles: `
    dl {
      display: grid;
      gap: 1rem 1.5rem;
      grid-template-columns: 1fr;
      margin: 0;
    }
    @media (min-width: 640px) {
      dl {
        grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr));
      }
      .wide {
        grid-column: 1 / -1;
      }
    }
    dt {
      font-size: var(--text-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-subtle);
    }
    dd {
      margin: 0.15rem 0 0;
      color: var(--color-text-strong);
      font-weight: 500;
      overflow-wrap: anywhere;
    }
    .danger {
      color: var(--color-danger);
      font-weight: 700;
    }
    .success {
      color: var(--color-success);
      font-weight: 700;
    }
  `,
})
export class InfoGrid {
  readonly items = input<readonly InfoItem[]>([]);
  readonly columns = input(2);
}
