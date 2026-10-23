import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import {
  CopCurrencyPipe,
  formatCop,
  PageChange,
  TabItem,
  TableColumn,
  UiAlert,
  UiAvatar,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiPagination,
  UiSpinner,
  UiTabs,
} from '../../../../shared/ui';
import { CertificatesPanel } from '../../components/certificates-panel';
import { EmployeeStatusModal } from '../../components/employee-status-modal';
import { EmploymentCertificateSheet } from '../../components/employment-certificate-sheet';
import { HrStatusBadge } from '../../components/hr-status-badge';
import { IncomeCertificateSheet } from '../../components/income-certificate-sheet';
import { PdfDownloadButton } from '../../components/pdf-download-button';
import { HrDocumentsService } from '../../data-access/hr-documents.service';
import { pdfFileName } from '../../data-access/hr-download';
import { EmployeesService } from '../../data-access/employees.service';
import {
  BANK_ACCOUNT_TYPE_LABELS,
  CONTRACT_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
  EMPLOYEE_STATUS_TRANSITIONS,
  EMPLOYEE_TYPE_LABELS,
  GENDER_LABELS,
  IncomeCertificate,
  IssuedCertificate,
  PayslipSummary,
} from '../../data-access/hr.models';
import { apiMessage, shortDate } from '../../data-access/hr-ui';
import { HR_BASE, PAYROLL_BASE } from './hr-links';
import { resourceValue } from '../../../../core/resource/resource-value';

type ShownDocument =
  { kind: 'employment'; data: IssuedCertificate } | { kind: 'income'; data: IncomeCertificate };

/** Ficha del empleado: datos laborales, desprendibles y certificados (laboral e ingresos). */
@Component({
  selector: 'app-employee-detail-page',
  imports: [
    RouterLink,
    CopCurrencyPipe,
    UiAlert,
    UiAvatar,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiPagination,
    UiSpinner,
    UiTabs,
    CertificatesPanel,
    EmployeeStatusModal,
    EmploymentCertificateSheet,
    HrStatusBadge,
    IncomeCertificateSheet,
    PdfDownloadButton,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './employee-detail-page.html',
  styles: `
    .hero {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }
    .hero h1 {
      font-size: var(--text-2xl);
    }
    .hero .grow {
      flex: 1;
      min-width: 14rem;
    }
    dl.info {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
      gap: var(--space-4);
    }
    dl.info dt {
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-subtle);
    }
    dl.info dd {
      margin: 0;
      font-weight: 600;
      color: var(--color-text-strong);
    }
    .mb {
      display: block;
      margin-bottom: var(--space-5);
    }
  `,
})
export class EmployeeDetailPage {
  private readonly employees = inject(EmployeesService);
  private readonly router = inject(Router);
  private readonly hrDocuments = inject(HrDocumentsService);

  readonly id = input(0, { transform: numberAttribute });
  protected readonly base = HR_BASE;
  protected readonly typeLabels = EMPLOYEE_TYPE_LABELS;
  protected readonly contractLabels = CONTRACT_TYPE_LABELS;
  protected readonly documentLabels = DOCUMENT_TYPE_LABELS;
  protected readonly genderLabels = GENDER_LABELS;
  protected readonly accountLabels = BANK_ACCOUNT_TYPE_LABELS;
  protected readonly shortDate = shortDate;

  protected readonly employee = rxResource({
    params: () => this.id() || undefined,
    stream: ({ params }) => this.employees.get(params),
  });
  protected readonly data = computed(() => resourceValue(this.employee, null));
  protected readonly loadError = computed(() =>
    this.employee.error() ? apiMessage(this.employee.error()) : null,
  );
  protected readonly canChangeStatus = computed(() => {
    const e = this.data();
    return !!e && EMPLOYEE_STATUS_TRANSITIONS[e.status].length > 0;
  });

  protected readonly tabs: TabItem[] = [
    { id: 'info', label: 'Ficha', icon: 'identification' },
    { id: 'payslips', label: 'Desprendibles', icon: 'banknotes' },
    { id: 'certificates', label: 'Certificados', icon: 'document-text' },
  ];
  protected readonly tab = signal<string | null>('info');

  protected readonly payslipPage = signal({ page: 1, pageSize: 10 });
  protected readonly payslips = rxResource({
    params: () =>
      this.tab() === 'payslips' && this.id() ? { id: this.id(), ...this.payslipPage() } : undefined,
    stream: ({ params }) => this.employees.payslips(params.id, params.page, params.pageSize),
  });
  protected readonly payslipRows = computed(() => resourceValue(this.payslips)?.items ?? []);
  protected readonly payslipTotal = computed(() => resourceValue(this.payslips)?.total ?? 0);
  protected readonly payslipColumns: TableColumn<PayslipSummary>[] = [
    { key: 'periodName', header: 'Período' },
    { key: 'paymentDate', header: 'Fecha de pago', format: (v) => shortDate(v as string) },
    {
      key: 'gross',
      header: 'Devengado',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
      hideBelow: 'md',
    },
    {
      key: 'totalDeductions',
      header: 'Deducciones',
      align: 'end',
      mono: true,
      format: (v) => formatCop(v as number),
      hideBelow: 'md',
    },
    { key: 'net', header: 'Neto', align: 'end', mono: true, format: (v) => formatCop(v as number) },
    { key: 'status', header: 'Estado' },
    { key: 'open', header: '', align: 'end' },
  ];

  protected readonly modalOpen = signal(false);
  protected readonly modalMode = signal<'status' | 'retire'>('status');
  protected readonly shown = signal<ShownDocument | null>(null);

  protected openModal(mode: 'status' | 'retire'): void {
    this.modalMode.set(mode);
    this.modalOpen.set(true);
  }

  protected changePayslipPage(change: PageChange): void {
    this.payslipPage.set({ page: change.page, pageSize: change.pageSize });
  }

  protected payslipLink(row: PayslipSummary): unknown[] {
    return [PAYROLL_BASE, 'desprendibles', row.paymentId];
  }

  protected employmentPdf(cert: IssuedCertificate): () => Observable<Blob> {
    return () => this.hrDocuments.documentPdf(cert.verificationCode);
  }
  protected employmentFileName(cert: IssuedCertificate): string {
    return pdfFileName('certificado-laboral', cert.content.employeeName, cert.verificationCode);
  }
  protected incomePdf(cert: IncomeCertificate): () => Observable<Blob> {
    return () => this.employees.incomeCertificatePdf(cert.employee.id, cert.year);
  }
  protected incomeFileName(cert: IncomeCertificate): string {
    return pdfFileName('certificado-ingresos', cert.year, cert.employee.fullName);
  }

  protected openPayslip(row: PayslipSummary): void {
    void this.router.navigate(this.payslipLink(row));
  }
}
