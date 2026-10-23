import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  type PageChange,
  type SelectOption,
  type TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiFilterBar,
  UiFormField,
  UiInput,
  UiPagination,
  UiSelect,
  UiStatCard,
} from '../../../../shared/ui';
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_TONES,
  attendanceLabel,
  attendanceTone,
  formatIsoDate,
  todayIso,
} from '../../data-access/academic.labels';
import type { AttendanceRecord, AttendanceStatus } from '../../data-access/academic.models';
import { AttendanceService } from '../../data-access/attendance.service';
import { AcademicStructureService } from '../../data-access/structure.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Reporte consolidado de asistencia del día (legacy `academic/attendance.php`). */
@Component({
  selector: 'app-attendance-report-page',
  imports: [
    FormsModule,
    RouterLink,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFilterBar,
    UiFormField,
    UiInput,
    UiPagination,
    UiSelect,
    UiStatCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Reporte de asistencia</h1>
        <p class="page-header__subtitle">{{ dateLabel() }}</p>
      </div>
      <div class="cluster no-print">
        <a ui-button variant="ghost" icon="arrow-left" routerLink="/admin/academico">Volver</a>
        <button ui-button type="button" variant="secondary" icon="printer" (click)="print()">
          Imprimir
        </button>
      </div>
    </div>

    <ui-filter-bar
      class="no-print mb"
      (apply)="apply()"
      [showClear]="!!classroomId()"
      (clear)="clear()"
    >
      <ui-form-field label="Fecha">
        <ui-input type="date" [max]="today" [(ngModel)]="draftDate" />
      </ui-form-field>
      <ui-form-field label="Salón">
        <ui-select
          [options]="classroomOptions()"
          placeholder="Todos los salones"
          [(ngModel)]="draftClassroom"
        />
      </ui-form-field>
    </ui-filter-bar>

    <section class="grid grid--4 mb" aria-label="Totales por estado">
      @for (s of statuses; track s) {
        <ui-stat-card
          [label]="labels[s]"
          [tone]="tones[s]"
          variant="border"
          [loading]="data.isLoading()"
          [value]="report()?.totals?.[s] ?? null"
        />
      }
    </section>

    @if (data.error()) {
      <ui-alert tone="error">{{ data.error()?.message }}</ui-alert>
    } @else {
      <ui-data-table
        caption="Registros de asistencia"
        [columns]="columns"
        [rows]="report()?.records?.items ?? []"
        [loading]="data.isLoading()"
        emptyTitle="Sin registros"
        emptyMessage="No hay asistencia registrada para los filtros seleccionados."
        emptyIcon="clipboard"
      >
        <ng-template uiCell="student" let-row>
          <span class="strong">{{ row.student?.fullName ?? '—' }}</span>
          @if (row.student?.documentNumber) {
            <span class="sub">Doc: {{ row.student.documentNumber }}</span>
          }
        </ng-template>
        <ng-template uiCell="status" let-value="value">
          <ui-badge [tone]="attTone($any(value))">{{ attLabel($any(value)) }}</ui-badge>
        </ng-template>
        <ui-pagination
          uiTableFooter
          [page]="page()"
          [pageSize]="limit()"
          [total]="report()?.records?.total ?? 0"
          (pageChange)="changePage($event)"
        />
      </ui-data-table>
    }
  `,
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-5);
    }
    .strong {
      display: block;
      font-weight: 600;
    }
    .sub {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    @media print {
      .no-print {
        display: none !important;
      }
    }
  `,
})
export class AttendanceReportPage {
  private readonly attendance = inject(AttendanceService);
  private readonly structure = inject(AcademicStructureService);

  protected readonly today = todayIso();
  protected draftDate: string = this.today;
  protected draftClassroom: number | null = null;

  protected readonly date = signal(this.today);
  protected readonly classroomId = signal<number | null>(null);
  protected readonly page = signal(1);
  protected readonly limit = signal(50);

  protected readonly data = rxResource({
    params: () => ({
      date: this.date(),
      classroomId: this.classroomId(),
      page: this.page(),
      limit: this.limit(),
    }),
    stream: ({ params }) => this.attendance.dailyReport(params),
  });
  protected readonly report = computed(() => resourceValue(this.data, null));
  protected readonly classrooms = rxResource({ stream: () => this.structure.classrooms() });
  protected readonly classroomOptions = computed<SelectOption<number>[]>(() =>
    resourceValue(this.classrooms, []).map((c) => ({
      value: c.id,
      label: `${c.name} (${c.gradeName})`,
    })),
  );
  protected readonly dateLabel = computed(() => `Asistencia del ${formatIsoDate(this.date())}`);

  protected readonly statuses: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];
  protected readonly labels = ATTENDANCE_LABELS;
  protected readonly tones = ATTENDANCE_TONES;
  protected readonly attTone = attendanceTone;
  protected readonly attLabel = attendanceLabel;
  protected readonly columns: TableColumn<AttendanceRecord>[] = [
    { key: 'time', header: 'Hora', mono: true, width: '6rem' },
    { key: 'student', header: 'Alumno', value: (r) => r.student?.fullName ?? '' },
    {
      key: 'classroomName',
      header: 'Salón',
      format: (v) => (v as string) || 'General',
      hideBelow: 'sm',
    },
    {
      key: 'subjectName',
      header: 'Materia',
      format: (v) => (v as string) || 'N/A',
      hideBelow: 'md',
    },
    { key: 'teacherName', header: 'Registrado por', hideBelow: 'lg' },
    { key: 'status', header: 'Estado' },
  ];

  protected apply(): void {
    this.date.set(this.draftDate || this.today);
    this.classroomId.set(this.draftClassroom);
    this.page.set(1);
  }

  protected clear(): void {
    this.draftClassroom = null;
    this.apply();
  }

  protected changePage(change: PageChange): void {
    this.page.set(change.page);
    this.limit.set(change.pageSize);
  }

  protected print(): void {
    window.print();
  }
}
