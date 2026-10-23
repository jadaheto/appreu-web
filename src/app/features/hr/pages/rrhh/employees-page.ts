import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  formatCop,
  PageChange,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiFilterBar,
  UiPagination,
  UiSearchBox,
  UiSelect,
  UiStatCard,
} from '../../../../shared/ui';
import { EmployeeStatusModal } from '../../components/employee-status-modal';
import { HrStatusBadge } from '../../components/hr-status-badge';
import { SectionNav } from '../../components/section-nav';
import { EmployeesService } from '../../data-access/employees.service';
import {
  CONTRACT_TYPE_LABELS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUS_TRANSITIONS,
  EMPLOYEE_STATUSES,
  EMPLOYEE_TYPE_LABELS,
  EMPLOYEE_TYPES,
  EmployeeFilters,
  EmployeeStatus,
  EmployeeSummary,
  EmployeeType,
  optionsOf,
} from '../../data-access/hr.models';
import { apiMessage, shortDate } from '../../data-access/hr-ui';
import { HR_BASE, HR_LINKS } from './hr-links';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Directorio de empleados: KPIs, filtros, tabla paginada y acciones de estado/retiro. */
@Component({
  selector: 'app-employees-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFilterBar,
    UiPagination,
    UiSearchBox,
    UiSelect,
    UiStatCard,
    EmployeeStatusModal,
    HrStatusBadge,
    SectionNav,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './employees-page.html',
})
export class EmployeesPage {
  private readonly employees = inject(EmployeesService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly links = HR_LINKS;
  protected readonly base = HR_BASE;
  protected readonly typeOptions = optionsOf(EMPLOYEE_TYPES, EMPLOYEE_TYPE_LABELS);
  protected readonly statusOptions = optionsOf(EMPLOYEE_STATUSES, EMPLOYEE_STATUS_LABELS);
  protected readonly typeLabels: Readonly<Record<string, string>> = EMPLOYEE_TYPE_LABELS;
  protected readonly contractLabels: Readonly<Record<string, string>> = CONTRACT_TYPE_LABELS;
  protected readonly shortDate = shortDate;
  protected readonly apiMessage = apiMessage;

  protected readonly filterForm = this.fb.group({
    search: this.fb.control(''),
    type: this.fb.control<EmployeeType | null>(null),
    status: this.fb.control<EmployeeStatus | null>('active'),
  });

  protected readonly filters = signal<EmployeeFilters>({ status: 'active', page: 1, pageSize: 20 });
  protected readonly result = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.employees.list(params),
  });
  protected readonly kpis = rxResource({ stream: () => this.employees.kpis() });
  protected readonly kpiData = computed(() => resourceValue(this.kpis, null));
  protected readonly rows = computed(() => resourceValue(this.result)?.items ?? []);
  protected readonly total = computed(() => resourceValue(this.result)?.total ?? 0);

  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return !!f.search || !!f.type || f.status !== 'active';
  });

  protected readonly columns: TableColumn<EmployeeSummary>[] = [
    { key: 'fullName', header: 'Empleado', sortable: true },
    { key: 'code', header: 'Código', mono: true, hideBelow: 'md' },
    { key: 'position', header: 'Cargo / Área', hideBelow: 'lg' },
    { key: 'employeeType', header: 'Tipo', hideBelow: 'md' },
    { key: 'contractType', header: 'Contrato', hideBelow: 'lg' },
    {
      key: 'baseSalary',
      header: 'Salario base',
      align: 'end',
      mono: true,
      sortable: true,
      format: (v) => formatCop(v as number),
    },
    { key: 'status', header: 'Estado' },
  ];

  protected readonly actions: TableAction<EmployeeSummary>[] = [
    { id: 'view', label: 'Ver ficha', icon: 'eye' },
    { id: 'edit', label: 'Editar', icon: 'pencil', hidden: (r) => r.status === 'retired' },
    {
      id: 'status',
      label: 'Cambiar estado',
      icon: 'arrows-up-down',
      hidden: (r) => EMPLOYEE_STATUS_TRANSITIONS[r.status].length === 0,
    },
    {
      id: 'retire',
      label: 'Retirar',
      icon: 'logout',
      tone: 'danger',
      hidden: (r) => r.status === 'retired',
    },
  ];

  protected readonly selected = signal<EmployeeSummary | null>(null);
  protected readonly modalMode = signal<'status' | 'retire'>('status');
  protected readonly modalOpen = signal(false);

  protected applyFilters(): void {
    const v = this.filterForm.getRawValue();
    this.filters.update((f) => ({
      ...f,
      search: v.search.trim() || undefined,
      type: v.type,
      status: v.status,
      page: 1,
    }));
  }

  protected onSearch(text: string): void {
    this.filterForm.controls.search.setValue(text);
    this.applyFilters();
  }

  protected clearFilters(): void {
    this.filterForm.reset({ search: '', type: null, status: 'active' });
    this.applyFilters();
  }

  protected changePage(change: PageChange): void {
    this.filters.update((f) => ({ ...f, page: change.page, pageSize: change.pageSize }));
  }

  protected onAction(event: TableActionEvent<EmployeeSummary>): void {
    const { action, row } = event;
    if (action === 'view') void this.router.navigate([HR_BASE, 'empleados', row.id]);
    else if (action === 'edit') void this.router.navigate([HR_BASE, 'empleados', row.id, 'editar']);
    else {
      this.selected.set(row);
      this.modalMode.set(action === 'retire' ? 'retire' : 'status');
      this.modalOpen.set(true);
    }
  }

  protected openDetail(row: EmployeeSummary): void {
    void this.router.navigate([HR_BASE, 'empleados', row.id]);
  }

  protected refresh(): void {
    this.result.reload();
    this.kpis.reload();
  }
}
