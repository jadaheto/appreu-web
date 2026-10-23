import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { UiAlert, UiButton, UiSpinner } from '../../../../shared/ui';
import { ChargeDocumentSheet } from '../../components/charge-document-sheet';
import { ReceiptSheet } from '../../components/receipt-sheet';
import { errorMessage } from '../../data-access/finance-labels';
import { FinanceService } from '../../data-access/finance.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/**
 * Recibo de caja imprimible (`/admin/finanzas/recibos/:receiptNumber` y
 * `/portal-estudiante/pagos/recibos/:receiptNumber`). La API valida que el
 * estudiante/acudiente solo vea los propios.
 */
@Component({
  selector: 'app-receipt-print-page',
  imports: [ReceiptSheet, UiAlert, UiButton, UiSpinner, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="back no-print">
      <a ui-button variant="ghost" icon="arrow-left" [routerLink]="back()">Volver</a>
    </div>
    @if (receipt.isLoading()) {
      <div class="center"><ui-spinner size="lg" /></div>
    } @else if (receipt.error()) {
      <ui-alert tone="error" title="No se pudo cargar el recibo">{{ error() }}</ui-alert>
    } @else if (val(receipt); as r) {
      <app-receipt-sheet [receipt]="r" />
    }
  `,
  styleUrl: './print-page.css',
})
export class ReceiptPrintPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly finance = inject(FinanceService);
  /** Parámetro de ruta. */
  readonly receiptNumber = input.required<string>();
  /** Ruta de regreso (`data.back`). */
  readonly back = input<string>('..');

  protected readonly receipt = rxResource({
    params: () => this.receiptNumber(),
    stream: ({ params }) => this.finance.receipt(params),
  });
  protected error(): string {
    return errorMessage(this.receipt.error());
  }
}

/** Cuenta de cobro imprimible de un cargo. */
@Component({
  selector: 'app-charge-print-page',
  imports: [ChargeDocumentSheet, UiAlert, UiButton, UiSpinner, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="back no-print">
      <a ui-button variant="ghost" icon="arrow-left" [routerLink]="back()">Volver</a>
    </div>
    @if (doc.isLoading()) {
      <div class="center"><ui-spinner size="lg" /></div>
    } @else if (doc.error()) {
      <ui-alert tone="error" title="No se pudo cargar la cuenta de cobro">{{ error() }}</ui-alert>
    } @else if (val(doc); as d) {
      <app-charge-document-sheet [doc]="d" />
    }
  `,
  styleUrl: './print-page.css',
})
export class ChargePrintPage {
  protected readonly val = resourceValue;
  private readonly finance = inject(FinanceService);
  readonly chargeId = input.required<string>();
  readonly back = input<string>('..');

  protected readonly doc = rxResource({
    params: () => Number(this.chargeId()),
    stream: ({ params }) => this.finance.chargeDocument(params),
  });
  protected error(): string {
    return errorMessage(this.doc.error());
  }
}
