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
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiError, ToastService } from '../../../../../core';
import {
  formatDateEs,
  SelectOption,
  UiAlert,
  UiButton,
  UiFormField,
  UiSelect,
} from '../../../../../shared/ui';
import { InfoGrid, InfoItem } from '../../../components/info-grid';
import {
  createStudentDetailsForm,
  StudentDetailsForm,
  studentDetailsValue,
  StudentFields,
  StudentNotesField,
} from '../../../components/student-forms';
import {
  GENDER_LABELS,
  labelOf,
  STUDENT_DOCUMENT_LABELS,
  StudentView,
} from '../../../data-access/students.models';
import { AcademicCatalogService, StudentsService } from '../../../data-access/students.service';
import { resourceValue } from '../../../../../core/resource/resource-value';

/** Pestaña "Datos": información personal y académica, con edición (`PATCH /students/:id`). */
@Component({
  selector: 'app-student-data-tab',
  imports: [
    InfoGrid,
    ReactiveFormsModule,
    StudentFields,
    StudentNotesField,
    UiAlert,
    UiButton,
    UiFormField,
    UiSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (form(); as f) {
      <form class="stack" (submit)="$event.preventDefault(); save(f)">
        @if (serverError(); as err) {
          <ui-alert tone="error" title="No se pudieron guardar los cambios">{{ err }}</ui-alert>
        }
        <app-student-fields [form]="f" />
        <ui-form-field label="Salón / grupo" hint="Solo salones del año lectivo vigente">
          <ui-select
            [formControl]="classroom"
            [options]="classroomOptions()"
            placeholder="Sin asignar"
          />
        </ui-form-field>
        <app-student-notes-field [form]="f" />
        <div class="cluster end">
          <button ui-button type="button" (click)="cancel()">Cancelar</button>
          <button ui-button type="submit" variant="primary" icon="check" [loading]="saving()">
            Guardar cambios
          </button>
        </div>
      </form>
    } @else {
      <div class="bar">
        <h2 class="ui-card__title">Información personal</h2>
        <button ui-button type="button" icon="pencil" (click)="edit()">Editar</button>
      </div>
      <app-info-grid [items]="items()" [columns]="3" />
    }
  `,
  styles: `
    .bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    .bar h2 {
      flex: 1;
    }
    .end {
      justify-content: flex-end;
    }
  `,
})
export class DataTab {
  private readonly students = inject(StudentsService);
  private readonly catalog = inject(AcademicCatalogService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly student = input.required<StudentView>();
  readonly updated = output<StudentView>();

  protected readonly form = signal<StudentDetailsForm | null>(null);
  protected readonly classroom = new FormControl<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);

  private readonly classrooms = rxResource({
    params: () => (this.form() ? true : undefined),
    stream: () => this.catalog.classrooms(),
  });
  protected readonly classroomOptions = computed<SelectOption<number>[]>(() => {
    const list = resourceValue(this.classrooms) ?? [];
    const current = this.student().placement;
    const options = list.map((c) => ({ value: c.id, label: `${c.gradeName} · ${c.name}` }));
    if (current && !list.some((c) => c.id === current.classroomId)) {
      options.unshift({
        value: current.classroomId,
        label: `${current.gradeName} · ${current.classroomName} (${current.academicYear})`,
      });
    }
    return options;
  });

  protected readonly items = computed<InfoItem[]>(() => {
    const s = this.student();
    return [
      { label: 'Nombres', value: s.firstName },
      { label: 'Apellidos', value: s.lastName },
      { label: 'Género', value: labelOf(GENDER_LABELS, s.gender) },
      {
        label: 'Documento',
        value: `${labelOf(STUDENT_DOCUMENT_LABELS, s.documentType)} ${s.documentNumber ?? ''}`,
      },
      {
        label: 'Fecha de nacimiento',
        value: s.birthDate ? formatDateEs(`${s.birthDate}T12:00:00`) : null,
      },
      { label: 'Correo', value: s.email },
      { label: 'Teléfono', value: s.phone },
      { label: 'Grupo sanguíneo', value: s.bloodType, emphasis: 'danger' },
      { label: 'EPS', value: s.eps },
      { label: 'Dirección', value: s.address },
      { label: 'Ciudad', value: s.city },
      { label: 'Barrio', value: s.neighborhood },
      {
        label: 'Salón',
        value: s.placement
          ? `${s.placement.gradeName} · ${s.placement.classroomName}`
          : 'Sin asignar',
      },
      { label: 'Año lectivo', value: s.academicYear },
      {
        label: 'Fecha de matrícula',
        value: s.enrollmentDate ? formatDateEs(`${s.enrollmentDate}T12:00:00`) : null,
      },
      { label: 'Beca / descuento', value: `${s.scholarshipPct}%` },
      { label: 'Observaciones', value: s.notes, wide: true },
    ];
  });

  protected edit(): void {
    this.serverError.set(null);
    this.classroom.setValue(this.student().placement?.classroomId ?? null);
    this.form.set(createStudentDetailsForm(this.fb, this.student()));
  }

  protected cancel(): void {
    this.form.set(null);
  }

  protected save(form: StudentDetailsForm): void {
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.serverError.set(null);
    this.students
      .update(this.student().id, {
        ...studentDetailsValue(form),
        classroomId: this.classroom.value,
      })
      .subscribe({
        next: (student) => {
          this.saving.set(false);
          this.form.set(null);
          this.toast.success('Datos del estudiante actualizados.');
          this.updated.emit(student);
        },
        error: (err: ApiError) => {
          this.saving.set(false);
          this.serverError.set(err.message);
        },
      });
  }
}
