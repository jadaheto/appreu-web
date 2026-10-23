import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { UiAlert, UiSpinner } from '../../../../shared/ui';
import { PortalStudentGate } from '../../components/portal-student-gate';
import { StudentIdCardSheet } from '../../components/student-id-card-sheet';
import { PortalContextStore } from '../../data-access/portal-context.store';
import { StudentsService } from '../../data-access/students.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Carnet digital imprimible del estudiante activo del portal (`GET /api/students/:id/id-card`). */
@Component({
  selector: 'app-my-id-card-page',
  imports: [PortalStudentGate, StudentIdCardSheet, UiAlert, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header no-print">
      <div>
        <h1>Carnet digital</h1>
        <p class="page-header__subtitle">
          Imprímelo o guárdalo en PDF. El QR sirve para registrar la asistencia.
        </p>
      </div>
    </div>
    <app-portal-student-gate>
      @if (card.isLoading()) {
        <div class="center"><ui-spinner size="lg" /></div>
      } @else if (card.error(); as err) {
        <ui-alert tone="error" title="No se pudo generar el carnet">{{ err.message }}</ui-alert>
      } @else if (value(); as c) {
        <app-student-id-card-sheet [card]="c" />
      }
    </app-portal-student-gate>
  `,
  styles: `
    .center {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }
  `,
})
export class MyIdCardPage {
  private readonly students = inject(StudentsService);
  private readonly store = inject(PortalContextStore);

  protected readonly card = rxResource({
    params: () => this.store.selectedId() ?? undefined,
    stream: ({ params }) => this.students.idCard(params),
  });
  protected readonly value = computed(() => resourceValue(this.card, null));
}
