import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmService, ToastService } from './core';
import { UiConfirmDialog, UiModal, UiToastStack } from './shared/ui';

/** Raíz: router + hosts globales de toasts y del diálogo de confirmación. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiToastStack, UiModal, UiConfirmDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <ui-toast-stack [toasts]="toast.toasts()" (dismiss)="toast.dismiss($event)" />
    @if (confirm.state(); as c) {
      <ui-modal [open]="true" size="sm" [showClose]="false" (closed)="confirm.respond(false)">
        <ui-confirm-dialog
          [title]="c.title"
          [message]="c.message ?? ''"
          [tone]="c.tone ?? 'primary'"
          [confirmLabel]="c.confirmLabel ?? 'Confirmar'"
          [cancelLabel]="c.cancelLabel ?? 'Cancelar'"
          (confirmed)="confirm.respond(true)"
          (cancelled)="confirm.respond(false)"
        />
      </ui-modal>
    }
  `,
})
export class App {
  protected readonly toast = inject(ToastService);
  protected readonly confirm = inject(ConfirmService);
}
