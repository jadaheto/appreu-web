import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { BrandingService, ConfirmService, ToastService } from '../../../../core';
import {
  DateEsPipe,
  formatCop,
  UiAlert,
  UiBadge,
  UiButton,
  UiFormField,
  UiInput,
  UiModal,
  UiPrintableSheet,
  UiSelect,
  UiSpinner,
  UiTextarea,
  BadgeTone,
} from '../../../../shared/ui';
import { DayPipe } from '../../components/day.pipe';
import { notifyError } from '../../components/notify-error';
import { JournalEntry, VoucherType } from '../../data-access/accounting.models';
import {
  ACCOUNTING_BASE,
  ENTRY_STATUS_LABELS,
  ENTRY_STATUS_TONES,
  entryDocument,
  isoDate,
  VOUCHER_TYPE_OPTIONS,
} from '../../data-access/accounting.labels';
import { AccountingService } from '../../data-access/accounting.service';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Detalle de un comprobante (imprimible) con sus acciones según el estado. */
@Component({
  selector: 'app-journal-entry-detail-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DateEsPipe,
    DayPipe,
    UiAlert,
    UiBadge,
    UiButton,
    UiFormField,
    UiInput,
    UiModal,
    UiPrintableSheet,
    UiSelect,
    UiSpinner,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-entry-detail-page.html',
  styleUrls: ['../accounting-page.scss'],
})
export class JournalEntryDetailPage {
  private readonly accounting = inject(AccountingService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  protected readonly branding = inject(BrandingService);

  protected readonly base = ACCOUNTING_BASE;
  protected readonly cop = formatCop;
  protected readonly statusLabels: Readonly<Record<string, string>> = ENTRY_STATUS_LABELS;
  protected readonly statusTones: Readonly<Record<string, BadgeTone>> = ENTRY_STATUS_TONES;
  protected readonly typeOptions = VOUCHER_TYPE_OPTIONS;

  private readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => Number(p.get('id')) || undefined)),
  );
  protected readonly entry = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.accounting.journalEntry(params),
  });
  protected readonly data = computed(() => resourceValue(this.entry, null));
  protected readonly periods = rxResource({ stream: () => this.accounting.periods() });
  protected readonly periodName = computed(() => {
    const e = this.data();
    const list = resourceValue(this.periods, []);
    return list.find((p) => p.id === e?.periodId)?.name ?? (e ? `#${e.periodId}` : '');
  });
  protected readonly doc = computed(() => (this.data() ? entryDocument(this.data()!) : ''));

  protected readonly busy = signal<string | null>(null);

  // Anular
  protected readonly voidOpen = signal(false);
  protected readonly voidReason = this.fb.nonNullable.control('', [
    Validators.required,
    Validators.maxLength(255),
  ]);
  // Revertir
  protected readonly reverseOpen = signal(false);
  protected readonly reverseForm = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.maxLength(255)]],
    date: [isoDate(new Date()), Validators.required],
    type: this.fb.nonNullable.control<VoucherType>('NI'),
  });

  protected async post(entry: JournalEntry): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Contabilizar este borrador?',
      message: 'Se asignará el consecutivo y ya no podrá editarse.',
      confirmLabel: 'Contabilizar',
    });
    if (!ok) return;
    await this.run('post', async () => {
      const saved = await firstValueFrom(this.accounting.postEntry(entry.id));
      this.toast.success(`Asiento ${entryDocument(saved)} contabilizado.`);
      this.entry.reload();
    });
  }

  protected async removeDraft(entry: JournalEntry): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Eliminar este borrador?',
      message: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    await this.run('delete', async () => {
      await firstValueFrom(this.accounting.deleteDraft(entry.id));
      this.toast.success('Borrador eliminado.');
      void this.router.navigate([ACCOUNTING_BASE, 'asientos']);
    });
  }

  protected openVoid(): void {
    this.voidReason.reset('');
    this.voidOpen.set(true);
  }

  protected async voidEntry(entry: JournalEntry): Promise<void> {
    if (this.voidReason.invalid) {
      this.voidReason.markAsTouched();
      return;
    }
    const ok = await this.confirm.ask({
      title: `¿Anular ${entryDocument(entry)}?`,
      message: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Anular asiento',
      tone: 'danger',
    });
    if (!ok) return;
    await this.run('void', async () => {
      await firstValueFrom(this.accounting.voidEntry(entry.id, this.voidReason.value.trim()));
      this.toast.success('Asiento anulado.');
      this.voidOpen.set(false);
      this.entry.reload();
    });
  }

  protected openReverse(): void {
    this.reverseForm.reset({ reason: '', date: isoDate(new Date()), type: 'NI' });
    this.reverseOpen.set(true);
  }

  protected async reverse(entry: JournalEntry): Promise<void> {
    if (this.reverseForm.invalid) {
      this.reverseForm.markAllAsTouched();
      return;
    }
    const v = this.reverseForm.getRawValue();
    await this.run('reverse', async () => {
      const reversal = await firstValueFrom(
        this.accounting.reverseEntry(entry.id, {
          reason: v.reason.trim(),
          date: v.date,
          type: v.type,
        }),
      );
      this.toast.success(`Contra-asiento ${entryDocument(reversal)} registrado.`);
      this.reverseOpen.set(false);
      void this.router.navigate([ACCOUNTING_BASE, 'asientos', reversal.id]);
    });
  }

  private async run(action: string, fn: () => Promise<void>): Promise<void> {
    this.busy.set(action);
    try {
      await fn();
    } catch (e) {
      notifyError(this.toast, e);
    } finally {
      this.busy.set(null);
    }
  }
}
