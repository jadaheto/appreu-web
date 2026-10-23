import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient, Page, withContext } from '../../../core';
import {
  ApiPaginated,
  BillingConceptOption,
  BillingPreview,
  BillingResult,
  ClassroomOption,
  DeliverySummary,
  EmailImageKind,
  EmailImageResult,
  EmailKpis,
  EmailLog,
  EmailLogQuery,
  GradeOption,
  SendBillingRequest,
  SendNoticeRequest,
  SmtpProfile,
  SmtpTestResult,
  toPage,
} from './communications.models';

/** Correo: KPIs, historial, avisos, avisos de cobro, prueba SMTP e imágenes del correo. */
@Injectable({ providedIn: 'root' })
export class EmailService {
  private readonly api = inject(ApiClient);
  /** Catálogos opcionales: si fallan (p. ej. 403) la página ofrece otra entrada, sin toast. */
  private readonly silent = { context: withContext({ skipErrorToast: true }) };

  kpis(): Observable<EmailKpis> {
    return this.api.get<EmailKpis>('communications/email/kpis');
  }

  logs(query: EmailLogQuery): Observable<Page<EmailLog>> {
    return this.api
      .get<ApiPaginated<EmailLog>>('communications/email/logs', {
        params: {
          page: query.page ?? 1,
          limit: query.pageSize ?? 20,
          search: query.search,
          type: query.type,
          status: query.status,
        },
      })
      .pipe(map(toPage));
  }

  /** `multipart/form-data`: campos del aviso + `attachments` (máx. 5). */
  sendNotice(request: SendNoticeRequest): Observable<DeliverySummary> {
    const form = new FormData();
    form.append('audience', request.audience);
    if (request.audience === 'by_grade' && request.gradeId)
      form.append('gradeId', String(request.gradeId));
    if (request.audience === 'by_classroom' && request.classroomId)
      form.append('classroomId', String(request.classroomId));
    if (request.audience === 'manual' && request.manualEmails)
      form.append('manualEmails', request.manualEmails);
    form.append('subject', request.subject);
    form.append('bodyHtml', request.bodyHtml);
    for (const file of request.attachments) form.append('attachments', file, file.name);
    return this.api.post<DeliverySummary>('communications/email/notices', form);
  }

  testSmtp(profile: SmtpProfile): Observable<SmtpTestResult> {
    return this.api.post<SmtpTestResult>('communications/email/smtp-test', { profile });
  }

  uploadImage(kind: EmailImageKind, file: File): Observable<EmailImageResult> {
    const form = new FormData();
    form.append('type', kind);
    form.append('image', file, file.name);
    return this.api.post<EmailImageResult>('communications/email/images', form);
  }

  billingPreview(month: string, conceptId?: number | null): Observable<BillingPreview> {
    return this.api.get<BillingPreview>('communications/billing-notices/preview', {
      params: { month, conceptId },
    });
  }

  sendBilling(request: SendBillingRequest): Observable<BillingResult> {
    const body: Record<string, unknown> = { month: request.month, channels: request.channels };
    if (request.conceptId) body['conceptId'] = request.conceptId;
    if (request.templateName && request.channels.includes('whatsapp'))
      body['templateName'] = request.templateName;
    return this.api.post<BillingResult>('communications/billing-notices', body);
  }

  /** Conceptos de cobro activos (finanzas; admin y finanzas). */
  concepts(): Observable<BillingConceptOption[]> {
    return this.api.get<BillingConceptOption[]>('finance/concepts', { params: { active: true } });
  }

  /** Catálogo de grados (académico; solo administradores). */
  grades(): Observable<GradeOption[]> {
    return this.api.get<GradeOption[]>('academic/grades', this.silent);
  }

  /** Salones del año lectivo (académico; solo administradores). */
  classrooms(): Observable<ClassroomOption[]> {
    return this.api.get<ClassroomOption[]>('academic/classrooms', this.silent);
  }
}
