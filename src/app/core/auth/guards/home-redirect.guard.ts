import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { APP_PATHS } from '../../routing/app-paths';
import { AuthService } from '../auth.service';

/** Ruta raíz `/`: redirige al portal del usuario (`user.portal`) o al login. */
export const homeRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated()
    ? router.parseUrl(auth.homeUrl())
    : router.createUrlTree(['/', APP_PATHS.login]);
};
