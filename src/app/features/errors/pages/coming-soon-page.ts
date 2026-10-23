import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../../core';
import { UiButton, UiEmptyState } from '../../../shared/ui';

/**
 * Marcador para módulos del menú que aún no tienen pantalla. Cada portal lo
 * usa como ruta comodín (`**`) hasta que el contexto agregue su `loadChildren`.
 */
@Component({
  selector: 'app-coming-soon-page',
  imports: [RouterLink, UiButton, UiEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ui-card">
      <ui-empty-state
        icon="cog"
        title="Módulo en construcción"
        [message]="'La sección ' + path() + ' estará disponible próximamente.'"
      >
        <a ui-button variant="secondary" icon="arrow-left" [routerLink]="auth.homeUrl()"
          >Volver al inicio</a
        >
      </ui-empty-state>
    </section>
  `,
})
export class ComingSoonPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly path = computed(() => this.url().split('?')[0]);
}
