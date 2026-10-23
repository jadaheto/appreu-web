import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { UiAlert, UiSpinner } from '../../../../../shared/ui';
import { StudentIdCardSheet } from '../../../components/student-id-card-sheet';
import { StudentsService } from '../../../data-access/students.service';
import { resourceValue } from '../../../../../core/resource/resource-value';

/** Pestaña "Carnet": carnet imprimible con QR firmado (`GET /students/:id/id-card`). */
@Component({
  selector: 'app-student-id-card-tab',
  imports: [StudentIdCardSheet, UiAlert, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (card.isLoading()) {
      <ui-spinner />
    } @else if (card.error(); as err) {
      <ui-alert tone="error" title="No se pudo generar el carnet">{{ err.message }}</ui-alert>
    } @else if (value(); as c) {
      <app-student-id-card-sheet [card]="c" />
    }
  `,
})
export class IdCardTab {
  private readonly students = inject(StudentsService);
  readonly studentId = input.required<number>();

  protected readonly card = rxResource({
    params: () => this.studentId(),
    stream: ({ params }) => this.students.idCard(params),
  });
  protected readonly value = computed(() => resourceValue(this.card, null));
}
