import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { APP_PATHS } from '../../routing/app-paths';
import { AuthService } from '../auth.service';

/** Exige sesión; si no hay, envía al login conservando la URL de destino. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/', APP_PATHS.login], {
    queryParams: state.url && state.url !== '/' ? { returnUrl: state.url } : {},
  });
};

/** Variante `canMatch` (evita descargar el chunk perezoso sin sesión). */
export const authMatchGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  const url = '/' + segments.map((s) => s.path).join('/');
  return inject(Router).createUrlTree(['/', APP_PATHS.login], {
    queryParams: url !== '/' ? { returnUrl: url } : {},
  });
};
