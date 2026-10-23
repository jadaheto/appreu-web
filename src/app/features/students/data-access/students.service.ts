import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { ApiClient, ApiError, Page, withContext } from '../../../core';
import { certificatePdfName, saveBlob } from './certificate-pdf';
import {
  AccountHolder,
  CertificateDocumentView,
  CertificateVerificationView,
  CertificateView,
  ClassroomOption,
  compact,
  EnrollStudentInput,
  EnrollStudentResult,
  GradeOption,
  GuardianDetailsInput,
  GuardianDetailView,
  ProvisionedAccount,
  ResetPasswordResult,
  StudentFilters,
  StudentFinancialView,
  StudentIdCardView,
  StudentProfileView,
  StudentStatus,
  StudentSummaryView,
  StudentView,
  UpdateStudentInput,
} from './students.models';

/** Respuesta paginada de `apreu-api` (`Paginated<T>`: usa `limit`, no `pageSize`). */
export interface ApiPaginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export function toPage<T>(res: ApiPaginated<T>): Page<T> {
  return { items: res.items, total: res.total, page: res.page, pageSize: res.limit };
}

/**
 * Expedientes de estudiantes: directorio, matrícula, ficha 360, foto, acudiente,
 * cuentas del portal, carnet, estado de cuenta y certificados.
 */
@Injectable({ providedIn: 'root' })
export class StudentsService {
  private readonly api = inject(ApiClient);
  private readonly doc = inject(DOCUMENT);

  // ------------------------------------------------------------ Directorio

  list(filters: StudentFilters): Observable<Page<StudentSummaryView>> {
    return this.api
      .get<ApiPaginated<StudentSummaryView>>('students', {
        params: {
          search: filters.search,
          status: filters.status,
          gradeId: filters.gradeId,
          classroomId: filters.classroomId,
          year: filters.year,
          page: filters.page,
          limit: filters.pageSize,
        },
      })
      .pipe(map(toPage));
  }

  enroll(input: EnrollStudentInput): Observable<EnrollStudentResult> {
    const body = compact({
      ...input,
      student: compact(input.student),
      guardian: input.guardian ? compact(input.guardian) : undefined,
    });
    return this.api.post<EnrollStudentResult>('students', body, {
      context: withContext({ skipErrorToast: true }),
    });
  }

  profile(id: number): Observable<StudentProfileView> {
    return this.api.get<StudentProfileView>(`students/${id}`);
  }

  update(id: number, input: UpdateStudentInput): Observable<StudentView> {
    const { classroomId, ...details } = input;
    const body: Record<string, unknown> = compact(details);
    if (classroomId !== undefined) body['classroomId'] = classroomId;
    return this.api.patch<StudentView>(`students/${id}`, body, {
      context: withContext({ skipErrorToast: true }),
    });
  }

  changeStatus(id: number, status: StudentStatus, reason?: string): Observable<StudentView> {
    return this.api.post<StudentView>(`students/${id}/status`, compact({ status, reason }));
  }

  // ------------------------------------------------------------ Foto

  uploadPhoto(id: number, file: File): Observable<void> {
    const form = new FormData();
    form.append('photo', file, file.name);
    return this.api.put<void>(`students/${id}/photo`, form);
  }

  /** Foto protegida por token: se descarga como Blob para crear un object URL. */
  photo(id: number): Observable<Blob | null> {
    return this.api
      .download(`students/${id}/photo`, { context: withContext({ skipErrorToast: true }) })
      .pipe(catchError(() => of(null)));
  }

  // ------------------------------------------------------------ Acudiente

  linkGuardian(id: number, guardianId: number): Observable<StudentView> {
    return this.api.put<StudentView>(`students/${id}/guardian`, { guardianId });
  }

  unlinkGuardian(id: number): Observable<StudentView> {
    return this.api.delete<StudentView>(`students/${id}/guardian`);
  }

  // ------------------------------------------------------------ Cuentas del portal

  provisionAccounts(id: number): Observable<ProvisionedAccount[]> {
    return this.api.post<ProvisionedAccount[]>(`students/${id}/portal-accounts`);
  }

  resetPortalPassword(id: number, holder: AccountHolder): Observable<ResetPasswordResult> {
    return this.api.post<ResetPasswordResult>(`students/${id}/portal-accounts/reset-password`, {
      holder,
    });
  }

  // ------------------------------------------------------------ Documentos

  idCard(id: number): Observable<StudentIdCardView> {
    return this.api.get<StudentIdCardView>(`students/${id}/id-card`);
  }

