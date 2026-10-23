import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError, ToastService } from '../../../../core';
import {
  SelectOption,
  TabItem,
  UiAlert,
  UiBadge,
  UiButton,
  UiCheckbox,
  UiChip,
  UiFormField,
  UiInput,
  UiSelect,
  UiTabs,
} from '../../../../shared/ui';
import { CredentialsDialog } from '../../components/credentials-dialog';
import { PhotoPicker } from '../../components/photo-picker';
import {
  createGuardianForm,
  createStudentDetailsForm,
  GuardianFields,
  guardianValue,
  StudentFields,
  StudentNotesField,
  studentDetailsValue,
  todayIso,
} from '../../components/student-forms';
import {
  EnrollStudentInput,
  EnrollStudentResult,
  GuardianDetailView,
  labelOf,
  RELATIONSHIP_LABELS,
  STUDENT_STATUS_LABELS,
} from '../../data-access/students.models';
import {
  AcademicCatalogService,
  GuardiansService,
  StudentsService,
} from '../../data-access/students.service';
import { resourceValue } from '../../../../core/resource/resource-value';

type Step = 'estudiante' | 'academico' | 'acudiente' | 'adicional';
type GuardianMode = 'nuevo' | 'existente' | 'ninguno';

const STEPS: Step[] = ['estudiante', 'academico', 'acudiente', 'adicional'];

/**
 * Asistente de matrícula (análisis 03 §4.2): datos del estudiante, salón,
 * acudiente (nuevo o existente buscado por documento, para hermanos) y
 * creación de cuentas del portal. Las contraseñas temporales se muestran una vez.
 */
