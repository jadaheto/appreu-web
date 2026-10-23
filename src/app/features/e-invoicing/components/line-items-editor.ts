import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { SelectOption, UiButton, UiFormField, UiInput, UiSelect } from '../../../shared/ui';
import {
  DocumentLineInput,
  TAX_TREATMENT_LABELS,
  TaxTreatment,
} from '../data-access/e-invoicing.models';

export type LineForm = FormGroup<{
  description: FormControl<string>;
  code: FormControl<string>;
  quantity: FormControl<number | null>;
  unitPrice: FormControl<number | null>;
  taxTreatment: FormControl<TaxTreatment>;
  taxRate: FormControl<number | null>;
}>;

/** Las líneas gravadas exigen tarifa de IVA. */
function taxRateRequired(group: AbstractControl): ValidationErrors | null {
  const { taxTreatment, taxRate } = group.value as {
    taxTreatment: TaxTreatment;
    taxRate: number | null;
  };
  return taxTreatment === 'taxed' && (taxRate === null || taxRate === undefined)
    ? { taxRateRequired: true }
    : null;
}

export function createLineForm(init: Partial<DocumentLineInput> = {}): LineForm {
  return new FormGroup(
    {
      description: new FormControl(init.description ?? '', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(300)],
      }),
      code: new FormControl(init.code ?? '', {
        nonNullable: true,
        validators: [Validators.maxLength(50)],
      }),
      quantity: new FormControl<number | null>(init.quantity ?? 1, [
        Validators.required,
        Validators.min(0.01),
      ]),
      unitPrice: new FormControl<number | null>(init.unitPrice ?? null, [
        Validators.required,
        Validators.min(0.01),
      ]),
      taxTreatment: new FormControl<TaxTreatment>(init.taxTreatment ?? 'excluded', {
        nonNullable: true,
      }),
      taxRate: new FormControl<number | null>(init.taxRate ?? null, [
        Validators.min(0),
        Validators.max(100),
      ]),
    },
    { validators: taxRateRequired },
  );
}

export function lineFormToInput(form: LineForm): DocumentLineInput {
  const v = form.getRawValue();
  const line: DocumentLineInput = {
    description: v.description.trim(),
    quantity: Number(v.quantity),
    unitPrice: Number(v.unitPrice),
    taxTreatment: v.taxTreatment,
  };
  if (v.code.trim()) line.code = v.code.trim();
  if (v.taxTreatment === 'taxed') line.taxRate = Number(v.taxRate);
  return line;
}

/** Estimación orientativa (la API calcula los totales definitivos con su redondeo). */
export function estimateTotals(lines: readonly DocumentLineInput[]): {
  subtotal: number;
  tax: number;
} {
  let subtotal = 0;
  let tax = 0;
  for (const l of lines) {
    const base = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
    subtotal += base;
    if (l.taxTreatment === 'taxed') tax += (base * (Number(l.taxRate) || 0)) / 100;
  }
  return { subtotal, tax };
}

/** Editor de líneas de factura/nota (FormArray de `LineForm`). */
@Component({
  selector: 'app-line-items-editor',
  imports: [ReactiveFormsModule, UiButton, UiFormField, UiInput, UiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lines" role="list" aria-label="Líneas del documento">
      @for (line of lines().controls; track line; let i = $index) {
        <fieldset class="line" role="listitem" [formGroup]="line">
          <legend class="sr-only">Línea {{ i + 1 }}</legend>
          <ui-form-field class="desc" label="Descripción" required>
            <ui-input formControlName="description" placeholder="Pensión marzo" />
          </ui-form-field>
          <ui-form-field label="Código">
            <ui-input formControlName="code" placeholder="PEN" mono />
          </ui-form-field>
          <ui-form-field label="Cantidad" required>
            <ui-input formControlName="quantity" type="number" min="0.01" step="1" />
          </ui-form-field>
          <ui-form-field label="Valor unitario" required>
            <ui-input formControlName="unitPrice" type="number" min="0" step="100" prefix="$" />
          </ui-form-field>
          <ui-form-field label="IVA">
            <ui-select formControlName="taxTreatment" [options]="treatments" [placeholder]="null" />
          </ui-form-field>
          @if (line.controls.taxTreatment.value === 'taxed') {
            <ui-form-field
              label="Tarifa IVA"
              required
              [error]="
                line.hasError('taxRateRequired') && line.controls.taxRate.touched
                  ? 'Indica la tarifa de IVA.'
                  : null
              "
            >
              <ui-input formControlName="taxRate" type="number" min="0" max="100" suffix="%" />
            </ui-form-field>
          }
          <div class="remove">
            <button
              ui-button
              type="button"
              variant="ghost"
              size="sm"
              icon="trash"
              iconOnly
              [attr.aria-label]="'Quitar línea ' + (i + 1)"
              [disabled]="lines().length <= minLines()"
              (click)="remove(i)"
            ></button>
          </div>
        </fieldset>
      }
    </div>
    <button ui-button type="button" variant="secondary" size="sm" icon="plus" (click)="add()">
      Agregar línea
    </button>
  `,
  styles: `
    :host {
      display: block;
    }
    .lines {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      margin-bottom: var(--space-3);
    }
    .line {
      display: grid;
      gap: var(--space-3);
      grid-template-columns: 1fr;
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius-md, 0.75rem);
      padding: var(--space-3);
      margin: 0;
    }
    @media (min-width: 900px) {
      .line {
        grid-template-columns: 2.5fr 1fr 0.8fr 1.2fr 1.2fr 0.9fr auto;
        align-items: end;
      }
    }
    .remove {
      display: flex;
      justify-content: flex-end;
    }
  `,
})
export class LineItemsEditor {
  readonly lines = input.required<FormArray<LineForm>>();
  readonly minLines = input(1);

  protected readonly treatments: SelectOption<TaxTreatment>[] = (
    Object.keys(TAX_TREATMENT_LABELS) as TaxTreatment[]
  ).map((t) => ({ value: t, label: TAX_TREATMENT_LABELS[t] }));

  protected add(): void {
    this.lines().push(createLineForm());
  }

  protected remove(index: number): void {
    if (this.lines().length > this.minLines()) this.lines().removeAt(index);
  }
}
