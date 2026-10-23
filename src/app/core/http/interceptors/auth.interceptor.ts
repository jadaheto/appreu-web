import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionStore } from '../../auth/session.store';
import { APP_CONFIG } from '../../config/app-config';
import { isApiUrl } from '../api-client';
import { SKIP_AUTH } from '../http-context';

/** Agrega `Authorization: Bearer <token>` si hay sesión. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const { apiUrl } = inject(APP_CONFIG);
  const token = inject(SessionStore).token();
  if (!token || req.context.get(SKIP_AUTH) || !isApiUrl(req.url, apiUrl)) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
