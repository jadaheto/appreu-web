import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ToastService } from '../../../core';
import { UiButton } from '../../../shared/ui';
import { saveBlob } from '../data-access/hr-download';

/**
 * Botón "Descargar PDF": pide el documento a la API (`application/pdf`) y lo
 * guarda con `fileName`. Los errores HTTP los notifica el interceptor global.
 */
@Component({
  selector: 'app-pdf-download-button',
  imports: [UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      ui-button
      [variant]="variant()"
      icon="download"
      [loading]="busy()"
      [disabled]="disabled()"
      (click)="download()"
    >
      {{ label() }}
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
  `,
})
export class PdfDownloadButton {
  private readonly toast = inject(ToastService);
  private readonly doc = inject(DOCUMENT);

  /** Fábrica de la petición (se invoca en cada clic). */
  readonly request = input.required<() => Observable<Blob>>();
  readonly fileName = input.required<string>();
  readonly label = input('Descargar PDF');
  readonly variant = input<'primary' | 'secondary' | 'ghost'>('secondary');
  readonly disabled = input(false);

  protected readonly busy = signal(false);

  protected download(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.request()().subscribe({
      next: (blob) => {
        this.busy.set(false);
        saveBlob(blob, this.fileName(), this.doc);
        this.toast.success('PDF descargado.');
      },
      error: () => this.busy.set(false),
    });
  }
}
