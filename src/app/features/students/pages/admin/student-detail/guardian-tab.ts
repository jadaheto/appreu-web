import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { ApiError, ConfirmService, ToastService } from '../../../../../core';
import {
  UiAlert,
  UiBadge,
  UiButton,
  UiEmptyState,
  UiFormField,
  UiInput,
} from '../../../../../shared/ui';
import { InfoGrid, InfoItem } from '../../../components/info-grid';
import {
  createGuardianForm,
  GuardianFields,
  GuardianForm,
  guardianValue,
} from '../../../components/student-forms';
import {
  GUARDIAN_DOCUMENT_LABELS,
  GuardianDetailView,
  labelOf,
  RELATIONSHIP_LABELS,
  STUDENT_STATUS_LABELS,
  StudentView,
} from '../../../data-access/students.models';
import { GuardiansService, StudentsService } from '../../../data-access/students.service';
import { resourceValue } from '../../../../../core/resource/resource-value';

type Mode = 'view' | 'edit' | 'link' | 'create';

/** Pestaña "Acudiente": ver, editar (compartido entre hermanos), vincular, registrar o desvincular. */
@Component({
  selector: 'app-student-guardian-tab',
  imports: [
    GuardianFields,
    InfoGrid,
    ReactiveFormsModule,
    RouterLink,
    UiAlert,
    UiBadge,
    UiButton,
    UiEmptyState,
    UiFormField,
    UiInput,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './guardian-tab.html',
  styles: `
    .bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 1rem;
    }
    .bar h2 {
      flex: 1;
    }
    .lookup {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem;
    }
    .lookup ui-form-field {
      flex: 1 1 16rem;
    }
    .siblings {
      margin: 0;
      padding-left: 1.25rem;
      font-size: var(--text-sm);
    }
    .end {
      justify-content: flex-end;
    }
    .block {
      margin-bottom: 1rem;
    }
  `,
})
export class GuardianTab {
  private readonly students = inject(StudentsService);
  private readonly guardians = inject(GuardiansService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly student = input.required<StudentView>();
  readonly changed = output<void>();

  protected readonly mode = signal<Mode>('view');
  protected readonly form = signal<GuardianForm | null>(null);
  protected readonly busy = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly guardian = computed(() => this.student().guardianDetails);
  /** Acudiente con sus estudiantes vinculados (hermanos). */
  protected readonly detail = rxResource({
    params: () => this.guardian()?.id,
    stream: ({ params }) => (params ? this.guardians.get(params) : of(null)),
  });
  protected readonly siblings = computed(() => {
    const d = resourceValue(this.detail, null);
    return (d?.students ?? []).filter((s) => s.id !== this.student().id);
  });

  protected readonly lookupDocument = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(30)],
  });
  protected readonly lookupState = signal<'idle' | 'loading' | 'notFound'>('idle');
  protected readonly found = signal<GuardianDetailView | null>(null);

  protected readonly items = computed<InfoItem[]>(() => {
    const g = this.guardian();
    if (!g) return [];
    return [
      { label: 'Nombre', value: g.fullName },
      { label: 'Parentesco', value: labelOf(RELATIONSHIP_LABELS, g.relationship) },
      {
        label: 'Documento',
        value: `${labelOf(GUARDIAN_DOCUMENT_LABELS, g.documentType)} ${g.documentNumber}`,
      },
      { label: 'Celular', value: g.mobile, mono: true },
      { label: 'Teléfono fijo', value: g.phone, mono: true },
      { label: 'Correo', value: g.email },
      { label: 'Ocupación', value: g.occupation },
      { label: 'Ciudad', value: g.city },
      { label: 'Dirección', value: g.address, wide: true },
    ];
  });

  protected statusLabel(status: string): string {
    return labelOf(STUDENT_STATUS_LABELS, status);
  }
  protected relationshipLabel(value: string): string {
    return labelOf(RELATIONSHIP_LABELS, value);
  }

  protected setMode(mode: Mode): void {
    this.serverError.set(null);
    this.found.set(null);
    this.lookupState.set('idle');
    this.lookupDocument.reset();
    if (mode === 'edit') this.form.set(createGuardianForm(this.fb, this.guardian()));
    else if (mode === 'create') this.form.set(createGuardianForm(this.fb));
    else this.form.set(null);
    this.mode.set(mode);
  }

  protected lookup(): void {
    if (this.lookupDocument.invalid) {
      this.lookupDocument.markAsTouched();
      return;
    }
    this.lookupState.set('loading');
    this.found.set(null);
    this.guardians.findByDocument(this.lookupDocument.value).subscribe({
      next: (g) => {
        this.found.set(g);
        this.lookupState.set(g ? 'idle' : 'notFound');
      },
      error: (err: ApiError) => {
        this.lookupState.set('idle');
        this.serverError.set(err.message);
      },
    });
  }

  protected link(guardian: GuardianDetailView): void {
    this.run(this.students.linkGuardian(this.student().id, guardian.id), 'Acudiente vinculado.');
  }

  protected async saveEdit(form: GuardianForm): Promise<void> {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const others = this.siblings().length;
    if (others > 0) {
      const ok = await this.confirm.ask({
        title: '¿Actualizar el acudiente compartido?',
        message: `Los cambios también se verán en ${others} estudiante(s) más vinculado(s) a este acudiente.`,
        confirmLabel: 'Actualizar',
      });
      if (!ok) return;
    }
    this.run(
      this.guardians.update(this.guardian()!.id, guardianValue(form)),
      'Acudiente actualizado.',
    );
  }

  protected saveNew(form: GuardianForm): void {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const studentId = this.student().id;
    this.run(
      this.guardians
        .create(guardianValue(form))
        .pipe(switchMap((g) => this.students.linkGuardian(studentId, g.id))),
      'Acudiente registrado y vinculado.',
    );
  }

  protected async unlink(): Promise<void> {
    const ok = await this.confirm.ask({
      title: '¿Desvincular el acudiente?',
      message:
        'El estudiante quedará sin acudiente legal. El registro del acudiente no se elimina.',
      confirmLabel: 'Desvincular',
      tone: 'danger',
    });
    if (!ok) return;
    this.run(this.students.unlinkGuardian(this.student().id), 'Acudiente desvinculado.');
  }

  private run(request: Observable<unknown>, message: string): void {
    this.busy.set(true);
    this.serverError.set(null);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(message);
        this.setMode('view');
        this.changed.emit();
      },
      error: (err: ApiError) => {
        this.busy.set(false);
        this.serverError.set(err.message);
      },
    });
  }
}
