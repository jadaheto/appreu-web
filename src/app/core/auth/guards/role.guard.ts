import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { APP_PATHS } from '../../routing/app-paths';
import { AuthService } from '../auth.service';
import type { Role } from '../roles';

/**
 * Exige uno de los roles indicados (o los de `route.data.roles`).
 * `superadmin` siempre pasa (regla del legacy y del backend).
 *
 * ```ts
 * { path: 'usuarios', canActivate: [roleGuard('admin')], loadComponent: ... }
 * ```
 */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return (route: ActivatedRouteSnapshot) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) return router.createUrlTree(['/', APP_PATHS.login]);
    const allowed = roles.length ? roles : ((route.data['roles'] as Role[] | undefined) ?? []);
    if (!allowed.length || auth.hasRole(...allowed)) return true;
    return router.createUrlTree(['/', APP_PATHS.forbidden]);
  };
}
