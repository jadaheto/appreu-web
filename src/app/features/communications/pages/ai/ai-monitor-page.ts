import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ROLES, roleLabel } from '../../../../core';
import {
  DateEsPipe,
  DateRange,
  isRangeValid,
  PageChange,
  SelectOption,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiDateRange,
  UiFilterBar,
  UiFormField,
  UiModal,
  UiPagination,
  UiSearchBox,
  UiSelect,
} from '../../../../shared/ui';
import { MarkdownLitePipe } from '../../../../shared/ui';
import { AiService } from '../../data-access/ai.service';
import { ChatLog, ChatLogQuery } from '../../data-access/communications.models';
import { resourceValue } from '../../../../core/resource/resource-value';

/** `/admin/monitor-ia`: conversaciones del asistente IA de todo el colegio. */
@Component({
  selector: 'app-ai-monitor-page',
  imports: [
    FormsModule,
    DateEsPipe,
    MarkdownLitePipe,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiDateRange,
    UiFilterBar,
    UiFormField,
    UiModal,
    UiPagination,
    UiSearchBox,
    UiSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-monitor-page.html',
  styleUrl: '../comms.scss',
})
export class AiMonitorPage {
  /** Lectura segura de los resources en la plantilla (no lanza en estado de error). */
  protected readonly val = resourceValue;
  private readonly ai = inject(AiService);

  protected readonly query = signal<ChatLogQuery>({ page: 1, pageSize: 20 });
  protected readonly logs = rxResource({
    params: () => this.query(),
    stream: ({ params }) => this.ai.logs(params),
  });

  protected search = '';
  protected role: string | null = null;
  protected range: DateRange = { from: null, to: null };
  protected readonly rangeError = signal(false);
  protected readonly roleOptions: SelectOption<string>[] = ROLES.map((r) => ({
    value: r,
    label: roleLabel(r),
  }));
  protected readonly hasFilters = computed(() => {
    const q = this.query();
    return !!(q.search || q.role || q.from || q.to);
  });

  protected readonly columns: TableColumn<ChatLog>[] = [
    { key: 'createdAt', header: 'Fecha y hora', width: '10rem' },
    { key: 'userName', header: 'Usuario' },
    { key: 'role', header: 'Rol', width: '8rem', hideBelow: 'md' },
    { key: 'userMessage', header: 'Pregunta' },
    { key: 'aiResponse', header: 'Respuesta', hideBelow: 'lg' },
  ];
  protected readonly actions: TableAction<ChatLog>[] = [
    { id: 'view', label: 'Ver conversación completa', icon: 'eye' },
  ];
  protected readonly selected = signal<ChatLog | null>(null);
  protected readonly detailOpen = signal(false);
  protected readonly roleLabel = roleLabel;

  protected apply(): void {
    if (!isRangeValid(this.range)) {
      this.rangeError.set(true);
      return;
    }
    this.rangeError.set(false);
    this.query.set({
      page: 1,
      pageSize: this.query().pageSize,
      search: this.search.trim() || null,
      role: this.role,
      from: this.range.from,
      to: this.range.to,
    });
  }

  protected clear(): void {
    this.search = '';
    this.role = null;
    this.range = { from: null, to: null };
    this.apply();
  }

  protected changePage(change: PageChange): void {
    this.query.update((q) => ({ ...q, page: change.page, pageSize: change.pageSize }));
  }

  protected onAction(event: TableActionEvent<ChatLog>): void {
    this.selected.set(event.row);
    this.detailOpen.set(true);
  }

  protected excerpt(text: string | null, max: number): string {
    if (!text) return '—';
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }
}
