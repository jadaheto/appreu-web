import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ApiClient, AuthService, SessionStorageService } from '../../../core';
import type { PortalContext, PortalStudent } from './academic.models';
import { resourceValue } from '../../../core/resource/resource-value';

const STORAGE_KEY = 'apreu.academic.student';

/**
 * Estudiantes visibles para el usuario del portal (`GET /api/portal/context`,
 * módulo students): el propio estudiante o los hijos activos del acudiente.
 * Conserva el estudiante elegido entre las páginas de notas, boletines y asistencia.
 */
@Injectable({ providedIn: 'root' })
export class PortalContextService {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(SessionStorageService);
  private readonly chosen = signal<number | null>(this.storage.get<number>(STORAGE_KEY));

  readonly context = rxResource({
    params: () => this.auth.user()?.id,
    stream: () => this.api.get<PortalContext>('portal/context'),
  });
  readonly students = computed<PortalStudent[]>(() =>
    this.context.hasValue() ? (resourceValue(this.context)?.students ?? []) : [],
  );
  readonly selectedId = computed<number | null>(() => {
    const list = this.students();
    const id = this.chosen();
    if (id !== null && list.some((s) => s.id === id)) return id;
    return list[0]?.id ?? null;
  });
  readonly selected = computed(
    () => this.students().find((s) => s.id === this.selectedId()) ?? null,
  );

  select(id: number | null): void {
    this.chosen.set(id);
    if (id === null) this.storage.remove(STORAGE_KEY);
    else this.storage.set(STORAGE_KEY, id);
  }
}
