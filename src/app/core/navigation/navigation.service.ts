import { computed, inject, Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import type { Portal, Role } from '../auth/roles';
import { MENU } from './menu.config';
import type { NavItem, NavSection } from './nav.model';

/** Claves siempre visibles para cualquier usuario autenticado de su portal. */
const ALWAYS_VISIBLE = new Set(['dashboard']);

export function isItemAllowed(
  item: NavItem,
  role: Role | null,
  permissions: ReadonlySet<string> | null,
): boolean {
  if (!role) return false;
  if (ALWAYS_VISIBLE.has(item.key)) return true;
  if (permissions) return permissions.has(item.module ?? item.key);
  if (role === 'superadmin') return true;
  return !!item.roles?.includes(role);
}

export function filterMenu(
  sections: readonly NavSection[],
  role: Role | null,
  permissions: ReadonlySet<string> | null,
): NavSection[] {
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => isItemAllowed(i, role, permissions)) }))
    .filter((s) => s.items.length > 0);
}

/**
 * Menú lateral del usuario actual: permisos de la API si existen; si no,
 * la matriz local de roles (`menu.config.ts`).
 */
@Injectable({ providedIn: 'root' })
export class NavigationService {
  private readonly auth = inject(AuthService);

  readonly menu = computed<NavSection[]>(() => {
    const portal = this.auth.portal();
    if (!portal) return [];
    return filterMenu(MENU[portal], this.auth.role(), this.auth.permissions());
  });

  /** `true` si los permisos vienen de la API (y no del fallback local). */
  readonly usingApiPermissions = computed(() => this.auth.permissions() !== null);

  menuFor(portal: Portal): NavSection[] {
    return filterMenu(MENU[portal], this.auth.role(), this.auth.permissions());
  }

  /** Comprueba el acceso a un módulo en cualquier portal. */
  canAccess(moduleKey: string): boolean {
    const role = this.auth.role();
    if (!role) return false;
    const perms = this.auth.permissions();
    if (perms) return ALWAYS_VISIBLE.has(moduleKey) || perms.has(moduleKey);
    if (role === 'superadmin') return true;
    return Object.values(MENU).some((sections) =>
      sections.some((s) =>
        s.items.some((i) => (i.module ?? i.key) === moduleKey && isItemAllowed(i, role, null)),
      ),
    );
  }
}
