import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  AuthService,
  ConfirmService,
  Role,
  ROLES,
  roleLabel,
  ToastService,
  toApiError,
} from '../../../../core';
import {
  BadgeTone,
  DateEsPipe,
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
  UiFormField,
  UiInput,
  UiModal,
  UiPagination,
  UiSearchBox,
  UiSelect,
  UiStatCard,
} from '../../../../shared/ui';
import {
  EFFECTIVE_STATUS_LABELS,
  EffectiveUserStatus,
  ManagedUser,
  UserQuery,
  UserWithTemporaryPassword,
} from '../../data-access/administration.models';
import { UsersService } from '../../data-access/users.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const STATUS_TONES: Record<EffectiveUserStatus, BadgeTone> = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'warning',
  retired: 'danger',
  on_leave: 'info',
};

type ActiveFilter = 'all' | 'active' | 'inactive';

/** `/admin/usuarios`: KPIs, búsqueda y filtros, alta, edición, estado y contraseña temporal. */
@Component({
  selector: 'app-users-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DateEsPipe,
    UiAlert,
    UiAvatar,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFilterBar,
    UiFormField,
    UiInput,
    UiModal,
    UiPagination,
    UiSearchBox,
    UiSelect,
    UiStatCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-page.html',
  styleUrl: '../admin.scss',
})
export class UsersPage {
  /** Lectura segura de los resources en la plantilla (no lanza en estado de error). */
  protected readonly val = resourceValue;
  private readonly users = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly document = inject(DOCUMENT);

  protected readonly me = computed(() => this.auth.user()?.id ?? null);
  private readonly isSuperadmin = computed(() => this.auth.isSuperadmin());

  protected readonly stats = rxResource({ stream: () => this.users.stats() });
  protected readonly query = signal<UserQuery>({ page: 1, pageSize: 20 });
  protected readonly result = rxResource({
    params: () => this.query(),
    stream: ({ params }) => this.users.list(params),
  });

