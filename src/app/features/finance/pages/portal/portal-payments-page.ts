import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { UiAlert, UiEmptyState, UiSpinner } from '../../../../shared/ui';
import { AccountStatementView } from '../../components/account-statement-view';
import { PortalStudentContext, PortalStudentPicker } from '../../components/portal-student-context';
import { errorMessage } from '../../data-access/finance-labels';
import { FinanceService } from '../../data-access/finance.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/**
 * `/portal-estudiante/pagos` — estado de cuenta, cobros y pagos propios (o del
 * hijo seleccionado) con recibos y cuentas de cobro imprimibles.
 */
@Component({
  selector: 'app-portal-payments-page',
  imports: [UiAlert, UiEmptyState, UiSpinner, AccountStatementView, PortalStudentPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Mis pagos</h1>
        <p class="page-header__subtitle">
          Estado de cuenta{{ ctx.current() ? ' de ' + ctx.current()!.fullName : '' }}.
        </p>
      </div>
      <app-portal-student-picker
        [students]="ctx.list()"
        [selected]="ctx.current()?.id ?? null"
        (selectedChange)="ctx.select($event)"
      />
    </div>

    @if (ctx.students.isLoading()) {
      <div class="center"><ui-spinner size="lg" /></div>
    } @else if (ctx.students.error()) {
      <ui-alert tone="error" title="No se pudieron cargar tus estudiantes">{{
        studentsError()
      }}</ui-alert>
    } @else if (!ctx.current()) {
      <div class="ui-card">
        <ui-empty-state
          icon="user"
          title="Sin estudiantes vinculados"
          message="Tu usuario no tiene estudiantes asociados. Comunícate con la institución."
        />
      </div>
    } @else if (statement.isLoading() && !st()) {
      <div class="center"><ui-spinner size="lg" /></div>
    } @else if (statement.error()) {
      <ui-alert tone="error" title="No se pudo cargar el estado de cuenta">{{
        statementError()
      }}</ui-alert>
    } @else if (st(); as s) {
      <app-account-statement-view [statement]="s" printBase="/portal-estudiante/pagos" />
    }
  `,
  styles: `
    .center {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }
  `,
})
export class PortalPaymentsPage {
  private readonly finance = inject(FinanceService);
  protected readonly ctx = inject(PortalStudentContext);

  protected readonly statement = rxResource({
    params: () => this.ctx.current()?.id,
    stream: ({ params }) => this.finance.accountStatement(params),
  });
  protected readonly st = computed(() => resourceValue(this.statement, null));

  protected studentsError(): string {
    return errorMessage(this.ctx.students.error());
  }
  protected statementError(): string {
    return errorMessage(this.statement.error());
  }
}
