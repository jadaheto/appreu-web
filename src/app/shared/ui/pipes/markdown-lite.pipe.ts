import { Pipe, PipeTransform } from '@angular/core';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Markdown mínimo y seguro para respuestas de IA: escapa el HTML y luego
 * convierte `**negrita**`, `*cursiva*`, viñetas `- ` / `* ` y saltos de línea.
 * El resultado se usa con `[innerHTML]` (Angular además lo sanea).
 */
export function markdownLite(text: string | null | undefined): string {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/^#{1,6}\s+(.+)$/gm, '<strong>$1</strong>')
    .replace(/^\s*[-*]\s+(.+)$/gm, '• $1')
    .replace(/\r?\n/g, '<br>');
}

@Pipe({ name: 'markdownLite' })
export class MarkdownLitePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return markdownLite(value);
  }
}
