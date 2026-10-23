import { saveBlob as saveBlobCore } from '../../../core/http/download';
/** Descarga un `Blob` con el nombre indicado (delegado en `core`). */
export function saveBlob(blob: Blob, fileName: string, doc: Document = document): void {
  saveBlobCore(blob, fileName, { doc });
}

/** Nombre de archivo seguro: sin tildes, espacios ni caracteres especiales, con extensión `.pdf`. */
export function pdfFileName(...parts: (string | number | null | undefined)[]): string {
  const base = parts
    .filter((p) => p !== null && p !== undefined && String(p).trim() !== '')
    .join('-')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${base || 'documento'}.pdf`;
}
