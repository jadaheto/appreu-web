import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiError, ConfirmService, ToastService } from '../../../../../core';
import {
  formatDateEs,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiFormField,
  UiModal,
  UiTextarea,
} from '../../../../../shared/ui';
import {
  CERTIFICATE_STATUS_LABELS,
  CERTIFICATE_STATUS_TONES,
  CERTIFICATE_TYPE_LABELS,
  CertificateView,
  isPrintable,
  labelOf,
  StudentView,
  toneOf,
} from '../../../data-access/students.models';
import { StudentsService } from '../../../data-access/students.service';

/**
 * Pestaña "Certificados": emisión manual, aprobación de solicitudes,
 * anulación/rechazo con motivo, impresión y descarga en PDF de los aprobados.
 */
@Component({
  selector: 'app-student-certificates-tab',
  imports: [
    ReactiveFormsModule,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiFormField,
    UiModal,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar">
      <h2 class="ui-card__title">Certificados de estudio</h2>
      <button ui-button type="button" size="sm" variant="primary" icon="plus" (click)="openIssue()">
        Emitir certificado
      </button>
    </div>
    <ui-data-table
      caption="Certificados del estudiante"
      [columns]="columns"
      [rows]="certificates()"
      [actions]="actions"
      emptyIcon="document-check"
      emptyTitle="Sin certificados"
      emptyMessage="Se emiten al pagar el concepto de certificado, por solicitud o manualmente."
      (action)="onAction($event)"
    >
      <ng-template uiCell="status" let-row>
        <ui-badge [tone]="statusTone(row.status)">{{ statusLabel(row.status) }}</ui-badge>
      </ng-template>
    </ui-data-table>

    <ui-modal
      [(open)]="issueOpen"
      title="Emitir certificado"
      description="Queda aprobado de inmediato con los datos actuales del estudiante."
    >
      <form id="issue-form" (submit)="$event.preventDefault(); issue()">
        <ui-form-field label="Notas (opcional)">
          <ui-textarea [formControl]="notes" [rows]="3" [maxlength]="1000" />
        </ui-form-field>
      </form>
      <ng-container uiModalFooter>
        <button ui-button type="button" (click)="issueOpen.set(false)">Cancelar</button>
        <button
          ui-button
          type="submit"
          form="issue-form"
          variant="primary"
          icon="check"
          [loading]="busy()"
        >
          Emitir
        </button>
      </ng-container>
    </ui-modal>

    <ui-modal
      [(open)]="cancelOpen"
      [title]="cancelTarget()?.status === 'pending' ? 'Rechazar solicitud' : 'Anular certificado'"
    >
      <form id="cancel-form" (submit)="$event.preventDefault(); cancel()">
        @if (error(); as err) {
          <ui-alert tone="error">{{ err }}</ui-alert>
        }
        <ui-form-field label="Motivo" required>
          <ui-textarea [formControl]="reason" [rows]="3" [maxlength]="500" />
        </ui-form-field>
      </form>
      <ng-container uiModalFooter>
        <button ui-button type="button" (click)="cancelOpen.set(false)">Volver</button>
        <button
          ui-button
          type="submit"
          form="cancel-form"
          variant="danger"
          icon="x-mark"
          [loading]="busy()"
        >
          Confirmar
        </button>
      </ng-container>
    </ui-modal>
  `,
  styles: `
    .bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
    }
    .bar h2 {
      flex: 1;
    }
  `,
})
export class CertificatesTab {
  private readonly students = inject(StudentsService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly student = input.required<StudentView>();
  readonly certificates = input<readonly CertificateView[]>([]);
  readonly changed = output<void>();

  protected readonly issueOpen = signal(false);
  protected readonly cancelOpen = signal(false);
  protected readonly cancelTarget = signal<CertificateView | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notes = new FormControl('', {
    nonNullable: true,
    validators: Validators.maxLength(1000),
  });
  protected readonly reason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(500)],
  });

  protected readonly columns: TableColumn<CertificateView>[] = [
    { key: 'type', header: 'Tipo', format: (v) => labelOf(CERTIFICATE_TYPE_LABELS, v as string) },
    { key: 'status', header: 'Estado' },
    { key: 'issuedAt', header: 'Fecha', format: (v) => formatDateEs(v as string) },
    { key: 'verificationCode', header: 'Código de verificación', mono: true, hideBelow: 'md' },
    { key: 'notes', header: 'Notas', hideBelow: 'lg' },
  ];
  protected readonly actions: TableAction<CertificateView>[] = [
    { id: 'pdf', label: 'Descargar PDF', icon: 'download', hidden: (c) => !isPrintable(c) },
    { id: 'print', label: 'Imprimir', icon: 'printer', hidden: (c) => !isPrintable(c) },
    { id: 'verify', label: 'Verificar', icon: 'shield-check', hidden: (c) => !c.verificationCode },
    { id: 'approve', label: 'Aprobar', icon: 'check', hidden: (c) => c.status !== 'pending' },
    {
      id: 'cancel',
      label: 'Anular / rechazar',
      icon: 'x-mark',
      tone: 'danger',
      hidden: (c) => c.status === 'cancelled',
    },
  ];

  protected statusLabel(v: string): string {
    return labelOf(CERTIFICATE_STATUS_LABELS, v);
  }
  protected statusTone(v: string) {
    return toneOf(CERTIFICATE_STATUS_TONES, v);
  }

  protected openIssue(): void {
    this.notes.reset();
    this.issueOpen.set(true);
  }

  protected issue(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.students.issueCertificate(this.student().id, this.notes.value).subscribe({
      next: () => {
        this.busy.set(false);
        this.issueOpen.set(false);
        this.toast.success('Certificado emitido.');
        this.changed.emit();
      },
      error: () => this.busy.set(false),
    });
  }

  protected async onAction(event: TableActionEvent<CertificateView>): Promise<void> {
    const c = event.row;
    switch (event.action) {
      case 'pdf':
        this.students
          .downloadCertificatePdf(c)
          .subscribe(() => this.toast.success('Certificado descargado en PDF.'));
        break;
      case 'print':
        void this.router.navigate(['..', 'certificados', c.id], { relativeTo: this.route });
        break;
      case 'verify':
        void this.router.navigate(['..', 'verificar', c.verificationCode], {
          relativeTo: this.route,
        });
        break;
      case 'approve': {
        const ok = await this.confirm.ask({
          title: '¿Aprobar la solicitud de certificado?',
          message: 'Se expedirá con los datos actuales del estudiante y podrá imprimirse.',
          confirmLabel: 'Aprobar',
        });
        if (!ok) return;
        this.students.approveCertificate(c.id).subscribe(() => {
          this.toast.success('Certificado aprobado.');
          this.changed.emit();
        });
        break;
      }
      case 'cancel':
        this.cancelTarget.set(c);
        this.reason.reset();
        this.error.set(null);
        this.cancelOpen.set(true);
        break;
    }
  }

  protected cancel(): void {
    const target = this.cancelTarget();
    if (!target || this.busy()) return;
    if (this.reason.invalid) {
      this.reason.markAsTouched();
      return;
    }
    this.busy.set(true);
    this.students.cancelCertificate(target.id, this.reason.value.trim()).subscribe({
      next: () => {
        this.busy.set(false);
        this.cancelOpen.set(false);
        this.toast.success(
          target.status === 'pending' ? 'Solicitud rechazada.' : 'Certificado anulado.',
        );
        this.changed.emit();
      },
      error: (err: ApiError) => {
        this.busy.set(false);
        this.error.set(err.message);
      },
    });
  }
}
