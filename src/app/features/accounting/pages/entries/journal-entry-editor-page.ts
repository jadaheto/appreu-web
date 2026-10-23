import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, of, startWith } from 'rxjs';
import { toApiError, ToastService } from '../../../../core';
import {
  formatCop,
  SelectOption,
  UiAlert,
  UiButton,
  UiFormField,
  UiIcon,
  UiInput,
  UiSelect,
  UiSpinner,
} from '../../../../shared/ui';
import {
  JournalEntry,
  JournalEntryRequest,
  VOUCHER_TYPES,
  VoucherType,
} from '../../data-access/accounting.models';
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNTING_BASE,
  entryDocument,
  isoDate,
  VOUCHER_TYPE_OPTIONS,
} from '../../data-access/accounting.labels';
import { AccountingService } from '../../data-access/accounting.service';
import { resourceValue } from '../../../../core/resource/resource-value';

type LineForm = FormGroup<{
  accountId: FormControl<number | null>;
  thirdPartyId: FormControl<number | null>;
  description: FormControl<string>;
  debit: FormControl<number | null>;
  credit: FormControl<number | null>;
}>;

interface LineValue {
  accountId?: number | null;
  thirdPartyId?: number | null;
  description?: string | null;
  debit?: number | null;
  credit?: number | null;
}

const toCents = (v: number | null | undefined): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) : 0;

const isBlank = (l: LineValue): boolean => !l.accountId && !toCents(l.debit) && !toCents(l.credit);

/** Una línea con cuenta debe tener valor en débito o en crédito (no en ambos). */
function lineValidator(control: AbstractControl): ValidationErrors | null {
  const l = control.value as LineValue;
  if (isBlank(l)) return null;
  if (!l.accountId) return { account: true };
  const d = toCents(l.debit);
  const c = toCents(l.credit);
  if (d < 0 || c < 0) return { negative: true };
  if (d > 0 === c > 0) return { amount: true };
  return null;
}

export interface EntryTotals {
  debit: number;
  credit: number;
  difference: number;
  balanced: boolean;
  lines: number;
}

/** Totales en vivo del editor (aritmética en centavos para evitar errores de coma flotante). */
export function computeTotals(lines: readonly LineValue[]): EntryTotals {
  const used = lines.filter((l) => !isBlank(l));
  const d = used.reduce((acc, l) => acc + toCents(l.debit), 0);
  const c = used.reduce((acc, l) => acc + toCents(l.credit), 0);
  return {
    debit: d / 100,
    credit: c / 100,
    difference: (d - c) / 100,
    balanced: d === c && d > 0,
    lines: used.length,
  };
}

/**
 * Editor de asientos (nuevo o borrador): cabecera, líneas débito/crédito,
 * totales y cuadre en vivo. La validación definitiva la hace la API.
 */
