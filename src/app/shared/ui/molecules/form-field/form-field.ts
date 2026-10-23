import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  input,
  signal,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { UiLabel } from '../../atoms/label/label';
import { uniqueId, UI_FORM_CONTROL } from '../../forms/form-control';
import { ErrorMessageMap, validationMessage } from '../../forms/validation-messages';

/**
 * Etiqueta + control + ayuda + error. Detecta el control proyectado
 * (`ui-input`, `ui-select`…) y su `NgControl`: enlaza `for`/`aria-describedby`
 * y muestra el primer error en español cuando el campo fue tocado.
 *
 * ```html
 * <ui-form-field label="Correo" hint="Usa tu correo institucional" required>
 *   <ui-input type="email" formControlName="email" />
 * </ui-form-field>
 * ```
 */
@Component({
  selector: 'ui-form-field',
  imports: [UiLabel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-form-field', '[class.has-error]': '!!errorText()' },
  template: `
    @if (label()) {
      <ui-label [for]="control()?.controlId() ?? null" [required]="required()">{{
        label()
      }}</ui-label>
    }
    <ng-content />
    @if (errorText(); as err) {
      <p class="error" [id]="errorId" role="alert">{{ err }}</p>
    } @else if (hint()) {
      <p class="hint" [id]="hintId">{{ hint() }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .hint,
    .error {
      margin-top: 0.375rem;
      font-size: var(--text-xs);
    }
    .hint {
      color: var(--color-text-subtle);
    }
    .error {
      color: var(--color-danger);
      font-weight: 600;
    }
  `,
})
export class UiFormField {
  readonly label = input('');
  readonly hint = input('');
  readonly required = input(false, { transform: booleanAttribute });
  /** Error explícito (p. ej. del servidor); tiene prioridad sobre los validadores. */
  readonly error = input<string | null>(null);
  /** Mensajes personalizados por clave de error. */
  readonly errorMessages = input<ErrorMessageMap>({});

  protected readonly control = contentChild(UI_FORM_CONTROL);
  private readonly ngControl = contentChild(NgControl);
  private readonly version = signal(0);

  protected readonly hintId = uniqueId('ui-hint');
  protected readonly errorId = uniqueId('ui-error');

  readonly errorText = computed(() => {
    this.version();
    const explicit = this.error();
    if (explicit) return explicit;
    const c = this.ngControl()?.control;
    if (!c || !c.invalid || !(c.touched || c.dirty)) return null;
    return validationMessage(c.errors, this.errorMessages());
  });

  constructor() {
    effect((onCleanup) => {
      const c = this.ngControl()?.control;
      if (!c) return;
      const sub = c.events.subscribe(() => this.version.update((v) => v + 1));
      onCleanup(() => sub.unsubscribe());
    });

    effect(() => {
      const ctrl = this.control();
      if (!ctrl) return;
      const err = this.errorText();
      ctrl.fieldInvalid.set(!!err);
      ctrl.describedBy.set(err ? this.errorId : this.hint() ? this.hintId : null);
    });
  }
}
