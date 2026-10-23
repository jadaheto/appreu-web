import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ShellLayoutApi, UiShellLayout } from '../shell-layout/shell-layout';

/**
 * Layout del portal del empleado (teacher, employee).
 */
@Component({
  selector: 'ui-employee-portal-layout',
  imports: [UiShellLayout],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'portal-employee' },
  template: `
    <ui-shell-layout
      [sections]="sections()"
      [brand]="brand()"
      [user]="user()"
      [tag]="tag()"
      [pageTitle]="pageTitle()"
      [pageSubtitle]="pageSubtitle()"
      [notificationsCount]="notificationsCount()"
      [darkMode]="darkMode()"
      (logout)="logout.emit()"
      (changePassword)="changePassword.emit()"
      (themeToggle)="themeToggle.emit()"
      (notificationsClick)="notificationsClick.emit()"
    >
      <ng-container ngProjectAs="[uiTopbarActions]"
        ><ng-content select="[uiTopbarActions]"
      /></ng-container>
      <ng-container ngProjectAs="[uiShellBanner]"
        ><ng-content select="[uiShellBanner]"
      /></ng-container>
      <ng-content />
    </ui-shell-layout>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class UiEmployeePortalLayout extends ShellLayoutApi {}