@Component({
  selector: 'app-journal-entry-editor-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    UiAlert,
    UiButton,
    UiFormField,
    UiIcon,
    UiInput,
    UiSelect,
    UiSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-entry-editor-page.html',
  styleUrls: ['../accounting-page.scss', './journal-entry-editor-page.scss'],
})
export class JournalEntryEditorPage {
  private readonly accounting = inject(AccountingService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly base = ACCOUNTING_BASE;
  protected readonly cop = formatCop;
  protected readonly entryId = Number(this.route.snapshot.paramMap.get('id')) || null;

  protected readonly accounts = rxResource({
    stream: () => this.accounting.transactionalAccounts(),
  });
  protected readonly parties = rxResource({
    stream: () => this.accounting.thirdParties({ isActive: true, pageSize: 200 }),
  });
  protected readonly periods = rxResource({ stream: () => this.accounting.periods() });
  protected readonly existing = rxResource({
    params: () => this.entryId,
    stream: ({ params }) => (params ? this.accounting.journalEntry(params) : of(null)),
  });

  protected readonly accountOptions = computed<SelectOption<number>[]>(() =>
    resourceValue(this.accounts, []).map((a) => ({
      value: a.id,
      label: `${a.code} — ${a.name}`,
      group: ACCOUNT_TYPE_LABELS[a.type],
    })),
  );
  protected readonly partyOptions = computed<SelectOption<number>[]>(() =>
    (resourceValue(this.parties)?.items ?? []).map((p) => ({
      value: p.id,
      label: `${p.name} (${p.document})`,
    })),
  );
  protected readonly periodOptions = computed<SelectOption<number | null>[]>(() => [
    { value: null, label: 'Automático (periodo abierto de la fecha)' },
    ...resourceValue(this.periods, [])
      .filter((p) => p.status === 'open')
      .map((p) => ({ value: p.id, label: `${p.name} (${p.startDate} a ${p.endDate})` })),
  ]);
  protected readonly typeOptions = VOUCHER_TYPE_OPTIONS;
  protected readonly noAccounts = computed(
    () => this.accounts.hasValue() && this.accounts.value().length === 0,
  );

  protected readonly form = this.fb.group({
    periodId: this.fb.control<number | null>(null),
    date: this.fb.nonNullable.control(isoDate(new Date()), Validators.required),
    type: this.fb.nonNullable.control<VoucherType>(this.initialType(), Validators.required),
    description: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
    lines: this.fb.array<LineForm>([]),
  });
  protected get lines(): FormArray<LineForm> {
    return this.form.controls.lines;
  }

  private readonly linesValue = toSignal<readonly LineValue[], readonly LineValue[]>(
    this.form.controls.lines.valueChanges.pipe(
      startWith(this.form.controls.lines.getRawValue() as readonly LineValue[]),
    ),
    { initialValue: [] },
  );
  protected readonly totals = computed(() => computeTotals(this.linesValue()));

  protected readonly saving = signal<'draft' | 'post' | null>(null);
  protected readonly serverError = signal<string | null>(null);
  protected readonly submitted = signal(false);
  private loadedId: number | null = null;

  protected readonly notDraft = computed(() => {
    const e = resourceValue(this.existing, null);
    return e && e.status !== 'draft' ? e : null;
  });

  constructor() {
    this.addLine();
    this.addLine();
    // Al cargar un borrador, se copia en el formulario (una sola vez).
    effect(() => {
      const entry = resourceValue(this.existing, null);
      if (entry && entry.status === 'draft' && this.loadedId !== entry.id) {
        untracked(() => this.hydrate(entry));
      }
    });
  }

  private hydrate(entry: JournalEntry): void {
    this.loadedId = entry.id;
    this.form.patchValue({
      periodId: entry.periodId,
      date: entry.date,
      type: entry.type,
      description: entry.description,
    });
    this.lines.clear();
    for (const l of entry.lines ?? []) this.addLine(l);
    while (this.lines.length < 2) this.addLine();
  }

  protected addLine(value: LineValue = {}): void {
    const group: LineForm = this.fb.group(
      {
        accountId: this.fb.control<number | null>(value.accountId ?? null),
        thirdPartyId: this.fb.control<number | null>(value.thirdPartyId ?? null),
        description: this.fb.nonNullable.control(
          value.description ?? '',
          Validators.maxLength(255),
        ),
        debit: this.fb.control<number | null>(value.debit ? value.debit : null, Validators.min(0)),
        credit: this.fb.control<number | null>(
          value.credit ? value.credit : null,
          Validators.min(0),
        ),
      },
      { validators: lineValidator },
    );
    // Exclusión mutua débito/crédito por fila.
    const { debit, credit } = group.controls;
    debit.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => {
      if (toCents(v) > 0 && credit.value) credit.setValue(null);
    });
    credit.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => {
      if (toCents(v) > 0 && debit.value) debit.setValue(null);
    });
    this.lines.push(group);
  }

  protected removeLine(index: number): void {
    if (this.lines.length <= 2) {
      this.lines
        .at(index)
        .reset({ accountId: null, thirdPartyId: null, description: '', debit: null, credit: null });
      return;
    }
    this.lines.removeAt(index);
  }

  /** Completa la línea con la diferencia para cuadrar el asiento. */
  protected balanceLine(index: number): void {
    const diff = this.totals().difference;
    if (!diff) return;
    const line = this.lines.at(index);
    const own = toCents(line.value.debit) / 100 - toCents(line.value.credit) / 100;
    const target = own - diff;
    if (target > 0) line.patchValue({ debit: Math.round(target * 100) / 100, credit: null });
    else if (target < 0) line.patchValue({ credit: Math.round(-target * 100) / 100, debit: null });
  }

  protected lineError(index: number): string | null {
    const g = this.lines.at(index);
    if (!g.errors || (!g.touched && !this.submitted())) return null;
    if (g.errors['account']) return 'Selecciona la cuenta de la línea.';
    if (g.errors['amount']) return 'Escribe un valor en débito o en crédito (solo uno).';
    if (g.errors['negative']) return 'Los valores no pueden ser negativos.';
    return null;
  }

  protected async save(mode: 'draft' | 'post'): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const totals = this.totals();
    if (totals.lines < 2) {
      this.serverError.set('El asiento debe tener al menos dos líneas con cuenta y valor.');
      return;
    }
    if (mode === 'post' && !totals.balanced) return;
    const dto = this.buildRequest();
    this.saving.set(mode);
    this.serverError.set(null);
    try {
      let saved: JournalEntry;
      if (this.entryId) {
        saved = await firstValueFrom(this.accounting.updateDraft(this.entryId, dto));
        if (mode === 'post') saved = await firstValueFrom(this.accounting.postEntry(this.entryId));
      } else {
        saved = await firstValueFrom(
          this.accounting.createJournalEntry({ ...dto, postImmediately: mode === 'post' }),
        );
      }
      this.toast.success(
        mode === 'post'
          ? `Asiento ${entryDocument(saved)} creado y contabilizado.`
          : 'Borrador guardado.',
      );
      void this.router.navigate([ACCOUNTING_BASE, 'asientos', saved.id]);
    } catch (e) {
      this.serverError.set(toApiError(e).message);
    } finally {
      this.saving.set(null);
    }
  }

  private buildRequest(): JournalEntryRequest {
    const v = this.form.getRawValue();
    return {
      ...(v.periodId ? { periodId: v.periodId } : {}),
      date: v.date,
      type: v.type,
      description: v.description.trim(),
      lines: v.lines
        .filter((l) => !isBlank(l))
        .map((l) => ({
          accountId: l.accountId as number,
          thirdPartyId: l.thirdPartyId ?? null,
          ...(l.description.trim() ? { description: l.description.trim() } : {}),
          debit: toCents(l.debit) / 100,
          credit: toCents(l.credit) / 100,
        })),
    };
  }

  private initialType(): VoucherType {
    const tipo = this.route.snapshot.queryParamMap.get('tipo')?.toUpperCase();
    return (VOUCHER_TYPES as readonly string[]).includes(tipo ?? '') ? (tipo as VoucherType) : 'CE';
  }
}
