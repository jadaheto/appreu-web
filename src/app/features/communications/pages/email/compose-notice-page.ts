import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmService, ToastService } from '../../../../core';
import {
  ErrorMessageMap,
  SelectOption,
  UiButton,
  UiFormField,
  UiInput,
  UiSelect,
  UiTextarea,
} from '../../../../shared/ui';
import { DeliverySummaryView } from '../../components/delivery-summary';
import { UiFilePicker, FileRules } from '../../../../shared/ui';
import { UiRichTextEditor } from '../../../../shared/ui';
import {
  ATTACHMENT_EXTENSIONS,
  AUDIENCE_KINDS,
  AUDIENCE_LABELS,
  AudienceKind,
  DeliverySummary,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  MAX_MANUAL_EMAILS,
} from '../../data-access/communications.models';
import { EmailService } from '../../data-access/email.service';
import { reportError } from '../../data-access/report-error';
import { resourceValue } from '../../../../core/resource/resource-value';

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** Separa una lista de correos por coma, punto y coma o saltos de línea. */
export function parseEmails(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

/** Valida la lista manual: al menos uno, todos válidos y máximo 500. */
export function manualEmailsValidator(control: AbstractControl<string>): ValidationErrors | null {
  const emails = parseEmails(control.value ?? '');
  if (!emails.length) return null;
  const invalid = emails.filter((e) => !EMAIL.test(e));
  if (invalid.length) return { invalidEmails: invalid.slice(0, 3).join(', ') };
  if (emails.length > MAX_MANUAL_EMAILS) return { tooManyEmails: emails.length };
  return null;
}

/** `/admin/correos/redactar`: aviso por correo a una audiencia, con adjuntos validados. */
@Component({
  selector: 'app-compose-notice-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DeliverySummaryView,
    UiFilePicker,
    UiRichTextEditor,
    UiButton,
    UiFormField,
    UiInput,
    UiSelect,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compose-notice-page.html',
  styleUrl: '../comms.scss',
})
export class ComposeNoticePage {
  private readonly email = inject(EmailService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    audience: this.fb.control<AudienceKind>('all_parents', Validators.required),
    gradeId: this.fb.control<number | null>(null),
    classroomId: this.fb.control<number | null>(null),
    manualEmails: this.fb.control('', manualEmailsValidator),
    subject: this.fb.control('', [Validators.required, Validators.maxLength(255)]),
    bodyHtml: this.fb.control('', Validators.required),
  });

  protected readonly audience = toSignal(this.form.controls.audience.valueChanges, {
    initialValue: this.form.controls.audience.value,
  });
  protected readonly audiences = AUDIENCE_KINDS.map((value) => ({
    value,
    label: AUDIENCE_LABELS[value],
  }));
  protected readonly attachments = signal<File[]>([]);
  protected readonly sending = signal(false);
  protected readonly result = signal<DeliverySummary | null>(null);
  protected readonly fileRules: FileRules = {
    maxFiles: MAX_ATTACHMENTS,
    maxBytes: MAX_ATTACHMENT_BYTES,
    extensions: ATTACHMENT_EXTENSIONS,
  };
  protected readonly manualMessages: ErrorMessageMap = {
    required: 'Ingresa al menos un correo.',
    invalidEmails: (v) => `Correos inválidos: ${String(v)}.`,
    tooManyEmails: `Máximo ${MAX_MANUAL_EMAILS} correos por envío.`,
  };
  protected readonly bodyMessages: ErrorMessageMap = { required: 'Escribe el mensaje del aviso.' };

  /** Los catálogos académicos solo se cargan cuando la audiencia los necesita. */
  private readonly grades = rxResource({
    params: () => (this.audience() === 'by_grade' ? true : undefined),
    stream: () => this.email.grades(),
  });
  private readonly classrooms = rxResource({
    params: () => (this.audience() === 'by_classroom' ? true : undefined),
    stream: () => this.email.classrooms(),
  });
  protected readonly gradeOptions = computed<SelectOption<number>[]>(() =>
    (resourceValue(this.grades) ?? []).map((g) => ({
      value: g.id,
      label: `${g.name} (${g.level})`,
    })),
  );
  protected readonly classroomOptions = computed<SelectOption<number>[]>(() =>
    (resourceValue(this.classrooms) ?? []).map((c) => ({
      value: c.id,
      label: `${c.name} · ${c.gradeName}`,
    })),
  );
  /** Si el catálogo no está disponible (p. ej. 403 para RR. HH./finanzas) se pide el id. */
  protected readonly gradesUnavailable = computed(() => !!this.grades.error());
  protected readonly classroomsUnavailable = computed(() => !!this.classrooms.error());
  protected readonly catalogsLoading = computed(
    () => this.grades.isLoading() || this.classrooms.isLoading(),
  );

  constructor() {
    this.form.controls.audience.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((kind) => this.applyAudienceRules(kind));
  }

  private applyAudienceRules(kind: AudienceKind): void {
    const { gradeId, classroomId, manualEmails } = this.form.controls;
    gradeId.setValidators(kind === 'by_grade' ? [Validators.required, Validators.min(1)] : null);
    classroomId.setValidators(
      kind === 'by_classroom' ? [Validators.required, Validators.min(1)] : null,
    );
    manualEmails.setValidators(
      kind === 'manual' ? [Validators.required, manualEmailsValidator] : manualEmailsValidator,
    );
    [gradeId, classroomId, manualEmails].forEach((c) => c.updateValueAndValidity());
  }

  protected async send(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.sending()) return;
    const value = this.form.getRawValue();
    const ok = await this.confirm.ask({
      title: '¿Enviar este aviso?',
      message: `Se enviará a: ${AUDIENCE_LABELS[value.audience]}. Cada destinatario recibe un correo individual.`,
      confirmLabel: 'Enviar aviso',
    });
    if (!ok) return;

    this.sending.set(true);
    this.result.set(null);
    this.email
      .sendNotice({
        audience: value.audience,
        gradeId: value.gradeId,
        classroomId: value.classroomId,
        manualEmails: parseEmails(value.manualEmails).join(','),
        subject: value.subject.trim(),
        bodyHtml: value.bodyHtml,
        attachments: this.attachments(),
      })
      .subscribe({
        next: (summary) => {
          this.sending.set(false);
          this.result.set(summary);
          if (summary.sent > 0) {
            this.toast.success(`Aviso enviado a ${summary.sent} destinatario(s).`);
            this.form.reset({ audience: value.audience });
            this.attachments.set([]);
          }
        },
        error: (err) => {
          this.sending.set(false);
          reportError(this.toast, err);
        },
      });
  }
}
