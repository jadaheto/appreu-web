import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ApiError, ToastService } from '../../../core';
import { SelectOption, UiBadge, UiButton } from '../../../shared/ui';
import {
  CatalogEntry,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_TONES,
  DocumentStatus,
} from '../data-access/e-invoicing.models';

/** Mensaje en español de un error de la API (con todas las validaciones si hay varias). */
export function errorMessage(
  err: unknown,
  fallback = 'No se pudo completar la operación.',
): string {
  if (err instanceof ApiError)
    return err.messages.length > 1 ? err.messages.join(' ') : err.message;
  return fallback;
}

/** Opciones de `ui-select` a partir de un catálogo DIAN/DANE (`código — nombre`). */
export function catalogOptions(
  entries: readonly CatalogEntry[] | undefined,
  withCode = true,
): SelectOption<string>[] {
  return (entries ?? []).map((e) => ({
    value: e.code,
    label: withCode ? `${e.code} — ${e.name}` : e.name,
  }));
}

/** Convierte cadenas vacías en `undefined` (la API ignora campos ausentes). */
export function blankToUndefined(value: string | null | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

/** Estado DIAN de un documento con etiqueta y tono en español. */
@Component({
  selector: 'app-document-status-badge',
  imports: [UiBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-badge [tone]="tone()" dot>{{ label() }}</ui-badge>`,
})
export class DocumentStatusBadge {
  readonly status = input.required<DocumentStatus>();
  protected readonly label = computed(() => DOCUMENT_STATUS_LABELS[this.status()] ?? this.status());
  protected readonly tone = computed(() => DOCUMENT_STATUS_TONES[this.status()] ?? 'neutral');
}

/** CUFE/CUDE truncado con botón para copiarlo completo. */
@Component({
  selector: 'app-cufe-chip',
  imports: [UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (value()) {
      <span class="cufe font-mono" [attr.title]="value()">{{ short() }}</span>
      @if (copyable()) {
        <button
          ui-button
          type="button"
          size="xs"
          variant="ghost"
          icon="clipboard"
          iconOnly
          aria-label="Copiar CUFE"
          title="Copiar CUFE"
          (click)="copy($event)"
        ></button>
      }
    } @else {
      <span class="text-muted">—</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      max-width: 100%;
    }
    .cufe {
      font-size: var(--text-xs);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class CufeChip {
  private readonly toast = inject(ToastService);
  readonly value = input<string | null>(null);
  readonly full = input(false);
  readonly copyable = input(true);

  protected readonly short = computed(() => {
    const v = this.value() ?? '';
    return this.full() || v.length <= 20 ? v : `${v.slice(0, 10)}…${v.slice(-8)}`;
  });

  protected async copy(event: Event): Promise<void> {
    event.stopPropagation();
    const v = this.value();
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      this.toast.success('CUFE copiado al portapapeles.');
    } catch {
      this.toast.warning('No se pudo copiar el CUFE.');
    }
  }
}
