import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../auth/session.store';
import { APP_PATHS } from '../routing/app-paths';
import { TenantService } from './tenant.service';

/**
 * Rutas `/:tenant` y `/:tenant/login`: guarda el slug como tenant activo y
 * redirige a `/login`. Si había una sesión de otro colegio, la descarta.
 * Un slug inválido lleva a "no encontrado".
 */
export const tenantRouteGuard: CanActivateFn = (route) => {
  const tenant = inject(TenantService);
  const router = inject(Router);
  const session = inject(SessionStore);
  const slug = route.paramMap.get('tenant') ?? '';

  if (!tenant.isLocked() && !tenant.set(slug, 'path')) {
    return router.createUrlTree(['/', APP_PATHS.notFound]);
  }
  const current = session.session();
  if (current && current.tenant !== tenant.slug()) session.clear();
  return router.createUrlTree(['/', APP_PATHS.login]);
};
