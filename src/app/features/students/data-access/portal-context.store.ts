import { computed, inject, Injectable, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { ApiClient, AuthService, SessionStorageService } from '../../../core';
import { PortalContextView, StudentSummaryView, StudentView } from './students.models';
import { resourceValue } from '../../../core/resource/resource-value';

const STORAGE_KEY = 'apreu.portal.student';

/**
 * Estudiante activo del portal (estudiante o acudiente). Carga
 * `GET /api/portal/context` una vez por usuario; si el acudiente tiene varios
 * hijos, recuerda el elegido en `sessionStorage` (regla 19-20 del análisis 03).
 */
@Injectable({ providedIn: 'root' })
export class PortalContextStore {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly storage = inject(SessionStorageService);

  private readonly chosen = signal<number | null>(this.storage.get<number>(STORAGE_KEY));

  readonly context = rxResource({
    params: () => this.auth.user()?.id ?? undefined,
    stream: () => this.api.get<PortalContextView>('portal/context'),
  });

  readonly students = computed<StudentSummaryView[]>(
    () => resourceValue(this.context)?.students ?? [],
  );
  readonly isLoading = this.context.isLoading;
  readonly error = this.context.error;
  readonly hasMany = computed(() => this.students().length > 1);
  /** El estudiante elegido o, por defecto, el primero (ordenados por la API). */
  readonly selected = computed<StudentSummaryView | null>(() => {
    const list = this.students();
    return list.find((s) => s.id === this.chosen()) ?? list[0] ?? null;
  });
  readonly selectedId = computed(() => this.selected()?.id ?? null);
  /** Contexto cargado y sin estudiantes vinculados. */
  readonly unlinked = computed(
    () => this.context.hasValue() && this.context.value().students.length === 0,
  );

  select(studentId: number): void {
    this.chosen.set(studentId);
    this.storage.set(STORAGE_KEY, studentId);
  }

  profile(studentId: number): Observable<StudentView> {
    return this.api.get<StudentView>(`portal/students/${studentId}/profile`);
  }
}
