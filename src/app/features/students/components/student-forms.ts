import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { SelectOption, UiFormField, UiInput, UiSelect, UiTextarea } from '../../../shared/ui';
import {
  BLOOD_TYPES,
  BloodType,
  Gender,
  GENDER_LABELS,
  GENDERS,
  GUARDIAN_DOCUMENT_LABELS,
  GUARDIAN_DOCUMENT_TYPES,
  GuardianDetailsInput,
  GuardianDocumentType,
  GuardianView,
  optionsOf,
  Relationship,
  RELATIONSHIP_LABELS,
  RELATIONSHIPS,
  STUDENT_DOCUMENT_LABELS,
  STUDENT_DOCUMENT_TYPES,
  StudentDetailsInput,
  StudentDocumentType,
  StudentView,
} from '../data-access/students.models';

/** Fecha `AAAA-MM-DD` de hoy en hora local. */
export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** La fecha (si hay) debe ser anterior a hoy. */
export function pastDateValidator(
  control: AbstractControl<string | null>,
): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  return value < todayIso() ? null : { pastDate: 'La fecha debe ser anterior a hoy.' };
}

// ------------------------------------------------------------ Estudiante

export type StudentDetailsForm = FormGroup<{
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  gender: FormControl<Gender>;
  documentType: FormControl<StudentDocumentType>;
  documentNumber: FormControl<string>;
  birthDate: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  bloodType: FormControl<BloodType | null>;
  address: FormControl<string>;
  city: FormControl<string>;
  neighborhood: FormControl<string>;
  eps: FormControl<string>;
  scholarshipPct: FormControl<number | null>;
  notes: FormControl<string>;
}>;

export function createStudentDetailsForm(
  fb: NonNullableFormBuilder,
  student?: StudentView | null,
): StudentDetailsForm {
  const s = student;
  return fb.group({
    firstName: [s?.firstName ?? '', [Validators.required, Validators.maxLength(100)]],
    lastName: [s?.lastName ?? '', [Validators.required, Validators.maxLength(100)]],
    gender: [(s?.gender as Gender) ?? 'M', Validators.required],
    documentType: [(s?.documentType as StudentDocumentType) ?? 'TI', Validators.required],
    documentNumber: [
      s?.documentNumber ?? '',
      [Validators.required, Validators.maxLength(30), Validators.pattern(/^[A-Za-z0-9-]+$/)],
    ],
    birthDate: [s?.birthDate ?? '', pastDateValidator],
    email: [s?.email ?? '', [Validators.email, Validators.maxLength(150)]],
    phone: [s?.phone ?? '', Validators.maxLength(20)],
    bloodType: fb.control<BloodType | null>((s?.bloodType as BloodType) ?? null),
    address: [s?.address ?? '', Validators.maxLength(500)],
    city: [s?.city ?? '', Validators.maxLength(100)],
    neighborhood: [s?.neighborhood ?? '', Validators.maxLength(100)],
    eps: [s?.eps ?? '', Validators.maxLength(100)],
    scholarshipPct: fb.control<number | null>(s?.scholarshipPct ?? 0, [
      Validators.min(0),
      Validators.max(100),
    ]),
    notes: [s?.notes ?? '', Validators.maxLength(5000)],
  });
}

export function studentDetailsValue(form: StudentDetailsForm): StudentDetailsInput {
  const v = form.getRawValue();
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    gender: v.gender,
    documentType: v.documentType,
    documentNumber: v.documentNumber,
    birthDate: v.birthDate || undefined,
    email: v.email || undefined,
    phone: v.phone || undefined,
    bloodType: v.bloodType ?? undefined,
    address: v.address || undefined,
    city: v.city || undefined,
    neighborhood: v.neighborhood || undefined,
    eps: v.eps || undefined,
    scholarshipPct: v.scholarshipPct ?? 0,
    notes: v.notes || undefined,
  };
}

