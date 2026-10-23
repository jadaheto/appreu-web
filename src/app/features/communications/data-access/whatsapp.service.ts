import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient, Page } from '../../../core';
import {
  ApiPaginated,
  DeliverySummary,
  NotifyEventRequest,
  PaymentOption,
  SendWhatsAppRequest,
  TemplateStatus,
  toPage,
  WhatsAppDashboard,
  WhatsAppLog,
  WhatsAppLogQuery,
  WhatsAppSendResult,
  WhatsAppTemplate,
  WhatsAppTemplateInput,
} from './communications.models';

/** WhatsApp: KPIs, historial, envíos y plantillas. */
@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  private readonly api = inject(ApiClient);
  private readonly base = 'communications/whatsapp';

  kpis(): Observable<WhatsAppDashboard> {
    return this.api.get<WhatsAppDashboard>(`${this.base}/kpis`);
  }

  logs(query: WhatsAppLogQuery): Observable<Page<WhatsAppLog>> {
    return this.api
      .get<ApiPaginated<WhatsAppLog>>(`${this.base}/logs`, {
        params: {
          page: query.page ?? 1,
          limit: query.pageSize ?? 20,
          search: query.search,
          status: query.status,
        },
      })
      .pipe(map(toPage));
  }

  send(request: SendWhatsAppRequest): Observable<WhatsAppSendResult> {
    return this.api.post<WhatsAppSendResult>(`${this.base}/messages`, request);
  }

  notifyEvent(request: NotifyEventRequest): Observable<DeliverySummary> {
    const body: Record<string, unknown> = { date: request.date, name: request.name };
    if (request.details) body['details'] = request.details;
    return this.api.post<DeliverySummary>(`${this.base}/events`, body);
  }

  confirmPayment(paymentId: number): Observable<WhatsAppSendResult> {
    return this.api.post<WhatsAppSendResult>(`${this.base}/payment-confirmations/${paymentId}`);
  }

  templates(status?: TemplateStatus | null): Observable<WhatsAppTemplate[]> {
    return this.api.get<WhatsAppTemplate[]>(`${this.base}/templates`, { params: { status } });
  }

  createTemplate(input: WhatsAppTemplateInput): Observable<WhatsAppTemplate> {
    return this.api.post<WhatsAppTemplate>(`${this.base}/templates`, cleanTemplate(input));
  }

  updateTemplate(id: number, input: WhatsAppTemplateInput): Observable<WhatsAppTemplate> {
    return this.api.put<WhatsAppTemplate>(`${this.base}/templates/${id}`, cleanTemplate(input));
  }

  deleteTemplate(id: number): Observable<void> {
    return this.api.delete<void>(`${this.base}/templates/${id}`);
  }

  /** Últimos pagos aplicados (finanzas; admin y finanzas). */
  recentPayments(search?: string | null): Observable<Page<PaymentOption>> {
    return this.api
      .get<ApiPaginated<PaymentOption>>('finance/payments', {
        params: { status: 'applied', limit: 10, page: 1, search },
      })
      .pipe(map(toPage));
  }
}

/** Omite los campos opcionales vacíos (el DTO no acepta `null` en los opcionales). */
function cleanTemplate(input: WhatsAppTemplateInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: input.name,
    language: input.language,
    category: input.category,
    body: input.body,
    variables: input.variables,
    status: input.status,
    headerType: input.headerType,
    buttons: input.buttons ?? [],
  };
  if (input.metaTemplateId) body['metaTemplateId'] = input.metaTemplateId;
  if (input.headerType === 'text') body['headerText'] = input.headerText ?? '';
  if (input.headerType === 'image') body['headerImageUrl'] = input.headerImageUrl ?? '';
  if (input.footerText) body['footerText'] = input.footerText;
  return body;
}
