/**
 * Modelos del contexto de facturación electrónica (DIAN). Reflejan los read
 * models de `apreu-api/src/modules/e-invoicing/application/*view*.ts`.
 */

export type DocumentType = 'fv' | 'nc' | 'nd';
export const DOCUMENT_TYPES: readonly DocumentType[] = ['fv', 'nc', 'nd'];

export type DocumentStatus =
  | 'draft'
  | 'signed'
  | 'submitted'
  | 'accepted'
  | 'accepted_with_notices'
  | 'rejected'
  | 'send_error';
export const DOCUMENT_STATUSES: readonly DocumentStatus[] = [
  'draft',
  'signed',
  'submitted',
  'accepted',
  'accepted_with_notices',
  'rejected',
  'send_error',
];

export type DianEnvironment = '1' | '2';
export type TaxTreatment = 'excluded' | 'exempt' | 'taxed';
export type PaymentForm = '1' | '2';
export type DianOperation = 'SendBillSync' | 'SendTestSetAsync' | 'GetStatusZip';
export type ArtifactKind = 'xml' | 'zip' | 'application-response' | 'attached-document';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  fv: 'Factura de venta',
  nc: 'Nota crédito',
  nd: 'Nota débito',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Borrador',
  signed: 'Firmado',
  submitted: 'Enviado',
  accepted: 'Aceptado',
  accepted_with_notices: 'Aceptado con notificaciones',
  rejected: 'Rechazado',
  send_error: 'Error de envío',
};

export const DOCUMENT_STATUS_TONES: Record<
  DocumentStatus,
  'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'info'
> = {
  draft: 'neutral',
  signed: 'primary',
  submitted: 'info',
  accepted: 'success',
  accepted_with_notices: 'warning',
  rejected: 'danger',
  send_error: 'danger',
};

export const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = {
  excluded: 'Excluido de IVA',
  exempt: 'Exento de IVA',
  taxed: 'Gravado',
};

export const ENVIRONMENT_LABELS: Record<DianEnvironment, string> = {
  '1': 'Producción',
  '2': 'Habilitación',
};

export const ARTIFACT_LABELS: Record<ArtifactKind, string> = {
  xml: 'XML firmado',
  zip: 'ZIP enviado',
  'application-response': 'ApplicationResponse',
  'attached-document': 'AttachedDocument',
};

/** Fila del listado de documentos. */
export interface DocumentSummary {
  id: number;
  type: DocumentType;
  number: string;
  issueDate: string;
  issueTime: string;
  customerName: string;
  customerIdType: string;
  customerIdNumber: string;
  subtotal: number;
  tax: number;
  total: number;
  status: DocumentStatus;
  statusMessage: string | null;
  cufe: string | null;
  trackId: string | null;
  sourcePaymentId: number | null;
  attempts: number;
  createdAt: string | null;
}

export interface DocumentLine {
  description: string;
  code: string;
  quantity: number;
  unitPrice: number;
  taxTreatment: TaxTreatment;
  taxRate: number;
  lineTotal: number;
  taxAmount: number;
}

export interface Submission {
  operation: DianOperation;
  outcome: string;
  statusCode: string | null;
  statusMessage: string | null;
  errors: string[];
  trackId: string | null;
  at: string;
}

export interface PaymentMeans {
  form: PaymentForm;
  code: string;
  dueDate: string | null;
}

export interface BillingReference {
  documentId: number | null;
  number: string;
  uniqueCode: string;
  issueDate: string;
}

export interface Discrepancy {
  code: string;
  description: string;
}

export interface DaneLocation {
  cityCode: string;
  cityName: string;
  departmentCode: string;
  departmentName: string;
}

/** Detalle con líneas, respuesta DIAN e historial de envíos. */
export interface DocumentDetail extends DocumentSummary {
  environment: string;
  customer: {
    name: string;
    idType: string;
    idNumber: string;
    dv: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  } & DaneLocation;
  lines: DocumentLine[];
  paymentMeans: PaymentMeans;
  notes: string | null;
  billingReference: BillingReference | null;
  discrepancy: Discrepancy | null;
  qrUrl: string | null;
  fileName: string | null;
  statusCode: string | null;
  errors: string[];
  notices: string[];
  operation: DianOperation | null;
  hasApplicationResponse: boolean;
  hasAttachedDocument: boolean;
  submissions: Submission[];
}

export type DocumentCounts = Record<DocumentType, Partial<Record<DocumentStatus, number>>>;

