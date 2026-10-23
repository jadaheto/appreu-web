import { DOCUMENT } from '@angular/common';
import {
  booleanAttribute,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { UiIcon } from '../../atoms/icon/icon';
import { uniqueId } from '../../forms/form-control';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Ventana modal accesible (`role="dialog"`, `aria-modal`): atrapa el foco,
 * cierra con Escape o clic en el fondo, bloquea el scroll del body y
 * devuelve el foco al elemento que la abrió.
 *
 * ```html
 * <ui-modal [(open)]="crearAbierto" title="Nuevo usuario">
 *   ...formulario...
 *   <ng-container uiModalFooter>
 *     <button ui-button (click)="crearAbierto.set(false)">Cancelar</button>
 *   </ng-container>
 * </ui-modal>
 * ```
 */
@Component({
  selector: 'ui-modal',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class UiModal {
  private readonly document = inject(DOCUMENT);

  readonly open = model(false);
  readonly title = input('');
  readonly description = input('');
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly closeOnBackdrop = input(true, { transform: booleanAttribute });
  readonly closeOnEscape = input(true, { transform: booleanAttribute });
  readonly showClose = input(true, { transform: booleanAttribute });
  readonly closed = output<void>();

  protected readonly titleId = uniqueId('ui-modal-title');
  protected readonly descId = uniqueId('ui-modal-desc');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private previouslyFocused: HTMLElement | null = null;
  private focused = false;

  constructor() {
    effect(() => {
      const isOpen = this.open();
      this.document.body.classList.toggle('ui-scroll-locked', isOpen);
      if (isOpen) {
        this.previouslyFocused = this.document.activeElement as HTMLElement | null;
      } else if (this.focused) {
        this.focused = false;
        this.previouslyFocused?.focus?.();
      }
    });

    afterRenderEffect(() => {
      const panel = this.panel()?.nativeElement;
      if (!panel || this.focused) return;
      this.focused = true;
      const first =
        panel.querySelector<HTMLElement>('[autofocus]') ??
        panel.querySelector('.body')?.querySelector<HTMLElement>(FOCUSABLE) ??
        panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    });

    inject(DestroyRef).onDestroy(() => this.document.body.classList.remove('ui-scroll-locked'));
  }

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.closed.emit();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === event.currentTarget) this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.closeOnEscape()) {
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const panel = this.panel()?.nativeElement;
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = this.document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
