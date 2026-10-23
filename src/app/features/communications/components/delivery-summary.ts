import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AlertTone, UiAlert } from '../../../shared/ui';
import type { DeliverySummary } from '../data-access/communications.models';

/** Resultado de un envío masivo: enviados, fallidos, omitidos y detalle de fallos. */
@Component({
  selector: 'app-delivery-summary',
  imports: [UiAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-alert [tone]="tone()" [title]="title()">
      <p>
        <strong>{{ summary().sent }}</strong> enviado(s) de {{ summary().total }}
        @if (summary().failed) {
          · <strong>{{ summary().failed }}</strong> fallido(s)
        }
        @if (summary().skipped) {
          · {{ summary().skipped }} sin dato de contacto
        }
      </p>
      @if (summary().failures.length) {
        <details>
          <summary>Ver fallos ({{ summary().failures.length }})</summary>
          <ul>
            @for (f of summary().failures; track $index) {
              <li>
                <span class="font-mono">{{ f.to }}</span
                >: {{ f.error }}
              </li>
            }
          </ul>
        </details>
      }
    </ui-alert>
  `,
  styles: `
    details {
      margin-top: 0.35rem;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    ul {
      margin: 0.35rem 0 0 1rem;
      max-height: 10rem;
      overflow-y: auto;
    }
  `,
})
export class DeliverySummaryView {
  readonly summary = input.required<DeliverySummary>();
  readonly label = input('Envío');

  protected readonly tone = computed<AlertTone>(() => {
    const s = this.summary();
    if (s.sent === 0 && s.total > 0) return 'error';
    return s.failed || s.skipped ? 'warning' : 'success';
  });
  protected readonly title = computed(() => `${this.label()} finalizado`);
}
