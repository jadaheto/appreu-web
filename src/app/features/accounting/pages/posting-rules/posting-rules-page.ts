import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ConfirmService, toApiError, ToastService } from '../../../../core';
import {
  SelectOption,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiAlert,
  UiBadge,
  UiButton,
  UiDataTable,
  UiFormField,
  UiInput,
  UiModal,
  UiSelect,
} from '../../../../shared/ui';
import { notifyError } from '../../components/notify-error';
import { PostingRule } from '../../data-access/accounting.models';
import { AccountingService } from '../../data-access/accounting.service';
import { resourceValue } from '../../../../core/resource/resource-value';

export interface RuleSlot {
  example: string;
  description: string;
  /** Prefijo editable cuando la clave admite un sufijo (método, concepto, categoría, origen). */
  prefix: string | null;
  rules: PostingRule[];
}

interface EventGroup {
  id: string;
  title: string;
  icon: string;
  explanation: string;
  slots: RuleSlot[];
}

const EVENTS: Record<string, { title: string; icon: string; explanation: string }> = {
  payment: {
    title: 'Pagos recibidos (Finanzas)',
    icon: 'banknotes',
    explanation:
      'Cada pago registrado en caja genera un recibo de caja: débito a la cuenta de caja/bancos según el método de pago y crédito al ingreso o cartera según el concepto cobrado. El excedente no aplicado se lleva a anticipos. Al anular el pago se registra la reversión.',
  },
  expense: {
    title: 'Gastos',
    icon: 'wallet',
    explanation:
      'Cada gasto aprobado genera un comprobante de egreso: débito a la cuenta de gasto según la categoría y crédito a caja, bancos o cuentas por pagar según el origen del gasto.',
  },
  payroll: {
    title: 'Nómina (Capital humano)',
    icon: 'briefcase',
    explanation:
      'Al liquidar la nómina se registra el gasto de personal por el total devengado, las deducciones por pagar (salud, pensión, otras) y el neto pagado desde bancos.',
  },
};

const VARIABLE = /^(.*\.(?:method|concept|category|source)\.)[^.]+$/;

/** Agrupa las claves soportadas por evento y les asocia las reglas configuradas. */
export function buildGroups(
  supported: { example: string; description: string }[],
  rules: PostingRule[],
): EventGroup[] {
  const groups = new Map<string, EventGroup>();
  for (const key of supported) {
    const event = key.example.split('.')[0];
    const meta = EVENTS[event] ?? { title: event, icon: 'cog', explanation: '' };
    if (!groups.has(event)) groups.set(event, { id: event, ...meta, slots: [] });
    const prefix = VARIABLE.exec(key.example)?.[1] ?? null;
    groups.get(event)!.slots.push({
      example: key.example,
      description: key.description,
      prefix,
      rules: rules.filter((r) => (prefix ? r.key.startsWith(prefix) : r.key === key.example)),
    });
  }
  return [...groups.values()];
}

/** Parametrización de cuentas para la contabilización automática de eventos de otros módulos. */
@Component({
  selector: 'app-posting-rules-page',
  imports: [
    ReactiveFormsModule,
    UiAlert,
    UiBadge,
    UiButton,
    UiDataTable,
    UiFormField,
    UiInput,
    UiModal,
    UiSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './posting-rules-page.html',
  styleUrls: ['../accounting-page.scss', './posting-rules-page.scss'],
})
export class PostingRulesPage {
  private readonly accounting = inject(AccountingService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  protected readonly data = rxResource({ stream: () => this.accounting.postingRules() });
  protected readonly accounts = rxResource({
    stream: () => this.accounting.transactionalAccounts(),
  });
  protected readonly groups = computed(() =>
    this.data.hasValue()
      ? buildGroups(this.data.value().supportedKeys, this.data.value().rules)
      : [],
  );
  protected readonly rules = computed(() => resourceValue(this.data)?.rules ?? []);
  protected readonly accountOptions = computed<SelectOption<number>[]>(() =>
    resourceValue(this.accounts, []).map((a) => ({
      value: a.id,
      label: `${a.code} — ${a.name}`,
    })),
  );

  protected readonly columns: TableColumn<PostingRule>[] = [
    { key: 'key', header: 'Clave', mono: true, sortable: true },
    {
      key: 'account',
      header: 'Cuenta',
      value: (r) => `${r.accountCode ?? ''} — ${r.accountName ?? 'Cuenta no encontrada'}`,
    },
  ];
  protected readonly actions: TableAction<PostingRule>[] = [
    { id: 'edit', label: 'Cambiar cuenta', icon: 'pencil' },
    { id: 'delete', label: 'Quitar parametrización', icon: 'trash', tone: 'danger' },
  ];

  protected readonly modalOpen = signal(false);
  protected readonly slot = signal<RuleSlot | null>(null);
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    suffix: ['', [Validators.pattern(/^[a-z0-9_-]+$/)]],
    key: ['', Validators.required],
    accountId: this.fb.control<number | null>(null, Validators.required),
  });
  protected readonly suffixErrors = { pattern: 'Solo minúsculas, números, guion y guion bajo.' };

  protected openSlot(slot: RuleSlot, rule?: PostingRule): void {
    this.slot.set(slot);
    this.serverError.set(null);
    const suffix = slot.prefix && rule ? rule.key.slice(slot.prefix.length) : '';
    this.form.reset({ suffix, key: rule?.key ?? slot.example, accountId: rule?.accountId ?? null });
    if (slot.prefix) this.form.controls.suffix.addValidators(Validators.required);
    else this.form.controls.suffix.removeValidators(Validators.required);
    this.form.controls.suffix.updateValueAndValidity();
    if (rule) this.form.controls.suffix.disable();
    else this.form.controls.suffix.enable();
    this.modalOpen.set(true);
  }

  protected onAction(event: TableActionEvent<PostingRule>): void {
    if (event.action === 'delete') {
      void this.remove(event.row);
      return;
    }
    const slot = this.groups()
      .flatMap((g) => g.slots)
      .find((s) => s.rules.includes(event.row));
    if (slot) this.openSlot(slot, event.row);
  }

  protected async save(): Promise<void> {
    const slot = this.slot();
    if (!slot) return;
    const v = this.form.getRawValue();
    const key = slot.prefix ? `${slot.prefix}${v.suffix.trim().toLowerCase()}` : slot.example;
    this.form.controls.key.setValue(key);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.serverError.set(null);
    try {
      const rule = await firstValueFrom(this.accounting.setPostingRule(key, v.accountId!));
      this.toast.success(`Clave ${rule.key} → ${rule.accountCode} ${rule.accountName}.`);
      this.modalOpen.set(false);
      this.data.reload();
    } catch (e) {
      this.serverError.set(toApiError(e).message);
    } finally {
      this.saving.set(false);
    }
  }

  private async remove(rule: PostingRule): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Quitar la parametrización ${rule.key}?`,
      message: 'Los próximos eventos usarán la clave por defecto o quedarán sin contabilizar.',
      confirmLabel: 'Quitar',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.accounting.deletePostingRule(rule.key));
      this.toast.success('Parametrización eliminada.');
      this.data.reload();
    } catch (e) {
      notifyError(this.toast, e);
    }
  }
}
