import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, of } from 'rxjs';
import { AuthService, ConfirmService, toApiError, ToastService } from '../../../../core';
import { notifyError } from '../../components/notify-error';
import {
  SelectOption,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiCheckbox,
  UiDataTable,
  UiEmptyState,
  UiFormField,
  UiIcon,
  UiInput,
  UiModal,
  UiSearchBox,
  UiSelect,
  BadgeTone,
} from '../../../../shared/ui';
import { Account, AccountType } from '../../data-access/accounting.models';
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_OPTIONS,
  ACCOUNT_TYPE_TONES,
} from '../../data-access/accounting.labels';
import { AccountingService } from '../../data-access/accounting.service';
import { resourceValue } from '../../../../core/resource/resource-value';

export interface AccountTreeRow extends Account {
  depth: number;
  hasChildren: boolean;
}

/** Aplana el árbol del PUC respetando los nodos expandidos (o todos si `expanded` es null). */
export function flattenTree(
  nodes: readonly Account[],
  expanded: ReadonlySet<number> | null,
  depth = 0,
  out: AccountTreeRow[] = [],
): AccountTreeRow[] {
  for (const node of nodes) {
    const children = node.children ?? [];
    out.push({ ...node, depth, hasChildren: children.length > 0 });
    if (children.length && (expanded === null || expanded.has(node.id)))
      flattenTree(children, expanded, depth + 1, out);
  }
  return out;
}

type ParentChoice = 'auto' | 'root' | number;

