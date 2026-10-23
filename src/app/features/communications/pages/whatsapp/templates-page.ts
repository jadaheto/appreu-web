import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, ConfirmService, ToastService } from '../../../../core';
import {
  BadgeTone,
  SelectOption,
  TableAction,
  TableActionEvent,
  TableColumn,
  UiBadge,
  UiButton,
  UiCellDef,
  UiChip,
  UiDataTable,
  UiFormField,
  UiInput,
  UiModal,
  UiSelect,
  UiTextarea,
} from '../../../../shared/ui';
import { WhatsAppPreview } from '../../components/whatsapp-preview';
import {
  countPlaceholders,
  HEADER_TYPES,
  HeaderType,
  MAX_TEMPLATE_BODY,
  TEMPLATE_CATEGORIES,
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_LANGUAGES,
  TEMPLATE_STATUS_LABELS,
  TEMPLATE_STATUSES,
  TemplateButton,
  TemplateCategory,
  TemplateStatus,
  WhatsAppTemplate,
  WhatsAppTemplateInput,
} from '../../data-access/communications.models';
import { reportError } from '../../data-access/report-error';
import { WhatsAppService } from '../../data-access/whatsapp.service';
import { resourceValue } from '../../../../core/resource/resource-value';

const STATUS_TONES: Record<TemplateStatus, BadgeTone> = {
  active: 'success',
  pending: 'warning',
  rejected: 'danger',
};
const HEADER_LABELS: Record<HeaderType, string> = {
  none: 'Ninguno',
  text: 'Texto',
  image: 'Imagen',
};
const BUTTON_TYPES = ['QUICK_REPLY', 'URL'] as const;

