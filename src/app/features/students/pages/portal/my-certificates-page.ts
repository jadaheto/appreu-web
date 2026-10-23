import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError, ToastService } from '../../../../core';
import {
  formatDateEs,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiCellDef,
  UiDataTable,
  UiEmptyState,
  UiFormField,
  UiModal,
  UiSpinner,
  UiTextarea,
} from '../../../../shared/ui';
import { CatalogLabelPipe, CatalogTonePipe } from '../../components/catalog-label.pipe';
import { InfoGrid, InfoItem } from '../../components/info-grid';
import { PortalStudentGate } from '../../components/portal-student-gate';
import { PortalContextStore } from '../../data-access/portal-context.store';
import {
  CERTIFICATE_STATUS_LABELS,
  CERTIFICATE_STATUS_TONES,
  CERTIFICATE_TYPE_LABELS,
  CertificateView,
  isPrintable,
  labelOf,
} from '../../data-access/students.models';
import { StudentsService } from '../../data-access/students.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/**
 * Certificado estudiantil del portal (análisis 03 §4.8, reglas 29-30): muestra
 * el último aprobado con sus botones de descarga en PDF e impresión, permite solicitar uno nuevo
 * (queda pendiente de aprobación) y lista el historial con su estado.
 */
@Component({
  selector: 'app-my-certificates-page',
  imports: [
    CatalogLabelPipe,
    CatalogTonePipe,
    InfoGrid,
    PortalStudentGate,
    ReactiveFormsModule,
    RouterLink,
    UiAlert,
    UiBadge,
    UiButton,
    UiCellDef,
    UiDataTable,
    UiEmptyState,
    UiFormField,
    UiModal,
    UiSpinner,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Certificado estudiantil</h1>
        <p class="page-header__subtitle">Consulta, solicita e imprime tu certificado de estudio.</p>
      </div>
      @if (store.selectedId()) {
        <button
          ui-button
          type="button"
          variant="primary"
          icon="plus"
          [disabled]="hasPending()"
          (click)="openRequest()"
        >
          Solicitar certificado
        </button>
      }
    </div>
    <app-portal-student-gate>
      @if (certificates.isLoading() && !list().length) {
        <div class="center"><ui-spinner size="lg" /></div>
      } @else if (certificates.error(); as err) {
        <ui-alert tone="error" title="No se pudieron cargar los certificados">{{
          err.message
        }}</ui-alert>
      } @else {
        @if (hasPending()) {
          <ui-alert tone="info" title="Tienes una solicitud en trámite">
            La secretaría la revisará; cuando sea aprobada podrás imprimir el certificado aquí.
          </ui-alert>
        }
        @if (latest(); as c) {
          <section class="ui-card stack approved" aria-labelledby="approved-title">
            <div class="cluster">
              <h2 class="ui-card__title" id="approved-title">Certificado aprobado</h2>
              <ui-badge tone="success" dot>Disponible</ui-badge>
            </div>
            <app-info-grid [items]="latestItems()" />
            <div class="cluster">
              <button
                ui-button
                type="button"
                variant="primary"
                icon="download"
                [loading]="downloadingId() === c.id"
                (click)="downloadPdf(c)"
              >
                Descargar PDF
              </button>
              <a ui-button icon="printer" [routerLink]="[c.id]">Imprimir certificado</a>
            </div>
          </section>
        } @else {
          <section class="ui-card">
            <ui-empty-state
              icon="document-check"
              title="Certificado no disponible"
              message="Se habilita cuando la secretaría aprueba tu solicitud o al pagar el concepto de certificado en tesorería."
            />
          </section>
        }

        @if (list().length) {
          <section class="ui-card stack">
            <h2 class="ui-card__title">Historial</h2>
            <ui-data-table caption="Historial de certificados" [columns]="columns" [rows]="list()">
              <ng-template uiCell="status" let-row>
                <ui-badge [tone]="row.status | catalogTone: statusTones">
                  {{ row.status | catalogLabel: statusLabels }}
                </ui-badge>
              </ng-template>
              <ng-template uiCell="actions" let-row>
                @if (printable(row)) {
                  <button
                    ui-button
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon="download"
                    [loading]="downloadingId() === row.id"
                    [attr.aria-label]="
                      'Descargar PDF del certificado ' + (row.verificationCode ?? row.id)
                    "
                    (click)="downloadPdf(row)"
                  >
                    PDF
                  </button>
                  <a ui-button size="sm" variant="ghost" icon="printer" [routerLink]="[row.id]"
                    >Imprimir</a
                  >
                }
              </ng-template>
            </ui-data-table>
          </section>
        }
      }
    </app-portal-student-gate>

    <ui-modal
      [(open)]="requestOpen"
      title="Solicitar certificado"
      description="La solicitud queda pendiente hasta que la secretaría la apruebe."
    >
      <form
        id="certificate-request-form"
        class="stack"
        (submit)="$event.preventDefault(); request()"
      >
        @if (error(); as err) {
          <ui-alert tone="error">{{ err }}</ui-alert>
        }
        <ui-form-field label="Motivo o destino del certificado (opcional)">
          <ui-textarea
            [formControl]="notes"
            [rows]="3"
            [maxlength]="1000"
            placeholder="Ej.: Para trámite de EPS"
          />
        </ui-form-field>
      </form>
      <ng-container uiModalFooter>
        <button ui-button type="button" (click)="requestOpen.set(false)">Cancelar</button>
        <button
          ui-button
          type="submit"
          form="certificate-request-form"
          variant="primary"
          icon="check"
          [loading]="saving()"
        >
          Enviar solicitud
        </button>
      </ng-container>
    </ui-modal>
  `,
  styles: `
    .center {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }
    :host ui-alert,
    section + section {
      display: block;
      margin-bottom: 1.25rem;
    }
    .approved {
      border-left: 4px solid var(--color-success);
    }
  `,
})
export class MyCertificatesPage {
  private readonly students = inject(StudentsService);
  private readonly toast = inject(ToastService);
  protected readonly store = inject(PortalContextStore);

  protected readonly statusLabels = CERTIFICATE_STATUS_LABELS;
  protected readonly statusTones = CERTIFICATE_STATUS_TONES;

  protected readonly certificates = rxResource({
    params: () => this.store.selectedId() ?? undefined,
    stream: ({ params }) => this.students.certificates(params),
  });
  protected readonly list = computed<CertificateView[]>(() => resourceValue(this.certificates, []));
  /** El aprobado más reciente (regla 30). */
  protected readonly latest = computed(
    () =>
      [...this.list()]
        .filter(isPrintable)
        .sort((a, b) => (b.issuedAt ?? '').localeCompare(a.issuedAt ?? '') || b.id - a.id)[0] ??
      null,
  );
  protected readonly hasPending = computed(() => this.list().some((c) => c.status === 'pending'));
  protected readonly latestItems = computed<InfoItem[]>(() => {
    const c = this.latest();
    const s = c?.snapshot;
    const student = this.store.selected();
    return [
      { label: 'Estudiante', value: s?.studentName ?? student?.fullName },
      {
        label: 'Documento',
        value: s ? `${s.documentType} ${s.documentNumber ?? ''}`.trim() : null,
        mono: true,
      },
      { label: 'Grado', value: s?.gradeName ?? student?.placement?.gradeName },
      { label: 'Fecha de expedición', value: formatDateEs(c?.issuedAt) },
    ];
  });

  protected readonly columns: TableColumn<CertificateView>[] = [
    { key: 'type', header: 'Tipo', format: (v) => labelOf(CERTIFICATE_TYPE_LABELS, v as string) },
    { key: 'issuedAt', header: 'Fecha', format: (v) => formatDateEs(v as string) },
    { key: 'status', header: 'Estado' },
    {
      key: 'verificationCode',
      header: 'Código de verificación',
      mono: true,
      hideBelow: 'md',
      format: (v) => (v as string) || '—',
    },
    { key: 'actions', header: '', align: 'end', value: () => null },
  ];

  protected readonly requestOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notes = new FormControl('', {
    nonNullable: true,
    validators: Validators.maxLength(1000),
  });

  protected readonly downloadingId = signal<number | null>(null);

  /** PDF oficial con membrete y QR (`GET /api/certificates/:id/pdf`). */
  protected downloadPdf(c: CertificateView): void {
    if (this.downloadingId() !== null) return;
    this.downloadingId.set(c.id);
    this.students.downloadCertificatePdf(c).subscribe({
      next: () => {
        this.downloadingId.set(null);
        this.toast.success('Certificado descargado en PDF.');
      },
      error: () => this.downloadingId.set(null),
    });
  }

  protected printable(c: CertificateView): boolean {
    return isPrintable(c);
  }

  protected openRequest(): void {
    this.notes.reset();
    this.error.set(null);
    this.requestOpen.set(true);
  }

  protected request(): void {
    const id = this.store.selectedId();
    if (!id || this.saving() || this.notes.invalid) return;
    this.saving.set(true);
    this.error.set(null);
    this.students.requestCertificate(id, this.notes.value).subscribe({
      next: () => {
        this.saving.set(false);
        this.requestOpen.set(false);
        this.toast.success('Solicitud de certificado enviada.');
        this.certificates.reload();
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.error.set(err.message);
      },
    });
  }
}
