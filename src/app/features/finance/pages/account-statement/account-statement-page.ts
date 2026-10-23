import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { UiAlert, UiButton, UiEmptyState, UiSpinner } from '../../../../shared/ui';
import { AccountStatementView } from '../../components/account-statement-view';
import { StudentSearch } from '../../components/student-search';
import { StudentSummaryCard } from '../../components/student-summary-card';
import { errorMessage } from '../../data-access/finance-labels';
import type { BillingStudent } from '../../data-access/finance.models';
import { FinanceService } from '../../data-access/finance.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** `/admin/finanzas/estado-cuenta?studentId=` — estado de cuenta completo del estudiante. */
@Component({
  selector: 'app-account-statement-page',
  imports: [
    RouterLink,
    UiAlert,
    UiButton,
    UiEmptyState,
    UiSpinner,
    AccountStatementView,
    StudentSearch,
    StudentSummaryCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Estado de cuenta</h1>
        <p class="page-header__subtitle">Cobros, pagos y saldos de un estudiante.</p>
      </div>
      @if (currentId()) {
        <div class="cluster no-print">
          <button ui-button icon="printer" (click)="print()">Imprimir</button>
          <a
            ui-button
            variant="primary"
            icon="banknotes"
            routerLink="../caja"
            [queryParams]="{ studentId: currentId() }"
          >
            Registrar pago
          </a>
        </div>
      }
    </div>

    <div class="ui-card mb no-print search">
      <app-student-search (selected)="select($event)" />
    </div>

    @if (!currentId()) {
      <div class="ui-card">
        <ui-empty-state
          icon="user"
          title="Busca un estudiante"
          message="Busca un estudiante para ver su estado de cuenta."
        />
      </div>
    } @else if (statement.isLoading() && !st()) {
      <div class="center"><ui-spinner size="lg" /></div>
    } @else if (statement.error()) {
      <ui-alert tone="error" title="No se pudo cargar el estado de cuenta">{{ error() }}</ui-alert>
    } @else if (st(); as s) {
      <section class="ui-card mb">
        <app-student-summary-card [student]="s.student" />
      </section>
      <app-account-statement-view [statement]="s" printBase="/admin/finanzas" />
    }
  `,
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-5);
    }
    .search {
      position: relative;
      z-index: 5;
    }
    .center {
      display: flex;
      justify-content: center;
      padding: 3rem 0;
    }
  `,
})
export class AccountStatementPage {
  private readonly finance = inject(FinanceService);
  private readonly router = inject(Router);

  readonly studentId = input<string | undefined>();
  protected readonly currentId = linkedSignal(() => {
    const id = Number(this.studentId());
    return Number.isInteger(id) && id > 0 ? id : null;
  });
  protected readonly statement = rxResource({
    params: () => this.currentId() ?? undefined,
    stream: ({ params }) => this.finance.accountStatement(params),
  });
  protected readonly st = computed(() => resourceValue(this.statement, null));

  protected error(): string {
    return errorMessage(this.statement.error());
  }

  protected select(student: BillingStudent): void {
    this.currentId.set(student.id);
    void this.router.navigate([], {
      queryParams: { studentId: student.id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected print(): void {
    window.print();
  }
}
