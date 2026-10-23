import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  forwardRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { UiIcon } from '../../atoms/icon/icon';
import { UI_FORM_CONTROL } from '../../forms/form-control';
import { UiControlBase } from '../../forms/control-base';

interface ToolbarAction {
  command: string;
  label: string;
  text?: string;
  icon?: string;
  value?: string;
}

const ACTIONS: readonly ToolbarAction[] = [
  { command: 'bold', label: 'Negrita', text: 'B' },
  { command: 'italic', label: 'Cursiva', text: 'I' },
  { command: 'underline', label: 'Subrayado', text: 'U' },
  { command: 'formatBlock', value: 'h3', label: 'Título', text: 'H' },
  { command: 'formatBlock', value: 'p', label: 'Párrafo', text: '¶' },
  { command: 'insertUnorderedList', label: 'Lista con viñetas', text: '•' },
  { command: 'insertOrderedList', label: 'Lista numerada', text: '1.' },
  { command: 'createLink', label: 'Insertar enlace', icon: 'document-text' },
  { command: 'removeFormat', label: 'Quitar formato', icon: 'x-mark' },
];

/** Texto visible de un HTML (para validar "vacío"). */
export function htmlText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Editor HTML mínimo sin librerías (`contenteditable` + barra de formato).
 * Es un `ControlValueAccessor`: el valor es el HTML; un editor sin texto vale `''`.
 * Al pegar se inserta texto plano para no arrastrar estilos externos; el
 * servidor sanea el HTML de todas formas.
 */
@Component({
  selector: 'ui-rich-text-editor',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiRichTextEditor), multi: true },
    { provide: UI_FORM_CONTROL, useExisting: forwardRef(() => UiRichTextEditor) },
  ],
  template: `
    <div class="editor" [class.invalid]="isInvalid()" [class.disabled]="isDisabled()">
      <div class="toolbar" role="toolbar" [attr.aria-label]="'Formato de ' + ariaLabel()">
        @for (a of actions; track a.label) {
          <button
            type="button"
            class="tool"
            [attr.aria-label]="a.label"
            [attr.title]="a.label"
            [disabled]="isDisabled()"
            (mousedown)="$event.preventDefault()"
            (click)="run(a)"
          >
            @if (a.icon) {
              <ui-icon [name]="a.icon" [size]="16" />
            } @else {
              <span [class]="'t-' + a.command">{{ a.text }}</span>
            }
          </button>
        }
      </div>
      <div
        #area
        class="area"
        [id]="resolvedId()"
        role="textbox"
        aria-multiline="true"
        [attr.aria-label]="ariaLabel()"
        [attr.aria-invalid]="isInvalid() || null"
        [attr.aria-describedby]="describedBy()"
        [attr.contenteditable]="!isDisabled()"
        [attr.data-placeholder]="placeholder()"
        [style.min-height.px]="minHeight()"
        (input)="sync()"
        (blur)="touch()"
        (paste)="onPaste($event)"
      ></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .editor {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      overflow: hidden;
    }
    .editor:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-ring);
    }
    .editor.invalid {
      border-color: var(--color-danger);
    }
    .editor.disabled {
      opacity: 0.7;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      padding: 0.4rem;
      border-bottom: 1px solid var(--color-border-soft);
      background: var(--color-surface-2);
    }
    .tool {
      min-width: 2rem;
      height: 2rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      border-radius: var(--radius-sm, 6px);
      background: transparent;
      color: var(--color-text);
      font-weight: 700;
      cursor: pointer;
    }
    .tool:hover:not(:disabled),
    .tool:focus-visible {
      border-color: var(--color-border);
      background: var(--color-surface);
    }
    .t-italic {
      font-style: italic;
    }
    .t-underline {
      text-decoration: underline;
    }
    .area {
      padding: 0.75rem 1rem;
      outline: 0;
      color: var(--color-text-strong);
      font-size: var(--text-sm);
      line-height: 1.6;
      overflow-y: auto;
      max-height: 32rem;
    }
    .area:empty::before {
      content: attr(data-placeholder);
      color: var(--color-text-subtle);
    }
    .area :is(ul, ol) {
      padding-left: 1.5rem;
    }
  `,
})
export class UiRichTextEditor extends UiControlBase<string> {
  private readonly document = inject(DOCUMENT);
  private readonly area = viewChild<ElementRef<HTMLElement>>('area');

  readonly placeholder = input('Escribe el mensaje…');
  readonly ariaLabel = input('Mensaje');
  readonly minHeight = input(240);

  protected readonly actions = ACTIONS;

  constructor() {
    super();
    afterNextRender(() => this.render(this.value()));
  }

  protected emptyValue(): string {
    return '';
  }
  protected override idPrefix(): string {
    return 'app-rte';
  }

  override writeValue(value: string | null | undefined): void {
    super.writeValue(value);
    this.render(value ?? '');
  }

  private render(html: string): void {
    const el = this.area()?.nativeElement;
    if (el && el.innerHTML !== html) el.innerHTML = html;
  }

  protected sync(): void {
    const el = this.area()?.nativeElement;
    if (!el) return;
    const html = el.innerHTML;
    this.commit(htmlText(html) ? html : '');
  }

  protected run(action: ToolbarAction): void {
    this.area()?.nativeElement.focus();
    let value = action.value;
    if (action.command === 'createLink') {
      const url = this.document.defaultView?.prompt('URL del enlace (https://…)', 'https://');
      if (!url || !/^(https?:|mailto:)/i.test(url.trim())) return;
      value = url.trim();
    }
    this.exec(action.command, value);
    this.sync();
  }

  protected onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text/plain');
    if (text === undefined) return;
    event.preventDefault();
    this.exec('insertText', text);
    this.sync();
  }

  private exec(command: string, value?: string): void {
    const doc = this.document as Document & {
      execCommand?: (c: string, ui?: boolean, v?: string) => boolean;
    };
    doc.execCommand?.(command, false, value);
  }
}
