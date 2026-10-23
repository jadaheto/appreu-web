import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { Environment } from '../../../environments/environment.model';

export type AppConfig = Environment;

/**
 * Configuración de la aplicación inyectable. Por defecto toma `environment`
 * (reemplazado por `environment.development.ts` en desarrollo); en pruebas se
 * sobrescribe con `{ provide: APP_CONFIG, useValue: {...} }`.
 */
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => environment,
});