/** Campos personales y de salud del estudiante (paso 1 de la matrícula y edición). */
@Component({
  selector: 'app-student-fields',
  imports: [ReactiveFormsModule, UiFormField, UiInput, UiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fields" [formGroup]="form()">
      <ui-form-field label="Nombres" required>
        <ui-input formControlName="firstName" autocomplete="off" />
      </ui-form-field>
      <ui-form-field label="Apellidos" required>
        <ui-input formControlName="lastName" autocomplete="off" />
      </ui-form-field>
      <ui-form-field label="Género" required>
        <ui-select formControlName="gender" [options]="genders" [placeholder]="null" />
      </ui-form-field>
      <ui-form-field label="Tipo de documento" required>
        <ui-select formControlName="documentType" [options]="documentTypes" [placeholder]="null" />
      </ui-form-field>
      <ui-form-field
        label="Número de documento"
        required
        [errorMessages]="{ pattern: 'Solo letras, números y guiones.' }"
      >
        <ui-input formControlName="documentNumber" mono />
      </ui-form-field>
      <ui-form-field label="Fecha de nacimiento">
        <ui-input type="date" formControlName="birthDate" [max]="today" />
      </ui-form-field>
      <ui-form-field label="Correo electrónico" hint="Si no tiene, se usa {código}@apreu.co">
        <ui-input type="email" formControlName="email" autocomplete="off" />
      </ui-form-field>
      <ui-form-field label="Teléfono / celular">
        <ui-input type="tel" formControlName="phone" />
      </ui-form-field>
      <ui-form-field label="Grupo sanguíneo">
        <ui-select formControlName="bloodType" [options]="bloodTypes" placeholder="—" />
      </ui-form-field>
      <ui-form-field label="EPS">
        <ui-input formControlName="eps" />
      </ui-form-field>
      <ui-form-field label="Dirección" class="wide">
        <ui-input formControlName="address" />
      </ui-form-field>
      <ui-form-field label="Ciudad">
        <ui-input formControlName="city" />
      </ui-form-field>
      <ui-form-field label="Barrio">
        <ui-input formControlName="neighborhood" />
      </ui-form-field>
      @if (showScholarship()) {
        <ui-form-field label="Beca / descuento" hint="Porcentaje entre 0 y 100">
          <ui-input
            type="number"
            formControlName="scholarshipPct"
            min="0"
            max="100"
            step="0.01"
            suffix="%"
          />
        </ui-form-field>
      }
    </div>
  `,
  styleUrl: './student-forms.scss',
})
export class StudentFields {
  readonly form = input.required<StudentDetailsForm>();
  readonly showScholarship = input(true);
  protected readonly today = todayIso();
  protected readonly genders = optionsOf(GENDERS, GENDER_LABELS);
  protected readonly documentTypes = optionsOf(STUDENT_DOCUMENT_TYPES, STUDENT_DOCUMENT_LABELS);
  protected readonly bloodTypes: SelectOption<BloodType>[] = BLOOD_TYPES.map((b) => ({
    value: b,
    label: b,
  }));
}

/** Observaciones generales (alergias, condiciones médicas…). */
@Component({
  selector: 'app-student-notes-field',
  imports: [ReactiveFormsModule, UiFormField, UiTextarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [formGroup]="form()">
      <ui-form-field
        label="Observaciones generales"
        hint="Alergias, condiciones médicas, recomendaciones…"
      >
        <ui-textarea formControlName="notes" [rows]="5" [maxlength]="5000" />
      </ui-form-field>
    </div>
  `,
})
export class StudentNotesField {
  readonly form = input.required<StudentDetailsForm>();
}

// ------------------------------------------------------------ Acudiente

export type GuardianForm = FormGroup<{
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  relationship: FormControl<Relationship>;
  documentType: FormControl<GuardianDocumentType>;
  documentNumber: FormControl<string>;
  mobile: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
  occupation: FormControl<string>;
  address: FormControl<string>;
  city: FormControl<string>;
}>;

export function createGuardianForm(
  fb: NonNullableFormBuilder,
  guardian?: GuardianView | null,
): GuardianForm {
  const g = guardian;
  return fb.group({
    firstName: [g?.firstName ?? '', [Validators.required, Validators.maxLength(100)]],
    lastName: [g?.lastName ?? '', [Validators.required, Validators.maxLength(100)]],
    relationship: [(g?.relationship as Relationship) ?? 'padre', Validators.required],
    documentType: [(g?.documentType as GuardianDocumentType) ?? 'cc', Validators.required],
    documentNumber: [g?.documentNumber ?? '', [Validators.required, Validators.maxLength(30)]],
    mobile: [g?.mobile ?? '', Validators.maxLength(20)],
    phone: [g?.phone ?? '', Validators.maxLength(20)],
    email: [g?.email ?? '', [Validators.email, Validators.maxLength(150)]],
    occupation: [g?.occupation ?? '', Validators.maxLength(100)],
    address: [g?.address ?? '', Validators.maxLength(500)],
    city: [g?.city ?? '', Validators.maxLength(100)],
  });
}

export function guardianValue(form: GuardianForm): GuardianDetailsInput {
  const v = form.getRawValue();
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    relationship: v.relationship,
    documentType: v.documentType,
    documentNumber: v.documentNumber,
    mobile: v.mobile || undefined,
    phone: v.phone || undefined,
    email: v.email || undefined,
    occupation: v.occupation || undefined,
    address: v.address || undefined,
    city: v.city || undefined,
  };
}

/** Datos del acudiente legal (matrícula y edición). */
@Component({
  selector: 'app-guardian-fields',
  imports: [ReactiveFormsModule, UiFormField, UiInput, UiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fields" [formGroup]="form()">
      <ui-form-field label="Nombres" required>
        <ui-input formControlName="firstName" />
      </ui-form-field>
      <ui-form-field label="Apellidos" required>
        <ui-input formControlName="lastName" />
      </ui-form-field>
      <ui-form-field label="Parentesco" required>
        <ui-select formControlName="relationship" [options]="relationships" [placeholder]="null" />
      </ui-form-field>
      <ui-form-field label="Tipo de documento" required>
        <ui-select formControlName="documentType" [options]="documentTypes" [placeholder]="null" />
      </ui-form-field>
      <ui-form-field label="Número de documento" required>
        <ui-input formControlName="documentNumber" mono />
      </ui-form-field>
      <ui-form-field label="Celular">
        <ui-input type="tel" formControlName="mobile" />
      </ui-form-field>
      <ui-form-field label="Teléfono fijo">
        <ui-input type="tel" formControlName="phone" />
      </ui-form-field>
      <ui-form-field label="Correo electrónico" hint="Necesario para crear su cuenta del portal">
        <ui-input type="email" formControlName="email" />
      </ui-form-field>
      <ui-form-field label="Ocupación">
        <ui-input formControlName="occupation" />
      </ui-form-field>
      <ui-form-field label="Ciudad">
        <ui-input formControlName="city" />
      </ui-form-field>
      <ui-form-field label="Dirección" class="wide">
        <ui-input formControlName="address" />
      </ui-form-field>
    </div>
  `,
  styleUrl: './student-forms.scss',
})
export class GuardianFields {
  readonly form = input.required<GuardianForm>();
  protected readonly relationships = optionsOf(RELATIONSHIPS, RELATIONSHIP_LABELS);
  protected readonly documentTypes = optionsOf(GUARDIAN_DOCUMENT_TYPES, GUARDIAN_DOCUMENT_LABELS);
}
