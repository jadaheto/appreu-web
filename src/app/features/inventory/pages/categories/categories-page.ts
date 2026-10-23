import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ConfirmService, toApiError, ToastService } from '../../../../core';
import {
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiButton,
  UiDataTable,
  UiFormField,
  UiInput,
  UiModal,
} from '../../../../shared/ui';
import { notifyError } from '../../components/notify-error';
import { InventoryCategory } from '../../data-access/inventory.models';
import { InventoryService } from '../../data-access/inventory.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Categorías de inventario: crear, renombrar y eliminar (solo si no tienen ítems). */
@Component({
  selector: 'app-categories-page',
  imports: [ReactiveFormsModule, UiAlert, UiButton, UiDataTable, UiFormField, UiInput, UiModal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Categorías</h1>
        <p class="page-header__subtitle">Agrupan los ítems para filtros y valoración</p>
      </div>
      <button ui-button variant="primary" icon="plus" (click)="openForm()">Nueva categoría</button>
    </div>

    @if (categories.error()) {
      <ui-alert tone="error" class="mb" title="No se pudieron cargar las categorías" />
    }

    <ui-data-table
      caption="Categorías de inventario"
      [columns]="columns"
      [rows]="rows()"
      [actions]="actions"
      [loading]="categories.isLoading()"
      emptyTitle="Sin categorías"
      emptyIcon="tag"
      emptyMessage="Ej. Uniformes, Útiles escolares, Equipos, Aseo."
      (action)="onAction($event)"
    />

    <ui-modal
      [(open)]="open"
      [title]="editing() ? 'Renombrar categoría' : 'Nueva categoría'"
      size="sm"
    >
      <form id="category-form" [formGroup]="form" (ngSubmit)="save()" novalidate>
        @if (serverError()) {
          <ui-alert tone="error">{{ serverError() }}</ui-alert>
        }
        <ui-form-field label="Nombre" required>
          <ui-input formControlName="name" placeholder="Ej. Uniformes" />
        </ui-form-field>
      </form>
      <ng-container uiModalFooter>
        <button ui-button type="button" (click)="open.set(false)">Cancelar</button>
        <button ui-button variant="primary" type="submit" form="category-form" [loading]="saving()">
          Guardar
        </button>
      </ng-container>
    </ui-modal>
  `,
  styleUrls: ['../inventory-page.scss'],
})
export class CategoriesPage {
  private readonly inventory = inject(InventoryService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly categories = rxResource({ stream: () => this.inventory.categories() });
  protected readonly rows = computed(() => resourceValue(this.categories, []));
  protected readonly columns: TableColumn<InventoryCategory>[] = [
    { key: 'name', header: 'Nombre', sortable: true },
  ];
  protected readonly actions: TableAction<InventoryCategory>[] = [
    { id: 'edit', label: 'Renombrar', icon: 'pencil' },
    { id: 'delete', label: 'Eliminar', icon: 'trash', tone: 'danger' },
  ];

  protected readonly open = signal(false);
  protected readonly editing = signal<InventoryCategory | null>(null);
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
  });

  protected openForm(category: InventoryCategory | null = null): void {
    this.editing.set(category);
    this.serverError.set(null);
    this.form.reset({ name: category?.name ?? '' });
    this.open.set(true);
  }

  protected onAction(event: TableActionEvent<InventoryCategory>): void {
    if (event.action === 'edit') this.openForm(event.row);
    else void this.remove(event.row);
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const name = this.form.getRawValue().name.trim();
    const editing = this.editing();
    this.saving.set(true);
    this.serverError.set(null);
    try {
      await firstValueFrom(
        editing
          ? this.inventory.renameCategory(editing.id, name)
          : this.inventory.createCategory(name),
      );
      this.toast.success(editing ? 'Categoría renombrada.' : 'Categoría creada.');
      this.open.set(false);
      this.categories.reload();
    } catch (e) {
      this.serverError.set(toApiError(e).message);
    } finally {
      this.saving.set(false);
    }
  }

  private async remove(category: InventoryCategory): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Eliminar la categoría ${category.name}?`,
      message: 'Solo se pueden eliminar categorías sin ítems.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.inventory.deleteCategory(category.id));
      this.toast.success('Categoría eliminada.');
      this.categories.reload();
    } catch (e) {
      notifyError(this.toast, e);
    }
  }
}
