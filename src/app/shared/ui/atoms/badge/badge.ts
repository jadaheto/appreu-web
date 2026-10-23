import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'info';

/**
 * Mapa de estados frecuentes del dominio al tono visual (`.status-*` del legacy).
 * Las páginas pueden pasar `status="paid"` en lugar de elegir un tono.
 */
export const STATUS_TONES: Record<string, BadgeTone> = {
  active: 'success',
  paid: 'success',
  accepted: 'success',
  approved: 'success',
  open: 'success',
  delivered: 'success',
  read: 'success',
  posted: 'success',
  reconciled: 'success',
  verde: 'success',
  inactive: 'neutral',
  draft: 'neutral',
  cancelled: 'neutral',
  closed: 'neutral',
  voided: 'neutral',
  archived: 'neutral',
  overdue: 'danger',
  rejected: 'danger',
  failed: 'danger',
  critical: 'danger',
  suspended: 'danger',
  rojo: 'danger',
  pending: 'warning',
  on_leave: 'warning',
  amarillo: 'warning',
  naranja: 'warning',
  medium: 'warning',
  partial: 'info',
  sent: 'info',
  processing: 'info',
  azul: 'info',
};

export const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  paid: 'Pagado',
  pending: 'Pendiente',
  partial: 'Parcial',
  overdue: 'Vencido',
  cancelled: 'Anulado',
  draft: 'Borrador',
  sent: 'Enviado',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  failed: 'Fallido',
  approved: 'Aprobado',
  open: 'Abierto',
  closed: 'Cerrado',
  suspended: 'Suspendido',
  on_leave: 'En licencia',
  delivered: 'Entregado',
  read: 'Leído',
};

/**
 * Píldora de estado. Use `tone` directamente o `status` (tono y etiqueta automáticos).
 *
 * ```html
 * <ui-badge status="paid" />            → "Pagado" en verde
 * <ui-badge tone="info" dot>Nuevo</ui-badge>
 * ```
 */
@Component({
  selector: 'ui-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-badge', '[class]': '"ui-badge--" + resolvedTone()' },
  template: `
    @if (dot()) {
      <span class="dot" aria-hidden="true"></span>
    }
    <ng-content />{{ statusLabel() }}
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.15rem 0.6rem;
      border-radius: var(--radius-full);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      white-space: nowrap;
      border: 1px solid var(--b-border);
      background: var(--b-bg);
      color: var(--b-fg);
    }
    .dot {
      width: 0.4rem;
      height: 0.4rem;
      border-radius: 50%;
      background: currentColor;
    }
    :host(.ui-badge--neutral) {
      --b-bg: var(--color-neutral-bg);
      --b-fg: var(--color-neutral);
      --b-border: var(--color-neutral-border);
    }
    :host(.ui-badge--primary) {
      --b-bg: var(--color-primary-soft);
      --b-fg: var(--color-primary);
      --b-border: transparent;
    }
    :host(.ui-badge--success) {
      --b-bg: var(--color-success-bg);
      --b-fg: var(--color-success);
      --b-border: var(--color-success-border);
    }
    :host(.ui-badge--danger) {
      --b-bg: var(--color-danger-bg);
      --b-fg: var(--color-danger);
      --b-border: var(--color-danger-border);
    }
    :host(.ui-badge--warning) {
      --b-bg: var(--color-warning-bg);
      --b-fg: var(--color-warning);
      --b-border: var(--color-warning-border);
    }
    :host(.ui-badge--info) {
      --b-bg: var(--color-info-bg);
      --b-fg: var(--color-info);
      --b-border: var(--color-info-border);
    }
  `,
})
export class UiBadge {
  readonly tone = input<BadgeTone | null>(null);
  readonly status = input<string | null>(null);
  readonly dot = input(false, { transform: booleanAttribute });

  protected readonly resolvedTone = computed<BadgeTone>(() => {
    const explicit = this.tone();
    if (explicit) return explicit;
    const status = this.status();
    return (status && STATUS_TONES[status.toLowerCase()]) || 'neutral';
  });

  /** Etiqueta automática solo cuando se usa `status`. */
  protected readonly statusLabel = computed(() => {
    const status = this.status();
    if (!status) return '';
    return STATUS_LABELS[status.toLowerCase()] ?? status;
  });
}
