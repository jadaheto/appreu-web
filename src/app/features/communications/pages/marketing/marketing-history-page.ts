import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  DateEsPipe,
  PageChange,
  SelectOption,
  UiButton,
  UiEmptyState,
  UiFilterBar,
  UiFormField,
  UiInput,
  UiPagination,
  UiSearchBox,
  UiSelect,
  UiSpinner,
} from '../../../../shared/ui';
import { MarkdownLitePipe } from '../../../../shared/ui';
import { AiService } from '../../data-access/ai.service';
import { MarketingHistoryQuery, MarketingType } from '../../data-access/communications.models';
import { resourceValue } from '../../../../core/resource/resource-value';

/** `/admin/marketing/historial`: generaciones propias con filtros por texto, tipo y fecha. */
@Component({
  selector: 'app-marketing-history-page',
  imports: [
    FormsModule,
    RouterLink,
    DateEsPipe,
    MarkdownLitePipe,
    UiButton,
    UiEmptyState,
    UiFilterBar,
    UiFormField,
    UiInput,
    UiPagination,
    UiSearchBox,
    UiSelect,
    UiSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './marketing-history-page.html',
  styleUrl: './marketing.scss',
})
export class MarketingHistoryPage {
  /** Lectura segura de los resources en la plantilla (no lanza en estado de error). */
  protected readonly val = resourceValue;
  private readonly ai = inject(AiService);

  protected readonly types = rxResource({ stream: () => this.ai.marketingTypes() });
  protected readonly typeOptions = computed<SelectOption<MarketingType>[]>(() =>
    (resourceValue(this.types) ?? []).map((t) => ({
      value: t.type,
      label: `${t.icon} ${t.title}`,
    })),
  );

  protected readonly query = signal<MarketingHistoryQuery>({ page: 1, pageSize: 10 });
  protected readonly history = rxResource({
    params: () => this.query(),
    stream: ({ params }) => this.ai.marketingHistory(params),
  });

  protected search = '';
  protected type: MarketingType | null = null;
  protected date: string | null = null;
  protected readonly hasFilters = computed(() => {
    const q = this.query();
    return !!(q.search || q.type || q.date);
  });

  protected apply(): void {
    this.query.set({
      page: 1,
      pageSize: 10,
      search: this.search.trim() || null,
      type: this.type,
      date: this.date || null,
    });
  }

  protected clear(): void {
    this.search = '';
    this.type = null;
    this.date = null;
    this.apply();
  }

  protected changePage(change: PageChange): void {
    this.query.update((q) => ({ ...q, page: change.page, pageSize: change.pageSize }));
  }

  protected titleOf(type: string): string {
    const t = resourceValue(this.types)?.find((x) => x.type === type);
    return t ? `${t.icon} ${t.title}` : type;
  }

  protected crmEntries(data: Record<string, unknown>): { key: string; value: string }[] {
    return Object.entries(data ?? {}).map(([key, value]) => ({
      key: key.replace(/_/g, ' '),
      value: String(value),
    }));
  }
}
