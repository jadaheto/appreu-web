import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toApiError, ToastService } from '../../../../core';
import {
  type SelectOption,
  type TabItem,
  type TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiChip,
  UiDataTable,
  UiEmptyState,
  UiFormField,
  UiSearchBox,
  UiSelect,
  UiSpinner,
  UiStatCard,
  UiTabs,
} from '../../../../shared/ui';
import { GradeValue } from '../../components/grade-value';
import {
  formatScore,
  GENDER_LABELS,
  isAutoToasted,
  monthLabel,
  periodStatusLabel,
  safeFileName,
  saveBlob,
} from '../../data-access/academic.labels';
import type { DirectorStudentRow, GroupReportCardRow } from '../../data-access/academic.models';
import { AssessmentService } from '../../data-access/assessment.service';
import { PeriodsService } from '../../data-access/periods.service';
import { TeacherPortalService } from '../../data-access/teacher-portal.service';
import { resourceValue } from '../../../../core/resource/resource-value';

type GenderFilter = 'all' | 'M' | 'F';

function matches(text: string, ...fields: (string | null)[]): boolean {
  const q = text.trim().toLowerCase();
  return !q || fields.some((f) => f?.toLowerCase().includes(q));
}

/**
 * Mis grupos (director de grupo, legacy `employee/group_director.php` y
 * `academic/group_bulletins.php`): panel del salón con alumnos y fallas del
 * mes, y estado de boletines por período con descarga ZIP.
 */
