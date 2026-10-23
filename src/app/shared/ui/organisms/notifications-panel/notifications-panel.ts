import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiIcon } from '../../atoms/icon/icon';
import { UiSpinner } from '../../atoms/spinner/spinner';
import { formatDateEs } from '../../pipes/date-es.pipe';

export type UiNotificationTone = 'info' | 'success' | 'warning' | 'error';

export interface UiNotificationItem {
  id: number;
  title: string;
  message: string;
  type: UiNotificationTone;
  isRead: boolean;
  createdAt: string | Date | null;
}

const ICONS: Record<UiNotificationTone, string> = {
  info: 'information-circle',
  success: 'check-circle',
  warning: 'exclamation-triangle',
  error: 'exclamation-circle',
};

/**
 * Panel desplegable de la campana: últimas notificaciones del usuario, marca
 * de no leídas y acción "Marcar todas como leídas". Componente de presentación:
 * el estado y las llamadas a la API las maneja quien lo usa.
 */
@Component({
  selector: 'ui-notifications-panel',
  imports: [UiIcon, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeRequest.emit()' },
  template: `
    <div class="backdrop" aria-hidden="true" (click)="closeRequest.emit()"></div>
    <section class="panel" role="dialog" aria-label="Notificaciones">
      <header>
        <h2>Notificaciones</h2>
        @if (unread() > 0) {
          <span class="count">{{ unread() }} sin leer</span>
        }
        <button
          type="button"
          class="close"
          aria-label="Cerrar notificaciones"
          (click)="closeRequest.emit()"
        >
          <ui-icon name="x-mark" [size]="18" />
        </button>
      </header>
      @if (loading() && items().length === 0) {
        <div class="state"><ui-spinner /></div>
      } @else if (items().length === 0) {
        <p class="state">No tiene notificaciones.</p>
      } @else {
        <ul>
          @for (n of items(); track n.id) {
            <li>
              <button
                type="button"
                class="item"
                [class.unread]="!n.isRead"
                [attr.aria-label]="(n.isRead ? '' : 'Sin leer: ') + n.title"
                (click)="itemClick.emit(n.id)"
              >
                <ui-icon [name]="icon(n.type)" [size]="20" [class]="'tone-' + n.type" />
                <span class="body">
                  <span class="title">{{ n.title }}</span>
                  <span class="msg">{{ n.message }}</span>
                  <span class="date">{{ date(n.createdAt) }}</span>
                </span>
                @if (!n.isRead) {
                  <span class="dot" aria-hidden="true"></span>
                }
              </button>
            </li>
          }
        </ul>
      }
      @if (unread() > 0) {
        <footer>
          <button type="button" class="link" (click)="markAll.emit()">
            Marcar todas como leídas
          </button>
        </footer>
      }
    </section>
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: var(--z-overlay);
    }
    .panel {
      position: fixed;
      top: 4.25rem;
      right: var(--space-4);
      z-index: var(--z-modal);
      width: min(24rem, calc(100vw - 2rem));
      max-height: min(32rem, calc(100vh - 6rem));
      display: flex;
      flex-direction: column;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
    }
    header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border-soft);
    }
    h2 {
      margin: 0;
      font-size: 1rem;
      color: var(--color-text-strong);
    }
    .count {
      font-size: 0.75rem;
      color: var(--color-primary);
      background: var(--color-primary-soft);
      border-radius: var(--radius-full);
      padding: 0.1rem 0.5rem;
    }
    .close {
      margin-left: auto;
      border: 0;
      background: none;
      color: var(--color-text-muted);
      cursor: pointer;
      padding: var(--space-1);
      border-radius: var(--radius-sm);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      overflow-y: auto;
    }
    .item {
      display: flex;
      gap: var(--space-3);
      width: 100%;
      text-align: left;
      border: 0;
      background: none;
      padding: var(--space-3) var(--space-4);
      cursor: pointer;
      border-bottom: 1px solid var(--color-border-soft);
      color: var(--color-text);
    }
    .item:hover {
      background: var(--color-surface-hover);
    }
    .item.unread {
      background: var(--color-primary-soft);
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      flex: 1;
      min-width: 0;
    }
    .title {
      font-weight: 600;
      color: var(--color-text-strong);
    }
    .msg {
      font-size: 0.875rem;
      color: var(--color-text-muted);
      overflow-wrap: anywhere;
    }
    .date {
      font-size: 0.75rem;
      color: var(--color-text-subtle);
    }
    .dot {
      width: 0.5rem;
      height: 0.5rem;
      margin-top: 0.4rem;
      border-radius: var(--radius-full);
      background: var(--color-primary);
      flex-shrink: 0;
    }
    .tone-info {
      color: var(--color-info);
    }
    .tone-success {
      color: var(--color-success);
    }
    .tone-warning {
      color: var(--color-warning);
    }
    .tone-error {
      color: var(--color-danger);
    }
    .state {
      padding: var(--space-6);
      text-align: center;
      color: var(--color-text-muted);
      margin: 0;
    }
    footer {
      padding: var(--space-2) var(--space-4);
      border-top: 1px solid var(--color-border-soft);
      text-align: right;
    }
    .link {
      border: 0;
      background: none;
      color: var(--color-primary);
      cursor: pointer;
      font-weight: 500;
    }
  `,
})
export class UiNotificationsPanel {
  readonly items = input<readonly UiNotificationItem[]>([]);
  readonly unread = input(0);
  readonly loading = input(false, { transform: booleanAttribute });

  readonly itemClick = output<number>();
  readonly markAll = output<void>();
  readonly closeRequest = output<void>();

  protected icon(type: UiNotificationTone): string {
    return ICONS[type] ?? ICONS.info;
  }

  protected date(value: string | Date | null): string {
    return value ? formatDateEs(value, 'datetime') : '';
  }
}
