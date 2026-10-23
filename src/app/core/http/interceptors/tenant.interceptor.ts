import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { APP_CONFIG } from '../../config/app-config';
import { TenantService } from '../../tenant/tenant.service';
import { isApiUrl } from '../api-client';

export const TENANT_HEADER = 'X-Tenant';

/** Agrega `X-Tenant: <slug>` a toda petición hacia la API. */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const { apiUrl } = inject(APP_CONFIG);
  const slug = inject(TenantService).slug();
  if (!slug || !isApiUrl(req.url, apiUrl) || req.headers.has(TENANT_HEADER)) return next(req);
  return next(req.clone({ setHeaders: { [TENANT_HEADER]: slug } }));
};
