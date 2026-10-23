import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import {
  UiAdminLayout,
  UiBrand,
  UiEmployeePortalLayout,
  UiNotificationsPanel,
  UiStudentPortalLayout,
  UiUserSummary,
} from '../../shared/ui';
import { formatDateEs } from '../../shared/ui/pipes/date-es.pipe';
import { AuthService } from '../auth/auth.service';
import { PORTAL_HOME, PORTAL_LABELS, roleLabel, type Portal } from '../auth/roles';
import { NavigationService } from '../navigation/navigation.service';
import { NotificationCenterService } from '../notifications/notification-center.service';
import { APP_PATHS } from '../routing/app-paths';
import { BrandingService } from '../theme/branding.service';
import { ThemeService } from '../theme/theme.service';

function deepestTitle(snapshot: ActivatedRouteSnapshot): string {
  let node: ActivatedRouteSnapshot | null = snapshot;
  let title = '';
  while (node) {
    if (node.title) title = node.title;
    node = node.firstChild;
  }
  return title;
}

/**
 * Componente "smart" que envuelve cada portal: conecta `AuthService`,
 * `NavigationService`, tema y marca con el template correspondiente
 * (`route.data.portal`). Las páginas se renderizan en su `<router-outlet>`.
 */
@Component({
  selector: 'app-portal-shell',
  imports: [
    RouterOutlet,
    UiAdminLayout,
    UiEmployeePortalLayout,
    UiNotificationsPanel,
    UiStudentPortalLayout,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (portal()) {
      @case ('admin') {
        <ui-admin-layout
          [sections]="menu()"
          [brand]="brand()"
          [user]="userSummary()"
          [tag]="tag()"
          [pageTitle]="pageTitle()"
          [pageSubtitle]="today"
          [darkMode]="theme.isDark()"
          [notificationsCount]="inbox.unread()"
          (notificationsClick)="toggleNotifications()"
          (logout)="auth.logout()"
          (changePassword)="goChangePassword()"
          (themeToggle)="theme.toggle()"
        >
          <router-outlet />
        </ui-admin-layout>
      }
      @case ('employee') {
        <ui-employee-portal-layout
          [sections]="menu()"
          [brand]="brand()"
          [user]="userSummary()"
          [pageTitle]="pageTitle()"
          [pageSubtitle]="today"
          [darkMode]="theme.isDark()"
          [notificationsCount]="inbox.unread()"
          (notificationsClick)="toggleNotifications()"
          (logout)="auth.logout()"
          (changePassword)="goChangePassword()"
          (themeToggle)="theme.toggle()"
        >
          <router-outlet />
        </ui-employee-portal-layout>
      }
      @case ('student') {
        <ui-student-portal-layout
          [sections]="menu()"
          [brand]="brand()"
          [user]="userSummary()"
          [pageTitle]="pageTitle()"
          [pageSubtitle]="today"
          [darkMode]="theme.isDark()"
          [notificationsCount]="inbox.unread()"
          (notificationsClick)="toggleNotifications()"
          (logout)="auth.logout()"
          (changePassword)="goChangePassword()"
          (themeToggle)="theme.toggle()"
        >
          <router-outlet />
        </ui-student-portal-layout>
      }
    }
    @if (notificationsOpen()) {
      <ui-notifications-panel
        [items]="inbox.items()"
        [unread]="inbox.unread()"
        [loading]="inbox.loading()"
        (itemClick)="markRead($event)"
        (markAll)="markAllRead()"
        (closeRequest)="notificationsOpen.set(false)"
      />
    }
  `,
})
export class PortalShell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly navigation = inject(NavigationService);
  private readonly branding = inject(BrandingService);
  protected readonly inbox = inject(NotificationCenterService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly portal = computed<Portal>(
    () => (this.route.snapshot.data['portal'] as Portal) ?? 'admin',
  );
  protected readonly menu = this.navigation.menu;
  protected readonly today = formatDateEs(new Date(), 'long');
  protected readonly tag = computed(() => `Año Lectivo ${this.branding.academicYear()}`);
  protected readonly notificationsOpen = signal(false);

  constructor() {
    this.inbox.start(inject(DestroyRef));
  }

  protected readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => deepestTitle(this.router.routerState.snapshot.root)),
    ),
    { initialValue: '' },
  );

  protected readonly brand = computed<UiBrand>(() => ({
    name: this.branding.logoUrl() ? this.branding.schoolName() : 'Apreu',
    logoUrl: this.branding.logoUrl(),
    logoSize: this.branding.logoSize(),
    subtitle: PORTAL_LABELS[this.portal()],
  }));

  protected readonly userSummary = computed<UiUserSummary | null>(() => {
    const user = this.auth.user();
    return user
      ? { name: user.name, email: user.email, roleLabel: roleLabel(user.role), avatar: user.avatar }
      : null;
  });

  protected toggleNotifications(): void {
    const open = !this.notificationsOpen();
    this.notificationsOpen.set(open);
    if (open) this.inbox.refresh();
  }

  protected markRead(id: number): void {
    this.inbox.markRead(id).subscribe();
  }

  protected markAllRead(): void {
    this.inbox.markAllRead().subscribe();
  }

  protected goChangePassword(): void {
    void this.router.navigate([PORTAL_HOME[this.portal()], APP_PATHS.changePassword]);
  }
}
