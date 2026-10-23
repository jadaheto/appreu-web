import type { Role } from '../auth/roles';

/** Ítem de navegación (también es el modelo que recibe `ui-sidebar`). */
export interface NavItem {
  /** Clave del módulo; se compara con `GET /api/auth/permissions`. */
  key: string;
  label: string;
  /** Nombre del ícono del registro de `ui-icon`. */
  icon: string;
  route: string;
  /** Roles con acceso (matriz local, fallback cuando la API no expone permisos). */
  roles?: readonly Role[];
  /** Clave de módulo a consultar si difiere de `key`. */
  module?: string;
  /** Activo solo con coincidencia exacta de la URL. */
  exact?: boolean;
  badge?: string | number | null;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}
