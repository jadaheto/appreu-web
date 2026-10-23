import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';
import { encodeQr, qrSvgPath, QrErrorCorrection } from './qr-encoder';

const MARGIN = 4;

/**
 * Código QR en SVG generado en el cliente (sin librerías). Nítido al imprimir.
 *
 * ```html
 * <app-qr-code [value]="card.qr" [size]="96" label="QR del carnet" />
 * ```
 */
@Component({
  selector: 'app-qr-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-qr-code',
    role: 'img',
    '[attr.aria-label]': 'label()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
  template: `
    @if (matrix(); as m) {
      <svg
        [attr.viewBox]="'0 0 ' + (m.size + margin * 2) + ' ' + (m.size + margin * 2)"
        shape-rendering="crispEdges"
        aria-hidden="true"
        focusable="false"
      >
        <rect width="100%" height="100%" fill="#fff" />
        <path [attr.d]="path()" fill="#000" />
      </svg>
    } @else {
      <span class="error">QR no disponible</span>
    }
  `,
  styles: `
    :host {
      display: inline-block;
      line-height: 0;
    }
    svg {
      width: 100%;
      height: 100%;
    }
    .error {
      font-size: 0.65rem;
      line-height: 1.2;
      color: var(--color-text-muted);
    }
  `,
})
export class QrCode {
  readonly value = input.required<string>();
  readonly size = input(96, { transform: numberAttribute });
  readonly errorCorrection = input<QrErrorCorrection>('M');
  readonly label = input('Código QR');

  protected readonly margin = MARGIN;
  protected readonly matrix = computed(() => {
    const value = this.value();
    if (!value) return null;
    try {
      return encodeQr(value, this.errorCorrection());
    } catch {
      return null;
    }
  });
  protected readonly path = computed(() => {
    const m = this.matrix();
    return m ? qrSvgPath(m, MARGIN) : '';
  });
}
