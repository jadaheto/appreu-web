import { computed, Directive, inject } from '@angular/core';
import { AuthService, NavigationService, toApiError } from '../../../core';
import type { StatTone } from '../../../shared/ui';

export interface DashboardCard {
  label: string;
  icon: string;
  tone: StatTone;
  value: string | number | null;
  hint?: string;
}

/** Lógica común de los inicios de portal (empleado y estudiante). */
@Directive()
export abstract class PortalDashboardBase {
  protected readonly auth = inject(AuthService);
  private readonly navigation = inject(NavigationService);

  protected readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? '');
  /** Accesos rápidos: los ítems del menú del usuario, sin el inicio. */
  protected readonly shortcuts = computed(() =>
    this.navigation
      .menu()
      .flatMap((s) => s.items)
      .filter((i) => i.key !== 'dashboard'),
  );

  /** Mensaje de error de la API (o `null` si es un 404 esperado, p. ej. sin vínculo). */
  protected describeError(error: unknown): { notFound: boolean; message: string } | null {
    if (!error) return null;
    const e = toApiError(error);
    return { notFound: e.status === 404, message: e.message };
  }
}

/** Antigüedad legible (`2 años y 3 meses`). */
export function formatTenure(months: number): string {
  if (!Number.isFinite(months) || months <= 0) return 'Menos de un mes';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years ? `${years} ${years === 1 ? 'año' : 'años'}` : '';
  const m = rest ? `${rest} ${rest === 1 ? 'mes' : 'meses'}` : '';
  return [y, m].filter(Boolean).join(' y ');
}
