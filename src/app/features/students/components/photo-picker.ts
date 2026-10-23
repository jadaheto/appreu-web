import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { UiButton, UiIcon } from '../../../shared/ui';
import { MAX_PHOTO_BYTES, PHOTO_MIME_TYPES } from '../data-access/students.models';

/** Valida una foto antes de subirla (mismas reglas que `domain/student-photo.ts`). */
export function validatePhoto(file: File): string | null {
  if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type.toLowerCase())) {
    return 'Formato no permitido. Usa una imagen JPG, PNG o WebP.';
  }
  if (file.size > MAX_PHOTO_BYTES) return 'La imagen supera el tamaño máximo de 2 MB.';
  if (file.size === 0) return 'El archivo está vacío.';
  return null;
}

/**
 * Selector de foto con vista previa y validación (JPG/PNG/WebP, máx. 2 MB).
 * Emite el archivo válido o `null` al quitarlo. Candidato a `shared/ui` (FileInput de imagen).
 */
@Component({
  selector: 'app-photo-picker',
  imports: [UiButton, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="picker">
      <div class="preview" aria-hidden="true">
        @if (preview(); as src) {
          <img [src]="src" alt="" />
        } @else {
          <ui-icon name="user" [size]="40" />
        }
      </div>
      <div class="actions">
        <label class="file">
          <input
            #file
            type="file"
            [attr.accept]="accept"
            (change)="onFile(file)"
            [attr.aria-describedby]="hintId"
          />
          <ui-icon name="pencil" [size]="16" />
          {{ preview() ? 'Cambiar foto' : label() }}
        </label>
        @if (preview()) {
          <button
            ui-button
            type="button"
            size="sm"
            variant="ghost"
            icon="trash"
            (click)="clear(file)"
          >
            Quitar
          </button>
        }
        <p class="hint" [id]="hintId">JPG, PNG o WebP · máx. 2 MB</p>
        @if (error(); as err) {
          <p class="error" role="alert">{{ err }}</p>
        }
      </div>
    </div>
  `,
  styles: `
    .picker {
      display: flex;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .preview {
      width: 7rem;
      height: 7rem;
      border-radius: var(--radius-lg);
      border: 2px dashed var(--color-border);
      background: var(--color-surface-2);
      color: var(--color-text-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .actions {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.4rem;
    }
    .file {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.9rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background: var(--color-surface);
      color: var(--color-text);
      font-size: var(--text-sm);
      font-weight: 600;
      cursor: pointer;
    }
    .file:focus-within {
      box-shadow: 0 0 0 3px var(--color-primary-ring);
    }
    .file input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    .hint {
      font-size: var(--text-xs);
      color: var(--color-text-subtle);
    }
    .error {
      font-size: var(--text-xs);
      color: var(--color-danger);
    }
  `,
})
export class PhotoPicker {
  readonly label = input('Seleccionar foto');
  readonly fileChange = output<File | null>();

  protected readonly accept = PHOTO_MIME_TYPES.join(',');
  protected readonly hintId = `photo-hint-${Math.random().toString(36).slice(2, 8)}`;
  protected readonly preview = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revoke());
  }

  protected onFile(input: HTMLInputElement): void {
    const file = input.files?.[0] ?? null;
    if (!file) return;
    const error = validatePhoto(file);
    this.error.set(error);
    if (error) {
      input.value = '';
      return;
    }
    this.revoke();
    this.preview.set(typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null);
    this.fileChange.emit(file);
  }

  protected clear(input: HTMLInputElement): void {
    input.value = '';
    this.revoke();
    this.preview.set(null);
    this.error.set(null);
    this.fileChange.emit(null);
  }

  private revoke(): void {
    const url = this.preview();
    if (url) URL.revokeObjectURL(url);
  }
}
