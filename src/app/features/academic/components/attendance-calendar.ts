import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ATTENDANCE_LABELS, monthLabel } from '../data-access/academic.labels';
import type { AttendanceRecord, AttendanceStatus } from '../data-access/academic.models';
import { ATTENDANCE_STATUSES } from '../data-access/academic.models';

interface CalendarDay {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  statuses: AttendanceStatus[];
  label: string;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Calendario mensual de asistencia (lunes a domingo). Cada día muestra un
 * marcador por estado registrado (presente, ausente, tarde, excusado).
 */
@Component({
  selector: 'app-attendance-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table class="cal" [attr.aria-label]="'Asistencia de ' + title()">
      <thead>
        <tr>
          @for (w of weekdays; track w) {
            <th scope="col">{{ w }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (week of weeks(); track $index) {
          <tr>
            @for (d of week; track d.iso) {
              <td
                [class.out]="!d.inMonth"
                [class.today]="d.isToday"
                [attr.aria-label]="d.inMonth ? d.label : null"
              >
                @if (d.inMonth) {
                  <span class="num" aria-hidden="true">{{ d.day }}</span>
                  <span class="marks" aria-hidden="true">
                    @for (s of d.statuses; track s) {
                      <span class="mark" [class]="'mark mark--' + s" [title]="labels[s]"></span>
                    }
                  </span>
                }
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
    <ul class="legend" aria-label="Convenciones">
      @for (s of statuses; track s) {
        <li><span class="mark" [class]="'mark mark--' + s"></span>{{ labels[s] }}</li>
      }
    </ul>
  `,
  styles: `
    .cal {
      width: 100%;
      table-layout: fixed;
      border-collapse: separate;
      border-spacing: 4px;
    }
    th {
      font-size: var(--text-xs);
      text-transform: uppercase;
      color: var(--color-text-subtle);
      font-weight: 600;
      padding-bottom: 0.25rem;
    }
    td {
      height: 4rem;
      vertical-align: top;
      padding: 0.35rem;
      border-radius: var(--radius-md);
      background: var(--color-surface-2);
      border: 1px solid var(--color-border-soft);
    }
    td.out {
      background: transparent;
      border-color: transparent;
    }
    td.today {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 1px var(--color-primary);
    }
    .num {
      display: block;
      font-size: var(--text-sm);
      font-weight: 600;
    }
    .marks {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
      margin-top: 0.35rem;
    }
    .mark {
      display: inline-block;
      width: 0.7rem;
      height: 0.7rem;
      border-radius: var(--radius-full);
    }
    .mark--present {
      background: var(--color-success);
    }
    .mark--absent {
      background: var(--color-danger);
    }
    .mark--late {
      background: var(--color-warning);
    }
    .mark--excused {
      background: var(--color-info);
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      margin-top: var(--space-3);
      font-size: var(--text-sm);
      color: var(--color-text-muted);
      list-style: none;
      padding: 0;
    }
    .legend li {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    @media (max-width: 640px) {
      td {
        height: 3rem;
        padding: 0.2rem;
      }
      .mark {
        width: 0.5rem;
        height: 0.5rem;
      }
    }
  `,
})
export class AttendanceCalendar {
  /** Mes `AAAA-MM`. */
  readonly month = input.required<string>();
  readonly records = input<readonly AttendanceRecord[]>([]);
  /** Fecha de hoy `AAAA-MM-DD` (inyectable para pruebas). */
  readonly today = input<string | null>(null);

  protected readonly weekdays = WEEKDAYS;
  protected readonly statuses = ATTENDANCE_STATUSES;
  protected readonly labels = ATTENDANCE_LABELS;
  protected readonly title = computed(() => monthLabel(this.month()));

  protected readonly weeks = computed<CalendarDay[][]>(() => {
    const [y, m] = this.month().split('-').map(Number);
    const byDate = new Map<string, Set<AttendanceStatus>>();
    for (const r of this.records()) {
      const set = byDate.get(r.date) ?? new Set<AttendanceStatus>();
      set.add(r.status);
      byDate.set(r.date, set);
    }
    const first = new Date(y, m - 1, 1);
    const offset = (first.getDay() + 6) % 7; // lunes = 0
    const start = new Date(y, m - 1, 1 - offset);
    const today = this.today();
    const weeks: CalendarDay[][] = [];
    const cursor = new Date(start);
    do {
      const week: CalendarDay[] = [];
      for (let i = 0; i < 7; i++) {
        const iso = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`;
        const statuses = ATTENDANCE_STATUSES.filter((s) => byDate.get(iso)?.has(s));
        week.push({
          iso,
          day: cursor.getDate(),
          inMonth: cursor.getMonth() === m - 1,
          isToday: iso === today,
          statuses,
          label: `${cursor.getDate()}: ${
            statuses.length ? statuses.map((s) => ATTENDANCE_LABELS[s]).join(', ') : 'sin registros'
          }`,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    } while (cursor.getMonth() === m - 1);
    return weeks;
  });
}
