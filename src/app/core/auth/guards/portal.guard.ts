import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { APP_PATHS } from '../../routing/app-paths';
import { AuthService } from '../auth.service';
import type { Portal } from '../roles';

/**
 * Restringe un árbol de rutas a un portal (`admin`, `employee`, `student`).
 * Si el usuario pertenece a otro portal, se le lleva a su propio inicio.
 */
export function portalGuard(portal: Portal): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) return router.createUrlTree(['/', APP_PATHS.login]);
    if (auth.portal() === portal) return true;
    return router.parseUrl(auth.homeUrl());
  };
}
