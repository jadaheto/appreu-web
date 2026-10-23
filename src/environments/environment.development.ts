import type { Environment } from './environment.model';

/**
 * Configuración de desarrollo: `ng serve` reenvía `/api` a apreu-api con el proxy
 * `proxy.conf.mjs` (variable `APREU_API_URL`, por defecto http://localhost:3000).
 */
export const environment: Environment = {
  production: false,
  apiUrl: '/api',
  baseDomain: 'localhost',
  defaultTenant: null,
  appName: 'Apreu ERP',
};
