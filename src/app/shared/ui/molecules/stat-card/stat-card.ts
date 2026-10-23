import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiIcon } from '../../atoms/icon/icon';
import { UiSpinner } from '../../atoms/spinner/spinner';

export type StatTone = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';

/**
 * Tarjeta KPI. Variante `icon` (ícono en cuadro con degradado, dashboard admin)
 * o `border` (borde lateral de color, listados). `delta` muestra ±x.x %.
 */
@Component({
  selector: 'ui-stat-card',
  imports: [UiIcon, UiSpinner, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-stat-card', '[class]': '"tone-" + tone() + " variant-" + variant()' },
  template: `
    <div class="body">
      <p class="label">{{ label() }}</p>
      @if (loading()) {
        <ui-spinner size="sm" />
      } @else {
        <p class="value font-mono">{{ value() ?? '—' }}</p>
      }
      @if (hint() || deltaText()) {
        <p class="hint">
          @if (deltaText()) {
            <span class="delta" [class.up]="(delta() ?? 0) > 0" [class.down]="(delta() ?? 0) < 0">{{
              deltaText()
            }}</span>
          }
          {{ hint() }}
        </p>
      }
      @if (link() && linkLabel()) {
        <a class="link" [routerLink]="link()">{{ linkLabel() }} →</a>
      }
    </div>
    @if (icon() && variant() === 'icon') {
      <span class="icon" aria-hidden="true"><ui-icon [name]="icon()!" [size]="22" /></span>
    }
  `,
  styleUrl: './stat-card.scss',
})
export class UiStatCard {
  readonly label = input.required<string>();
  readonly value = input<string | number | null>(null);
  readonly hint = input('');
  readonly icon = input<string | null>(null);
  readonly tone = input<StatTone>('primary');
  readonly variant = input<'icon' | 'border'>('icon');
  /** Variación porcentual respecto al período anterior. */
  readonly delta = input<number | null>(null);
  readonly link = input<string | null>(null);
  readonly linkLabel = input('');
  readonly loading = input(false, { transform: booleanAttribute });

  protected readonly deltaText = computed(() => {
    const d = this.delta();
    if (d === null || !Number.isFinite(d)) return '';
    return `${d > 0 ? '+' : ''}${d.toFixed(1)} %`;
  });
}
