import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService, ConfirmService, ToastService } from '../../../../core';
import {
  DateEsPipe,
  UiAlert,
  UiBadge,
  UiButton,
  UiEmptyState,
  UiIcon,
  UiSpinner,
} from '../../../../shared/ui';
import { DocumentStatusBadge, errorMessage } from '../../components/e-invoicing-ui';
import { CheckSeverity, RetrySummary } from '../../data-access/e-invoicing.models';
import { EInvoicingService } from '../../data-access/e-invoicing.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const SEVERITY: Record<
  CheckSeverity,
  { icon: string; tone: 'success' | 'warning' | 'danger'; label: string }
> = {
  ok: { icon: 'check-circle', tone: 'success', label: 'Correcto' },
  warning: { icon: 'exclamation-triangle', tone: 'warning', label: 'Advertencia' },
  error: { icon: 'exclamation-circle', tone: 'danger', label: 'Error' },
};

/** Diagnóstico de configuración, certificado de firma y reenvío de pendientes (solo administradores). */
@Component({
  selector: 'app-e-invoicing-diagnostics-page',
  imports: [
    RouterLink,
    DateEsPipe,
    UiAlert,
    UiBadge,
    UiButton,
    UiEmptyState,
    UiIcon,
    UiSpinner,
    DocumentStatusBadge,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './diagnostics-page.html',
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-6);
    }
    .checks {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .checks li {
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
    }
    .sev-success {
      color: var(--color-success);
    }
    .sev-warning {
      color: var(--color-warning);
    }
    .sev-danger {
      color: var(--color-danger);
    }
    .code {
      font-size: var(--text-xs);
      color: var(--color-text-subtle);
    }
    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: var(--space-2) var(--space-4);
      margin: 0;
      font-size: var(--text-sm);
    }
    dt {
      color: var(--color-text-muted);
    }
    dd {
      margin: 0;
      word-break: break-word;
    }
    .center {
      display: flex;
      justify-content: center;
      padding: var(--space-5);
    }
    .results {
      margin-top: var(--space-4);
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .results li {
      display: flex;
      gap: var(--space-3);
      align-items: center;
    }
  `,
})
export class DiagnosticsPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly service = inject(EInvoicingService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  protected readonly isAdmin = computed(() => this.auth.hasRole('admin'));
  protected readonly severity = SEVERITY;

  protected readonly diagnostics = rxResource({
    params: () => this.isAdmin() || undefined,
    stream: () => this.service.diagnostics(),
  });
  protected readonly certificate = rxResource({
    params: () => this.isAdmin() || undefined,
    stream: () => this.service.certificate(),
  });
  protected readonly counts = computed(() => {
    const checks = resourceValue(this.diagnostics)?.checks ?? [];
    return {
      errors: checks.filter((c) => c.severity === 'error').length,
      warnings: checks.filter((c) => c.severity === 'warning').length,
    };
  });

  protected readonly retrying = signal(false);
  protected readonly retryResult = signal<RetrySummary | null>(null);

  protected errorText(err: unknown): string {
    return errorMessage(err, 'Inténtelo de nuevo más tarde.');
  }

  protected async retryPending(): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Reenviar documentos pendientes?',
      message:
        'Se reenviarán a la DIAN los documentos firmados sin enviar o con error de transporte (mismo XML).',
      confirmLabel: 'Reenviar',
    });
    if (!ok) return;
    this.retrying.set(true);
    try {
      const result = await firstValueFrom(this.service.retryPending());
      this.retryResult.set(result);
      this.toast.success(`Procesados ${result.processed} documentos (${result.skipped} omitidos).`);
      this.diagnostics.reload();
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.retrying.set(false);
    }
  }
}
