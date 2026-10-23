import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  type TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiStatCard,
} from '../../../../shared/ui';
import { AttendanceCalendar } from '../../components/attendance-calendar';
import { PortalStudentBar } from '../../components/portal-student-bar';
import {
  attendanceLabel,
  attendanceTone,
  formatIsoDate,
  monthLabel,
  shiftMonth,
  todayIso,
} from '../../data-access/academic.labels';
import type { AttendanceRecord } from '../../data-access/academic.models';
import { AttendanceService } from '../../data-access/attendance.service';
import { PortalContextService } from '../../data-access/portal-context.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Mi asistencia (legacy `student/asistencia.php`): resumen del mes, calendario y últimos registros. */
@Component({
  selector: 'app-my-attendance-page',
  imports: [
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiStatCard,
    AttendanceCalendar,
    PortalStudentBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Asistencia</h1>
        <p class="page-header__subtitle">Registros de asistencia a clase.</p>
      </div>
    </div>

    <app-portal-student-bar />

    @if (ctx.selectedId()) {
      @if (data.error()) {
        <ui-alert tone="error" title="No se pudo cargar la asistencia">{{
          data.error()?.message
        }}</ui-alert>
      } @else {
        <section class="grid grid--4 mb" aria-label="Resumen del mes">
          <ui-stat-card
            label="Días asistidos"
            icon="check-circle"
            tone="success"
            [loading]="data.isLoading()"
            [value]="summary()?.daysAttended ?? null"
            [hint]="title()"
          />
          <ui-stat-card
            label="Ausencias"
            icon="x-mark"
            tone="danger"
            [loading]="data.isLoading()"
            [value]="summary()?.absent ?? null"
            [hint]="title()"
          />
          <ui-stat-card
            label="Llegadas tarde"
            icon="clock"
            tone="warning"
            [loading]="data.isLoading()"
            [value]="summary()?.late ?? null"
            [hint]="title()"
          />
          <ui-stat-card
            label="Total registros"
            icon="clipboard"
            tone="info"
            [loading]="data.isLoading()"
            [value]="summary()?.totalRecords ?? null"
            [hint]="(summary()?.excused ?? 0) + ' excusados'"
          />
        </section>

        <section class="ui-card mb">
          <header class="cal-head">
            <button
              ui-button
              type="button"
              variant="ghost"
              size="sm"
              icon="chevron-left"
              iconOnly
              aria-label="Mes anterior"
              (click)="move(-1)"
            ></button>
            <h2 class="ui-card__title month">{{ title() }}</h2>
            <button
              ui-button
              type="button"
              variant="ghost"
              size="sm"
              icon="chevron-right"
              iconOnly
              aria-label="Mes siguiente"
              [disabled]="month() >= currentMonth"
              (click)="move(1)"
            ></button>
          </header>
          <app-attendance-calendar [month]="month()" [records]="monthRecords()" [today]="today" />
          @if (incomplete()) {
            <p class="text-muted note">
              El calendario muestra {{ monthRecords().length }} de
              {{ summary()?.totalRecords }} registros del mes (solo los más recientes están
              disponibles en detalle).
            </p>
          }
        </section>

        <h2 class="section-title">Últimos registros</h2>
        <ui-data-table
          caption="Últimos registros de asistencia"
          [columns]="columns"
          [rows]="recent()"
          [loading]="data.isLoading()"
          emptyTitle="Sin registros"
          emptyMessage="Aún no hay asistencia registrada."
          emptyIcon="clipboard"
        >
          <ng-template uiCell="subjectName" let-row>
            <span class="strong">{{ row.subjectName ?? '—' }}</span>
            @if (row.classroomName) {
              <span class="sub">Salón {{ row.classroomName }}</span>
            }
          </ng-template>
          <ng-template uiCell="status" let-value="value">
            <ui-badge [tone]="tone($any(value))">{{ label($any(value)) }}</ui-badge>
          </ng-template>
        </ui-data-table>
      }
    }
  `,
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-6);
    }
    .cal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-3);
    }
    .month {
      margin: 0;
      padding: 0;
      border: 0;
      text-transform: capitalize;
    }
    .note {
      margin-top: var(--space-3);
      font-size: var(--text-sm);
    }
    .section-title {
      font-size: var(--text-lg);
      margin-bottom: var(--space-3);
      color: var(--color-text-strong);
    }
    .strong {
      display: block;
      font-weight: 600;
    }
    .sub {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
  `,
})
export class MyAttendancePage {
  protected readonly ctx = inject(PortalContextService);
  private readonly attendance = inject(AttendanceService);

  protected readonly today = todayIso();
  protected readonly currentMonth = this.today.slice(0, 7);
  protected readonly month = signal(this.currentMonth);
  protected readonly title = computed(() => monthLabel(this.month()));

  protected readonly data = rxResource({
    params: () => {
      const studentId = this.ctx.selectedId();
      return studentId ? { studentId, month: this.month() } : undefined;
    },
    stream: ({ params }) => this.attendance.student(params.studentId, params.month),
  });
  protected readonly view = computed(() => resourceValue(this.data, null));
  protected readonly summary = computed(() => this.view()?.summary ?? null);
  protected readonly recent = computed(() => this.view()?.recent ?? []);
  protected readonly monthRecords = computed(() =>
    this.recent().filter((r) => r.date.startsWith(this.month())),
  );
  protected readonly incomplete = computed(
    () => (this.summary()?.totalRecords ?? 0) > this.monthRecords().length,
  );

  protected readonly tone = attendanceTone;
  protected readonly label = attendanceLabel;
  protected readonly columns: TableColumn<AttendanceRecord>[] = [
    { key: 'date', header: 'Fecha', format: (v) => formatIsoDate(v as string), sortable: true },
    { key: 'time', header: 'Hora', mono: true, hideBelow: 'sm' },
    { key: 'subjectName', header: 'Materia' },
    { key: 'teacherName', header: 'Profesor', hideBelow: 'md' },
    { key: 'status', header: 'Estado' },
  ];

  protected move(delta: number): void {
    const next = shiftMonth(this.month(), delta);
    if (next <= this.currentMonth) this.month.set(next);
  }
}
