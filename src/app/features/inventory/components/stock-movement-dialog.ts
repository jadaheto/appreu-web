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
import { toSignal } from '@angular/core/rxjs-interop';
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
  UiTextarea,
} from '../../../shared/ui';
import {
  InventoryItem,
  ManualMovementType,
  StockMovementResult,
} from '../data-access/inventory.models';
import { InventoryService } from '../data-access/inventory.service';
import { INTEGER_MESSAGES, integerValidator } from './integer.validator';

/**
 * Registro de entradas, salidas y ajustes de stock. El stock solo cambia
 * con movimientos; el ajuste exige motivo y recibe el stock contado.
 */
@Component({
  selector: 'app-stock-movement-dialog',
  imports: [
    ReactiveFormsModule,
    UiAlert,
    UiButton,
    UiFormField,
    UiInput,
    UiModal,
    UiSelect,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-modal
      [(open)]="open"
      title="Registrar movimiento"
      [description]="item() ? item()!.sku + ' · ' + item()!.name : ''"
    >
      @if (item(); as it) {
        <form
          id="movement-form"
          class="grid-form"
          [formGroup]="form"
          (ngSubmit)="save()"
          novalidate
        >
          @if (serverError()) {
            <ui-alert tone="error">{{ serverError() }}</ui-alert>
          }
          <p class="current">
            Stock actual: <strong class="font-mono">{{ it.stock }} {{ it.unit }}</strong> · mínimo
            {{ it.minStock }}
          </p>
          <ui-form-field label="Tipo de movimiento" required>
            <ui-select formControlName="type" [options]="typeOptions" [placeholder]="null" />
          </ui-form-field>
          <ui-form-field
            [label]="type() === 'ajuste' ? 'Stock contado' : 'Cantidad'"
            required
            [hint]="hint()"
            [errorMessages]="integerMessages"
          >
            <ui-input
              type="number"
              formControlName="quantity"
              [min]="type() === 'ajuste' ? 0 : 1"
              step="1"
              mono
            />
          </ui-form-field>
          @if (type() === 'entrada') {
            <ui-form-field
              label="Costo unitario de compra"
              hint="Opcional: recalcula el costo promedio ponderado."
            >
              <ui-input
                type="number"
                formControlName="unitCost"
                min="0"
                step="0.01"
                prefix="$"
                mono
              />
            </ui-form-field>
          }
          <ui-form-field
            [label]="type() === 'ajuste' ? 'Motivo del ajuste' : 'Motivo'"
            [required]="type() === 'ajuste'"
          >
            <ui-textarea formControlName="reason" [maxlength]="255" [rows]="2" />
          </ui-form-field>
        </form>
      }
      <ng-container uiModalFooter>
        <button ui-button type="button" (click)="open.set(false)">Cancelar</button>
        <button ui-button variant="primary" type="submit" form="movement-form" [loading]="saving()">
          Registrar movimiento
        </button>
      </ng-container>
    </ui-modal>
  `,
  styles: `
    .grid-form {
      display: grid;
      gap: var(--space-4);
    }
    .current {
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }
  `,
})
export class StockMovementDialog {
  private readonly inventory = inject(InventoryService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly open = model(false);
  readonly item = input<InventoryItem | null>(null);
  readonly initialType = input<ManualMovementType>('entrada');
  readonly saved = output<StockMovementResult>();

  protected readonly typeOptions: SelectOption<ManualMovementType>[] = [
    { value: 'entrada', label: 'Entrada (compra / recepción)' },
    { value: 'salida', label: 'Salida (venta / consumo)' },
    { value: 'ajuste', label: 'Ajuste por conteo físico' },
  ];
  protected readonly integerMessages = INTEGER_MESSAGES;
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly form = this.fb.group({
    type: this.fb.nonNullable.control<ManualMovementType>('entrada'),
    quantity: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      integerValidator,
    ]),
    unitCost: this.fb.control<number | null>(null, Validators.min(0)),
    reason: this.fb.nonNullable.control('', Validators.maxLength(255)),
  });
  protected readonly type = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });
  protected readonly hint = computed(() =>
    this.type() === 'ajuste'
      ? 'Escribe las unidades contadas; la API calcula la diferencia.'
      : this.type() === 'salida'
        ? 'Unidades que salen del inventario.'
        : 'Unidades que ingresan al inventario.',
  );

  constructor() {
    effect(() => {
      if (this.open()) {
        const type = this.initialType();
        untracked(() => {
          this.serverError.set(null);
          this.form.reset({ type, quantity: null, unitCost: null, reason: '' });
          this.applyRules(type);
        });
      }
    });
    this.form.controls.type.valueChanges.subscribe((t) => this.applyRules(t));
  }

  private applyRules(type: ManualMovementType): void {
    const { quantity, reason } = this.form.controls;
    quantity.setValidators([
      Validators.required,
      Validators.min(type === 'ajuste' ? 0 : 1),
      integerValidator,
    ]);
    reason.setValidators(
      type === 'ajuste'
        ? [Validators.required, Validators.maxLength(255)]
        : [Validators.maxLength(255)],
    );
    quantity.updateValueAndValidity({ emitEvent: false });
    reason.updateValueAndValidity({ emitEvent: false });
  }

  protected async save(): Promise<void> {
    const item = this.item();
    if (!item) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.serverError.set(null);
    try {
      const result = await firstValueFrom(
        this.inventory.registerMovement(item.id, {
          type: v.type,
          quantity: v.quantity ?? 0,
          ...(v.type === 'entrada' && v.unitCost !== null ? { unitCost: v.unitCost } : {}),
          ...(v.reason.trim() ? { reason: v.reason.trim() } : {}),
        }),
      );
      this.toast.success(result.message);
      this.saved.emit(result);
      this.open.set(false);
    } catch (e) {
      this.serverError.set(toApiError(e).message);
    } finally {
      this.saving.set(false);
    }
  }
}
