import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';
import { ApiClient, Page, withContext, saveBlob } from '../../../core';
import type {
  ApiPaginated,
  ArtifactKind,
  CatalogEntry,
  CatalogName,
  CertificateInfo,
  Diagnostics,
  DocumentDetail,
  DocumentFilters,
  DocumentStats,
  DocumentSummary,
  DocumentType,
  IssueCreditNoteRequest,
  IssueDebitNoteRequest,
  IssueInvoiceRequest,
  IssuerConfig,
  RegisterResolutionRequest,
  Resolution,
  RetrySummary,
  TestSetPlan,
  TestSetProgress,
  UpdateIssuerConfigRequest,
  UpdateResolutionRequest,
} from './e-invoicing.models';

const BASE = 'e-invoicing';

/** Convierte la paginación de la API (`limit`) al contrato `Page<T>` del frontend. */
export function toPage<T>(res: ApiPaginated<T>): Page<T> {
  return { items: res.items, total: res.total, page: res.page, pageSize: res.limit };
}

/** Acceso HTTP a `/api/e-invoicing/**` (documentos, configuración, habilitación, catálogos). */
@Injectable({ providedIn: 'root' })
export class EInvoicingService {
  private readonly api = inject(ApiClient);
  private readonly document = inject(DOCUMENT);
  private readonly catalogCache = new Map<string, Observable<CatalogEntry[]>>();
  /** Las acciones manejan sus propios errores (toast o alerta con el mensaje de la API). */
  private readonly handled = { context: withContext({ skipErrorToast: true }) };

  // ----- Documentos -----

  list(filters: DocumentFilters): Observable<Page<DocumentSummary>> {
    return this.api
      .get<ApiPaginated<DocumentSummary>>(`${BASE}/documents`, {
        params: {
          page: filters.page,
          limit: filters.pageSize,
          search: filters.search,
          type: filters.type,
          status: filters.status,
          from: filters.from,
          to: filters.to,
        },
      })
      .pipe(map(toPage));
  }

  stats(range: { from?: string | null; to?: string | null } = {}): Observable<DocumentStats> {
    return this.api.get<DocumentStats>(`${BASE}/documents/stats`, {
      params: { from: range.from, to: range.to },
    });
  }

  get(id: number): Observable<DocumentDetail> {
    return this.api.get<DocumentDetail>(`${BASE}/documents/${id}`);
  }

  issueInvoice(dto: IssueInvoiceRequest): Observable<DocumentDetail> {
    return this.api.post<DocumentDetail>(`${BASE}/documents/invoices`, dto, this.handled);
  }

  issueCreditNote(invoiceId: number, dto: IssueCreditNoteRequest): Observable<DocumentDetail> {
    return this.api.post<DocumentDetail>(
      `${BASE}/documents/${invoiceId}/credit-notes`,
      dto,
      this.handled,
    );
  }

  issueDebitNote(invoiceId: number, dto: IssueDebitNoteRequest): Observable<DocumentDetail> {
    return this.api.post<DocumentDetail>(
      `${BASE}/documents/${invoiceId}/debit-notes`,
      dto,
      this.handled,
    );
  }

  submit(id: number): Observable<DocumentDetail> {
    return this.api.post<DocumentDetail>(`${BASE}/documents/${id}/submit`, null, this.handled);
  }

  checkStatus(id: number): Observable<DocumentDetail> {
    return this.api.post<DocumentDetail>(
      `${BASE}/documents/${id}/status-check`,
      null,
      this.handled,
    );
  }

  retryPending(): Observable<RetrySummary> {
    return this.api.post<RetrySummary>(`${BASE}/documents/retry-pending`, null, this.handled);
  }

  downloadArtifact(id: number, kind: ArtifactKind): Observable<Blob> {
    return this.api.download(`${BASE}/documents/${id}/${kind}`, this.handled);
  }

  /** Guarda un blob como archivo en el navegador. */
  saveBlob(blob: Blob, fileName: string): void {
    saveBlob(blob, fileName, { doc: this.document });
  }

  // ----- Configuración -----

  config(): Observable<IssuerConfig> {
    return this.api.get<IssuerConfig>(`${BASE}/config`);
  }

  updateConfig(dto: UpdateIssuerConfigRequest): Observable<IssuerConfig> {
    return this.api.put<IssuerConfig>(`${BASE}/config`, dto, this.handled);
  }

  certificate(): Observable<CertificateInfo> {
    return this.api.get<CertificateInfo>(`${BASE}/config/certificate`, this.handled);
  }

  diagnostics(): Observable<Diagnostics> {
    return this.api.get<Diagnostics>(`${BASE}/diagnostics`, this.handled);
  }

  resolutions(): Observable<Resolution[]> {
    return this.api.get<Resolution[]>(`${BASE}/resolutions`);
  }

  registerResolution(dto: RegisterResolutionRequest): Observable<Resolution> {
    return this.api.post<Resolution>(`${BASE}/resolutions`, dto, this.handled);
  }

  updateResolution(id: number, dto: UpdateResolutionRequest): Observable<Resolution> {
    return this.api.patch<Resolution>(`${BASE}/resolutions/${id}`, dto, this.handled);
  }

  // ----- Catálogos (en caché por sesión de la página) -----

  catalog(name: CatalogName): Observable<CatalogEntry[]> {
    return this.cached(name, () => this.api.get<CatalogEntry[]>(`${BASE}/catalogs/${name}`));
  }

  cities(departmentCode: string): Observable<CatalogEntry[]> {
    return this.cached(`cities:${departmentCode}`, () =>
      this.api.get<CatalogEntry[]>(`${BASE}/catalogs/dane/departments/${departmentCode}/cities`),
    );
  }

  // ----- Habilitación -----

  runTestSet(plan: TestSetPlan): Observable<TestSetPlan> {
    return this.api.post<TestSetPlan>(`${BASE}/habilitation/test-set/run`, plan, this.handled);
  }

  testSetProgress(): Observable<TestSetProgress> {
    return this.api.get<TestSetProgress>(`${BASE}/habilitation/test-set/progress`);
  }

  resetNumbering(types: DocumentType[]): Observable<Resolution[]> {
    return this.api.post<Resolution[]>(
      `${BASE}/habilitation/numbering/reset`,
      { types },
      this.handled,
    );
  }

  private cached(key: string, factory: () => Observable<CatalogEntry[]>) {
    let obs = this.catalogCache.get(key);
    if (!obs) {
      obs = factory().pipe(shareReplay({ bufferSize: 1, refCount: false }));
      this.catalogCache.set(key, obs);
    }
    return obs;
  }
}
