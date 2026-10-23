import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { ConfirmService, ToastService } from '../../../../core';
import {
  CopCurrencyPipe,
  DateEsPipe,
  UiAlert,
  UiBadge,
  UiButton,
  UiEmptyState,
  UiFormField,
  UiIcon,
  UiInput,
  UiModal,
  UiSelect,
  UiSpinner,
  UiTextarea,
} from '../../../../shared/ui';
import {
  catalogOptions,
  CufeChip,
  DocumentStatusBadge,
  errorMessage,
  blankToUndefined,
} from '../../components/e-invoicing-ui';
import {
  createLineForm,
  LineForm,
  LineItemsEditor,
  lineFormToInput,
} from '../../components/line-items-editor';
import {
  ARTIFACT_LABELS,
  ArtifactKind,
  DOCUMENT_TYPE_LABELS,
  DocumentDetail,
  ENVIRONMENT_LABELS,
  DianEnvironment,
  TAX_TREATMENT_LABELS,
} from '../../data-access/e-invoicing.models';
import { EInvoicingService } from '../../data-access/e-invoicing.service';
import { resourceValue } from '../../../../core/resource/resource-value';

type NoteKind = 'nc' | 'nd';
type Busy = 'submit' | 'status' | 'note' | ArtifactKind | null;

