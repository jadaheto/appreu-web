import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient, Page } from '../../../core';
import { asPage, PAGE_HANDLES_ERRORS } from './hr-http';
import type {
  ApiPage,
  CreateStickerRequest,
  Sticker,
  StickerListFilters,
  StickerStats,
} from './hr.models';

/**
 * Stickers/notas para empleados (`/api/stickers`). La visibilidad la decide la
 * API: admin/RR. HH. ven todos; los demás, los propios o creados por ellos.
 */
@Injectable({ providedIn: 'root' })
export class StickersService {
  private readonly api = inject(ApiClient);

  list(filters: StickerListFilters): Observable<Page<Sticker>> {
    return asPage(
      this.api.get<ApiPage<Sticker>>('stickers', {
        params: {
          filter: filters.filter,
          employeeId: filters.employeeId,
          page: filters.page,
          limit: filters.pageSize,
        },
      }),
    );
  }

  stats(): Observable<StickerStats> {
    return this.api.get<StickerStats>('stickers/stats');
  }

  /** Mis stickers no leídos (máx. 5, urgentes primero). Falla si el usuario no es empleado. */
  pending(): Observable<Sticker[]> {
    return this.api.get<Sticker[]>('stickers/pending', PAGE_HANDLES_ERRORS);
  }

  create(dto: CreateStickerRequest): Observable<Sticker> {
    return this.api.post<Sticker>('stickers', dto, PAGE_HANDLES_ERRORS);
  }

  markRead(id: number): Observable<Sticker> {
    return this.api.patch<Sticker>(`stickers/${id}/read`, {}, PAGE_HANDLES_ERRORS);
  }

  remove(id: number): Observable<void> {
    return this.api.delete<void>(`stickers/${id}`, PAGE_HANDLES_ERRORS);
  }
}
