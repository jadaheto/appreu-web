export interface Environment {
  /** `true` en el build de producción (oculta rutas de desarrollo como `/dev/ui`). */
  production: boolean;
  /** URL base de la API, incluido el prefijo `/api`. */
  apiUrl: string;
  /**
   * Dominio raíz. Si la app se sirve en `<slug>.<baseDomain>`, el slug se toma como tenant.
   * Ej.: `colegio-a.apreu.co` → `colegio-a`.
   */
  baseDomain: string;
  /** Tenant usado si no se puede resolver de otra forma (útil en desarrollo). */
  defaultTenant: string | null;
  appName: string;
}