@Component({
  selector: 'app-student-enroll-page',
  imports: [
    CredentialsDialog,
    GuardianFields,
    PhotoPicker,
    ReactiveFormsModule,
    RouterLink,
    StudentFields,
    StudentNotesField,
    UiAlert,
    UiBadge,
    UiButton,
    UiCheckbox,
    UiChip,
    UiFormField,
    UiInput,
    UiSelect,
    UiTabs,
    UpperCasePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-enroll-page.html',
  styleUrl: './student-enroll-page.scss',
})
export class StudentEnrollPage {
  private readonly students = inject(StudentsService);
  private readonly guardians = inject(GuardiansService);
  private readonly catalog = inject(AcademicCatalogService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly step = signal<Step>('estudiante');
  protected readonly tabs: TabItem[] = [
    { id: 'estudiante', label: '1. Estudiante', icon: 'user' },
    { id: 'academico', label: '2. Académico', icon: 'academic-cap' },
    { id: 'acudiente', label: '3. Acudiente', icon: 'users' },
    { id: 'adicional', label: '4. Adicional', icon: 'clipboard' },
  ];
  protected readonly stepIndex = computed(() => STEPS.indexOf(this.step()));
  protected readonly isLast = computed(() => this.stepIndex() === STEPS.length - 1);

  // ---------------------------------------------------------- Formularios
  protected readonly studentForm = createStudentDetailsForm(this.fb);
  protected readonly enrollmentForm = this.fb.group({
    classroomId: this.fb.control<number | null>(null),
    enrollmentDate: [todayIso(), Validators.required],
    createPortalAccounts: [true],
  });
  protected readonly guardianForm = createGuardianForm(this.fb);
  protected readonly guardianMode = signal<GuardianMode>('nuevo');
  protected readonly lookupDocument = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(30)],
  });
  protected readonly lookupState = signal<'idle' | 'loading' | 'notFound' | 'error'>('idle');
  protected readonly existingGuardian = signal<GuardianDetailView | null>(null);
  protected readonly photo = signal<File | null>(null);

  private readonly classrooms = rxResource({ stream: () => this.catalog.classrooms() });
  protected readonly classroomOptions = computed<SelectOption<number>[]>(() =>
    (resourceValue(this.classrooms) ?? []).map((c) => ({
      value: c.id,
      label: `${c.gradeName} · ${c.name} (${c.studentsCount}/${c.capacity})${c.isFull ? ' — lleno' : ''}`,
    })),
  );
  protected readonly academicYear = computed(
    () => resourceValue(this.classrooms)?.[0]?.academicYear ?? null,
  );

  // ---------------------------------------------------------- Envío
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly result = signal<EnrollStudentResult | null>(null);
  protected readonly credentialsOpen = signal(false);

  protected relationshipLabel(value: string): string {
    return labelOf(RELATIONSHIP_LABELS, value);
  }
  protected statusLabel(value: string): string {
    return labelOf(STUDENT_STATUS_LABELS, value);
  }

  protected setMode(mode: GuardianMode): void {
    this.guardianMode.set(mode);
  }

  protected goTo(step: string | null): void {
    if (step && (STEPS as string[]).includes(step)) this.step.set(step as Step);
  }

  protected next(): void {
    if (!this.validateStep(this.step())) return;
    this.step.set(STEPS[Math.min(this.stepIndex() + 1, STEPS.length - 1)]);
  }

  protected previous(): void {
    this.step.set(STEPS[Math.max(this.stepIndex() - 1, 0)]);
  }

  protected lookupGuardian(): void {
    if (this.lookupDocument.invalid) {
      this.lookupDocument.markAsTouched();
      return;
    }
    this.lookupState.set('loading');
    this.existingGuardian.set(null);
    this.guardians.findByDocument(this.lookupDocument.value).subscribe({
      next: (guardian) => {
        this.existingGuardian.set(guardian);
        this.lookupState.set(guardian ? 'idle' : 'notFound');
      },
      error: () => this.lookupState.set('error'),
    });
  }

  /** Pasa el documento buscado (no encontrado) al formulario de acudiente nuevo. */
  protected registerNewWithDocument(): void {
    this.guardianForm.controls.documentNumber.setValue(this.lookupDocument.value);
    this.guardianMode.set('nuevo');
  }

  protected submit(): void {
    for (const step of STEPS) {
      if (!this.validateStep(step)) {
        this.step.set(step);
        return;
      }
    }
    const enrollment = this.enrollmentForm.getRawValue();
    const input: EnrollStudentInput = {
      student: studentDetailsValue(this.studentForm),
      classroomId: enrollment.classroomId ?? undefined,
      enrollmentDate: enrollment.enrollmentDate || undefined,
      createPortalAccounts: enrollment.createPortalAccounts,
    };
    const mode = this.guardianMode();
    if (mode === 'existente') input.guardianId = this.existingGuardian()?.id;
    if (mode === 'nuevo') input.guardian = guardianValue(this.guardianForm);

    this.saving.set(true);
    this.serverError.set(null);
    this.students.enroll(input).subscribe({
      next: (result) => {
        this.result.set(result);
        this.toast.success(`Estudiante matriculado con el código ${result.student.code}.`);
        if (result.accounts.length) this.credentialsOpen.set(true);
        this.uploadPhoto(result.student.id);
        this.saving.set(false);
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.serverError.set(err.message);
      },
    });
  }

  protected restart(): void {
    this.studentForm.reset();
    this.enrollmentForm.reset();
    this.guardianForm.reset();
    this.lookupDocument.reset();
    this.existingGuardian.set(null);
    this.lookupState.set('idle');
    this.guardianMode.set('nuevo');
    this.photo.set(null);
    this.result.set(null);
    this.serverError.set(null);
    this.step.set('estudiante');
  }

  private uploadPhoto(studentId: number): void {
    const file = this.photo();
    if (!file) return;
    this.students.uploadPhoto(studentId, file).subscribe({
      error: () =>
        this.toast.warning('El estudiante quedó matriculado, pero no se pudo subir la foto.'),
    });
  }

  private validateStep(step: Step): boolean {
    switch (step) {
      case 'estudiante': {
        const c = this.studentForm.controls;
        const controls = [
          c.firstName,
          c.lastName,
          c.gender,
          c.documentType,
          c.documentNumber,
          c.birthDate,
          c.email,
          c.phone,
          c.bloodType,
          c.address,
          c.city,
          c.neighborhood,
          c.eps,
        ];
        controls.forEach((ctrl) => ctrl.markAsTouched());
        return controls.every((ctrl) => ctrl.valid);
      }
      case 'academico': {
        this.enrollmentForm.markAllAsTouched();
        this.studentForm.controls.scholarshipPct.markAsTouched();
        return this.enrollmentForm.valid && this.studentForm.controls.scholarshipPct.valid;
      }
      case 'acudiente': {
        const mode = this.guardianMode();
        if (mode === 'ninguno') return true;
        if (mode === 'existente') {
          if (this.existingGuardian()) return true;
          this.lookupDocument.markAsTouched();
          this.toast.warning('Busca y selecciona un acudiente existente o registra uno nuevo.');
          return false;
        }
        this.guardianForm.markAllAsTouched();
        return this.guardianForm.valid;
      }
      case 'adicional':
        this.studentForm.controls.notes.markAsTouched();
        return this.studentForm.controls.notes.valid;
    }
  }
}
