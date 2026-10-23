import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  PageChange,
  SelectOption,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiAvatar,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiFilterBar,
  UiPagination,
  UiSearchBox,
  UiSelect,
} from '../../../../shared/ui';
import {
  labelOf,
  optionsOf,
  STUDENT_STATUS_LABELS,
  STUDENT_STATUS_TONES,
  STUDENT_STATUSES,
  StudentFilters,
  StudentStatus,
  StudentSummaryView,
  toneOf,
} from '../../data-access/students.models';
import { AcademicCatalogService, StudentsService } from '../../data-access/students.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const DEFAULT_FILTERS: StudentFilters = {
  search: '',
  status: 'active',
  gradeId: null,
  classroomId: null,
  year: new Date().getFullYear(),
  page: 1,
  pageSize: 20,
};

/** Directorio de alumnos (análisis 03 §4.1) con filtros y paginación en servidor. */
@Component({
  selector: 'app-students-list-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    UiAlert,
    UiAvatar,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFilterBar,
    UiPagination,
    UiSearchBox,
    UiSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './students-list-page.html',
  styles: `
    .student {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 12rem;
    }
    .sub {
      display: block;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .filter {
      min-width: 10rem;
    }
  `,
})
export class StudentsListPage {
  private readonly students = inject(StudentsService);
  private readonly catalog = inject(AcademicCatalogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly filters = signal<StudentFilters>({ ...DEFAULT_FILTERS });
  protected readonly search = signal('');

  protected readonly filterForm = this.fb.group({
    status: this.fb.control<StudentStatus | null>(DEFAULT_FILTERS.status ?? null),
    gradeId: this.fb.control<number | null>(null),
    classroomId: this.fb.control<number | null>(null),
    year: this.fb.control<number | null>(DEFAULT_FILTERS.year ?? null),
  });

  protected readonly result = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.students.list(params),
  });

  /** Página actual (sin lanzar si el recurso falló). */
  protected readonly page = computed(() => resourceValue(this.result, null));

  private readonly grades = rxResource({ stream: () => this.catalog.grades() });
  private readonly selectedYear = signal<number | null>(DEFAULT_FILTERS.year ?? null);
  private readonly selectedGrade = signal<number | null>(null);
  private readonly classrooms = rxResource({
    params: () => ({ year: this.selectedYear() }),
    stream: ({ params }) => this.catalog.classrooms(params.year),
  });

  protected readonly statusOptions = optionsOf(STUDENT_STATUSES, STUDENT_STATUS_LABELS);
  protected readonly yearOptions: SelectOption<number>[] = Array.from({ length: 4 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year, label: String(year) };
  });
  protected readonly gradeOptions = computed<SelectOption<number>[]>(() =>
    (resourceValue(this.grades) ?? []).map((g) => ({ value: g.id, label: g.name })),
  );
  protected readonly classroomOptions = computed<SelectOption<number>[]>(() => {
    const grade = this.selectedGrade();
    return (resourceValue(this.classrooms) ?? [])
      .filter((c) => grade === null || c.gradeId === grade)
      .map((c) => ({ value: c.id, label: `${c.gradeName} · ${c.name}` }));
  });

  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return (
      !!f.search ||
      f.status !== DEFAULT_FILTERS.status ||
      f.gradeId !== null ||
      f.classroomId !== null ||
      f.year !== DEFAULT_FILTERS.year
    );
  });

  protected readonly columns: TableColumn<StudentSummaryView>[] = [
    { key: 'fullName', header: 'Alumno' },
    { key: 'code', header: 'Código', mono: true },
    { key: 'placement', header: 'Grado / curso', hideBelow: 'md' },
    { key: 'guardian', header: 'Acudiente', hideBelow: 'lg' },
    { key: 'scholarshipPct', header: 'Beca', align: 'center', hideBelow: 'lg' },
    { key: 'status', header: 'Estado' },
  ];
  protected readonly actions: TableAction<StudentSummaryView>[] = [
    { id: 'view', label: 'Ver ficha', icon: 'eye' },
    { id: 'finance', label: 'Estado de cuenta', icon: 'banknotes' },
    { id: 'card', label: 'Carnet', icon: 'identification' },
  ];

  constructor() {
    this.filterForm.controls.year.valueChanges.subscribe((year) => {
      this.selectedYear.set(year);
      this.filterForm.controls.classroomId.setValue(null);
    });
    this.filterForm.controls.gradeId.valueChanges.subscribe((grade) => {
      this.selectedGrade.set(grade);
      this.filterForm.controls.classroomId.setValue(null);
    });
  }

  protected statusLabel(status: string): string {
    return labelOf(STUDENT_STATUS_LABELS, status);
  }
  protected statusTone(status: string) {
    return toneOf(STUDENT_STATUS_TONES, status);
  }

  protected onSearch(text: string): void {
    this.filters.update((f) => ({ ...f, search: text, page: 1 }));
  }

  protected apply(): void {
    const v = this.filterForm.getRawValue();
    this.filters.update((f) => ({ ...f, ...v, page: 1 }));
  }

  protected clear(): void {
    this.search.set('');
    this.filterForm.reset();
    this.filters.set({ ...DEFAULT_FILTERS });
  }

  protected onPage(change: PageChange): void {
    this.filters.update((f) => ({ ...f, page: change.page, pageSize: change.pageSize }));
  }

  protected onAction(event: TableActionEvent<StudentSummaryView>): void {
    const tab = { view: null, finance: 'finanzas', card: 'carnet' }[event.action] ?? null;
    void this.router.navigate([event.row.id], {
      relativeTo: this.route,
      queryParams: tab ? { tab } : {},
    });
  }

  protected open(row: StudentSummaryView): void {
    void this.router.navigate([row.id], { relativeTo: this.route });
  }
}
