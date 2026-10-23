import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiIcon } from '../../../shared/ui';
import { StudentIdCardView, usableImageUrl } from '../data-access/students.models';
import { QrCode } from './qr-code/qr-code';
import { StudentPhoto } from './student-photo';

/**
 * Carnet estudiantil (análisis 03 §3.6 regla 27, §4.4): cabecera institucional,
 * foto o iniciales, datos del estudiante, QR firmado y franja del acudiente.
 * Se imprime con colores (`print-color-adjust: exact`).
 */
@Component({
  selector: 'app-student-id-card',
  host: { class: 'ui-light-surface' },
  imports: [QrCode, StudentPhoto, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = card();
    <article class="card" [attr.aria-label]="'Carnet estudiantil de ' + c.student.fullName">
      <header class="head">
        @if (logo(); as src) {
          <img [src]="src" alt="" [style.height.px]="c.institution.logoSize" />
        } @else {
          <ui-icon name="academic-cap" [size]="28" />
        }
        <div>
          <p class="school">{{ c.institution.name }}</p>
          @if (c.institution.nit) {
            <p class="nit">NIT {{ c.institution.nit }}</p>
          }
          <p class="kind">Carnet estudiantil — {{ c.academicYear }}</p>
        </div>
      </header>
      <div class="body">
        <app-student-photo
          square
          [studentId]="c.student.id"
          [name]="c.student.fullName"
          [initials]="c.student.initials"
          [available]="c.student.photoAvailable"
        />
        <dl>
          <dt class="sr-only">Nombre</dt>
          <dd class="name">{{ c.student.fullName }}</dd>
          <dt>Código</dt>
          <dd class="font-mono">{{ c.student.code }}</dd>
          <dt>Grado</dt>
          <dd>
            @if (c.student.placement; as p) {
              {{ p.gradeName }} · {{ p.classroomName }}
            } @else {
              Sin asignar
            }
          </dd>
          <dt>Documento</dt>
          <dd class="font-mono">
            {{ c.student.documentType }} {{ c.student.documentNumber ?? '—' }}
          </dd>
          @if (c.student.bloodType) {
            <dt>RH</dt>
            <dd class="rh">{{ c.student.bloodType }}</dd>
          }
        </dl>
      </div>
      <div class="foot">
        <app-qr-code [value]="c.qr" [size]="84" label="Código QR firmado del carnet" />
        <div class="valid">
          @if (c.institution.city) {
            <p>{{ c.institution.city }}</p>
          }
          <p>
            Válido: <strong>{{ c.academicYear }}</strong>
          </p>
          <p class="code font-mono">{{ c.student.code }}</p>
        </div>
      </div>
      @if (c.guardian; as g) {
        <footer class="guardian">
          <span>Acudiente</span>
          <strong>{{ g.fullName }}</strong>
          @if (g.mobile) {
            <span class="font-mono">{{ g.mobile }}</span>
          }
        </footer>
      }
    </article>
  `,
  styles: `
    :host {
      display: block;
      max-width: 22rem;
      margin-inline: auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .card {
      border-radius: var(--radius-xl);
      overflow: hidden;
      background: #fff;
      color: #1e293b;
      box-shadow: var(--shadow-lg);
      border: 1px solid var(--color-border-soft);
    }
    .head {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      padding: 1rem 1.25rem;
      background: var(--gradient-primary);
      color: #fff;
    }
    .school {
      font-weight: 800;
      line-height: 1.2;
    }
    .nit,
    .kind {
      font-size: 0.7rem;
      opacity: 0.9;
    }
    .kind {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      margin-top: 0.15rem;
    }
    .body {
      display: flex;
      gap: 1rem;
      padding: 1.25rem;
    }
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.2rem 0.6rem;
      font-size: 0.78rem;
      align-content: start;
    }
    dt {
      color: #64748b;
      font-weight: 600;
    }
    .name {
      grid-column: 1 / -1;
      font-size: 1rem;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 0.25rem;
    }
    .rh {
      color: #dc2626;
      font-weight: 800;
    }
    .foot {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0 1.25rem 1.25rem;
      font-size: 0.75rem;
      color: #475569;
    }
    .code {
      font-size: 1.1rem;
      font-weight: 700;
      color: #1e293b;
    }
    .guardian {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem 0.75rem;
      align-items: baseline;
      padding: 0.75rem 1.25rem;
      background: #1e293b;
      color: #e2e8f0;
      font-size: 0.75rem;
    }
    .guardian span:first-child {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.65rem;
      color: #94a3b8;
    }
    @media print {
      .card {
        box-shadow: none;
      }
    }
  `,
})
export class StudentIdCard {
  readonly card = input.required<StudentIdCardView>();
  protected readonly logo = computed(() => usableImageUrl(this.card().institution.logo));
}
