import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BrandingService, ToastService, toApiError } from '../../../core';
import {
  SelectOption,
  UiAlert,
  UiButton,
  UiCheckbox,
  UiFormField,
  UiInput,
  UiSelect,
  UiSpinner,
} from '../../../shared/ui';
import {
  SECRET_MASK,
  SettingField,
  SettingsSectionMetadata,
  SettingValue,
} from '../data-access/administration.models';
import { InstitutionService } from '../data-access/institution.service';
import {
  buildSettingControl,
  changedSettingValues,
  optionLabel,
  settingErrors,
} from '../data-access/settings-form';

/**
 * Formulario de una pestaña de configuración generado desde los metadatos
 * tipados de la API (texto, números, booleanos, listas, colores, correos, URL,
 * fechas). Los secretos llegan enmascarados (`••••••••`) y solo se envían si cambian.
 */
@Component({
  selector: 'app-settings-section-form',
  imports: [
    ReactiveFormsModule,
    UiAlert,
    UiButton,
    UiCheckbox,
    UiFormField,
    UiInput,
    UiSelect,
    UiSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="ui-card__title">{{ meta().label }}</h2>
    @if (values.isLoading() && !form()) {
      <ui-spinner size="lg" />
    } @else if (values.error() && !form()) {
      <ui-alert tone="error" title="No se pudo cargar la sección">
        {{ loadError() }}
        <button ui-button size="sm" variant="ghost" (click)="values.reload()">Reintentar</button>
      </ui-alert>
    } @else if (form(); as f) {
      <form [formGroup]="f" (ngSubmit)="save()" novalidate>
        <div class="fields">
          @for (field of meta().fields; track field.key) {
            @switch (field.type) {
              @case ('boolean') {
                <div class="field field--check">
                  <ui-checkbox [formControlName]="field.key">{{ field.label }}</ui-checkbox>
                </div>
              }
              @case ('enum-set') {
                <fieldset class="field field--wide set">
                  <legend>{{ field.label }}</legend>
                  <div class="set__options">
                    @for (opt of field.options ?? []; track opt) {
                      <ui-checkbox
                        [checked]="isChecked(field.key, opt)"
                        [disabled]="field.readOnly || saving()"
                        (checkedChange)="toggleOption(field.key, opt, $event)"
                        >{{ optionLabel(opt) }}</ui-checkbox
                      >
                    }
                  </div>
                </fieldset>
              }
              @case ('enum') {
                <ui-form-field class="field" [label]="field.label">
                  <ui-select
                    [options]="enumOptions(field)"
                    placeholder="Sin definir"
                    [formControlName]="field.key"
                  />
                </ui-form-field>
              }
              @case ('hex-color') {
                <ui-form-field class="field" [label]="field.label" [errorMessages]="errors(field)">
                  <div class="color">
                    <input
                      type="color"
                      [value]="colorValue(field.key)"
                      [disabled]="field.readOnly || saving()"
                      [attr.aria-label]="field.label + ' (selector)'"
                      (input)="setColor(field.key, $any($event.target).value)"
                    />
                    <ui-input
                      mono
                      [formControlName]="field.key"
                      placeholder="#4f46e5"
                      [maxlength]="7"
                    />
                  </div>
                </ui-form-field>
              }
              @default {
                <ui-form-field
                  class="field"
                  [label]="field.label"
                  [hint]="hint(field)"
                  [errorMessages]="errors(field)"
                >
                  <ui-input
                    [type]="inputType(field)"
                    [formControlName]="field.key"
                    [mono]="field.type === 'url' || field.secret"
                    [min]="field.min"
                    [max]="field.max"
                    [step]="field.type === 'decimal' ? 'any' : field.type === 'integer' ? 1 : null"
                    [maxlength]="field.maxLength"
                    [autocomplete]="field.secret ? 'new-password' : 'off'"
                  />
                </ui-form-field>
              }
            }
          }
        </div>
        <div class="actions">
          <button
            ui-button
            type="button"
            variant="ghost"
            [disabled]="!f.dirty || saving()"
            (click)="reset()"
          >
            Descartar cambios
          </button>
          <button ui-button type="submit" variant="primary" icon="check" [loading]="saving()">
            Guardar {{ meta().label }}
          </button>
        </div>
      </form>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .fields {
      display: grid;
      gap: var(--space-4);
      grid-template-columns: 1fr;
    }
    @media (min-width: 768px) {
      .fields {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .field--wide {
        grid-column: 1 / -1;
      }
    }
    .field--check {
      display: flex;
      align-items: center;
      min-height: 2.5rem;
    }
    .set {
      border: 0;
      padding: 0;
      margin: 0;
    }
    .set legend {
      font-size: var(--text-xs);
      font-weight: 600;
      margin-bottom: var(--space-2);
    }
    .set__options {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3) var(--space-5);
    }
    .color {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .color input[type='color'] {
      width: 3rem;
      height: 2.5rem;
      padding: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: none;
      cursor: pointer;
    }
    .color ui-input {
      flex: 1;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--space-3);
      margin-top: var(--space-6);
    }
  `,
})
export class SettingsSectionForm {
  private readonly institution = inject(InstitutionService);
  private readonly toast = inject(ToastService);
  private readonly branding = inject(BrandingService);

  readonly meta = input.required<SettingsSectionMetadata>();
  /** Solo lectura (p. ej. si el rol no puede editar). */
  readonly readOnly = input(false);

  protected readonly values = rxResource({
    params: () => this.meta().key,
    stream: ({ params }) => this.institution.section(params),
  });
  protected readonly form = signal<FormGroup | null>(null);
  private initial: Record<string, SettingValue> = {};
  protected readonly saving = signal(false);
  protected readonly loadError = computed(() => {
    const err = this.values.error();
    return err ? toApiError(err).message : '';
  });
  protected readonly optionLabel = optionLabel;

  constructor() {
    effect(() => {
      if (!this.values.hasValue()) return;
      this.build(this.values.value().values);
    });
  }

  private build(values: Record<string, SettingValue>): void {
    this.initial = { ...values };
    const controls: Record<string, FormControl> = {};
    for (const field of this.meta().fields)
      controls[field.key] = buildSettingControl(field, values[field.key]);
    const group = new FormGroup(controls);
    if (this.readOnly()) group.disable();
    this.form.set(group);
  }

  protected inputType(
    field: SettingField,
  ): 'text' | 'email' | 'url' | 'number' | 'date' | 'password' {
    if (field.secret) return 'password';
    switch (field.type) {
      case 'integer':
      case 'decimal':
        return 'number';
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  }

  protected hint(field: SettingField): string {
    if (field.secret) {
      return this.initial[field.key] === SECRET_MASK
        ? 'Configurado. Déjalo así para conservarlo o escribe uno nuevo; vacío lo elimina.'
        : 'Sin configurar.';
    }
    if (field.readOnly) return 'Calculado automáticamente.';
    if (field.min !== null && field.max !== null) return `Entre ${field.min} y ${field.max}.`;
    return '';
  }

  protected errors(field: SettingField): Record<string, string> {
    return settingErrors(field);
  }

  protected enumOptions(field: SettingField): SelectOption<string>[] {
    return (field.options ?? []).map((o) => ({ value: o, label: optionLabel(o) }));
  }

  protected isChecked(key: string, option: string): boolean {
    const value = this.form()?.get(key)?.value;
    return Array.isArray(value) && value.includes(option);
  }

  protected toggleOption(key: string, option: string, checked: boolean): void {
    const control = this.form()?.get(key);
    if (!control) return;
    const current: string[] = Array.isArray(control.value) ? control.value : [];
    control.setValue(
      checked ? [...new Set([...current, option])] : current.filter((o) => o !== option),
    );
    control.markAsDirty();
  }

  protected colorValue(key: string): string {
    const v = this.form()?.get(key)?.value;
    return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : '#000000';
  }

  protected setColor(key: string, value: string): void {
    const control = this.form()?.get(key);
    control?.setValue(value);
    control?.markAsDirty();
  }

  protected reset(): void {
    this.build(this.initial);
  }

  protected save(): void {
    const form = this.form();
    if (!form || this.saving()) return;
    form.markAllAsTouched();
    if (form.invalid) return;
    const changes = changedSettingValues(this.meta().fields, form.getRawValue(), this.initial);
    if (!Object.keys(changes).length) {
      this.toast.info('No hay cambios por guardar.');
      return;
    }
    this.saving.set(true);
    this.institution.updateSection(this.meta().key, changes).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.build(res.values);
        if (this.meta().key === 'branding') this.applyBranding(res.values);
        this.toast.success(`${this.meta().label}: configuración guardada.`);
      },
      error: (err) => {
        this.saving.set(false);
        const e = toApiError(err);
        if (!(
          e.status === 0 ||
          e.status === 403 ||
          e.status === 429 ||
          e.status >= 500 ||
          e.status === 401
        ))
          this.toast.error(e.message);
      },
    });
  }

  /** Aplica de inmediato colores y tamaño del logo guardados. */
  private applyBranding(values: Record<string, SettingValue>): void {
    this.branding.apply({
      colorPrimary: (values['color_primary'] as string) ?? null,
      colorHeaderBg: (values['color_header_bg'] as string) ?? null,
      colorHeaderBar: (values['color_header_bar'] as string) ?? null,
      logoSize: (values['logo_size'] as number) ?? null,
    });
  }
}
