import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  DateEsPipe,
  PageChange,
  UiAlert,
  UiEmptyState,
  UiPagination,
  UiSpinner,
} from '../../../../shared/ui';
import { AiChat } from '../../components/ai-chat';
import { MarkdownLitePipe } from '../../../../shared/ui';
import { AiService } from '../../data-access/ai.service';
import { PagedQuery } from '../../data-access/communications.models';
import { resourceValue } from '../../../../core/resource/resource-value';

/**
 * `/portal-empleado/historial-ia` y `/portal-estudiante/historial-ia`: chat con
 * el asistente y el historial propio de conversaciones (15 por página).
 */
@Component({
  selector: 'app-ai-history-page',
  imports: [AiChat, DateEsPipe, MarkdownLitePipe, UiAlert, UiEmptyState, UiPagination, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-history-page.html',
  styleUrl: '../comms.scss',
  styles: `
    .layout {
      display: grid;
      gap: var(--space-6);
      grid-template-columns: 1fr;
      align-items: start;
    }
    @media (min-width: 1024px) {
      .layout {
        grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
      }
    }
    .exchange {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .when {
      font-size: var(--text-xs);
      color: var(--color-text-subtle);
    }
    .question {
      font-weight: 600;
      color: var(--color-text-strong);
    }
    .answer {
      background: var(--color-surface-2);
      border-left: 3px solid var(--color-primary);
      border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4);
      font-size: var(--text-sm);
      line-height: 1.6;
      word-break: break-word;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
  `,
})
export class AiHistoryPage {
  /** Lectura segura de los resources en la plantilla (no lanza en estado de error). */
  protected readonly val = resourceValue;
  private readonly ai = inject(AiService);

  protected readonly query = signal<PagedQuery>({ page: 1, pageSize: 15 });
  protected readonly history = rxResource({
    params: () => this.query(),
    stream: ({ params }) => this.ai.myHistory(params),
  });

  protected onAnswered(): void {
    if ((this.query().page ?? 1) === 1) this.history.reload();
    else this.query.update((q) => ({ ...q, page: 1 }));
  }

  protected changePage(change: PageChange): void {
    this.query.set({ page: change.page, pageSize: change.pageSize });
  }
}
