import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core';
import { UiButton } from '../../../shared/ui';

/** Página 404. */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="center">
      <section class="card">
        <p class="emoji" aria-hidden="true">🧭</p>
        <h1>Página no encontrada</h1>
        <p class="text">La dirección que buscas no existe o fue movida.</p>
        <p class="code font-mono">Error 404</p>
        <a ui-button variant="primary" icon="arrow-left" [routerLink]="auth.homeUrl()"
          >Volver al Inicio</a
        >
      </section>
    </main>
  `,
  styleUrl: './error-page.scss',
})
export class NotFoundPage {
  protected readonly auth = inject(AuthService);
}
