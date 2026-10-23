import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { map, Observable, of, switchMap } from 'rxjs';
import {
  DateEsPipe,
  UiAlert,
  UiBadge,
  UiButton,
  UiEmptyState,
  UiFormField,
  UiInput,
  UiSpinner,
} from '../../../shared/ui';
import { HrDocumentsService } from '../../hr/data-access/hr-documents.service';
import { HR_DOCUMENT_TYPE_LABELS, HrDocumentVerification } from '../../hr/data-access/hr.models';
import { InfoGrid, InfoItem } from '../components/info-grid';
import {
  CERTIFICATE_STATUS_LABELS,
  CERTIFICATE_TYPE_LABELS,
  CertificateVerificationView,
  labelOf,
} from '../data-access/students.models';
import { StudentsService } from '../data-access/students.service';
import { resourceValue } from '../../../core/resource/resource-value';

/** Valor de `?tipo=` que ponen los QR de los PDF (`VerifiableDocumentKind` de la API). */
export type VerifiableKind = 'estudiantil' | 'laboral';

type Verification =
  | { kind: 'estudiantil'; data: CertificateVerificationView }
  | { kind: 'laboral'; data: HrDocumentVerification };

interface VerifyQuery {
  code: string;
  /** `null`: se intenta como certificado estudiantil y, si no existe, como documento de RR. HH. */
  kind: VerifiableKind | null;
}

/** Normaliza `?tipo=`; cualquier otro valor se trata como "sin tipo". */
export function parseKind(value: string | null | undefined): VerifiableKind | null {
  const v = value?.trim().toLowerCase();
  return v === 'estudiantil' || v === 'laboral' ? v : null;
}

/**
 * Verificación de autenticidad de un documento por su código. Es pública en
 * `/verificar` y `/verificar/:code` (ver `app.routes.ts`); también se monta en
 * `/admin/alumnos/verificar` para el personal. Los QR de los PDF apuntan a
 * `/verificar/{code}?tipo={kind}`:
 * - `tipo=estudiantil`: certificado de estudio (`GET /api/public/certificates/verify/:code`).
 * - `tipo=laboral`: certificado de RR. HH. (`GET /api/hr/documents/verify/:code`).
 * - sin `tipo` (o desconocido): estudiantil y, si da 404, RR. HH.
 */
