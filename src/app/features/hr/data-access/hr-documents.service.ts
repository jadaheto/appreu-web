import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';
import { ApiClient, ApiError, withContext } from '../../../core';
import type { HrDocumentVerification } from './hr.models';

/**
 * Certificados expedidos por RR. HH. (`/api/hr/documents`): copia en PDF
 * (RR. HH. o el empleado dueño) y verificación pública por código (QR).
 */
@Injectable({ providedIn: 'root' })
export class HrDocumentsService {
  private readonly api = inject(ApiClient);

  /** PDF del certificado laboral expedido con ese código de verificación. */
  documentPdf(code: string): Observable<Blob> {
    return this.api.download(`hr/documents/${encodeURIComponent(code)}/document`);
  }

  /**
   * Verificación pública (solo `X-Tenant`, sin token): no se envía Authorization,
   * un 401 no cierra sesión ni se lanza el toast global (la página lo muestra).
   * `null` si el código no existe (404).
   */
  verify(code: string): Observable<HrDocumentVerification | null> {
    return this.api
      .get<HrDocumentVerification>(`hr/documents/verify/${encodeURIComponent(code.trim())}`, {
        context: withContext({ skipAuth: true, skipErrorToast: true, skipLogoutOn401: true }),
      })
      .pipe(
        catchError((err: unknown) =>
          err instanceof ApiError && err.status === 404 ? of(null) : throwError(() => err),
        ),
      );
  }
}
