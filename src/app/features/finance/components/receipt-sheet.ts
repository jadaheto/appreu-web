import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CopCurrencyPipe, DateEsPipe, formatDateEs, UiPrintableSheet } from '../../../shared/ui';
import type { Receipt } from '../data-access/finance.models';

/** Recibo de caja imprimible (`REC-AAAA-NNNNNN`) con el desglose aplicado por la API. */
@Component({
  selector: 'app-receipt-sheet',
  imports: [UiPrintableSheet, CopCurrencyPipe, DateEsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let r = receipt();
    <ui-printable-sheet
      [institutionName]="r.schoolName"
      [nit]="r.schoolNit"
      documentTitle="Recibo de caja"
      [documentNumber]="r.receiptNumber"
      [issuedAt]="issuedAt()"
    >
      @if (r.status === 'reversed') {
        <p class="void" role="note">ANULADO{{ r.voidReason ? ' — ' + r.voidReason : '' }}</p>
      }
      <section class="party">
        <h3>Recibimos de</h3>
        <p class="strong">{{ r.studentName }}</p>
        <p>
          Código <span class="font-mono">{{ r.studentCode }}</span>
          @if (r.documentNumber) {
            · Doc. <span class="font-mono">{{ r.documentNumber }}</span>
          }
        </p>
      </section>
      <dl class="meta">
        <div>
          <dt>Método de pago</dt>
          <dd>{{ r.methodLabel }}</dd>
        </div>
        <div>
          <dt>Cajero</dt>
          <dd>{{ r.cashierName || 'Sistema web' }}</dd>
        </div>
        @if (r.reference) {
          <div>
            <dt>Referencia</dt>
            <dd class="font-mono">{{ r.reference }}</dd>
          </div>
        }
      </dl>
      <table>
        <caption class="sr-only">
          Desglose del pago
        </caption>
        <thead>
          <tr>
            <th scope="col">Concepto</th>
            <th scope="col" class="num">Valor abonado</th>
            <th scope="col" class="num">Saldo del cobro</th>
          </tr>
        </thead>
        <tbody>
          @for (line of r.lines; track line.chargeId) {
            <tr>
              <td>
                {{ line.conceptName }}
                @if (line.description && line.description !== line.conceptName) {
                  <small class="muted">{{ line.description }}</small>
                }
              </td>
              <td class="num font-mono">{{ line.amount | cop }}</td>
              <td class="num font-mono">{{ line.chargePending | cop }}</td>
            </tr>
          } @empty {
            <tr>
              <td>{{ r.notes || 'Abono / pago general' }}</td>
              <td class="num font-mono">{{ r.amount | cop }}</td>
              <td class="num">—</td>
            </tr>
          }
        </tbody>
        <tfoot>
          @if (r.unappliedAmount > 0) {
            <tr>
              <td>Saldo a favor (no aplicado)</td>
              <td class="num font-mono">{{ r.unappliedAmount | cop }}</td>
              <td></td>
            </tr>
          }
          <tr class="total">
            <td>TOTAL PAGADO</td>
            <td class="num font-mono">{{ r.amount | cop }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
      @if (r.notes && r.lines.length) {
        <p class="notes"><strong>Observaciones:</strong> {{ r.notes }}</p>
      }
      <div uiSheetFooter class="foot">
        <p>*** COPIA ORIGINAL DEL SISTEMA ***</p>
        <p class="muted">Impreso el {{ printedAt | dateEs: 'datetime' }}</p>
      </div>
    </ui-printable-sheet>
  `,
  styles: `
    h3 {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 0.25rem;
    }
    .strong {
      font-weight: 700;
      font-size: 1rem;
    }
    .party {
      margin-bottom: 1rem;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: 0.5rem 1rem;
      margin-bottom: 1rem;
    }
    dt {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: #64748b;
    }
    dd {
      margin: 0;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 0.5rem;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      vertical-align: top;
    }
    th {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: #64748b;
    }
    .num {
      text-align: right;
    }
    small {
      display: block;
    }
    .muted {
      color: #64748b;
    }
    .total td {
      font-weight: 800;
      font-size: 1rem;
      border-bottom: 0;
      border-top: 2px solid #0f172a;
    }
    .void {
      text-align: center;
      font-weight: 800;
      color: #b91c1c;
      border: 2px solid #b91c1c;
      padding: 0.5rem;
      margin-bottom: 1rem;
      letter-spacing: 0.08em;
    }
    .notes {
      margin-top: 1rem;
    }
    .foot {
      text-align: center;
      font-size: 0.75rem;
    }
  `,
})
export class ReceiptSheet {
  readonly receipt = input.required<Receipt>();
  protected readonly printedAt = new Date();
  protected readonly issuedAt = computed(() => formatDateEs(this.receipt().paidAt, 'datetime'));
}
