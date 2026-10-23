import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DateEsPipe, UiBadge, UiButton } from '../../../shared/ui';
import type { Sticker } from '../data-access/hr.models';

/**
 * Nota tipo post-it (análisis 01 §6.6): borde/fondo por color, franja con el
 * destinatario, "URGENTE", punto si no está leído y acciones leer/eliminar.
 * Candidato a promoverse a `shared/ui` (molécula `StickerCard`).
 */
@Component({
  selector: 'app-sticker-card',
  imports: [UiBadge, UiButton, DateEsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'article',
    '[class]': '"sticker ui-light-surface sticker--" + sticker().color',
    '[class.sticker--urgent]': 'sticker().priority === "urgent"',
    '[attr.aria-label]': 'sticker().title',
  },
  template: `
    @let s = sticker();
    <header class="strip">
      <span class="who">{{ showRecipient() ? (s.employeeName ?? 'Empleado') : 'Para mí' }}</span>
      @if (s.priority === 'urgent') {
        <ui-badge tone="danger">Urgente</ui-badge>
      }
      @if (!s.isRead) {
        <span class="unread" title="No leído"><span class="sr-only">No leído</span></span>
      }
    </header>
    <div class="body">
      <h3>{{ s.title }}</h3>
      @if (s.content) {
        <p class="content">{{ s.content }}</p>
      }
      <p class="from">De: {{ s.createdByName || 'Administración' }}</p>
    </div>
    <footer>
      <time [attr.datetime]="s.createdAt">{{ s.createdAt | dateEs: 'datetime' }}</time>
      <span class="actions">
        @if (s.isRead) {
          <span class="read">✓ Leído</span>
        } @else if (canMarkRead()) {
          <button ui-button size="xs" variant="success" icon="check" (click)="markRead.emit(s)">
            Marcar leído
          </button>
        }
        @if (canDelete()) {
          <button
            ui-button
            size="xs"
            variant="ghost"
            icon="trash"
            iconOnly
            [attr.aria-label]="'Eliminar sticker ' + s.title"
            (click)="remove.emit(s)"
          ></button>
        }
      </span>
    </footer>
  `,
  styles: `
    :host {
      --c: #eab308;
      --bg: #fefce8;
      display: flex;
      flex-direction: column;
      border: 2px solid var(--c);
      background: var(--bg);
      border-radius: var(--radius-md);
      overflow: hidden;
      color: #1e293b;
      min-height: 11rem;
    }
    :host(.sticker--red) {
      --c: #f87171;
      --bg: #fef2f2;
    }
    :host(.sticker--green) {
      --c: #4ade80;
      --bg: #f0fdf4;
    }
    :host(.sticker--blue) {
      --c: #60a5fa;
      --bg: #eff6ff;
    }
    :host(.sticker--purple) {
      --c: #c084fc;
      --bg: #faf5ff;
    }
    :host(.sticker--urgent) {
      box-shadow: 0 0 0 2px #ef4444;
    }
    .strip {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      background: color-mix(in srgb, var(--c) 35%, white);
      font-size: var(--text-xs);
      font-weight: 700;
    }
    .who {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .unread {
      width: 0.6rem;
      height: 0.6rem;
      border-radius: 50%;
      background: #2563eb;
    }
    .body {
      flex: 1;
      padding: 0.75rem;
    }
    h3 {
      font-weight: 800;
      font-size: var(--text-sm);
      margin-bottom: 0.35rem;
    }
    .content {
      font-size: var(--text-sm);
      white-space: pre-line;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .from {
      margin-top: 0.5rem;
      font-size: var(--text-xs);
      color: #64748b;
    }
    footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      border-top: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
      font-size: var(--text-xs);
      color: #475569;
    }
    .actions {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .read {
      color: #15803d;
      font-weight: 700;
    }
  `,
})
export class StickerCard {
  readonly sticker = input.required<Sticker>();
  readonly showRecipient = input(true, { transform: booleanAttribute });
  readonly canMarkRead = input(true, { transform: booleanAttribute });
  readonly canDelete = input(false, { transform: booleanAttribute });
  readonly markRead = output<Sticker>();
  readonly remove = output<Sticker>();
}
