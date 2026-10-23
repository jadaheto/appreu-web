import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiPrintableSheet } from '../../../shared/ui';
import { StudentIdCardView, usableImageUrl } from '../data-access/students.models';
import { StudentIdCard } from './student-id-card';

/** Carnet dentro de la hoja imprimible institucional (botón Imprimir, `@media print`). */
@Component({
  selector: 'app-student-id-card-sheet',
  imports: [StudentIdCard, UiPrintableSheet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = card();
    <ui-printable-sheet
      [institutionName]="c.institution.name"
      [nit]="c.institution.nit"
      [city]="c.institution.city"
      [logoUrl]="logo()"
      [documentTitle]="'Carnet estudiantil ' + c.academicYear"
      [documentNumber]="c.student.code"
    >
      <app-student-id-card [card]="c" />
      <p uiSheetFooter class="note">
        El código QR está firmado digitalmente y sirve para registrar la asistencia del estudiante.
      </p>
    </ui-printable-sheet>
  `,
  styles: `
    .note {
      font-size: 0.75rem;
      color: #64748b;
      text-align: center;
    }
  `,
})
export class StudentIdCardSheet {
  readonly card = input.required<StudentIdCardView>();
  protected readonly logo = computed(() => usableImageUrl(this.card().institution.logo));
}
