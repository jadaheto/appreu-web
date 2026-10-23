import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { catchError, of } from 'rxjs';
import { AuthService, ConfirmService, ToastService } from '../../../../core';
import {
  PageChange,
  UiAlert,
  UiButton,
  UiChip,
  UiEmptyState,
  UiFormField,
  UiInput,
  UiModal,
  UiPagination,
  UiSelect,
  UiSpinner,
  UiStatCard,
  UiTextarea,
} from '../../../../shared/ui';
import { StickerCard } from '../../components/sticker-card';
import { EmployeesService } from '../../data-access/employees.service';
import {
  optionsOf,
  Sticker,
  STICKER_COLOR_LABELS,
  STICKER_COLORS,
  STICKER_PRIORITIES,
  STICKER_PRIORITY_LABELS,
  StickerColor,
  StickerFilter,
  StickerListFilters,
  StickerPriority,
} from '../../data-access/hr.models';
import { apiMessage } from '../../data-access/hr-ui';
import { MyEmployeeService } from '../../data-access/my-employee.service';
import { StickersService } from '../../data-access/stickers.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/**
 * Stickers & notas. `mode="admin"` (admin/RR. HH.): gestiona y asigna a
 * cualquier empleado. `mode="employee"` (portal): bandeja de pendientes,
 * notas propias y recordatorios para sí mismo. La visibilidad la decide la API.
 */
@Component({
  selector: 'app-stickers-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    UiAlert,
    UiButton,
    UiChip,
    UiEmptyState,
    UiFormField,
    UiInput,
    UiModal,
    UiPagination,
    UiSelect,
    UiSpinner,
    UiStatCard,
    UiTextarea,
    StickerCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stickers-page.html',
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-6);
    }
    .board {
      display: grid;
      gap: var(--space-4);
      grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    }
    .tray {
      border-left: 4px solid var(--color-warning);
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-4);
    }
  `,
})
export class StickersPage {
  private readonly stickers = inject(StickersService);
  private readonly employees = inject(EmployeesService);
  private readonly me = inject(MyEmployeeService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Llega por `data` de la ruta. */
  readonly mode = input<'admin' | 'employee'>('employee');
  protected readonly isAdmin = computed(() => this.mode() === 'admin');
  protected readonly apiMessage = apiMessage;

  protected readonly chips: { id: StickerFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'unread', label: 'No leídos' },
    { id: 'urgent', label: 'Urgentes' },
  ];
  protected readonly filters = signal<StickerListFilters>({ filter: 'all', page: 1, pageSize: 24 });
  protected readonly result = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.stickers.list(params),
  });
  protected readonly rows = computed(() => resourceValue(this.result)?.items ?? []);
  protected readonly total = computed(() => resourceValue(this.result)?.total ?? 0);
  protected readonly stats = rxResource({ stream: () => this.stickers.stats() });
  protected readonly statsData = computed(() => resourceValue(this.stats, null));

  /** Bandeja: mis no leídos (vacío si el usuario no es empleado). */
  protected readonly pending = rxResource({
    stream: () => this.stickers.pending().pipe(catchError(() => of([] as Sticker[]))),
  });
  protected readonly pendingList = computed(() => resourceValue(this.pending, []));

  /** Empleado de la sesión (para crear notas propias y permisos en el portal). */
  protected readonly profile = rxResource({
    params: () => (this.isAdmin() ? undefined : true),
    stream: () => this.me.profile(),
  });
  protected readonly myEmployeeId = computed(() =>
    this.profile.hasValue() ? (resourceValue(this.profile)?.id ?? null) : null,
  );

  protected readonly employeeOptions = rxResource({
    params: () => (this.isAdmin() ? true : undefined),
    stream: () => this.employees.activeOptions(),
  });
  protected readonly employeeList = computed(() => resourceValue(this.employeeOptions, []));
  protected readonly employeeFilter = signal<number | null>(null);

  protected readonly canCreate = computed(() => this.isAdmin() || this.myEmployeeId() !== null);

  protected readonly colorOptions = STICKER_COLORS.map((c) => ({
    value: c,
    label: `${{ yellow: '🟡', red: '🔴', green: '🟢', blue: '🔵', purple: '🟣' }[c]} ${STICKER_COLOR_LABELS[c]}`,
  }));
  protected readonly priorityOptions = optionsOf(STICKER_PRIORITIES, STICKER_PRIORITY_LABELS);
  protected readonly createOpen = signal(false);
  protected readonly creating = signal(false);
  protected readonly createError = signal<string | null>(null);
  protected readonly form = this.fb.group({
    employeeId: this.fb.control<number | null>(null),
    title: this.fb.control('', [Validators.required, Validators.maxLength(150)]),
    content: this.fb.control('', Validators.maxLength(2000)),
    color: this.fb.control<StickerColor>('yellow'),
    priority: this.fb.control<StickerPriority>('normal'),
  });

  protected setFilter(filter: StickerFilter): void {
    this.filters.update((f) => ({ ...f, filter, page: 1 }));
  }

  protected setEmployee(employeeId: number | null): void {
    this.employeeFilter.set(employeeId);
    this.filters.update((f) => ({ ...f, employeeId, page: 1 }));
  }

  protected changePage(change: PageChange): void {
    this.filters.update((f) => ({ ...f, page: change.page, pageSize: change.pageSize }));
  }

  protected canMarkRead(s: Sticker): boolean {
    return this.isAdmin() || s.employeeId === this.myEmployeeId();
  }

  protected canDelete(s: Sticker): boolean {
    return this.isAdmin() || s.createdBy === this.auth.user()?.id;
  }

  protected openCreate(): void {
    this.form.reset({
      employeeId: this.isAdmin() ? null : this.myEmployeeId(),
      title: '',
      content: '',
      color: 'yellow',
      priority: 'normal',
    });
    this.form.controls.employeeId.setValidators(this.isAdmin() ? Validators.required : null);
    this.form.controls.employeeId.updateValueAndValidity();
    this.createError.set(null);
    this.createOpen.set(true);
  }

  protected create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const employeeId = this.isAdmin() ? v.employeeId : this.myEmployeeId();
    if (!employeeId) return;
    this.creating.set(true);
    this.createError.set(null);
    this.stickers
      .create({
        employeeId,
        title: v.title.trim(),
        content: v.content.trim() || undefined,
        color: v.color,
        priority: v.priority,
      })
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.createOpen.set(false);
          this.toast.success(this.isAdmin() ? 'Sticker creado y asignado.' : 'Nota creada.');
          this.refresh();
        },
        error: (err: unknown) => {
          this.creating.set(false);
          this.createError.set(apiMessage(err));
        },
      });
  }

  protected markRead(s: Sticker): void {
    this.stickers.markRead(s.id).subscribe({
      next: () => {
        this.toast.success('Sticker marcado como leído.');
        this.refresh();
      },
      error: (err: unknown) => this.toast.error(apiMessage(err)),
    });
  }

  protected async remove(s: Sticker): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Eliminar el sticker?',
      message: s.title,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    this.stickers.remove(s.id).subscribe({
      next: () => {
        this.toast.success('Sticker eliminado.');
        this.refresh();
      },
      error: (err: unknown) => this.toast.error(apiMessage(err)),
    });
  }

  private refresh(): void {
    this.result.reload();
    this.stats.reload();
    this.pending.reload();
  }
}
