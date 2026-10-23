import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ApiError, ToastService } from '../../../../../core';
import { UiAlert, UiButton } from '../../../../../shared/ui';
import { PhotoPicker } from '../../../components/photo-picker';
import { StudentPhoto } from '../../../components/student-photo';
import { StudentView } from '../../../data-access/students.models';
import { StudentsService } from '../../../data-access/students.service';

/** Pestaña "Foto": foto actual y subida validada (JPG/PNG/WebP, máx. 2 MB). */
@Component({
  selector: 'app-student-photo-tab',
  imports: [PhotoPicker, StudentPhoto, UiAlert, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 class="ui-card__title">Foto del estudiante</h2>
    <div class="layout">
      <figure>
        <app-student-photo
          square
          [studentId]="student().id"
          [name]="student().fullName"
          [initials]="student().initials"
          [available]="student().photoAvailable"
          [version]="version()"
        />
        <figcaption class="text-muted">
          {{ student().photoAvailable ? 'Foto actual' : 'Sin foto: se muestran las iniciales' }}
        </figcaption>
      </figure>
      <div class="stack">
        @if (error(); as err) {
          <ui-alert tone="error">{{ err }}</ui-alert>
        }
        <app-photo-picker label="Seleccionar nueva foto" (fileChange)="file.set($event)" />
        <div>
          <button
            ui-button
            type="button"
            variant="primary"
            icon="arrow-up"
            [disabled]="!file()"
            [loading]="saving()"
            (click)="upload()"
          >
            Subir foto
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .layout {
      display: flex;
      flex-wrap: wrap;
      gap: 2rem;
      align-items: flex-start;
    }
    figure {
      margin: 0;
      display: grid;
      gap: 0.5rem;
      justify-items: center;
      font-size: var(--text-xs);
    }
  `,
})
export class PhotoTab {
  private readonly students = inject(StudentsService);
  private readonly toast = inject(ToastService);

  readonly student = input.required<StudentView>();
  readonly version = input(0);
  readonly uploaded = output<void>();

  protected readonly file = signal<File | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected upload(): void {
    const file = this.file();
    if (!file) return;
    this.saving.set(true);
    this.error.set(null);
    this.students.uploadPhoto(this.student().id, file).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Foto actualizada.');
        this.uploaded.emit();
      },
      error: (err: ApiError) => {
        this.saving.set(false);
        this.error.set(err.message);
      },
    });
  }
}
