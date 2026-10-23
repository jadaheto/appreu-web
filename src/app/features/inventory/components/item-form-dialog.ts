import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { toApiError, ToastService } from '../../../core';
import {
  SelectOption,
  UiAlert,
  UiButton,
  UiFormField,
  UiInput,
  UiModal,
  UiSelect,
} from '../../../shared/ui';
import { InventoryCategory, InventoryItem, ItemRequest } from '../data-access/inventory.models';
import { InventoryService } from '../data-access/inventory.service';
import { INTEGER_MESSAGES, integerValidator } from './integer.validator';

/** Alta/edición de un ítem. En edición el stock no es editable (solo por movimientos). */
@Component({
  selector: 'app-item-form-dialog',
  imports: [ReactiveFormsModule, UiAlert, UiButton, UiFormField, UiInput, UiModal, UiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal [(open)]="open" size="lg" [title]="item() ? 'Editar ítem' : 'Nuevo ítem'">
      <form id="item-form" class="form-grid" [formGroup]="form" (ngSubmit)="save()" novalidate>
        @if (serverError()) {
          <ui-alert tone="error" class="full">{{ serverError() }}</ui-alert>
        }
        <ui-form-field label="Nombre" required class="full">
          <ui-input formControlName="name" placeholder="Ej. Camiseta uniforme talla 10" />
        </ui-form-field>
        <ui-form-field label="SKU" required>
          <ui-input formControlName="sku" mono placeholder="UNI-CAM-10" />
        </ui-form-field>
        <ui-form-field label="Categoría">
          <ui-select
            formControlName="categoryId"
            [options]="categoryOptions()"
            placeholder="Sin categoría"
          />
        </ui-form-field>
        <ui-form-field label="Unidad" hint="Ej. und, par, caja">
          <ui-input formControlName="unit" />
        </ui-form-field>
        <ui-form-field label="Ubicación">
          <ui-input formControlName="location" placeholder="Bodega 1, estante A" />
        </ui-form-field>
        <ui-form-field label="Costo unitario" required>
          <ui-input type="number" formControlName="unitCost" min="0" step="0.01" prefix="$" mono />
        </ui-form-field>
        <ui-form-field label="Precio de venta" required>
          <ui-input type="number" formControlName="salePrice" min="0" step="0.01" prefix="$" mono />
        </ui-form-field>
        <ui-form-field label="Stock mínimo" required [errorMessages]="integerMessages">
          <ui-input type="number" formControlName="minStock" min="0" step="1" mono />
        </ui-form-field>
        @if (item(); as it) {
          <ui-form-field label="Stock actual" hint="Cambia solo con entradas, salidas o ajustes.">
            <ui-input [value]="it.stock + ' ' + it.unit" readonly mono ariaLabel="Stock actual" />
          </ui-form-field>
        } @else {
          <ui-form-field
            label="Stock inicial"
            hint="Se registra como movimiento inicial en el kárdex."
            [errorMessages]="integerMessages"
          >
            <ui-input type="number" formControlName="initialStock" min="0" step="1" mono />
          </ui-form-field>
        }
      </form>
      <ng-container uiModalFooter>
        <button ui-button type="button" (click)="open.set(false)">Cancelar</button>
        <button ui-button variant="primary" type="submit" form="item-form" [loading]="saving()">
          Guardar
        </button>
      </ng-container>
    </ui-modal>
  `,
  styles: `
    .form-grid {
      display: grid;
      gap: var(--space-4);
      grid-template-columns: 1fr;
    }
    @media (min-width: 640px) {
      .form-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .full {
        grid-column: 1 / -1;
      }
    }
  `,
})
export class ItemFormDialog {
  private readonly inventory = inject(InventoryService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly open = model(false);
  readonly item = input<InventoryItem | null>(null);
  readonly categories = input<readonly InventoryCategory[]>([]);
  readonly saved = output<InventoryItem>();

  protected readonly integerMessages = INTEGER_MESSAGES;
  protected readonly categoryOptions = computed<SelectOption<number>[]>(() =>
    this.categories().map((c) => ({ value: c.id, label: c.name })),
  );
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    sku: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    categoryId: this.fb.control<number | null>(null),
    unit: this.fb.nonNullable.control('und', Validators.maxLength(20)),
    location: this.fb.nonNullable.control('', Validators.maxLength(100)),
    unitCost: this.fb.control<number | null>(0, [Validators.required, Validators.min(0)]),
    salePrice: this.fb.control<number | null>(0, [Validators.required, Validators.min(0)]),
    minStock: this.fb.control<number | null>(5, [
      Validators.required,
      Validators.min(0),
      integerValidator,
    ]),
    initialStock: this.fb.control<number | null>(0, [Validators.min(0), integerValidator]),
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const it = this.item();
      untracked(() => {
        this.serverError.set(null);
        this.form.reset(
          it
            ? {
                name: it.name,
                sku: it.sku,
                categoryId: it.categoryId,
                unit: it.unit,
                location: it.location ?? '',
                unitCost: it.unitCost,
                salePrice: it.salePrice,
                minStock: it.minStock,
                initialStock: 0,
              }
            : { unit: 'und', unitCost: 0, salePrice: 0, minStock: 5, initialStock: 0 },
        );
      });
    });
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const dto: ItemRequest = {
      name: v.name.trim(),
      sku: v.sku.trim(),
      categoryId: v.categoryId,
      unit: v.unit.trim() || 'und',
      unitCost: v.unitCost ?? 0,
      salePrice: v.salePrice ?? 0,
      minStock: v.minStock ?? 0,
      ...(v.location.trim() ? { location: v.location.trim() } : {}),
    };
    const editing = this.item();
    this.saving.set(true);
    this.serverError.set(null);
    try {
      const saved = await firstValueFrom(
        editing
          ? this.inventory.updateItem(editing.id, dto)
          : this.inventory.createItem({ ...dto, initialStock: v.initialStock ?? 0 }),
      );
      this.toast.success(editing ? 'Ítem actualizado.' : 'Ítem creado.');
      this.saved.emit(saved);
      this.open.set(false);
    } catch (e) {
      this.serverError.set(toApiError(e).message);
    } finally {
      this.saving.set(false);
    }
  }
}
