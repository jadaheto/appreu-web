import { saveBlob as saveBlobCore } from '../../../core/http/download';
import type { CertificateView } from './students.models';

/** Descarga un `Blob` con el nombre indicado (delegado en `core`). */
export function saveBlob(blob: Blob, fileName: string, doc: Document = document): void {
  saveBlobCore(blob, fileName, { doc });
}

/** `certificado-estudio-<estudiante>-<código>.pdf`, sin tildes ni espacios. */
export function certificatePdfName(
  c: Pick<CertificateView, 'id' | 'verificationCode' | 'snapshot'>,
): string {
  const base = ['certificado-estudio', c.snapshot?.studentName, c.verificationCode ?? c.id]
    .filter((p) => p !== null && p !== undefined && String(p).trim() !== '')
    .join('-')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${base}.pdf`;
}
