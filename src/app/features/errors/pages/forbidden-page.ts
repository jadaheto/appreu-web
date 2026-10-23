import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, roleLabel } from '../../../core';
import { UiButton } from '../../../shared/ui';

/** Página 403 "Acceso No Autorizado". */
@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="center">
      <section class="card">
        <p class="emoji" aria-hidden="true">🚫</p>
        <h1>Acceso No Autorizado</h1>
        <p class="text">
          @if (role()) {
            Tu rol <strong>{{ role() }}</strong> no tiene permiso para ver esta sección.
          } @else {
            No tienes permiso para ver esta sección.
          }
        </p>
        <p class="code font-mono">Error 403</p>
        <a ui-button variant="primary" icon="arrow-left" [routerLink]="auth.homeUrl()"
          >Volver al Inicio</a
        >
      </section>
    </main>
  `,
  styleUrl: './error-page.scss',
})
export class ForbiddenPage {
  protected readonly auth = inject(AuthService);
  protected readonly role = computed(() => roleLabel(this.auth.role()));
}
