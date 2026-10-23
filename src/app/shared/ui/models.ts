/** Modelos de presentación compartidos por organismos y templates (sin lógica de negocio). */

export interface UiNavItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
  badge?: string | number | null;
}

export interface UiNavSection {
  title?: string;
  items: readonly UiNavItem[];
}

export interface UiUserSummary {
  name: string;
  email?: string;
  roleLabel?: string;
  avatar?: string | null;
}

export interface UiBrand {
  name: string;
  logoUrl?: string | null;
  logoSize?: number;
  /** Texto bajo el nombre (p. ej. "Portal Administrativo"). */
  subtitle?: string;
}
