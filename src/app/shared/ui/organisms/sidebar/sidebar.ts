import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UiAvatar } from '../../atoms/avatar/avatar';
import { UiIcon } from '../../atoms/icon/icon';
import { UiBrand, UiNavSection, UiUserSummary } from '../../models';

/**
 * Menú lateral (256 px, off-canvas en < 1024 px). Recibe las secciones ya
 * filtradas por permisos (lo hace `NavigationService` en el core).
 */
@Component({
  selector: 'ui-sidebar',
  imports: [RouterLink, RouterLinkActive, UiIcon, UiAvatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.open]': 'open()' },
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class UiSidebar {
  readonly sections = input<readonly UiNavSection[]>([]);
  readonly brand = input<UiBrand>({ name: 'Apreu' });
  readonly user = input<UiUserSummary | null>(null);
  /** Chip informativo (p. ej. "Año Lectivo 2026"). */
  readonly tag = input('');
  /** Visible en móvil. */
  readonly open = input(false, { transform: booleanAttribute });

  readonly closeRequest = output<void>();
  readonly logout = output<void>();
  readonly navigate = output<string>();
}
