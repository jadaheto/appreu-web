/**
 * Guarda un contenido como archivo descargable (enlace temporal + `click`).
 * Es la única implementación: los features la reutilizan para PDF, XLSX, CSV, XML…
 * Si el entorno no soporta `URL.createObjectURL` (SSR, pruebas) no hace nada.
 */
export function saveBlob(
  content: Blob | string,
  fileName: string,
  options: { type?: string; doc?: Document } = {},
): void {
  const doc = options.doc ?? document;
  const view = doc.defaultView;
  if (!view?.URL?.createObjectURL) return;
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: options.type ?? 'text/plain' });
  const url = view.URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => view.URL.revokeObjectURL(url), 0);
}