/** Detalle de un documento electrónico: estado DIAN, CUFE, líneas, envíos, descargas y notas. */
@Component({
  selector: 'app-e-invoicing-document-detail-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CopCurrencyPipe,
    DateEsPipe,
    UiAlert,
    UiBadge,
    UiButton,
    UiEmptyState,
    UiFormField,
    UiIcon,
    UiInput,
    UiModal,
    UiSelect,
    UiSpinner,
    UiTextarea,
    CufeChip,
    DocumentStatusBadge,
    LineItemsEditor,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './document-detail-page.html',
  styleUrl: './document-detail-page.scss',
})
export class DocumentDetailPage {
  private readonly service = inject(EInvoicingService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Parámetro `:id` de la ruta (input binding). */
  readonly id = input.required<string>();

  protected readonly document = rxResource({
    params: () => Number(this.id()),
    stream: ({ params }) => this.service.get(params),
  });
  protected readonly doc = computed(() => resourceValue(this.document) ?? null);
  protected readonly busy = signal<Busy>(null);

  protected readonly typeLabels = DOCUMENT_TYPE_LABELS;
  protected readonly treatmentLabels = TAX_TREATMENT_LABELS;

  protected readonly canRetry = computed(() => {
    const s = this.doc()?.status;
    return s === 'signed' || s === 'send_error';
  });
  protected readonly canCheckStatus = computed(() => {
    const d = this.doc();
    return !!d && d.status !== 'draft' && d.status !== 'signed' && !!(d.trackId || d.cufe);
  });
  protected readonly canIssueNotes = computed(() => {
    const d = this.doc();
    return (
      !!d && d.type === 'fv' && (d.status === 'accepted' || d.status === 'accepted_with_notices')
    );
  });
  protected readonly environmentLabel = computed(
    () =>
      ENVIRONMENT_LABELS[this.doc()?.environment as DianEnvironment] ??
      this.doc()?.environment ??
      '',
  );
  protected readonly artifacts = computed(() => {
    const d = this.doc();
    if (!d) return [];
    const kinds: ArtifactKind[] = [];
    if (d.status !== 'draft') kinds.push('xml', 'zip');
    if (d.hasApplicationResponse) kinds.push('application-response');
    if (d.hasAttachedDocument) kinds.push('attached-document');
    return kinds.map((kind) => ({ kind, label: ARTIFACT_LABELS[kind] }));
  });

  // ----- Notas crédito / débito -----
  protected readonly noteKind = signal<NoteKind | null>(null);
  protected readonly noteOpen = signal(false);
  protected readonly noteError = signal<string | null>(null);
  protected readonly creditConcepts = rxResource({
    params: () => (this.noteKind() === 'nc' ? true : undefined),
    stream: () => this.service.catalog('credit-note-concepts'),
  });
  protected readonly debitConcepts = rxResource({
    params: () => (this.noteKind() === 'nd' ? true : undefined),
    stream: () => this.service.catalog('debit-note-concepts'),
  });
  protected readonly conceptOptions = computed(() =>
    catalogOptions(
      this.noteKind() === 'nc'
        ? resourceValue(this.creditConcepts)
        : resourceValue(this.debitConcepts),
    ),
  );
  protected readonly noteForm = new FormGroup({
    conceptCode: new FormControl<string | null>(null, Validators.required),
    description: new FormControl('', { nonNullable: true, validators: Validators.maxLength(255) }),
    notes: new FormControl('', { nonNullable: true, validators: Validators.maxLength(2000) }),
    lines: new FormArray<LineForm>([createLineForm()]),
  });
  private readonly noteConcept = signal<string | null>(null);
  /** Nota crédito concepto 2 (anulación total): las líneas se omiten. */
  protected readonly fullAnnulment = computed(
    () => this.noteKind() === 'nc' && this.noteConcept() === '2',
  );

  constructor() {
    this.noteForm.controls.conceptCode.valueChanges.subscribe((v) => this.noteConcept.set(v));
  }

  protected async retry(): Promise<void> {
    const d = this.doc();
    if (!d) return;
    await this.run('submit', this.service.submit(d.id), 'Documento reenviado a la DIAN.');
  }

  protected async checkStatus(): Promise<void> {
    const d = this.doc();
    if (!d) return;
    await this.run('status', this.service.checkStatus(d.id), 'Estado consultado en la DIAN.');
  }

  protected async download(kind: ArtifactKind): Promise<void> {
    const d = this.doc();
    if (!d) return;
    this.busy.set(kind);
    try {
      const blob = await firstValueFrom(this.service.downloadArtifact(d.id, kind));
      this.service.saveBlob(blob, this.fileName(d, kind));
    } catch (err) {
      this.toast.error(errorMessage(err, 'No se pudo descargar el archivo.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected openNote(kind: NoteKind): void {
    this.noteKind.set(kind);
    this.noteError.set(null);
    this.noteForm.reset();
    this.noteForm.controls.lines.clear();
    this.noteForm.controls.lines.push(createLineForm());
    this.noteOpen.set(true);
  }

  protected async submitNote(): Promise<void> {
    const d = this.doc();
    const kind = this.noteKind();
    if (!d || !kind) return;
    const annul = this.fullAnnulment();
    const { conceptCode, description, notes, lines } = this.noteForm.controls;
    conceptCode.markAsTouched();
    if (conceptCode.invalid || description.invalid || notes.invalid || (!annul && lines.invalid)) {
      this.noteForm.markAllAsTouched();
      return;
    }
    const label = kind === 'nc' ? 'nota crédito' : 'nota débito';
    const ok = await this.confirm.ask({
      title: `¿Emitir ${label}?`,
      message: `Se enviará a la DIAN una ${label} que referencia la factura ${d.number}. Esta acción no se puede deshacer.`,
      confirmLabel: `Emitir ${label}`,
      tone: annul ? 'danger' : 'primary',
    });
    if (!ok) return;
    const base = {
      conceptCode: conceptCode.value!,
      description: blankToUndefined(description.value),
      notes: blankToUndefined(notes.value),
    };
    const lineInputs = lines.controls.map(lineFormToInput);
    const request$ =
      kind === 'nc'
        ? this.service.issueCreditNote(d.id, { ...base, lines: annul ? undefined : lineInputs })
        : this.service.issueDebitNote(d.id, { ...base, lines: lineInputs });
    this.busy.set('note');
    this.noteError.set(null);
    try {
      const note = await firstValueFrom(request$);
      this.noteOpen.set(false);
      this.toast.success(
        `${kind === 'nc' ? 'Nota crédito' : 'Nota débito'} ${note.number} emitida.`,
      );
      void this.router.navigate(['../documentos', note.id], { relativeTo: this.route });
    } catch (err) {
      this.noteError.set(errorMessage(err));
    } finally {
      this.busy.set(null);
    }
  }

  private async run(busy: Busy, request$: Observable<DocumentDetail>, success: string) {
    this.busy.set(busy);
    try {
      const updated = await firstValueFrom(request$);
      this.document.value.set(updated);
      this.toast.success(success);
    } catch (err) {
      this.toast.error(errorMessage(err));
    } finally {
      this.busy.set(null);
    }
  }

  private fileName(d: DocumentDetail, kind: ArtifactKind): string {
    const base = d.fileName?.replace(/\.xml$/, '') ?? d.number;
    switch (kind) {
      case 'xml':
        return `${base}.xml`;
      case 'zip':
        return `${base}.zip`;
      case 'application-response':
        return `ApplicationResponse-${d.number}.xml`;
      default:
        return `AttachedDocument-${d.number}.xml`;
    }
  }
}