/** Plan de cuentas (PUC) en árbol: crear, editar, eliminar y sembrar el PUC base. */
@Component({
  selector: 'app-chart-of-accounts-page',
  imports: [
    ReactiveFormsModule,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiCheckbox,
    UiDataTable,
    UiEmptyState,
    UiFormField,
    UiIcon,
    UiInput,
    UiModal,
    UiSearchBox,
    UiSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chart-of-accounts-page.html',
  styleUrls: ['../accounting-page.scss', './chart-of-accounts-page.scss'],
})
export class ChartOfAccountsPage {
  private readonly accounting = inject(AccountingService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly search = signal('');
  protected readonly tree = rxResource({ stream: () => this.accounting.accountTree() });
  protected readonly searchResult = rxResource({
    params: () => this.search().trim(),
    stream: ({ params }) => (params ? this.accounting.accounts({ search: params }) : of(null)),
  });

  /** Ids expandidos; por defecto se expanden las clases (nivel 1). */
  protected readonly expanded = signal<ReadonlySet<number> | null>(null);
  private readonly defaultExpanded = computed(
    () => new Set(resourceValue(this.tree, []).map((a) => a.id)),
  );

  protected readonly allAccounts = computed(() => flattenTree(resourceValue(this.tree, []), null));
  protected readonly rows = computed<AccountTreeRow[]>(() => {
    const found = resourceValue(this.searchResult, null);
    if (this.search().trim() && found)
      return found.map((a) => ({ ...a, depth: 0, hasChildren: false }));
    return flattenTree(resourceValue(this.tree, []), this.expanded() ?? this.defaultExpanded());
  });
  protected readonly isEmpty = computed(
    () => this.tree.hasValue() && this.tree.value().length === 0 && !this.search(),
  );
  protected readonly canSeed = computed(() => this.auth.hasRole('admin'));

  protected readonly typeLabels: Readonly<Record<string, string>> = ACCOUNT_TYPE_LABELS;
  protected readonly typeTones: Readonly<Record<string, BadgeTone>> = ACCOUNT_TYPE_TONES;
  protected readonly typeOptions: SelectOption<AccountType | null>[] = [
    { value: null, label: 'Derivar del primer dígito' },
    ...ACCOUNT_TYPE_OPTIONS,
  ];
  protected readonly parentOptions = computed<SelectOption<ParentChoice>[]>(() => [
    { value: 'auto', label: 'Inferir por prefijo del código' },
    { value: 'root', label: 'Ninguna (cuenta raíz)' },
    ...this.allAccounts()
      .filter((a) => !a.isTransactional)
      .map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
  ]);

  protected readonly columns: TableColumn<AccountTreeRow>[] = [
    { key: 'code', header: 'Código', width: '14rem' },
    { key: 'name', header: 'Nombre' },
    { key: 'type', header: 'Tipo', hideBelow: 'sm' },
    { key: 'levelName', header: 'Nivel', hideBelow: 'md' },
    { key: 'isTransactional', header: 'Clasificación', hideBelow: 'md' },
  ];
  protected readonly actions: TableAction<AccountTreeRow>[] = [
    { id: 'edit', label: 'Editar cuenta', icon: 'pencil' },
    { id: 'delete', label: 'Eliminar cuenta', icon: 'trash', tone: 'danger' },
  ];

  // ---- Formulario ----
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Account | null>(null);
  protected readonly saving = signal(false);
  protected readonly seeding = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    type: this.fb.control<AccountType | null>(null),
    parent: this.fb.nonNullable.control<ParentChoice>('auto'),
    isTransactional: [false],
  });
  protected readonly codeErrors = { pattern: 'El código PUC solo admite dígitos.' };

  protected toggle(row: AccountTreeRow): void {
    const current = new Set(this.expanded() ?? this.defaultExpanded());
    if (current.has(row.id)) current.delete(row.id);
    else current.add(row.id);
    this.expanded.set(current);
  }

  protected isExpanded(row: AccountTreeRow): boolean {
    return (this.expanded() ?? this.defaultExpanded()).has(row.id);
  }

  protected expandAll(open: boolean): void {
    this.expanded.set(
      open
        ? new Set(
            this.allAccounts()
              .filter((a) => a.hasChildren)
              .map((a) => a.id),
          )
        : new Set(),
    );
  }

  protected openCreate(parent?: Account): void {
    this.editing.set(null);
    this.serverError.set(null);
    this.form.reset({
      code: parent?.code ?? '',
      name: '',
      type: null,
      parent: parent ? parent.id : 'auto',
      isTransactional: false,
    });
    this.form.controls.code.enable();
    this.form.controls.type.enable();
    this.form.controls.parent.enable();
    this.modalOpen.set(true);
  }

  protected openEdit(account: Account): void {
    this.editing.set(account);
    this.serverError.set(null);
    this.form.reset({
      code: account.code,
      name: account.name,
      type: account.type,
      parent: account.parentId ?? 'root',
      isTransactional: account.isTransactional,
    });
    this.form.controls.code.disable();
    this.form.controls.type.disable();
    this.form.controls.parent.disable();
    this.modalOpen.set(true);
  }

  protected onAction(event: TableActionEvent<AccountTreeRow>): void {
    if (event.action === 'edit') this.openEdit(event.row);
    if (event.action === 'delete') void this.remove(event.row);
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.serverError.set(null);
    try {
      const editing = this.editing();
      if (editing) {
        await firstValueFrom(
          this.accounting.updateAccount(editing.id, {
            name: v.name.trim(),
            isTransactional: v.isTransactional,
          }),
        );
        this.toast.success('Cuenta actualizada.');
      } else {
        await firstValueFrom(
          this.accounting.createAccount({
            code: v.code.trim(),
            name: v.name.trim(),
            isTransactional: v.isTransactional,
            ...(v.type ? { type: v.type } : {}),
            ...(v.parent === 'auto' ? {} : { parentId: v.parent === 'root' ? null : v.parent }),
          }),
        );
        this.toast.success('Cuenta creada.');
      }
      this.modalOpen.set(false);
      this.reload();
    } catch (e) {
      this.serverError.set(toApiError(e).message);
    } finally {
      this.saving.set(false);
    }
  }

  private async remove(account: Account): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Eliminar la cuenta ${account.code}?`,
      message: `"${account.name}" se eliminará. Solo es posible si no tiene movimientos ni subcuentas.`,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.accounting.deleteAccount(account.id));
      this.toast.success('Cuenta eliminada.');
      this.reload();
    } catch (e) {
      notifyError(this.toast, e);
    }
  }

  protected async seed(): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Cargar el PUC base para colegios?',
      message:
        'Se agregan las cuentas estándar que aún no existan. Las cuentas actuales no se modifican.',
      confirmLabel: 'Cargar PUC',
    });
    if (!ok) return;
    this.seeding.set(true);
    try {
      const result = await firstValueFrom(this.accounting.seedPuc());
      this.toast.success(
        `PUC cargado: ${result.inserted} cuentas nuevas, ${result.skipped} ya existían.`,
      );
      this.reload();
    } catch (e) {
      notifyError(this.toast, e);
    } finally {
      this.seeding.set(false);
    }
  }

  private reload(): void {
    this.tree.reload();
    if (this.search().trim()) this.searchResult.reload();
  }
}