  // Filtros
  protected search = '';
  protected role: Role | null = null;
  protected active: ActiveFilter = 'all';
  protected readonly filterRoleOptions: SelectOption<Role>[] = ROLES.map((r) => ({
    value: r,
    label: roleLabel(r),
  }));
  protected readonly activeOptions: SelectOption<ActiveFilter>[] = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ];
  protected readonly hasFilters = computed(() => {
    const q = this.query();
    return !!(q.search || q.role || (q.active !== undefined && q.active !== null));
  });

  /** Solo un superadministrador puede asignar el rol superadmin. */
  protected readonly formRoleOptions = computed<SelectOption<Role>[]>(() =>
    ROLES.filter((r) => r !== 'superadmin' || this.isSuperadmin()).map((r) => ({
      value: r,
      label: roleLabel(r),
    })),
  );

  protected readonly columns: TableColumn<ManagedUser>[] = [
    { key: 'name', header: 'Usuario', sortable: true },
    { key: 'email', header: 'Correo', mono: true, hideBelow: 'md' },
    { key: 'role', header: 'Rol', width: '9rem' },
    { key: 'effectiveStatus', header: 'Estado', width: '8rem' },
    { key: 'lastLogin', header: 'Último acceso', hideBelow: 'lg', width: '10rem' },
    { key: 'createdAt', header: 'Creado', hideBelow: 'lg', width: '7rem' },
  ];
  protected readonly actions: TableAction<ManagedUser>[] = [
    { id: 'edit', label: 'Editar usuario', icon: 'pencil', hidden: (u) => !this.canManage(u) },
    {
      id: 'reset',
      label: 'Restablecer contraseña',
      icon: 'key',
      hidden: (u) => !this.canManage(u) || u.id === this.me(),
    },
    {
      id: 'deactivate',
      label: 'Desactivar usuario',
      icon: 'lock-closed',
      tone: 'danger',
      hidden: (u) => !u.isActive || !this.canManage(u) || u.id === this.me(),
    },
    {
      id: 'activate',
      label: 'Activar usuario',
      icon: 'check-circle',
      hidden: (u) => u.isActive || !this.canManage(u),
    },
  ];
  protected readonly rowClass = (u: ManagedUser) => (u.isActive ? null : 'is-muted');

  // Formulario crear / editar
  protected readonly formOpen = signal(false);
  protected readonly editing = signal<ManagedUser | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.maxLength(150)]),
    email: this.fb.control('', [Validators.required, Validators.email, Validators.maxLength(150)]),
    role: this.fb.control<Role>('employee', Validators.required),
  });

  // Contraseña temporal (se muestra una sola vez)
  protected readonly credentials = signal<UserWithTemporaryPassword | null>(null);
  protected readonly credentialsOpen = signal(false);
  protected readonly busyId = signal<number | null>(null);

  protected canManage(user: ManagedUser): boolean {
    return user.role !== 'superadmin' || this.isSuperadmin();
  }

  protected roleLabel(role: string): string {
    return roleLabel(role);
  }
  protected statusTone(status: EffectiveUserStatus): BadgeTone {
    return STATUS_TONES[status] ?? 'neutral';
  }
  protected statusLabel(status: EffectiveUserStatus): string {
    return EFFECTIVE_STATUS_LABELS[status] ?? status;
  }
  protected isAdminRole(role: string): boolean {
    return role === 'admin' || role === 'superadmin';
  }

  protected applyFilters(): void {
    this.query.set({
      page: 1,
      pageSize: this.query().pageSize,
      search: this.search.trim() || null,
      role: this.role,
      active: this.active === 'all' ? null : this.active === 'active',
    });
  }

  protected onSearch(text: string): void {
    this.search = text;
    this.applyFilters();
  }

  protected clearFilters(): void {
    this.search = '';
    this.role = null;
    this.active = 'all';
    this.applyFilters();
  }

  protected changePage(change: PageChange): void {
    this.query.update((q) => ({ ...q, page: change.page, pageSize: change.pageSize }));
  }

  private refresh(): void {
    this.result.reload();
    this.stats.reload();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ name: '', email: '', role: 'employee' });
    this.form.controls.role.enable();
    this.formOpen.set(true);
  }

  private openEdit(user: ManagedUser): void {
    this.editing.set(user);
    this.formError.set(null);
    this.form.reset({ name: user.name, email: user.email, role: user.role });
    // Nadie puede cambiar su propio rol (regla del backend).
    if (user.id === this.me()) this.form.controls.role.disable();
    else this.form.controls.role.enable();
    this.formOpen.set(true);
  }

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    const dto = { name: v.name.trim(), email: v.email.trim().toLowerCase(), role: v.role };
    const current = this.editing();

    if (current && current.role !== dto.role) {
      const ok = await this.confirm.ask({
        title: '¿Cambiar el rol?',
        message: `${current.name} pasará de ${roleLabel(current.role)} a ${roleLabel(dto.role)}. Cambiarán sus permisos y su portal.`,
        confirmLabel: 'Cambiar rol',
      });
      if (!ok) return;
    }

    this.saving.set(true);
    this.formError.set(null);
    if (current) {
      const changes: Partial<typeof dto> = {};
      if (dto.name !== current.name) changes.name = dto.name;
      if (dto.email !== current.email) changes.email = dto.email;
      if (dto.role !== current.role) changes.role = dto.role;
      this.users.update(current.id, changes).subscribe({
        next: () => {
          this.saving.set(false);
          this.formOpen.set(false);
          this.toast.success('Usuario actualizado.');
          this.refresh();
        },
        error: (err) => this.fail(err),
      });
    } else {
      this.users.create(dto).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.formOpen.set(false);
          this.toast.success(
            `Usuario «${res.user.name}» creado con rol ${roleLabel(res.user.role)}.`,
          );
          this.showCredentials(res);
          this.refresh();
        },
        error: (err) => this.fail(err),
      });
    }
  }

  private fail(err: unknown): void {
    this.saving.set(false);
    this.formError.set(toApiError(err).message);
  }

  private showCredentials(res: UserWithTemporaryPassword): void {
    this.credentials.set(res);
    this.credentialsOpen.set(true);
  }

  /** Al cerrar el aviso la contraseña temporal se descarta de la memoria de la página. */
  protected closeCredentials(): void {
    this.credentialsOpen.set(false);
    this.credentials.set(null);
  }

  protected async copyPassword(): Promise<void> {
    const pwd = this.credentials()?.temporaryPassword;
    if (!pwd) return;
    try {
      await this.document.defaultView?.navigator.clipboard.writeText(pwd);
      this.toast.success('Contraseña copiada al portapapeles.');
    } catch {
      this.toast.error('No se pudo copiar. Selecciónala y cópiala manualmente.');
    }
  }

  protected async onAction(event: TableActionEvent<ManagedUser>): Promise<void> {
    const user = event.row;
    switch (event.action) {
      case 'edit':
        this.openEdit(user);
        break;
      case 'reset':
        await this.resetPassword(user);
        break;
      case 'deactivate':
      case 'activate':
        await this.toggle(user, event.action === 'activate');
        break;
    }
  }

  private async resetPassword(user: ManagedUser): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Restablecer la contraseña de ${user.name}?`,
      message:
        'Se generará una contraseña temporal; la actual dejará de funcionar y el usuario deberá cambiarla al iniciar sesión.',
      confirmLabel: 'Restablecer',
      tone: 'danger',
    });
    if (!ok) return;
    this.busyId.set(user.id);
    this.users.resetPassword(user.id).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.showCredentials(res);
        this.refresh();
      },
      error: (err) => {
        this.busyId.set(null);
        this.notify(err);
      },
    });
  }

  private async toggle(user: ManagedUser, active: boolean): Promise<void> {
    const ok = await this.confirm.ask({
      title: active ? `¿Activar a ${user.name}?` : `¿Desactivar a ${user.name}?`,
      message: active
        ? 'Podrá volver a iniciar sesión.'
        : 'No podrá iniciar sesión hasta que se active de nuevo. Sus datos se conservan.',
      confirmLabel: active ? 'Activar' : 'Desactivar',
      tone: active ? 'primary' : 'danger',
    });
    if (!ok) return;
    this.busyId.set(user.id);
    this.users.setActive(user.id, active).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(active ? 'Usuario activado.' : 'Usuario desactivado.');
        this.refresh();
      },
      error: (err) => {
        this.busyId.set(null);
        this.notify(err);
      },
    });
  }

  private notify(err: unknown): void {
    const e = toApiError(err);
    if (!(
      e.status === 0 ||
      e.status === 403 ||
      e.status === 429 ||
      e.status >= 500 ||
      e.status === 401
    ))
      this.toast.error(e.message);
  }
}
