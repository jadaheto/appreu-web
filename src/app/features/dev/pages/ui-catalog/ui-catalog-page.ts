import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ConfirmService, ThemeService, ToastService } from '../../../../core';
import {
  ChartDatum,
  ChartSeries,
  formatCop,
  ICONS,
  PageChange,
  SelectOption,
  SortState,
  TabItem,
  TableAction,
  TableColumn,
  UiAlert,
  UiAvatar,
  UiBadge,
  UiBarChart,
  UiButton,
  UiCellDef,
  UiCheckbox,
  UiChip,
  UiDataTable,
  UiDateRange,
  UiDonutChart,
  UiEmptyState,
  UiFilterBar,
  UiFormField,
  UiIcon,
  UiInput,
  UiLineChart,
  UiLink,
  UiModal,
  UiMoneyText,
  UiPagination,
  UiPrintableSheet,
  UiProgressBar,
  UiSearchBox,
  UiSelect,
  UiSpinner,
  UiStatCard,
  UiTabs,
  UiTextarea,
} from '../../../../shared/ui';

interface DemoUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  balance: number;
}

/**
 * Catálogo visual de `shared/ui` (ruta `/dev/ui`, solo en desarrollo).
 * Sirve de referencia de uso para quienes construyan las pantallas.
 */
@Component({
  selector: 'app-ui-catalog-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    UiAlert,
    UiAvatar,
    UiBadge,
    UiBarChart,
    UiButton,
    UiCellDef,
    UiCheckbox,
    UiChip,
    UiDataTable,
    UiDateRange,
    UiDonutChart,
    UiEmptyState,
    UiFilterBar,
    UiFormField,
    UiIcon,
    UiInput,
    UiLineChart,
    UiLink,
    UiModal,
    UiMoneyText,
    UiPagination,
    UiPrintableSheet,
    UiProgressBar,
    UiSearchBox,
    UiSelect,
    UiSpinner,
    UiStatCard,
    UiTabs,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-catalog-page.html',
  styleUrl: './ui-catalog-page.scss',
})
export class UiCatalogPage {
  protected readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);
  private readonly confirmService = inject(ConfirmService);

  protected readonly iconNames = Object.keys(ICONS);
  protected readonly modalOpen = signal(false);
  protected readonly tab = signal<string | null>('a');
  protected readonly filter = signal('all');
  protected readonly search = signal('');
  protected readonly lastAction = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly sort = signal<SortState | null>(null);
  protected readonly selection = signal<readonly DemoUser[]>([]);
  protected readonly cop = formatCop;

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    role: [null as string | null, Validators.required],
    notes: [''],
    active: [true],
    range: [{ from: null as string | null, to: null as string | null }],
  });

  protected readonly roleOptions: SelectOption<string>[] = [
    { value: 'admin', label: 'Administrador' },
    { value: 'finance', label: 'Finanzas' },
    { value: 'teacher', label: 'Docente' },
  ];

  protected readonly tabs: TabItem[] = [
    { id: 'a', label: 'Empresa', icon: 'building' },
    { id: 'b', label: 'Académico', icon: 'academic-cap', badge: 3 },
    { id: 'c', label: 'DIAN', icon: 'document-check' },
    { id: 'd', label: 'Deshabilitada', disabled: true },
  ];

  protected readonly columns: TableColumn<DemoUser>[] = [
    { key: 'name', header: 'Usuario', sortable: true },
    { key: 'email', header: 'Email', mono: true, hideBelow: 'md' },
    { key: 'role', header: 'Rol', sortable: true },
    { key: 'status', header: 'Estado' },
    {
      key: 'balance',
      header: 'Saldo',
      sortable: true,
      align: 'end',
      format: (v) => formatCop(v as number),
    },
  ];

  protected readonly actions: TableAction<DemoUser>[] = [
    { id: 'edit', label: 'Editar', icon: 'pencil' },
    { id: 'delete', label: 'Eliminar', icon: 'trash', tone: 'danger', hidden: (r) => r.id === 1 },
  ];

  protected readonly rows: DemoUser[] = [
    {
      id: 1,
      name: 'Ana Pérez',
      email: 'ana@apreu.co',
      role: 'admin',
      status: 'active',
      balance: 0,
    },
    {
      id: 2,
      name: 'Bruno Díaz',
      email: 'bruno@apreu.co',
      role: 'finance',
      status: 'pending',
      balance: 350000,
    },
    {
      id: 3,
      name: 'Carla Gómez',
      email: 'carla@apreu.co',
      role: 'teacher',
      status: 'inactive',
      balance: 1250000,
    },
    {
      id: 4,
      name: 'David Ruiz',
      email: 'david@apreu.co',
      role: 'teacher',
      status: 'overdue',
      balance: 98000,
    },
  ];

  protected readonly months = ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'];
  protected readonly income: ChartSeries[] = [
    { name: 'Ingresos', values: [18.2e6, 21.5e6, 19.8e6, 24.1e6, 22.7e6, 26.3e6] },
  ];
  protected readonly compare: ChartSeries[] = [
    { name: '2025', values: [12, 15, 14, 18, 17, 20] },
    { name: '2026', values: [14, 17, 19, 21, 22, 25] },
  ];
  protected readonly levels: ChartDatum[] = [
    { label: 'Preescolar', value: 48 },
    { label: 'Primaria', value: 162 },
    { label: 'Secundaria', value: 131 },
    { label: 'Media', value: 64 },
  ];
  protected readonly copFormatter = (v: number) => formatCop(v);

  protected toastDemo(type: 'success' | 'error' | 'warning' | 'info'): void {
    this.toast.show(type, `Mensaje de ejemplo (${type}).`);
  }

  protected async confirmDemo(): Promise<void> {
    const ok = await this.confirmService.ask({
      title: '¿Eliminar el registro?',
      message: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    this.toast.info(ok ? 'Confirmado' : 'Cancelado');
  }

  protected onPage(change: PageChange): void {
    this.page.set(change.page);
    this.pageSize.set(change.pageSize);
  }

  protected submitForm(): void {
    this.form.markAllAsTouched();
    if (this.form.valid) this.toast.success('Formulario válido');
  }
}
