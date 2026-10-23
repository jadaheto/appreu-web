import type { Environment } from './environment.model';

/** Configuración de producción. La API se sirve detrás del mismo dominio (`/api`). */
export const environment: Environment = {
  production: true,
  apiUrl: '/api',
  baseDomain: 'apreu.co',
  defaultTenant: null,
  appName: 'Apreu ERP',
};
