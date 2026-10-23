import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiAvatar, UiBadge } from '../../../shared/ui';
import type { BillingStudent } from '../data-access/finance.models';

/** Tarjeta de resumen del estudiante (grado, grupo, acudiente, beca). */
@Component({
  selector: 'app-student-summary-card',
  imports: [UiAvatar, UiBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let s = student();
    <div class="head">
      <ui-avatar [name]="s.fullName" size="lg" />
      <div class="min-w-0">
        <p class="name">{{ s.fullName }}</p>
        <p class="text-muted font-mono">{{ s.code }}</p>
      </div>
    </div>
    <dl>
      <div>
        <dt>Documento</dt>
        <dd>{{ s.documentNumber || '—' }}</dd>
      </div>
      <div>
        <dt>Grado / grupo</dt>
        <dd>{{ s.gradeName || '—' }}{{ s.classroomName ? ' · ' + s.classroomName : '' }}</dd>
      </div>
      <div>
        <dt>Acudiente</dt>
        <dd>{{ s.guardianName || '—' }}</dd>
      </div>
      <div>
        <dt>Teléfono</dt>
        <dd>{{ s.guardianPhone || '—' }}</dd>
      </div>
      @if (s.scholarshipPct > 0) {
        <div>
          <dt>Beca</dt>
          <dd>
            <ui-badge tone="info">{{ s.scholarshipPct }} %</ui-badge>
          </dd>
        </div>
      }
    </dl>
    <ng-content />
  `,
  styles: `
    :host {
      display: block;
    }
    .head {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .min-w-0 {
      min-width: 0;
    }
    .name {
      font-weight: 700;
      color: var(--color-text-strong);
    }
    dl {
      display: grid;
      gap: 0.5rem;
      font-size: var(--text-sm);
    }
    dl > div {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }
    dt {
      color: var(--color-text-muted);
    }
    dd {
      margin: 0;
      text-align: right;
      font-weight: 600;
    }
  `,
})
export class StudentSummaryCard {
  readonly student = input.required<BillingStudent>();
}
