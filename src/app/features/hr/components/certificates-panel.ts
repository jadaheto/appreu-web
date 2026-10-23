import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ToastService } from '../../../core';
import {
  UiAlert,
  UiButton,
  UiCheckbox,
  UiFormField,
  UiIcon,
  UiInput,
  UiSelect,
} from '../../../shared/ui';
import { EmployeesService } from '../data-access/employees.service';
import type { IncomeCertificate, IssuedCertificate } from '../data-access/hr.models';
import { apiMessage } from '../data-access/hr-ui';
import { MyEmployeeService } from '../data-access/my-employee.service';
import { pdfFileName } from '../data-access/hr-download';
import { PdfDownloadButton } from './pdf-download-button';

/**
 * Tarjetas para expedir el certificado laboral (con o sin salario, destinatario)
 * y consultar el certificado de ingresos de un año. Con `employeeId` actúa como
 * RR. HH.; sin él, sobre el empleado de la sesión (portal).
 */
@Component({
  selector: 'app-certificates-panel',
  imports: [
    ReactiveFormsModule,
    UiAlert,
    UiButton,
    UiCheckbox,
    UiFormField,
    UiIcon,
    UiInput,
    UiSelect,
    PdfDownloadButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid--2">
      <form class="ui-card stack" [formGroup]="employmentForm" (ngSubmit)="issue()">
        <h2 class="ui-card__title title"><ui-icon name="document-check" /> Certificado laboral</h2>
        <p class="text-muted">
          Se expide con los datos actuales del contrato y un código de verificación.
        </p>
        <ui-form-field label="Dirigido a" hint="Opcional. Por defecto: «quien pueda interesar».">
          <ui-input
            formControlName="addressee"
            [maxlength]="150"
            placeholder="A quien pueda interesar"
          />
        </ui-form-field>
        <ui-checkbox formControlName="includeSalary">Incluir el salario básico</ui-checkbox>
        @if (employmentError()) {
          <ui-alert tone="error">{{ employmentError() }}</ui-alert>
        }
        <div>
          <button
            ui-button
            type="submit"
            variant="primary"
            icon="document-text"
            [loading]="issuing()"
          >
            Expedir certificado
          </button>
        </div>
      </form>

      <form class="ui-card stack" [formGroup]="incomeForm" (ngSubmit)="income()">
        <h2 class="ui-card__title title">
          <ui-icon name="banknotes" /> Certificado de ingresos y retenciones
        </h2>
        <p class="text-muted">
          Resumen informativo de los pagos de nómina efectivamente pagados en el año gravable.
        </p>
        <ui-form-field label="Año gravable" required>
          <ui-select formControlName="year" [options]="years" [placeholder]="null" />
        </ui-form-field>
        @if (incomeError()) {
          <ui-alert tone="error">{{ incomeError() }}</ui-alert>
        }
        <div class="actions">
          <button
            ui-button
            type="submit"
            variant="primary"
            icon="document-text"
            [loading]="loadingIncome()"
          >
            Ver certificado
          </button>
          <app-pdf-download-button [request]="incomePdf" [fileName]="incomeFileName()" />
        </div>
      </form>
    </div>
  `,
  styles: `
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: 0;
    }
  `,
})
export class CertificatesPanel {
  private readonly employees = inject(EmployeesService);
  private readonly me = inject(MyEmployeeService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Empleado (RR. HH.); `null` = el de la sesión. */
  readonly employeeId = input<number | null>(null);
  readonly employment = output<IssuedCertificate>();
  readonly incomeReady = output<IncomeCertificate>();

  private readonly currentYear = new Date().getFullYear();
  /** La API acepta hasta el año en curso; por defecto el año gravable anterior. */
  protected readonly years = Array.from({ length: 6 }, (_, i) => {
    const y = this.currentYear - i;
    return { value: y, label: String(y) };
  });

  protected readonly employmentForm = this.fb.group({
    addressee: this.fb.control('', Validators.maxLength(150)),
    includeSalary: this.fb.control(true),
  });
  protected readonly incomeForm = this.fb.group({
    year: this.fb.control(this.currentYear - 1, Validators.required),
  });

  private readonly incomeYear = toSignal(this.incomeForm.controls.year.valueChanges, {
    initialValue: this.incomeForm.controls.year.value,
  });
  /** PDF del certificado de ingresos del año elegido (RR. HH. o portal). */
  protected readonly incomePdf = (): Observable<Blob> => {
    const year = this.incomeForm.controls.year.value;
    const id = this.employeeId();
    return id ? this.employees.incomeCertificatePdf(id, year) : this.me.incomeCertificatePdf(year);
  };
  protected readonly incomeFileName = computed(() =>
    pdfFileName(
      'certificado-ingresos',
      this.incomeYear(),
      this.employeeId() ? `empleado-${this.employeeId()}` : null,
    ),
  );

  protected readonly issuing = signal(false);
  protected readonly loadingIncome = signal(false);
  protected readonly employmentError = signal<string | null>(null);
  protected readonly incomeError = signal<string | null>(null);

  protected issue(): void {
    if (this.employmentForm.invalid) {
      this.employmentForm.markAllAsTouched();
      return;
    }
    const v = this.employmentForm.getRawValue();
    const dto = { includeSalary: v.includeSalary, addressee: v.addressee.trim() || undefined };
    const id = this.employeeId();
    const request: Observable<IssuedCertificate> = id
      ? this.employees.issueEmploymentCertificate(id, dto)
      : this.me.issueEmploymentCertificate(dto);
    this.issuing.set(true);
    this.employmentError.set(null);
    request.subscribe({
      next: (cert) => {
        this.issuing.set(false);
        this.toast.success(`Certificado expedido (código ${cert.verificationCode}).`);
        this.employment.emit(cert);
      },
      error: (err: unknown) => {
        this.issuing.set(false);
        this.employmentError.set(apiMessage(err));
      },
    });
  }

  protected income(): void {
    const year = this.incomeForm.controls.year.value;
    const id = this.employeeId();
    const request = id
      ? this.employees.incomeCertificate(id, year)
      : this.me.incomeCertificate(year);
    this.loadingIncome.set(true);
    this.incomeError.set(null);
    request.subscribe({
      next: (cert) => {
        this.loadingIncome.set(false);
        this.incomeReady.emit(cert);
      },
      error: (err: unknown) => {
        this.loadingIncome.set(false);
        this.incomeError.set(apiMessage(err));
      },
    });
  }
}
