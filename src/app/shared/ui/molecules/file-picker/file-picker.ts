import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  signal,
} from '@angular/core';
import { UiButton } from '../../atoms/button/button';
import { UiIcon } from '../../atoms/icon/icon';
import { uniqueId } from '../../forms/form-control';

export interface FileRules {
  maxFiles: number;
  maxBytes: number;
  /** Extensiones permitidas en minúscula, sin punto. */
  extensions: readonly string[];
}

/** Tamaño legible (`1,5 MB`). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toLocaleString('es-CO', { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB`;
}

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

/** Valida archivos nuevos contra las reglas y los ya elegidos. */
export function validateFiles(
  current: readonly File[],
  incoming: readonly File[],
  rules: FileRules,
): { accepted: File[]; errors: string[] } {
  const accepted: File[] = [];
  const errors: string[] = [];
  for (const file of incoming) {
    const ext = extensionOf(file.name);
    if (!rules.extensions.includes(ext)) {
      errors.push(`«${file.name}»: formato no permitido (${rules.extensions.join(', ')}).`);
    } else if (file.size > rules.maxBytes) {
      errors.push(`«${file.name}»: supera el máximo de ${formatBytes(rules.maxBytes)}.`);
    } else if (file.size === 0) {
      errors.push(`«${file.name}»: el archivo está vacío.`);
    } else if (current.length + accepted.length >= rules.maxFiles) {
      errors.push(`Máximo ${rules.maxFiles} archivo(s): «${file.name}» no se agregó.`);
    } else if (current.some((f) => f.name === file.name && f.size === file.size)) {
      errors.push(`«${file.name}» ya está en la lista.`);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, errors };
}

/**
 * Selector de archivos con zona de arrastre, validación de cantidad, tamaño y
 * extensión, y lista con opción de quitar. `[(files)]` es bidireccional.
 */
@Component({
  selector: 'ui-file-picker',
  imports: [UiButton, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="drop"
      [class.over]="dragging()"
      [class.disabled]="disabled()"
      (dragover)="$event.preventDefault(); dragging.set(true)"
      (dragleave)="dragging.set(false)"
      (drop)="onDrop($event)"
    >
      <ui-icon name="download" [size]="24" />
      <p>
        Arrastra los archivos aquí o
        <label class="pick" [attr.for]="inputId">elige desde tu equipo</label>
      </p>
      <p class="hint" [id]="hintId">{{ hint() }}</p>
      <input
        #picker
        class="sr-only"
        type="file"
        [id]="inputId"
        [attr.accept]="accept()"
        [multiple]="rules().maxFiles > 1"
        [disabled]="disabled()"
        [attr.aria-describedby]="hintId"
        [attr.aria-label]="label()"
        (change)="onPick(picker)"
      />
    </div>
    @if (errors().length) {
      <ul class="errors" role="alert">
        @for (e of errors(); track $index) {
          <li>{{ e }}</li>
        }
      </ul>
    }
    @if (files().length) {
      <ul class="list" [attr.aria-label]="label()">
        @for (f of files(); track f.name + f.size) {
          <li>
            <ui-icon name="document-text" [size]="18" />
            <span class="name">{{ f.name }}</span>
            <span class="size font-mono">{{ size(f.size) }}</span>
            <button
              ui-button
              type="button"
              variant="ghost"
              size="sm"
              icon="trash"
              iconOnly
              [attr.aria-label]="'Quitar ' + f.name"
              [disabled]="disabled()"
              (click)="remove(f)"
            ></button>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .drop {
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      text-align: center;
      color: var(--color-text-muted);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      transition:
        border-color 0.15s,
        background 0.15s;
    }
    .drop.over {
      border-color: var(--color-primary);
      background: var(--color-primary-soft);
    }
    .drop.disabled {
      opacity: 0.6;
    }
    .pick {
      color: var(--color-primary);
      font-weight: 700;
      cursor: pointer;
      text-decoration: underline;
    }
    .hint {
      font-size: var(--text-xs);
      color: var(--color-text-subtle);
    }
    .errors {
      margin-top: 0.5rem;
      color: var(--color-danger);
      font-size: var(--text-xs);
      font-weight: 600;
      list-style: none;
      padding: 0;
    }
    .list {
      list-style: none;
      padding: 0;
      margin-top: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .list li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.6rem;
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius-md);
    }
    .name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .size {
      font-size: var(--text-xs);
      color: var(--color-text-subtle);
    }
  `,
})
export class UiFilePicker {
  readonly files = model<File[]>([]);
  readonly rules = input.required<FileRules>();
  readonly label = input('Archivos adjuntos');
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly inputId = uniqueId('app-file');
  protected readonly hintId = uniqueId('app-file-hint');
  protected readonly dragging = signal(false);
  protected readonly errors = signal<string[]>([]);
  protected readonly accept = computed(() =>
    this.rules()
      .extensions.map((e) => `.${e}`)
      .join(','),
  );
  protected readonly hint = computed(() => {
    const r = this.rules();
    return `Máx. ${r.maxFiles} archivo(s) de ${formatBytes(r.maxBytes)} · ${r.extensions.join(', ')}`;
  });
  protected readonly size = formatBytes;

  protected onPick(input: HTMLInputElement): void {
    this.add(Array.from(input.files ?? []));
    input.value = '';
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    if (this.disabled()) return;
    this.add(Array.from(event.dataTransfer?.files ?? []));
  }

  /** Agrega archivos validándolos (público para pruebas). */
  add(incoming: File[]): void {
    const { accepted, errors } = validateFiles(this.files(), incoming, this.rules());
    this.errors.set(errors);
    if (accepted.length) this.files.set([...this.files(), ...accepted]);
  }

  protected remove(file: File): void {
    this.files.set(this.files().filter((f) => f !== file));
    this.errors.set([]);
  }
}
