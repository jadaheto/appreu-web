import { Pipe, PipeTransform } from '@angular/core';
import type { BadgeTone } from '../../../shared/ui';
import { labelOf, toneOf } from '../data-access/students.models';

/** Etiqueta en español de un valor de catálogo: `{{ i.status | catalogLabel: STATUS_LABELS }}`. */
@Pipe({ name: 'catalogLabel' })
export class CatalogLabelPipe implements PipeTransform {
  transform(value: string | null | undefined, labels: Record<string, string>): string {
    return labelOf(labels, value);
  }
}

/** Tono de `ui-badge` de un valor de catálogo: `[tone]="i.status | catalogTone: STATUS_TONES"`. */
@Pipe({ name: 'catalogTone' })
export class CatalogTonePipe implements PipeTransform {
  transform(value: string | null | undefined, tones: Record<string, BadgeTone>): BadgeTone {
    return toneOf(tones, value);
  }
}

/** `#0001`: número de incidencia como en el legacy. */
export function incidentNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

/** Recorta un texto largo para listados. */
export function excerpt(text: string | null | undefined, max: number): string {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}
