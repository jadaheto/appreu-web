import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { UiAvatar } from '../../atoms/avatar/avatar';
import { UiIcon } from '../../atoms/icon/icon';
import { UiUserSummary } from '../../models';

/**
 * Barra superior (64 px, sticky): hamburguesa (móvil), título + fecha,
 * acciones proyectadas, tema claro/oscuro, notificaciones y menú del usuario
 * (cambiar contraseña, cerrar sesión).
 */
@Component({
  selector: 'ui-topbar',
  imports: [UiIcon, UiAvatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class UiTopbar {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly title = input('');
  readonly subtitle = input('');
  readonly user = input<UiUserSummary | null>(null);
  readonly notificationsCount = input(0);
  readonly showNotifications = input(true, { transform: booleanAttribute });
  readonly darkMode = input(false, { transform: booleanAttribute });

  readonly menuToggle = output<void>();
  readonly logout = output<void>();
  readonly changePassword = output<void>();
  readonly themeToggle = output<void>();
  readonly notificationsClick = output<void>();

  protected readonly menuOpen = signal(false);

  protected onDocumentClick(event: Event): void {
    if (
      this.menuOpen() &&
      !this.host.nativeElement.querySelector('.user')?.contains(event.target as Node)
    ) {
      this.menuOpen.set(false);
    }
  }

  protected choose(action: 'password' | 'logout'): void {
    this.menuOpen.set(false);
    if (action === 'password') this.changePassword.emit();
    else this.logout.emit();
  }
}