@Component({
  selector: 'app-certificate-verify-page',
  imports: [
    DateEsPipe,
    InfoGrid,
    ReactiveFormsModule,
    UiAlert,
    UiBadge,
    UiButton,
    UiEmptyState,
    UiFormField,
    UiInput,
    UiSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Verificar certificado</h1>
        <p class="page-header__subtitle">
          Consulta la autenticidad de un certificado de estudio o laboral con su código de
          verificación.
        </p>
      </div>
    </div>
    <section class="ui-card stack">
      <form class="search" (submit)="$event.preventDefault(); verify()">
        <ui-form-field label="Código de verificación" required>
          <ui-input [formControl]="codeControl" mono placeholder="Ej.: 7F3K-9QXW" />
        </ui-form-field>
        <button
          ui-button
          type="submit"
          variant="primary"
          icon="shield-check"
          [loading]="result.isLoading()"
        >
          Verificar
        </button>
      </form>

      @if (result.isLoading()) {
        <ui-spinner />
      } @else if (result.error(); as err) {
        <ui-alert tone="error">{{ err.message }}</ui-alert>
      } @else if (searched()) {
        @if (hrVerification(); as h) {
          <div class="result valid" data-kind="laboral">
            <div class="cluster">
              <ui-badge tone="success" dot>Documento auténtico</ui-badge>
              <span class="text-muted">{{ hrTypeLabel(h.type) }}</span>
            </div>
            <app-info-grid [items]="hrItems()" />
            <p class="text-muted small">Expedido el {{ h.issuedAt | dateEs: 'long' }}</p>
          </div>
        } @else if (verification(); as v) {
          <div
            class="result"
            data-kind="estudiantil"
            [class.valid]="v.valid"
            [class.invalid]="!v.valid"
          >
            <div class="cluster">
              <ui-badge [tone]="v.valid ? 'success' : 'danger'" dot>
                {{ v.valid ? 'Certificado válido' : 'Certificado no válido' }}
              </ui-badge>
              <span class="text-muted">{{ statusLabel(v.status) }}</span>
            </div>
            <app-info-grid [items]="items()" />
            <p class="text-muted small">Expedido el {{ v.issuedAt | dateEs: 'long' }}</p>
          </div>
        } @else {
          <ui-empty-state
            icon="exclamation-triangle"
            title="Código no encontrado"
            message="No existe un certificado o documento con ese código. Verifica que lo hayas escrito correctamente."
          />
        }
      }
    </section>
  `,
  styles: `
    .search {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem;
    }
    .search ui-form-field {
      flex: 1 1 16rem;
    }
    .result {
      display: grid;
      gap: 1rem;
      padding: 1.25rem;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border-soft);
    }
    .result.valid {
      border-color: var(--color-success-border);
      background: var(--color-success-bg);
    }
    .result.invalid {
      border-color: var(--color-danger-border);
      background: var(--color-danger-bg);
    }
    .small {
      font-size: var(--text-xs);
    }
  `,
})
export class CertificateVerifyPage {
  private readonly students = inject(StudentsService);
  private readonly hrDocuments = inject(HrDocumentsService);
  private readonly route = inject(ActivatedRoute);

  /** Parámetro de ruta opcional `:code` (con `withComponentInputBinding`). */
  readonly code = input<string>();
  /** Query param `?tipo=estudiantil|laboral` (con `withComponentInputBinding`). */
  readonly tipo = input<string>();

  /** Respaldo cuando el router no enlaza inputs (p. ej. `app.spec.ts`). */
  private readonly routeCode = toSignal(this.route.paramMap.pipe(map((p) => p.get('code'))), {
    initialValue: null,
  });
  private readonly routeTipo = toSignal(this.route.queryParamMap.pipe(map((p) => p.get('tipo'))), {
    initialValue: null,
  });
  private readonly urlCode = computed(() => (this.code() || this.routeCode() || '').trim());
  private readonly urlKind = computed(() => parseKind(this.tipo() || this.routeTipo()));

  protected readonly codeControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(64)],
  });
  private readonly query = signal<VerifyQuery | null>(null);
  protected readonly searched = computed(() => !!this.query());

  protected readonly result = rxResource({
    params: () => this.query() ?? undefined,
    stream: ({ params }) => this.lookup(params),
  });
  private readonly found = computed(() => resourceValue(this.result, null));
  protected readonly verification = computed(() => {
    const f = this.found();
    return f?.kind === 'estudiantil' ? f.data : null;
  });
  protected readonly hrVerification = computed(() => {
    const f = this.found();
    return f?.kind === 'laboral' ? f.data : null;
  });
  protected readonly items = computed<InfoItem[]>(() => {
    const v = this.verification();
    if (!v) return [];
    return [
      { label: 'Institución', value: v.schoolName, wide: true },
      { label: 'Estudiante', value: v.studentName },
      { label: 'Documento', value: v.document, mono: true },
      { label: 'Grado', value: v.gradeName },
      { label: 'Año lectivo', value: v.academicYear },
      { label: 'Tipo', value: labelOf(CERTIFICATE_TYPE_LABELS, v.type) },
    ];
  });
  protected readonly hrItems = computed<InfoItem[]>(() => {
    const h = this.hrVerification();
    if (!h) return [];
    return [
      { label: 'Institución', value: h.institutionName, wide: true },
      { label: 'Empleado', value: h.employeeName },
      { label: 'Tipo', value: this.hrTypeLabel(h.type) },
      { label: 'Código', value: h.code, mono: true },
    ];
  });

  constructor() {
    effect(() => {
      const code = this.urlCode();
      if (code) {
        this.codeControl.setValue(code);
        this.query.set({ code, kind: this.urlKind() });
      }
    });
  }

  protected statusLabel(status: string): string {
    return labelOf(CERTIFICATE_STATUS_LABELS, status);
  }

  protected hrTypeLabel(type: string): string {
    return HR_DOCUMENT_TYPE_LABELS[type] ?? 'Documento de RR. HH.';
  }

  protected verify(): void {
    if (this.codeControl.invalid) {
      this.codeControl.markAsTouched();
      return;
    }
    const code = this.codeControl.value.trim();
    // El `tipo` del QR solo aplica al código de la URL; uno escrito a mano se busca en ambos.
    const kind = code === this.urlCode() ? this.urlKind() : null;
    const current = this.query();
    if (current && current.code === code && current.kind === kind) this.result.reload();
    else this.query.set({ code, kind });
  }

  private lookup({ code, kind }: VerifyQuery): Observable<Verification | null> {
    const asStudent = this.students
      .verifyCertificate(code)
      .pipe(map((data): Verification | null => (data ? { kind: 'estudiantil', data } : null)));
    const asHr = this.hrDocuments
      .verify(code)
      .pipe(map((data): Verification | null => (data ? { kind: 'laboral', data } : null)));
    if (kind === 'estudiantil') return asStudent;
    if (kind === 'laboral') return asHr;
    return asStudent.pipe(switchMap((found) => (found ? of(found) : asHr)));
  }
}
