import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, interval } from 'rxjs';
import { AuthService, ConfirmService, ToastService } from '../../../../core';
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiCheckbox,
  UiFormField,
  UiInput,
  UiProgressBar,
  UiSpinner,
} from '../../../../shared/ui';
import { errorMessage } from '../../components/e-invoicing-ui';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  DocumentCounts,
  DocumentStatus,
  DocumentType,
  ENVIRONMENT_LABELS,
  DianEnvironment,
} from '../../data-access/e-invoicing.models';
import { EInvoicingService } from '../../data-access/e-invoicing.service';
import { resourceValue } from '../../../../core/resource/resource-value';

export const POLL_INTERVAL_MS = 3000;
const FINAL: DocumentStatus[] = ['accepted', 'accepted_with_notices', 'rejected'];
const IN_FLIGHT: DocumentStatus[] = ['draft', 'signed', 'submitted'];

const count = (
  c: Partial<Record<DocumentStatus, number>> | undefined,
  statuses: DocumentStatus[],
) => statuses.reduce((s, st) => s + (c?.[st] ?? 0), 0);
const total = (counts: DocumentCounts | undefined) =>
  DOCUMENT_TYPES.reduce(
    (s, t) => s + Object.values(counts?.[t] ?? {}).reduce((a, b) => a + (b ?? 0), 0),
    0,
  );

const planControl = (value: number) =>
  new FormControl<number | null>(value, [
    Validators.required,
    Validators.min(0),
    Validators.max(100),
  ]);

/** Habilitación DIAN: set de pruebas con avance en vivo y reinicio de numeración. */
@Component({
  selector: 'app-e-invoicing-habilitation-page',
  imports: [
    ReactiveFormsModule,
    UiAlert,
    UiBadge,
    UiButton,
    UiCheckbox,
    UiFormField,
    UiInput,
    UiProgressBar,
    UiSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './habilitation-page.html',
  styles: `
    .mb {
      display: block;
      margin-bottom: var(--space-6);
    }
    .type-card h3 {
      font-weight: 700;
      margin-bottom: var(--space-3);
    }
    .counts {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-2);
      margin: var(--space-3) 0 0;
      font-size: var(--text-sm);
    }
    .counts dt {
      color: var(--color-text-muted);
    }
    .counts dd {
      margin: 0;
      text-align: right;
      font-family: var(--font-mono);
      font-weight: 700;
    }
    .live {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--color-primary);
    }
    .checks {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }
  `,
})
export class HabilitationPage {
  /** Valor del recurso o `undefined` si carga o falló (ver `resourceValue`). */
  protected readonly val = resourceValue;
  private readonly service = inject(EInvoicingService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  protected readonly isAdmin = computed(() => this.auth.hasRole('admin'));
  protected readonly typeLabels = DOCUMENT_TYPE_LABELS;

  protected readonly progress = rxResource({ stream: () => this.service.testSetProgress() });
  protected readonly polling = signal(false);
  private baseline = 0;
  private planned = 0;

  protected readonly environmentLabel = computed(() => {
    const env = resourceValue(this.progress)?.environment as DianEnvironment | undefined;
    return env ? (ENVIRONMENT_LABELS[env] ?? env) : '';
  });
  protected readonly cards = computed(() => {
    const counts = resourceValue(this.progress)?.counts;
    return DOCUMENT_TYPES.map((type) => {
      const c = counts?.[type];
      const sent = Object.values(c ?? {}).reduce((a, b) => a + (b ?? 0), 0);
      const accepted = count(c, ['accepted', 'accepted_with_notices']);
      return {
        type,
        label: DOCUMENT_TYPE_LABELS[type],
        sent,
        accepted,
        rejected: count(c, ['rejected']),
        errors: count(c, ['send_error']),
        inFlight: count(c, IN_FLIGHT),
        done: count(c, FINAL),
        percent: sent ? Math.round((accepted / sent) * 100) : 0,
      };
    });
  });

  protected readonly planForm = new FormGroup({
    invoices: planControl(30),
    creditNotes: planControl(10),
    debitNotes: planControl(10),
  });
  protected readonly running = signal(false);
  protected readonly runError = signal<string | null>(null);

  protected readonly resetTypes = signal<Record<DocumentType, boolean>>({
    fv: true,
    nc: true,
    nd: true,
  });
  protected readonly resetting = signal(false);

  constructor() {
    interval(POLL_INTERVAL_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (!this.polling()) return;
        this.progress.reload();
        this.checkFinished();
      });
  }

  protected async run(): Promise<void> {
    if (!this.isAdmin()) return;
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      return;
    }
    const plan = {
      invoices: Number(this.planForm.controls.invoices.value),
      creditNotes: Number(this.planForm.controls.creditNotes.value),
      debitNotes: Number(this.planForm.controls.debitNotes.value),
    };
    const sum = plan.invoices + plan.creditNotes + plan.debitNotes;
    if (!sum) {
      this.runError.set('Indique al menos un documento para el set de pruebas.');
      return;
    }
    const ok = await this.confirm.ask({
      title: '¿Ejecutar el set de pruebas?',
      message: `Se generarán y enviarán a la DIAN ${plan.invoices} facturas, ${plan.creditNotes} notas crédito y ${plan.debitNotes} notas débito consumiendo la numeración de habilitación.`,
      confirmLabel: 'Ejecutar set',
    });
    if (!ok) return;
    this.running.set(true);
    this.runError.set(null);
    try {
      await firstValueFrom(this.service.runTestSet(plan));
      this.baseline = total(resourceValue(this.progress)?.counts);
      this.planned = sum;
      this.polling.set(true);
      this.progress.reload();
      this.toast.success('Set de pruebas en ejecución. El avance se actualiza automáticamente.');
    } catch (err) {
      this.runError.set(errorMessage(err));
    } finally {
      this.running.set(false);
    }
  }

  protected stopPolling(): void {
    this.polling.set(false);
  }

  protected toggleReset(type: DocumentType, checked: boolean): void {
    this.resetTypes.update((t) => ({ ...t, [type]: checked }));
  }

  protected async reset(): Promise<void> {
    if (!this.isAdmin()) return;
    const types = DOCUMENT_TYPES.filter((t) => this.resetTypes()[t]);
    if (!types.length) {
      this.toast.warning('Seleccione al menos un tipo de documento.');
      return;
    }
    const ok = await this.confirm.ask({
      title: '¿Reiniciar la numeración de habilitación?',
      message: `Se reiniciará el consecutivo de: ${types.map((t) => DOCUMENT_TYPE_LABELS[t]).join(', ')}. Los documentos existentes no se borran.`,
      confirmLabel: 'Reiniciar numeración',
      tone: 'danger',
    });
    if (!ok) return;
    this.resetting.set(true);
    try {
      const result = await firstValueFrom(this.service.resetNumbering(types));
      this.toast.success(
        `Numeración reiniciada: ${result.map((r) => `${r.prefix} desde ${r.current}`).join(', ') || 'sin cambios'}.`,
      );
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.resetting.set(false);
    }
  }

  private checkFinished(): void {
    const counts = resourceValue(this.progress)?.counts;
    if (!counts) return;
    const inFlight = DOCUMENT_TYPES.reduce((s, t) => s + count(counts[t], IN_FLIGHT), 0);
    if (total(counts) - this.baseline >= this.planned && inFlight === 0) {
      this.polling.set(false);
      this.toast.info('El set de pruebas terminó de procesarse.');
    }
  }
}
