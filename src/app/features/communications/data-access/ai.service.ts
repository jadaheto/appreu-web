import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient, Page, withContext } from '../../../core';
import {
  ApiPaginated,
  ChatExchange,
  ChatLog,
  ChatLogQuery,
  MarketingGeneration,
  MarketingHistoryQuery,
  MarketingType,
  MarketingTypeInfo,
  PagedQuery,
  toPage,
} from './communications.models';

/** Asistente IA (chat, historial propio, monitor) y Marketing IA. */
@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly api = inject(ApiClient);

  /** Pregunta al asistente (máx. 20 mensajes/min). Los errores los muestra el chat. */
  chat(message: string): Observable<{ response: string }> {
    return this.api.post<{ response: string }>(
      'ai/chat',
      { message },
      { context: withContext({ skipErrorToast: true }) },
    );
  }

  myHistory(query: PagedQuery): Observable<Page<ChatExchange>> {
    return this.api
      .get<ApiPaginated<ChatExchange>>('ai/chat/history', {
        params: { page: query.page ?? 1, limit: query.pageSize ?? 15 },
      })
      .pipe(map(toPage));
  }

  logs(query: ChatLogQuery): Observable<Page<ChatLog>> {
    return this.api
      .get<ApiPaginated<ChatLog>>('ai/chat/logs', {
        params: {
          page: query.page ?? 1,
          limit: query.pageSize ?? 20,
          search: query.search,
          role: query.role,
          from: query.from,
          to: query.to,
        },
      })
      .pipe(map(toPage));
  }

  marketingTypes(): Observable<MarketingTypeInfo[]> {
    return this.api.get<MarketingTypeInfo[]>('marketing/types');
  }

  generate(type: MarketingType, context: string): Observable<MarketingGeneration> {
    return this.api.post<MarketingGeneration>(
      'marketing/generations',
      { type, context },
      { context: withContext({ skipErrorToast: true }) },
    );
  }

  marketingHistory(query: MarketingHistoryQuery): Observable<Page<MarketingGeneration>> {
    return this.api
      .get<ApiPaginated<MarketingGeneration>>('marketing/generations', {
        params: {
          page: query.page ?? 1,
          limit: query.pageSize ?? 10,
          search: query.search,
          type: query.type,
          date: query.date,
        },
      })
      .pipe(map(toPage));
  }
}
