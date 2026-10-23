import { saveBlob as saveBlobCore } from '../../../core/http/download';
/** Descarga un `Blob` con el nombre indicado (delegado en `core`). */
export function saveBlob(blob: Blob, fileName: string, doc: Document = document): void {
  saveBlobCore(blob, fileName, { doc });
}
