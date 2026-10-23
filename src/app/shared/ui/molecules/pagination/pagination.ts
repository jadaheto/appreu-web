import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiIcon } from '../../atoms/icon/icon';

export interface PageChange {
  page: number;
  pageSize: number;
}

/** Calcula los números de página visibles con elipsis (`0` = elipsis). */
export function pageWindow(current: number, totalPages: number, siblings = 1): number[] {
  if (totalPages <= 5 + siblings * 2) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = Math.max(2, current - siblings);
  const end = Math.min(totalPages - 1, current + siblings);
  const pages: number[] = [1];
  if (start > 2) pages.push(0);
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push(0);
  pages.push(totalPages);
  return pages;
}

/** Paginación numérica (página base 1) con resumen y selector de tamaño. */
@Component({
  selector: 'ui-pagination',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="summary" aria-live="polite">
      @if (total() > 0) {
        Mostrando <strong>{{ from() }}–{{ to() }}</strong> de <strong>{{ total() }}</strong>
      } @else {
        Sin resultados
      }
    </p>
    <div class="controls">
      @if (pageSizeOptions().length > 1) {
        <label class="size">
          <span class="sr-only">Registros por página</span>
          <select [value]="pageSize()" (change)="changeSize($any($event.target).value)">
            @for (s of pageSizeOptions(); track s) {
              <option [value]="s" [selected]="s === pageSize()">{{ s }} / pág.</option>
            }
          </select>
        </label>
      }
      <nav aria-label="Paginación">
        <button
          type="button"
          class="btn"
          [disabled]="page() <= 1"
          (click)="go(page() - 1)"
          aria-label="Página anterior"
        >
          <ui-icon name="chevron-left" [size]="16" />
        </button>
        @for (p of pages(); track $index) {
          @if (p === 0) {
            <span class="ellipsis" aria-hidden="true">…</span>
          } @else {
            <button
              type="button"
              class="btn"
              [class.active]="p === page()"
              [attr.aria-current]="p === page() ? 'page' : null"
              [attr.aria-label]="'Página ' + p"
              (click)="go(p)"
            >
              {{ p }}
            </button>
          }
        }
        <button
          type="button"
          class="btn"
          [disabled]="page() >= totalPages()"
          (click)="go(page() + 1)"
          aria-label="Página siguiente"
        >
          <ui-icon name="chevron-right" [size]="16" />
        </button>
      </nav>
    </div>
  `,
  styleUrl: './pagination.scss',
})
export class UiPagination {
  readonly page = input(1);
  readonly pageSize = input(20);
  readonly total = input(0);
  readonly pageSizeOptions = input<readonly number[]>([10, 20, 50, 100]);
  readonly pageChange = output<PageChange>();

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / Math.max(1, this.pageSize()))),
  );
  protected readonly pages = computed(() => pageWindow(this.page(), this.totalPages()));
  protected readonly from = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );
  protected readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));

  protected go(page: number): void {
    const target = Math.min(Math.max(1, page), this.totalPages());
    if (target !== this.page()) this.pageChange.emit({ page: target, pageSize: this.pageSize() });
  }

  protected changeSize(value: string): void {
    this.pageChange.emit({ page: 1, pageSize: Number(value) });
  }
}
