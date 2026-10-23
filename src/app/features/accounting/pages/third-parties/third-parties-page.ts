import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ConfirmService, toApiError, ToastService } from '../../../../core';
import {
  PageChange,
  SelectOption,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
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
} from '../../../../shared/ui';
import { notifyError } from '../../components/notify-error';
import {
  DocumentType,
  ThirdParty,
  ThirdPartyFilters,
  ThirdPartyRequest,
} from '../../data-access/accounting.models';
import { DOCUMENT_TYPE_OPTIONS } from '../../data-access/accounting.labels';
import { AccountingService } from '../../data-access/accounting.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Terceros contables: búsqueda, alta/edición (DV del NIT calculado por la API), estado y borrado. */
@Component({
  selector: 'app-third-parties-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    UiAlert,
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './third-parties-page.html',
  styleUrls: ['../accounting-page.scss'],
})
export class ThirdPartiesPage {
  private readonly accounting = inject(AccountingService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly searchText = signal('');
  protected readonly activeFilter = signal<boolean | null>(null);
  protected readonly filters = signal<ThirdPartyFilters>({ page: 1, pageSize: 20 });
  protected readonly result = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.accounting.thirdParties(params),
  });
  protected readonly page = computed(() => resourceValue(this.result, null));
  protected readonly hasFilters = computed(
    () => !!this.filters().search || this.filters().isActive != null,
  );

  protected readonly statusOptions: SelectOption<boolean>[] = [
    { value: true, label: 'Activos' },
    { value: false, label: 'Inactivos' },
  ];
  protected readonly docOptions = DOCUMENT_TYPE_OPTIONS;

  protected readonly columns: TableColumn<ThirdParty>[] = [
    { key: 'document', header: 'Documento', width: '14rem' },
    { key: 'name', header: 'Nombre / razón social', sortable: true },
    { key: 'city', header: 'Ciudad', hideBelow: 'md' },
    { key: 'phone', header: 'Teléfono', hideBelow: 'lg' },
    { key: 'email', header: 'Email', hideBelow: 'lg' },
    { key: 'isActive', header: 'Estado' },
  ];
  protected readonly actions: TableAction<ThirdParty>[] = [
    { id: 'edit', label: 'Editar tercero', icon: 'pencil' },
    { id: 'deactivate', label: 'Inactivar', icon: 'eye-slash', hidden: (r) => !r.isActive },
    { id: 'activate', label: 'Reactivar', icon: 'eye', hidden: (r) => r.isActive },
    { id: 'delete', label: 'Eliminar tercero', icon: 'trash', tone: 'danger' },
  ];
  protected readonly rowClass = (r: ThirdParty) => (r.isActive ? null : 'is-muted');

  // ---- Formulario ----
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<ThirdParty | null>(null);
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    documentType: this.fb.nonNullable.control<DocumentType>('NIT', Validators.required),
    documentNumber: ['', [Validators.required, Validators.maxLength(50)]],
    dv: ['', [Validators.maxLength(1), Validators.pattern(/^\d$/)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    phone: ['', Validators.maxLength(50)],
    city: ['', Validators.maxLength(100)],
    address: ['', Validators.maxLength(500)],
  });
  protected readonly docType = signal<DocumentType>('NIT');
  protected readonly dvErrors = { pattern: 'El DV es un solo dígito.' };

  constructor() {
    this.form.controls.documentType.valueChanges.subscribe((t) => {
      this.docType.set(t);
      if (t !== 'NIT') this.form.controls.dv.setValue('');
    });
  }

  protected applyFilters(): void {
    this.filters.update((f) => ({
      ...f,
      page: 1,
      search: this.searchText().trim() || undefined,
      isActive: this.activeFilter(),
    }));
  }

  protected clearFilters(): void {
    this.searchText.set('');
    this.activeFilter.set(null);
    this.filters.set({ page: 1, pageSize: this.filters().pageSize });
  }

  protected onPage(change: PageChange): void {
    this.filters.update((f) => ({ ...f, page: change.page, pageSize: change.pageSize }));
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.serverError.set(null);
    this.form.reset({ documentType: 'NIT' });
    this.docType.set('NIT');
    this.modalOpen.set(true);
  }

  protected openEdit(party: ThirdParty): void {
    this.editing.set(party);
    this.serverError.set(null);
    this.form.reset({
      documentType: party.documentType,
      documentNumber: party.documentNumber,
      dv: party.dv ?? '',
      name: party.name,
      email: party.email ?? '',
      phone: party.phone ?? '',
      city: party.city ?? '',
      address: party.address ?? '',
    });
    this.docType.set(party.documentType);
    this.modalOpen.set(true);
  }

  protected onAction(event: TableActionEvent<ThirdParty>): void {
    switch (event.action) {
      case 'edit':
        this.openEdit(event.row);
        break;
      case 'activate':
      case 'deactivate':
        void this.setActive(event.row, event.action === 'activate');
        break;
      case 'delete':
        void this.remove(event.row);
        break;
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const opt = (s: string) => s.trim() || undefined;
    const dto: ThirdPartyRequest = {
      documentType: v.documentType,
      documentNumber: v.documentNumber.trim(),
      dv: v.documentType === 'NIT' ? opt(v.dv) : undefined,
      name: v.name.trim(),
      email: opt(v.email),
      phone: opt(v.phone),
      city: opt(v.city),
      address: opt(v.address),
    };
    this.saving.set(true);
    this.serverError.set(null);
    try {
      const editing = this.editing();
      const saved = await firstValueFrom(
        editing
          ? this.accounting.updateThirdParty(editing.id, dto)
          : this.accounting.createThirdParty(dto),
      );
      this.toast.success(
        `${editing ? 'Tercero actualizado' : 'Tercero registrado'}: ${saved.documentType} ${saved.document}`,
      );
      this.modalOpen.set(false);
      this.result.reload();
    } catch (e) {
      this.serverError.set(toApiError(e).message);
    } finally {
      this.saving.set(false);
    }
  }

  private async setActive(party: ThirdParty, active: boolean): Promise<void> {
    if (
      !active &&
      !(await this.confirm.ask({
        title: `¿Inactivar a ${party.name}?`,
        message: 'No podrá usarse en nuevos asientos hasta que se reactive.',
        confirmLabel: 'Inactivar',
        tone: 'danger',
      }))
    )
      return;
    try {
      await firstValueFrom(this.accounting.setThirdPartyActive(party.id, active));
      this.toast.success(active ? 'Tercero reactivado.' : 'Tercero inactivado.');
      this.result.reload();
    } catch (e) {
      notifyError(this.toast, e);
    }
  }

  private async remove(party: ThirdParty): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Eliminar a ${party.name}?`,
      message: 'Solo se pueden eliminar terceros sin movimientos contables.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.accounting.deleteThirdParty(party.id));
      this.toast.success('Tercero eliminado.');
      this.result.reload();
    } catch (e) {
      notifyError(this.toast, e);
    }
  }
}
