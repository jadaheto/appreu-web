import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';
import { APP_CONFIG, AppConfig } from '../app/core/config/app-config';
import { authInterceptor } from '../app/core/http/interceptors/auth.interceptor';
import { errorInterceptor } from '../app/core/http/interceptors/error.interceptor';
import { tenantInterceptor } from '../app/core/http/interceptors/tenant.interceptor';
import type { AuthUser } from '../app/core/auth/auth.models';

/** Utilidades compartidas por las pruebas unitarias (no forman parte del bundle). */
export const TEST_API = 'http://api.test/api';

export const TEST_CONFIG: AppConfig = {
  production: false,
  apiUrl: TEST_API,
  baseDomain: 'apreu.test',
  defaultTenant: null,
  appName: 'Apreu ERP',
};

export function provideTestConfig(overrides: Partial<AppConfig> = {}): Provider {
  return { provide: APP_CONFIG, useValue: { ...TEST_CONFIG, ...overrides } };
}

/** HttpClient de pruebas con los interceptores reales, router y configuración. */
export function provideTestHttp(routes: Routes = []): (Provider | EnvironmentProviders)[] {
  return [
    provideTestConfig(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([tenantInterceptor, authInterceptor, errorInterceptor])),
    provideHttpClientTesting(),
  ];
}

export function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    name: 'Ana Pérez',
    email: 'ana@apreu.co',
    role: 'admin',
    avatar: null,
    isActive: true,
    lastLogin: null,
    portal: 'admin',
    ...overrides,
  };
}
