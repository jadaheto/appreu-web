import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { UiFormField, UiSelect } from '../../../shared/ui';
import { EInvoicingService } from '../data-access/e-invoicing.service';
import { catalogOptions } from './e-invoicing-ui';
import { resourceValue } from '../../../core/resource/resource-value';

/** Departamento → municipio DANE (catálogos de la API). */
@Component({
  selector: 'app-dane-location-fields',
  imports: [ReactiveFormsModule, UiFormField, UiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-form-field label="Departamento" [required]="required()">
      <ui-select
        [formControl]="departmentControl()"
        [options]="departmentOptions()"
        placeholder="Seleccione el departamento…"
        (change)="onDepartmentChange()"
      />
    </ui-form-field>
    <ui-form-field
      label="Municipio"
      [required]="required()"
      [hint]="cities.isLoading() ? 'Cargando municipios…' : ''"
    >
      <ui-select
        [formControl]="cityControl()"
        [options]="cityOptions()"
        [placeholder]="department() ? 'Seleccione el municipio…' : 'Primero elija el departamento'"
      />
    </ui-form-field>
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class DaneLocationFields implements OnInit {
  private readonly service = inject(EInvoicingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly departmentControl = input.required<FormControl<string | null>>();
  readonly cityControl = input.required<FormControl<string | null>>();
  readonly required = input(false, { transform: booleanAttribute });

  protected readonly department = signal<string | null>(null);
  protected readonly departments = rxResource({
    stream: () => this.service.catalog('dane-departments'),
  });
  protected readonly cities = rxResource({
    params: () => this.department() || undefined,
    stream: ({ params }) => this.service.cities(params),
  });
  protected readonly departmentOptions = computed(() =>
    catalogOptions(resourceValue(this.departments), false),
  );
  protected readonly cityOptions = computed(() =>
    this.department() ? catalogOptions(resourceValue(this.cities), false) : [],
  );

  ngOnInit(): void {
    const control = this.departmentControl();
    this.department.set(control.value);
    control.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.department.set(v));
  }

  /** Solo cuando el usuario cambia el departamento se limpia el municipio. */
  protected onDepartmentChange(): void {
    this.cityControl().setValue(null);
    this.cityControl().markAsDirty();
  }
}
