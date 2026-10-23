import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiBadge } from '../../../shared/ui';
import {
  EMPLOYEE_STATUS_LABELS,
  HR_STATUS_TONES,
  LEAVE_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PERIOD_STATUS_LABELS,
} from '../data-access/hr.models';

export type HrStatusKind = 'employee' | 'leave' | 'period' | 'payment';

const LABELS: Record<HrStatusKind, Record<string, string>> = {
  employee: EMPLOYEE_STATUS_LABELS,
  leave: LEAVE_STATUS_LABELS,
  period: PERIOD_STATUS_LABELS,
  payment: PAYMENT_STATUS_LABELS,
};

/** Estado de empleado, permiso, período o pago con la etiqueta en español del contexto. */
@Component({
  selector: 'app-hr-status-badge',
  imports: [UiBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-badge [tone]="tone()">{{ label() }}</ui-badge>`,
})
export class HrStatusBadge {
  readonly status = input.required<string>();
  readonly kind = input<HrStatusKind>('employee');

  protected readonly tone = computed(() => HR_STATUS_TONES[this.status()] ?? 'neutral');
  protected readonly label = computed(() => LABELS[this.kind()][this.status()] ?? this.status());
}