  financialSummary(id: number): Observable<StudentFinancialView> {
    return this.api.get<StudentFinancialView>(`students/${id}/financial-summary`);
  }

  certificates(id: number): Observable<CertificateView[]> {
    return this.api.get<CertificateView[]>(`students/${id}/certificates`);
  }

  /** Emisión manual (admin): queda aprobado de inmediato. */
  issueCertificate(id: number, notes?: string): Observable<CertificateView> {
    return this.api.post<CertificateView>(`students/${id}/certificates`, compact({ notes }));
  }

  /** Solicitud (admin, estudiante o acudiente): queda pendiente de aprobación. */
  requestCertificate(id: number, notes?: string): Observable<CertificateView> {
    return this.api.post<CertificateView>(
      `students/${id}/certificate-requests`,
      compact({ notes }),
    );
  }

  approveCertificate(certificateId: number): Observable<CertificateView> {
    return this.api.post<CertificateView>(`certificates/${certificateId}/approve`);
  }

  cancelCertificate(certificateId: number, reason: string): Observable<CertificateView> {
    return this.api.post<CertificateView>(`certificates/${certificateId}/cancel`, { reason });
  }

  certificateDocument(certificateId: number): Observable<CertificateDocumentView> {
    return this.api.get<CertificateDocumentView>(`certificates/${certificateId}/document`, {
      context: withContext({ skipErrorToast: true }),
    });
  }

  /** Certificado aprobado en PDF con membrete y QR de verificación (`application/pdf`). */
  certificatePdf(certificateId: number): Observable<Blob> {
    return this.api.download(`certificates/${certificateId}/pdf`);
  }

  /** Descarga el PDF del certificado y lo guarda con un nombre legible. */
  downloadCertificatePdf(certificate: CertificateView): Observable<void> {
    return this.certificatePdf(certificate.id).pipe(
      map((blob) => saveBlob(blob, certificatePdfName(certificate), this.doc)),
    );
  }

  /** Verificación pública; `null` si el código no existe. */
  verifyCertificate(code: string): Observable<CertificateVerificationView | null> {
    return this.api
      .get<CertificateVerificationView>(
        `public/certificates/verify/${encodeURIComponent(code.trim())}`,
        { context: withContext({ skipErrorToast: true, skipLogoutOn401: true }) },
      )
      .pipe(
        catchError((err: unknown) =>
          err instanceof ApiError && err.status === 404 ? of(null) : throwError(() => err),
        ),
      );
  }
}

/** Acudientes compartidos entre hermanos (solo admin). */
@Injectable({ providedIn: 'root' })
export class GuardiansService {
  private readonly api = inject(ApiClient);

  /** Busca por documento; `null` si no existe. */
  findByDocument(documentNumber: string): Observable<GuardianDetailView | null> {
    return this.api
      .get<GuardianDetailView>('guardians', {
        params: { documentNumber: documentNumber.trim() },
        context: withContext({ skipErrorToast: true }),
      })
      .pipe(
        catchError((err: unknown) =>
          err instanceof ApiError && err.status === 404 ? of(null) : throwError(() => err),
        ),
      );
  }

  get(id: number): Observable<GuardianDetailView> {
    return this.api.get<GuardianDetailView>(`guardians/${id}`);
  }

  create(input: GuardianDetailsInput): Observable<GuardianDetailView> {
    return this.api.post<GuardianDetailView>('guardians', compact(input), {
      context: withContext({ skipErrorToast: true }),
    });
  }

  update(id: number, input: GuardianDetailsInput): Observable<GuardianDetailView> {
    return this.api.patch<GuardianDetailView>(`guardians/${id}`, compact(input), {
      context: withContext({ skipErrorToast: true }),
    });
  }
}

/** Grados y salones (contexto académico) para filtros y asignación de salón. */
@Injectable({ providedIn: 'root' })
export class AcademicCatalogService {
  private readonly api = inject(ApiClient);

  grades(): Observable<GradeOption[]> {
    return this.api
      .get<GradeOption[]>('academic/grades', { context: withContext({ skipErrorToast: true }) })
      .pipe(catchError(() => of([])));
  }

  /** Salones del año indicado (por defecto, el año lectivo vigente). */
  classrooms(year?: number | null): Observable<ClassroomOption[]> {
    return this.api
      .get<ClassroomOption[]>('academic/classrooms', {
        params: { year },
        context: withContext({ skipErrorToast: true }),
      })
      .pipe(catchError(() => of([])));
  }
}
