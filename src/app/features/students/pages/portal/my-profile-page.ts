import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { formatDateEs, UiAlert, UiBadge, UiSpinner } from '../../../../shared/ui';
import { CatalogLabelPipe, CatalogTonePipe } from '../../components/catalog-label.pipe';
import { InfoGrid, InfoItem } from '../../components/info-grid';
import { PortalStudentGate } from '../../components/portal-student-gate';
import { StudentPhoto } from '../../components/student-photo';
import { PortalContextStore } from '../../data-access/portal-context.store';
import {
  GENDER_LABELS,
  labelOf,
  RELATIONSHIP_LABELS,
  STUDENT_DOCUMENT_LABELS,
  STUDENT_STATUS_LABELS,
  STUDENT_STATUS_TONES,
  StudentView,
} from '../../data-access/students.models';
import { resourceValue } from '../../../../core/resource/resource-value';

/**
 * Mi perfil (análisis 03 §4.7, regla 22): datos del estudiante, foto y
 * acudiente en solo lectura (`GET /api/portal/students/:id/profile`).
 * Los cambios —incluida la foto— los hace la secretaría.
 */
@Component({
  selector: 'app-my-profile-page',
  imports: [
    CatalogLabelPipe,
    CatalogTonePipe,
    InfoGrid,
    PortalStudentGate,
    StudentPhoto,
    UiAlert,
    UiBadge,
    UiSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Mi perfil</h1>
        <p class="page-header__subtitle">Información registrada en la institución</p>
      </div>
    </div>
    <app-portal-student-gate>
      @if (profile.isLoading() && !student()) {
        <div class="center"><ui-spinner size="lg" /></div>
      } @else if (profile.error(); as err) {
        <ui-alert tone="error" title="No se pudo cargar el perfil">{{ err.message }}</ui-alert>
      } @else if (student(); as s) {
        <section class="ui-card head">
          <app-student-photo
            square
            [studentId]="s.id"
            [name]="s.fullName"
            [initials]="s.initials"
            [available]="s.photoAvailable"
          />
          <div class="who">
            <h2>{{ s.fullName }}</h2>
            <div class="cluster">
              <ui-badge tone="primary"
                ><span class="font-mono">{{ s.code }}</span></ui-badge
              >
              @if (s.placement; as p) {
                <ui-badge tone="info">{{ p.gradeName }} · {{ p.classroomName }}</ui-badge>
              }
              <ui-badge [tone]="s.status | catalogTone: statusTones" dot>
                {{ s.status | catalogLabel: statusLabels }}
              </ui-badge>
            </div>
          </div>
        </section>

        <section class="ui-card stack" aria-labelledby="data-title">
          <h2 class="ui-card__title" id="data-title">Datos del estudiante</h2>
          <app-info-grid [items]="studentItems()" />
        </section>

        <section class="ui-card stack" aria-labelledby="guardian-title">
          <h2 class="ui-card__title" id="guardian-title">Acudiente</h2>
          @if (guardianItems(); as items) {
            <app-info-grid [items]="items" />
          } @else {
            <p class="text-muted">Sin acudiente registrado.</p>
          }
        </section>

        <ui-alert tone="info">
          Para actualizar tus datos o tu foto, comunícate con la secretaría del colegio.
        </ui-alert>
      }
    </app-portal-student-gate>
  `,
  styles: `
    .center {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
      align-items: center;
    }
    .who {
      display: grid;
      gap: 0.5rem;
    }
    section,
    ui-alert {
      display: block;
      margin-bottom: 1.25rem;
    }
  `,
})
export class MyProfilePage {
  private readonly store = inject(PortalContextStore);

  protected readonly statusLabels = STUDENT_STATUS_LABELS;
  protected readonly statusTones = STUDENT_STATUS_TONES;

  protected readonly profile = rxResource({
    params: () => this.store.selectedId() ?? undefined,
    stream: ({ params }) => this.store.profile(params),
  });
  protected readonly student = computed<StudentView | null>(() =>
    resourceValue(this.profile, null),
  );

  protected readonly studentItems = computed<InfoItem[]>(() => {
    const s = this.student();
    if (!s) return [];
    return [
      { label: 'Nombre', value: s.fullName },
      { label: 'Código', value: s.code, mono: true },
      {
        label: 'Documento',
        value:
          `${labelOf(STUDENT_DOCUMENT_LABELS, s.documentType)} ${s.documentNumber ?? ''}`.trim(),
      },
      {
        label: 'Fecha de nacimiento',
        value: s.birthDate ? formatDateEs(`${s.birthDate}T12:00:00`) : null,
      },
      { label: 'Género', value: labelOf(GENDER_LABELS, s.gender) },
      { label: 'Grupo sanguíneo', value: s.bloodType, emphasis: 'danger' },
      { label: 'Grado', value: s.placement?.gradeName },
      { label: 'Salón', value: s.placement?.classroomName },
      { label: 'Correo electrónico', value: s.email },
      { label: 'Teléfono', value: s.phone },
      { label: 'Dirección', value: [s.address, s.neighborhood, s.city].filter(Boolean).join(', ') },
      { label: 'EPS', value: s.eps },
      {
        label: 'Fecha de matrícula',
        value: s.enrollmentDate ? formatDateEs(`${s.enrollmentDate}T12:00:00`) : null,
      },
      { label: 'Año lectivo', value: s.academicYear },
    ];
  });

  protected readonly guardianItems = computed<InfoItem[] | null>(() => {
    const g = this.student()?.guardianDetails;
    if (!g) return null;
    return [
      { label: 'Nombre', value: g.fullName },
      { label: 'Parentesco', value: labelOf(RELATIONSHIP_LABELS, g.relationship) },
      { label: 'Celular', value: g.mobile, mono: true },
      { label: 'Teléfono', value: g.phone, mono: true },
      { label: 'Correo electrónico', value: g.email },
      { label: 'Ocupación', value: g.occupation },
    ];
  });
}
