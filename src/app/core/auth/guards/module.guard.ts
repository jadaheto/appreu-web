import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NavigationService } from '../../navigation/navigation.service';
import { APP_PATHS } from '../../routing/app-paths';

/**
 * Exige acceso a un módulo según `GET /api/auth/permissions` o, si no está
 * disponible, según la matriz local de roles del menú.
 */
export function moduleGuard(moduleKey: string): CanActivateFn {
  return () => {
    if (inject(NavigationService).canAccess(moduleKey)) return true;
    return inject(Router).createUrlTree(['/', APP_PATHS.forbidden]);
  };
}
