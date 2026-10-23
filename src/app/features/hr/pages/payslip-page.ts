import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { UiAlert, UiButton, UiSpinner } from '../../../shared/ui';
import { PayslipSheet } from '../components/payslip-sheet';
import { PdfDownloadButton } from '../components/pdf-download-button';
import { pdfFileName } from '../data-access/hr-download';
import { apiMessage } from '../data-access/hr-ui';
import { MyEmployeeService } from '../data-access/my-employee.service';
import { PayrollService } from '../data-access/payroll.service';
import { resourceValue } from '../../../core/resource/resource-value';

/**
 * Desprendible imprimible. `scope="admin"` (RR. HH./finanzas: cualquier
 * desprendible) o `scope="me"` (portal: solo los propios de períodos aprobados).
 * `scope` llega por `data` de la ruta.
 */
@Component({
  selector: 'app-payslip-page',
  imports: [UiAlert, UiButton, UiSpinner, PayslipSheet, PdfDownloadButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (doc.error()) {
      <ui-alert tone="error" title="No se pudo cargar el desprendible">{{ error() }}</ui-alert>
      <p style="margin-top: var(--space-4)">
        <button ui-button variant="ghost" icon="arrow-left" (click)="back()">Volver</button>
      </p>
    } @else if (doc.hasValue()) {
      <app-payslip-sheet [doc]="doc.value()">
        <app-pdf-download-button
          sheetActions
          variant="primary"
          [request]="pdf"
          [fileName]="fileName()"
        />
        <button sheetActions ui-button variant="ghost" icon="arrow-left" (click)="back()">
          Volver
        </button>
      </app-payslip-sheet>
    } @else {
      <div class="ui-card" style="text-align: center"><ui-spinner size="lg" /></div>
    }
  `,
})
export class PayslipPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly payroll = inject(PayrollService);
  private readonly me = inject(MyEmployeeService);
  private readonly location = inject(Location);

  readonly id = input(0, { transform: numberAttribute });
  readonly scope = input<'admin' | 'me'>('admin');

  protected readonly doc = rxResource({
    params: () => (this.id() ? { id: this.id(), scope: this.scope() } : undefined),
    stream: ({ params }) =>
      params.scope === 'me' ? this.me.payslip(params.id) : this.payroll.payslip(params.id),
  });
  protected readonly error = computed(() => apiMessage(this.doc.error()));

  /** PDF del desprendible (`application/pdf`) según el alcance de la ruta. */
  protected readonly pdf = () =>
    this.scope() === 'me' ? this.me.payslipPdf(this.id()) : this.payroll.payslipPdf(this.id());
  protected readonly fileName = computed(() => {
    const d = resourceValue(this.doc, null);
    return pdfFileName('desprendible', d?.period.name ?? this.id(), d?.employee.fullName);
  });

  protected back(): void {
    this.location.back();
  }
}
