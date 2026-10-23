import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';
import { UiIcon } from '../../atoms/icon/icon';
import { uniqueId } from '../../forms/form-control';

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number | null;
  disabled?: boolean;
}

/**
 * Pestañas accesibles (`role="tablist"`, flechas/Inicio/Fin). La página
 * decide el contenido del panel según `active`:
 *
 * ```html
 * <ui-tabs [tabs]="tabs" [(active)]="tab">
 *   @switch (tab()) { @case ('empresa') { ... } }
 * </ui-tabs>
 * ```
 * Variantes: `underline` (por defecto), `pill` (segmentada) y `vertical` (configuración).
 */
@Component({
  selector: 'ui-tabs',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': '"ui-tabs ui-tabs--" + variant()' },
  template: `
    <div
      class="list"
      role="tablist"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-orientation]="variant() === 'vertical' ? 'vertical' : 'horizontal'"
      (keydown)="onKeydown($event)"
    >
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          role="tab"
          class="tab"
          [id]="tabId(tab.id)"
          [attr.aria-selected]="tab.id === current()"
          [attr.aria-controls]="panelId"
          [attr.tabindex]="tab.id === current() ? 0 : -1"
          [disabled]="tab.disabled"
          [class.active]="tab.id === current()"
          (click)="select(tab)"
        >
          @if (tab.icon) {
            <ui-icon [name]="tab.icon" [size]="18" />
          }
          <span>{{ tab.label }}</span>
          @if (tab.badge !== undefined && tab.badge !== null && tab.badge !== '') {
            <span class="badge">{{ tab.badge }}</span>
          }
        </button>
      }
    </div>
    <div
      class="panel"
      role="tabpanel"
      [id]="panelId"
      [attr.aria-labelledby]="tabId(current())"
      tabindex="0"
    >
      <ng-content />
    </div>
  `,
  styleUrl: './tabs.scss',
})
export class UiTabs {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly baseId = uniqueId('ui-tabs');

  readonly tabs = input.required<readonly TabItem[]>();
  readonly active = model<string | null>(null);
  readonly variant = input<'underline' | 'pill' | 'vertical'>('underline');
  readonly ariaLabel = input('Secciones');

  protected readonly panelId = `${this.baseId}-panel`;
  /** Pestaña activa efectiva (la primera habilitada si no se indicó). */
  protected readonly current = computed(
    () => this.active() ?? this.tabs().find((t) => !t.disabled)?.id ?? null,
  );

  protected tabId(id: string | null): string {
    return `${this.baseId}-tab-${id ?? 'none'}`;
  }

  protected select(tab: TabItem): void {
    if (!tab.disabled) this.active.set(tab.id);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const enabled = this.tabs().filter((t) => !t.disabled);
    if (!enabled.length) return;
    const index = enabled.findIndex((t) => t.id === this.current());
    const vertical = this.variant() === 'vertical';
    const nextKeys = vertical ? ['ArrowDown'] : ['ArrowRight'];
    const prevKeys = vertical ? ['ArrowUp'] : ['ArrowLeft'];
    let target: TabItem | undefined;
    if (nextKeys.includes(event.key)) target = enabled[(index + 1) % enabled.length];
    else if (prevKeys.includes(event.key))
      target = enabled[(index - 1 + enabled.length) % enabled.length];
    else if (event.key === 'Home') target = enabled[0];
    else if (event.key === 'End') target = enabled[enabled.length - 1];
    if (!target) return;
    event.preventDefault();
    this.active.set(target.id);
    const id = this.tabId(target.id);
    queueMicrotask(() =>
      Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('[role=tab]'))
        .find((el) => el.id === id)
        ?.focus(),
    );
  }
}