/** `/admin/whatsapp/plantillas`: listado de plantillas; crear/editar/eliminar solo administradores. */
@Component({
  selector: 'app-whatsapp-templates-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    WhatsAppPreview,
    UiBadge,
    UiButton,
    UiCellDef,
    UiChip,
    UiDataTable,
    UiFormField,
    UiInput,
    UiModal,
    UiSelect,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './templates-page.html',
  styleUrl: '../comms.scss',
  styles: `
    .editor-grid {
      display: grid;
      gap: var(--space-6);
      grid-template-columns: 1fr;
    }
    @media (min-width: 1024px) {
      .editor-grid {
        grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
      }
    }
    .plain {
      border: 0;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .plain legend {
      font-size: var(--text-xs);
      font-weight: 600;
      margin-bottom: var(--space-2);
    }
    .button-row {
      display: grid;
      gap: var(--space-2);
      grid-template-columns: 10rem 1fr 1fr auto;
      align-items: center;
    }
    @media (max-width: 640px) {
      .button-row {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class WhatsAppTemplatesPage {
  /** Lectura segura de los resources en la plantilla (no lanza en estado de error). */
  protected readonly val = resourceValue;
  private readonly wa = inject(WhatsAppService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly canEdit = computed(() => this.auth.hasRole('admin'));
  protected readonly statusFilter = signal<TemplateStatus | null>(null);
  protected readonly templates = rxResource({
    params: () => ({ status: this.statusFilter() }),
    stream: ({ params }) => this.wa.templates(params.status),
  });
  protected readonly statuses = TEMPLATE_STATUSES;
  protected readonly statusLabels = TEMPLATE_STATUS_LABELS;

  protected readonly columns: TableColumn<WhatsAppTemplate>[] = [
    { key: 'name', header: 'Nombre', sortable: true },
    { key: 'metaTemplateId', header: 'ID Meta', mono: true, hideBelow: 'lg' },
    { key: 'category', header: 'Categoría', hideBelow: 'md' },
    { key: 'language', header: 'Idioma', mono: true, width: '6rem' },
    { key: 'status', header: 'Estado', width: '8rem' },
  ];
  protected readonly actions = computed<TableAction<WhatsAppTemplate>[]>(() =>
    this.canEdit()
      ? [
          { id: 'edit', label: 'Editar plantilla', icon: 'pencil' },
          { id: 'delete', label: 'Eliminar plantilla', icon: 'trash', tone: 'danger' },
        ]
      : [{ id: 'view', label: 'Ver plantilla', icon: 'eye' }],
  );

  // ── Formulario ──
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<WhatsAppTemplate | null>(null);
  protected readonly readOnly = signal(false);
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly languageOptions: SelectOption<string>[] = TEMPLATE_LANGUAGES.map((l) => ({
    value: l,
    label: l,
  }));
  protected readonly categoryOptions: SelectOption<TemplateCategory>[] = TEMPLATE_CATEGORIES.map(
    (c) => ({ value: c, label: TEMPLATE_CATEGORY_LABELS[c] }),
  );
  protected readonly statusOptions: SelectOption<TemplateStatus>[] = TEMPLATE_STATUSES.map((s) => ({
    value: s,
    label: TEMPLATE_STATUS_LABELS[s],
  }));
  protected readonly headerOptions: SelectOption<HeaderType>[] = HEADER_TYPES.map((h) => ({
    value: h,
    label: HEADER_LABELS[h],
  }));
  protected readonly buttonTypeOptions: SelectOption<string>[] = BUTTON_TYPES.map((t) => ({
    value: t,
    label: t === 'URL' ? 'Enlace (URL)' : 'Respuesta rápida',
  }));
  protected readonly maxBody = MAX_TEMPLATE_BODY;
  protected readonly modalHint = 'Usa {{1}}, {{2}}, … en el cuerpo para las variables.';

  protected readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.pattern(/^[a-z0-9_]{1,100}$/)]),
    metaTemplateId: this.fb.control('', Validators.maxLength(100)),
    language: this.fb.control('es_CO', Validators.required),
    category: this.fb.control<TemplateCategory>('utility', Validators.required),
    status: this.fb.control<TemplateStatus>('active', Validators.required),
    headerType: this.fb.control<HeaderType>('none'),
    headerText: this.fb.control('', Validators.maxLength(60)),
    headerImageUrl: this.fb.control('', Validators.pattern(/^https:\/\/\S+$/)),
    body: this.fb.control('', [Validators.required, Validators.maxLength(MAX_TEMPLATE_BODY)]),
    variables: this.fb.array<string>([]),
    footerText: this.fb.control('', Validators.maxLength(60)),
    buttons: this.fb.array<FormGroup>([]),
  });
  protected readonly nameMessages = {
    pattern: 'Solo minúsculas, números y guion bajo (ej. cobro_mensual).',
  };
  protected readonly urlMessages = { pattern: 'Debe ser una URL https://' };

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });
  protected readonly headerType = computed(() => this.formValue().headerType ?? 'none');
  protected readonly previewVariables = computed(() =>
    (this.formValue().variables ?? []).map((label, i) => (label ? `[${label}]` : `{{${i + 1}}}`)),
  );
  protected readonly previewButtons = computed<TemplateButton[]>(
    () => (this.formValue().buttons ?? []) as TemplateButton[],
  );

  constructor() {
    this.form.controls.body.valueChanges.subscribe((body) => this.syncVariables(body));
    this.form.controls.headerType.valueChanges.subscribe((type) => this.applyHeaderRules(type));
  }

  protected get variablesArray(): FormArray {
    return this.form.controls.variables;
  }
  protected get buttonsArray(): FormArray<FormGroup> {
    return this.form.controls.buttons;
  }

  protected placeholderLabel(index: number): string {
    return `Variable {{${index + 1}}}`;
  }

  protected categoryLabel(category: TemplateCategory): string {
    return TEMPLATE_CATEGORY_LABELS[category] ?? category;
  }
  protected statusTone(status: TemplateStatus): BadgeTone {
    return STATUS_TONES[status] ?? 'neutral';
  }
  protected statusLabel(status: TemplateStatus): string {
    return TEMPLATE_STATUS_LABELS[status] ?? status;
  }

  /** Mantiene una etiqueta por cada `{{n}}` del cuerpo. */
  private syncVariables(body: string): void {
    const count = countPlaceholders(body ?? '');
    const array = this.form.controls.variables;
    while (array.length < count) array.push(this.fb.control('', Validators.maxLength(60)));
    while (array.length > count) array.removeAt(array.length - 1);
  }

  private applyHeaderRules(type: HeaderType): void {
    const { headerText, headerImageUrl } = this.form.controls;
    headerText.setValidators(
      type === 'text' ? [Validators.required, Validators.maxLength(60)] : Validators.maxLength(60),
    );
    headerImageUrl.setValidators(
      type === 'image'
        ? [Validators.required, Validators.pattern(/^https:\/\/\S+$/)]
        : Validators.pattern(/^https:\/\/\S+$/),
    );
    headerText.updateValueAndValidity();
    headerImageUrl.updateValueAndValidity();
  }

  private buttonGroup(button: TemplateButton = {}): FormGroup {
    return this.fb.group({
      type: this.fb.control(String(button.type ?? 'QUICK_REPLY')),
      text: this.fb.control(String(button.text ?? ''), [
        Validators.required,
        Validators.maxLength(25),
      ]),
      url: this.fb.control(String(button.url ?? ''), Validators.pattern(/^https:\/\/\S+$/)),
    });
  }

  protected addButton(): void {
    this.buttonsArray.push(this.buttonGroup());
  }

  protected removeButton(index: number): void {
    this.buttonsArray.removeAt(index);
  }

  protected openCreate(): void {
    this.open(null, false);
  }

  private open(template: WhatsAppTemplate | null, readOnly: boolean): void {
    this.editing.set(template);
    this.readOnly.set(readOnly);
    this.serverError.set(null);
    this.form.reset({
      name: template?.name ?? '',
      metaTemplateId: template?.metaTemplateId ?? '',
      language: template?.language ?? 'es_CO',
      category: template?.category ?? 'utility',
      status: template?.status ?? 'active',
      headerType: template?.headerType ?? 'none',
      headerText: template?.headerText ?? '',
      headerImageUrl: template?.headerImageUrl ?? '',
      body: template?.body ?? '',
      footerText: template?.footerText ?? '',
    });
    this.syncVariables(template?.body ?? '');
    (template?.variables ?? []).forEach((label, i) => this.variablesArray.at(i)?.setValue(label));
    this.buttonsArray.clear();
    (template?.buttons ?? []).forEach((b) => this.buttonsArray.push(this.buttonGroup(b)));
    if (readOnly) this.form.disable();
    else this.form.enable();
    this.modalOpen.set(true);
  }

  protected async onAction(event: TableActionEvent<WhatsAppTemplate>): Promise<void> {
    if (event.action === 'edit') this.open(event.row, false);
    else if (event.action === 'view') this.open(event.row, true);
    else if (event.action === 'delete') await this.remove(event.row);
  }

  private async remove(template: WhatsAppTemplate): Promise<void> {
    const ok = await this.confirm.ask({
      title: `¿Eliminar la plantilla «${template.name}»?`,
      message: 'Los envíos que la usen dejarán de funcionar. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });
    if (!ok) return;
    this.wa.deleteTemplate(template.id).subscribe({
      next: () => {
        this.toast.success('Plantilla eliminada.');
        this.templates.reload();
      },
      error: (err) => reportError(this.toast, err),
    });
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving() || this.readOnly()) return;
    const v = this.form.getRawValue();
    const input: WhatsAppTemplateInput = {
      name: v.name,
      metaTemplateId: v.metaTemplateId.trim() || null,
      language: v.language,
      category: v.category,
      status: v.status,
      headerType: v.headerType,
      headerText: v.headerType === 'text' ? v.headerText.trim() : null,
      headerImageUrl: v.headerType === 'image' ? v.headerImageUrl.trim() : null,
      body: v.body,
      variables: v.variables.map((x: string) => x.trim()),
      footerText: v.footerText.trim() || null,
      buttons: (v.buttons as { type: string; text: string; url: string }[]).map((b) =>
        b.type === 'URL'
          ? { type: 'URL', text: b.text, url: b.url }
          : { type: b.type, text: b.text },
      ),
    };
    const current = this.editing();
    this.saving.set(true);
    this.serverError.set(null);
    const request = current
      ? this.wa.updateTemplate(current.id, input)
      : this.wa.createTemplate(input);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(current ? 'Plantilla actualizada.' : 'Plantilla creada.');
        this.templates.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.serverError.set(reportError(this.toast, err));
      },
    });
  }
}
