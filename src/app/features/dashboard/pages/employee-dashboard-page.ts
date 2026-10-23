import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { formatCop, UiAlert, UiButton, UiIcon, UiStatCard } from '../../../shared/ui';
import { DashboardService } from '../data-access/dashboard.service';
import { DashboardCard, formatTenure, PortalDashboardBase } from './portal-dashboard.base';
import { resourceValue } from '../../../core/resource/resource-value';

/**
 * Inicio del portal del empleado (`GET /api/me/employee/dashboard`): último
 * pago, antigüedad, permisos y ausencias, más accesos rápidos según su menú.
 */
@Component({
  selector: 'app-employee-dashboard-page',
  imports: [RouterLink, UiAlert, UiButton, UiIcon, UiStatCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div>
        <h1>Hola, {{ firstName() }} 👋</h1>
        <p class="page-header__subtitle">
          @if (data(); as d) {
            {{ d.employee.position || 'Tu información laboral' }}
            @if (d.employee.department) {
              · {{ d.employee.department }}
            }
            · <span class="font-mono">{{ d.employee.code }}</span>
          } @else {
            Tu información laboral en un solo lugar.
          }
        </p>
      </div>
    </div>

    @if (error(); as e) {
      @if (e.notFound) {
        <ui-alert tone="info" title="Sin ficha de empleado vinculada" class="mb">
          Tu usuario no está vinculado a una ficha de empleado; los indicadores laborales no están
          disponibles. Comunícate con Talento Humano.
        </ui-alert>
      } @else {
        <ui-alert tone="error" title="No se pudieron cargar tus indicadores" class="mb">
          {{ e.message }}
          <button ui-button size="sm" variant="ghost" (click)="summary.reload()">Reintentar</button>
        </ui-alert>
      }
    }

    @if (!error()) {
      <section class="grid grid--4 mb" aria-label="Indicadores">
        @for (card of cards(); track card.label) {
          <ui-stat-card
            variant="border"
            [label]="card.label"
            [icon]="card.icon"
            [tone]="card.tone"
            [value]="card.value"
            [hint]="card.hint ?? ''"
            [loading]="summary.isLoading()"
          />
        }
      </section>
    }

    <section aria-labelledby="shortcuts-title">
      <h2 id="shortcuts-title" class="section-title">Accesos rápidos</h2>
      <div class="grid grid--3">
        @for (item of shortcuts(); track item.key) {
          <a class="shortcut ui-card" [routerLink]="item.route">
            <span class="icon"><ui-icon [name]="item.icon" [size]="22" /></span>
            <span class="label">{{ item.label }}</span>
            <ui-icon name="chevron-right" [size]="18" class="chev" />
          </a>
        }
      </div>
    </section>
  `,
  styleUrl: './portal-dashboard.scss',
})
export class EmployeeDashboardPage extends PortalDashboardBase {
  private readonly dashboard = inject(DashboardService);
  protected readonly summary = rxResource({ stream: () => this.dashboard.employee() });
  protected readonly data = computed(() => resourceValue(this.summary, null));
  protected readonly error = computed(() => this.describeError(this.summary.error()));

  protected readonly cards = computed<DashboardCard[]>(() => {
    const d = this.data();
    return [
      {
        label: 'Último pago neto',
        icon: 'banknotes',
        tone: 'success',
        value: d ? (d.lastPayslip ? formatCop(d.lastPayslip.net) : 'Sin pagos') : null,
        hint: d?.lastPayslip?.periodLabel ?? '',
      },
      {
        label: 'Antigüedad',
        icon: 'clock',
        tone: 'primary',
        value: d ? formatTenure(d.monthsEmployed) : null,
      },
      {
        label: 'Permisos pendientes',
        icon: 'calendar',
        tone: 'warning',
        value: d?.pendingLeaves ?? null,
        hint: d ? `${d.approvedLeavesThisYear} aprobados este año` : '',
      },
      {
        label: 'Días de ausencia (año)',
        icon: 'document-text',
        tone: 'info',
        value: d?.absenceDaysThisYear ?? null,
      },
    ];
  });
}
