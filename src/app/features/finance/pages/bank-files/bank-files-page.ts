import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '../../../../core';
import {
  formatCop,
  SelectOption,
  UiAlert,
  UiButton,
  UiFormField,
  UiInput,
  UiSelect,
} from '../../../../shared/ui';
import {
  COLLECTION_BANK_OPTIONS,
  currentMonth,
  errorMessage,
  PAYROLL_BANK_OPTIONS,
} from '../../data-access/finance-labels';
import type {
  BankFileDownload,
  CollectionFileBank,
  PayrollFileBank,
} from '../../data-access/finance.models';
import { FinanceService, saveFile } from '../../data-access/finance.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const PAYROLL_STATUS: Record<string, string> = {
  draft: 'Borrador',
  calculated: 'Calculado',
  approved: 'Aprobado',
  paid: 'Pagado',
  cancelled: 'Anulado',
};

/** `/admin/finanzas/archivos-bancarios` — TXT de recaudo y de dispersión de nómina. */
@Component({
  selector: 'app-bank-files-page',
  imports: [ReactiveFormsModule, UiAlert, UiButton, UiFormField, UiInput, UiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Archivos bancarios</h1>
        <p class="page-header__subtitle">
          Genera los archivos planos (TXT) para cargar en el portal del banco.
        </p>
      </div>
    </div>

    <div class="grid grid--2">
      <form
        class="ui-card"
        [formGroup]="collectionForm"
        (ngSubmit)="downloadCollection()"
        novalidate
        aria-labelledby="col-title"
      >
        <h2 class="ui-card__title" id="col-title">Archivo de recaudo (estudiantes)</h2>
        <ui-form-field label="Banco / formato" required>
          <ui-select formControlName="bank" [options]="collectionBanks" />
        </ui-form-field>
        <ui-form-field label="Mes de facturación" required>
          <ui-input type="month" formControlName="month" />
        </ui-form-field>
        <p class="text-muted note">
          Incluye los cobros con saldo del mes. Requiere convenio de recaudo con el banco.
        </p>
        @if (collectionResult(); as r) {
          <ui-alert tone="success"
            >{{ r.fileName }} descargado ({{ r.records }} registros).</ui-alert
          >
        }
        @if (collectionError()) {
          <ui-alert tone="error">{{ collectionError() }}</ui-alert>
        }
        <div class="actions">
          <button
            ui-button
            type="submit"
            variant="primary"
            icon="download"
            [loading]="loadingCollection()"
          >
            Generar TXT de recaudo
          </button>
        </div>
      </form>

      <form
        class="ui-card"
        [formGroup]="payrollForm"
        (ngSubmit)="downloadPayroll()"
        novalidate
        aria-labelledby="pay-title"
      >
        <h2 class="ui-card__title" id="pay-title">Pago de nómina (dispersión)</h2>
        <ui-form-field label="Banco / formato" required>
          <ui-select formControlName="bank" [options]="payrollBanks" />
        </ui-form-field>
        @if (periodOptions().length) {
          <ui-form-field
            label="Período de nómina"
            required
            hint="Solo períodos aprobados o pagados"
          >
            <ui-select formControlName="periodId" [options]="periodOptions()" />
          </ui-form-field>
        } @else {
          <ui-form-field
            label="ID del período de nómina"
            required
            [hint]="
              periods.isLoading()
                ? 'Cargando períodos…'
                : 'No fue posible listar los períodos; ingresa el identificador.'
            "
          >
            <ui-input type="number" formControlName="periodId" min="1" mono />
          </ui-form-field>
        }
        @if (payrollResult(); as r) {
          <ui-alert tone="success"
            >{{ r.fileName }} descargado ({{ r.records }} registros).</ui-alert
          >
        }
        @if (payrollError()) {
          <ui-alert tone="error">{{ payrollError() }}</ui-alert>
        }
        <div class="actions">
          <button
            ui-button
            type="submit"
            variant="primary"
            icon="download"
            [loading]="loadingPayroll()"
          >
            Descargar TXT de nómina
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .note {
      font-size: var(--text-sm);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: auto;
    }
  `,
})
export class BankFilesPage {
  private readonly finance = inject(FinanceService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly collectionBanks = COLLECTION_BANK_OPTIONS;
  protected readonly payrollBanks = PAYROLL_BANK_OPTIONS;
  protected readonly periods = rxResource({ stream: () => this.finance.payrollPeriods() });
  protected readonly periodOptions = computed<SelectOption<number>[]>(() =>
    (resourceValue(this.periods) ?? []).map((p) => ({
      value: p.id,
      label: `${p.name} · ${PAYROLL_STATUS[p.status] ?? p.status} · ${formatCop(p.netTotal)}`,
      disabled: p.status !== 'approved' && p.status !== 'paid',
    })),
  );

  protected readonly collectionForm = this.fb.group({
    bank: this.fb.control<CollectionFileBank | null>('asobancaria', Validators.required),
    month: [currentMonth(), Validators.required],
  });
  protected readonly payrollForm = this.fb.group({
    bank: this.fb.control<PayrollFileBank | null>('bancolombia', Validators.required),
    periodId: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
  });

  protected readonly loadingCollection = signal(false);
  protected readonly loadingPayroll = signal(false);
  protected readonly collectionResult = signal<BankFileDownload | null>(null);
  protected readonly payrollResult = signal<BankFileDownload | null>(null);
  protected readonly collectionError = signal<string | null>(null);
  protected readonly payrollError = signal<string | null>(null);

  protected downloadCollection(): void {
    if (this.collectionForm.invalid) {
      this.collectionForm.markAllAsTouched();
      return;
    }
    const { bank, month } = this.collectionForm.getRawValue();
    this.collectionError.set(null);
    this.collectionResult.set(null);
    this.loadingCollection.set(true);
    this.finance.collectionFile(bank!, month).subscribe({
      next: (file) => {
        this.loadingCollection.set(false);
        this.deliver(file);
        this.collectionResult.set(file);
      },
      error: (err) => {
        this.loadingCollection.set(false);
        this.collectionError.set(errorMessage(err, 'No se pudo generar el archivo de recaudo.'));
      },
    });
  }

  protected downloadPayroll(): void {
    if (this.payrollForm.invalid) {
      this.payrollForm.markAllAsTouched();
      return;
    }
    const { bank, periodId } = this.payrollForm.getRawValue();
    this.payrollError.set(null);
    this.payrollResult.set(null);
    this.loadingPayroll.set(true);
    this.finance.payrollFile(bank!, Number(periodId)).subscribe({
      next: (file) => {
        this.loadingPayroll.set(false);
        this.deliver(file);
        this.payrollResult.set(file);
      },
      error: (err) => {
        this.loadingPayroll.set(false);
        this.payrollError.set(errorMessage(err, 'No se pudo generar el archivo de nómina.'));
      },
    });
  }

  private deliver(file: BankFileDownload): void {
    saveFile(file.content, file.fileName, 'text/plain;charset=utf-8');
    this.toast.success(`Archivo ${file.fileName} generado.`);
  }
}