export interface DocumentStats {
  counts: DocumentCounts;
  acceptedInvoicesTotal: number;
}

export interface DocumentFilters {
  page: number;
  pageSize: number;
  search?: string | null;
  type?: DocumentType | null;
  status?: DocumentStatus | null;
  from?: string | null;
  to?: string | null;
}

/** Respuesta paginada tal como la devuelve la API (`limit`). */
export interface ApiPaginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ----- Emisión -----

export interface CustomerInput {
  name: string;
  idType: string;
  idNumber: string;
  email?: string;
  phone?: string;
  address?: string;
  cityCode?: string;
  taxLevelCode?: string;
  vatRegime?: '48' | '49';
  firstName?: string;
  familyName?: string;
}

export interface DocumentLineInput {
  description: string;
  code?: string;
  quantity: number;
  unitPrice: number;
  taxTreatment?: TaxTreatment;
  taxRate?: number;
}

export interface IssueInvoiceRequest {
  customer: CustomerInput;
  lines: DocumentLineInput[];
  paymentMeans: { form: PaymentForm; code: string; dueDate?: string };
  notes?: string;
}

export interface IssueCreditNoteRequest {
  conceptCode: string;
  description?: string;
  lines?: DocumentLineInput[];
  notes?: string;
}

export interface IssueDebitNoteRequest {
  conceptCode: string;
  description?: string;
  lines: DocumentLineInput[];
  notes?: string;
}

export interface RetrySummary {
  processed: number;
  skipped: number;
  results: { id: number; number: string; status: DocumentStatus }[];
}

// ----- Configuración -----

export interface IssuerConfig {
  businessName: string;
  nit: string;
  dv: string;
  personType: '1' | '2';
  firstName: string | null;
  familyName: string | null;
  taxResponsibilities: string;
  vatRegime: '48' | '49';
  address: string;
  location: DaneLocation;
  postalCode: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  softwareId: string;
  softwarePinConfigured: boolean;
  environment: DianEnvironment;
  testSetId: string | null;
  autoInvoiceOnPayment: boolean;
  fileNaming: 'annex' | 'legacy';
  providerCode: string;
}

export interface UpdateIssuerConfigRequest {
  businessName?: string;
  nit?: string;
  personType?: '1' | '2';
  firstName?: string;
  familyName?: string;
  taxResponsibilities?: string;
  vatRegime?: '48' | '49';
  address?: string;
  cityCode?: string;
  postalCode?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  softwareId?: string;
  softwarePin?: string;
  environment?: DianEnvironment;
  testSetId?: string;
  autoInvoiceOnPayment?: boolean;
  fileNaming?: 'annex' | 'legacy';
  providerCode?: string;
}

export interface Resolution {
  id: number;
  docType: DocumentType;
  prefix: string;
  rangeFrom: number;
  rangeTo: number;
  current: number;
  remaining: number;
  resolutionNumber: string | null;
  validFrom: string | null;
  validTo: string | null;
  environment: DianEnvironment;
  technicalKeyConfigured: boolean;
  cycle: number;
  active: boolean;
}

export interface RegisterResolutionRequest {
  docType: DocumentType;
  prefix: string;
  rangeFrom: number;
  rangeTo: number;
  resolutionNumber?: string;
  validFrom?: string;
  validTo?: string;
  technicalKey?: string;
  environment: DianEnvironment;
}

export interface UpdateResolutionRequest {
  rangeTo?: number;
  validFrom?: string;
  validTo?: string;
  technicalKey?: string;
  resolutionNumber?: string;
  active?: boolean;
}

export interface CatalogEntry {
  code: string;
  name: string;
}

export type CatalogName =
  | 'id-types'
  | 'tax-responsibilities'
  | 'vat-regimes'
  | 'payment-forms'
  | 'payment-means'
  | 'credit-note-concepts'
  | 'debit-note-concepts'
  | 'dane-departments';

// ----- Diagnóstico y habilitación -----

export type CheckSeverity = 'ok' | 'warning' | 'error';

export interface DiagnosticCheck {
  code: string;
  severity: CheckSeverity;
  message: string;
}

export interface Diagnostics {
  ready: boolean;
  checks: DiagnosticCheck[];
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  daysToExpire: number;
  expired: boolean;
}

export interface TestSetPlan {
  invoices: number;
  creditNotes: number;
  debitNotes: number;
}

export interface TestSetProgress {
  testSetId: string | null;
  environment: string;
  counts: DocumentCounts;
}
