import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiIcon } from '../icon/icon';
import { UiSpinner } from '../spinner/spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Botón sobre el elemento nativo (`<button ui-button>` o `<a ui-button>`), así
 * conserva semántica, foco y `type`. Con `loading` se deshabilita y muestra un spinner.
 *
 * ```html
 * <button ui-button variant="primary" icon="plus" (click)="crear()">Nuevo</button>
 * <button ui-button variant="ghost" icon="trash" iconOnly aria-label="Eliminar"></button>
 * ```
 */
@Component({
  selector: 'button[ui-button], a[ui-button]',
  imports: [UiIcon, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-button',
    '[class.ui-button--primary]': 'variant() === "primary"',
    '[class.ui-button--secondary]': 'variant() === "secondary"',
    '[class.ui-button--ghost]': 'variant() === "ghost"',
    '[class.ui-button--danger]': 'variant() === "danger"',
    '[class.ui-button--success]': 'variant() === "success"',
    '[class.ui-button--xs]': 'size() === "xs"',
    '[class.ui-button--sm]': 'size() === "sm"',
    '[class.ui-button--lg]': 'size() === "lg"',
    '[class.ui-button--block]': 'block()',
    '[class.ui-button--icon-only]': 'iconOnly()',
    '[attr.aria-busy]': 'loading() || null',
    '[attr.disabled]': 'loading() || disabled() ? "" : null',
    '[attr.aria-disabled]': 'loading() || disabled() || null',
  },
  template: `
    @if (loading()) {
      <ui-spinner size="sm" label="Procesando…" />
    } @else if (icon()) {
      <ui-icon [name]="icon()!" [size]="iconSize()" />
    }
    <ng-content />
    @if (iconRight() && !loading()) {
      <ui-icon [name]="iconRight()!" [size]="iconSize()" />
    }
  `,
  styleUrl: './button.scss',
})
export class UiButton {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  readonly icon = input<string | null>(null);
  readonly iconRight = input<string | null>(null);
  readonly loading = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly block = input(false, { transform: booleanAttribute });
  readonly iconOnly = input(false, { transform: booleanAttribute });

  protected iconSize(): number {
    return { xs: 14, sm: 16, md: 18, lg: 20 }[this.size()];
  }
}