@Component({
  selector: 'app-my-groups-page',
  imports: [
    FormsModule,
    RouterLink,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiChip,
    UiDataTable,
    UiEmptyState,
    UiFormField,
    UiSearchBox,
    UiSelect,
    UiSpinner,
    UiStatCard,
    UiTabs,
    GradeValue,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-groups-page.html',
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-5);
    }
    .center {
      display: grid;
      place-items: center;
      padding: var(--space-8);
    }
    .picker {
      min-width: 14rem;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      align-items: center;
      margin-bottom: var(--space-4);
    }
    .toolbar ui-search-box {
      flex: 1 1 16rem;
    }
    .strong {
      display: block;
      font-weight: 600;
    }
    .sub {
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      align-items: flex-end;
      margin-bottom: var(--space-5);
    }
    .filters ui-form-field {
      flex: 0 1 18rem;
    }
    @media print {
      .no-print {
        display: none !important;
      }
    }
  `,
})
export class MyGroupsPage {
  private readonly portal = inject(TeacherPortalService);
  private readonly assessment = inject(AssessmentService);
  private readonly periodsApi = inject(PeriodsService);
  private readonly toast = inject(ToastService);

  protected readonly classrooms = rxResource({ stream: () => this.portal.directedClassrooms() });
  protected readonly classroomList = computed(() => resourceValue(this.classrooms, []));
  protected readonly classroomId = signal<number | null>(null);
  protected readonly classroomOptions = computed<SelectOption<number>[]>(() =>
    this.classroomList().map((c) => ({ value: c.id, label: `${c.name} (${c.gradeName})` })),
  );

  protected readonly tab = signal<string | null>('panel');
  protected readonly tabs: TabItem[] = [
    { id: 'panel', label: 'Panel del grupo', icon: 'users' },
    { id: 'report-cards', label: 'Boletines', icon: 'document-check' },
  ];

  // ─── Panel ───────────────────────────────────────────────────────────────
  protected readonly dashboard = rxResource({
    params: () => this.classroomId() ?? undefined,
    stream: ({ params }) => this.portal.directorDashboard(params),
  });
  protected readonly panel = computed(() => resourceValue(this.dashboard, null));
  protected readonly search = signal('');
  protected readonly gender = signal<GenderFilter>('all');
  protected readonly students = computed(() =>
    (this.panel()?.students ?? []).filter(
      (s) =>
        (this.gender() === 'all' || s.gender === this.gender()) &&
        matches(this.search(), s.fullName, s.code, s.documentNumber),
    ),
  );
  protected readonly monthText = computed(() => {
    const m = this.panel()?.month;
    return m ? monthLabel(m) : '';
  });
  protected readonly studentColumns: TableColumn<DirectorStudentRow>[] = [
    { key: 'code', header: 'Código', mono: true, width: '7rem', hideBelow: 'sm' },
    { key: 'fullName', header: 'Estudiante', sortable: true },
    {
      key: 'gender',
      header: 'Género',
      format: (v) => GENDER_LABELS[v as string] ?? String(v),
      hideBelow: 'md',
    },
    {
      key: 'document',
      header: 'Identificación',
      value: (s) => [s.documentType, s.documentNumber].filter(Boolean).join(' '),
      hideBelow: 'md',
    },
    { key: 'phone', header: 'Teléfono acudiente' },
  ];

  // ─── Boletines ───────────────────────────────────────────────────────────
  protected readonly periods = rxResource({
    params: () => this.panel()?.classroom.academicYear ?? undefined,
    stream: ({ params }) => this.periodsApi.list(params),
  });
  protected readonly periodOptions = computed<SelectOption<number>[]>(() =>
    resourceValue(this.periods, [])
      .filter((p) => p.status !== 'open')
      .map((p) => ({ value: p.id, label: `${p.name} (${periodStatusLabel(p.status)})` })),
  );
  protected readonly hasGenerated = computed(() =>
    resourceValue(this.periods, []).some((p) => p.status === 'bulletins_generated'),
  );
  protected readonly periodId = signal<number | null>(null);
  protected readonly group = rxResource({
    params: () => {
      const classroomId = this.classroomId();
      const periodId = this.periodId();
      return classroomId && periodId && this.tab() === 'report-cards'
        ? { classroomId, periodId }
        : undefined;
    },
    stream: ({ params }) => this.assessment.groupReportCards(params.classroomId, params.periodId),
  });
  protected readonly groupData = computed(() => resourceValue(this.group, null));
  protected readonly cardSearch = signal('');
  protected readonly cardRows = computed(() =>
    (this.groupData()?.rows ?? []).filter((r) => matches(this.cardSearch(), r.fullName, r.code)),
  );
  protected readonly cardColumns: TableColumn<GroupReportCardRow>[] = [
    { key: 'fullName', header: 'Estudiante', sortable: true },
    { key: 'averageScore', header: 'Promedio', align: 'center', sortable: true },
    {
      key: 'viewCount',
      header: 'Consultas',
      align: 'center',
      mono: true,
      format: (v) => `${v} veces`,
      hideBelow: 'sm',
    },
    { key: 'status', header: 'Estado' },
    { key: 'view', header: '', align: 'end' },
  ];
  protected readonly trackStudent = (r: { studentId: number }) => r.studentId;
  protected readonly downloading = signal(false);
  protected readonly score = formatScore;

  constructor() {
    effect(() => {
      const list = this.classroomList();
      const current = untracked(this.classroomId);
      if (list.length && !list.some((c) => c.id === current)) this.classroomId.set(list[0].id);
    });
    effect(() => {
      const list = resourceValue(this.periods, []);
      const current = untracked(this.periodId);
      if (current && list.some((p) => p.id === current)) return;
      const generated = [...list].reverse().find((p) => p.status === 'bulletins_generated');
      this.periodId.set(generated?.id ?? null);
    });
  }

  protected print(): void {
    window.print();
  }

  protected downloadZip(): void {
    const classroomId = this.classroomId();
    const periodId = this.periodId();
    const data = this.groupData();
    if (!classroomId || !periodId) return;
    this.downloading.set(true);
    this.assessment.groupReportCardsZip(classroomId, periodId).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        const name = data ? `boletines-${data.classroom.name}-${data.period.name}` : 'boletines';
        saveBlob(blob, `${safeFileName(name)}.zip`);
        this.toast.success('Descarga iniciada.');
      },
      error: (err: unknown) => {
        this.downloading.set(false);
        const e = toApiError(err);
        if (!isAutoToasted(e.status)) this.toast.error(e.message);
      },
    });
  }
}
