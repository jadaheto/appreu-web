import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { renderTemplate, type TemplateButton } from '../data-access/communications.models';

/** Vista previa estilo burbuja de WhatsApp de una plantilla con sus variables. */
@Component({
  selector: 'app-whatsapp-preview',
  host: { class: 'ui-light-surface' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat" role="img" [attr.aria-label]="'Vista previa del mensaje: ' + text()">
      <div class="bubble">
        @if (header()) {
          <p class="header">{{ header() }}</p>
        }
        @if (imageUrl()) {
          <p class="image">🖼️ Imagen de encabezado</p>
        }
        <p class="body">{{ text() || 'El cuerpo del mensaje aparecerá aquí.' }}</p>
        @if (footer()) {
          <p class="footer">{{ footer() }}</p>
        }
        <span class="time">{{ time }}</span>
      </div>
      @for (b of buttons(); track $index) {
        @if (b.text) {
          <div class="btn">{{ b.text }}</div>
        }
      }
    </div>
  `,
  styles: `
    .chat {
      background: #e5ddd5;
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
    .bubble {
      position: relative;
      background: #fff;
      color: #111b21;
      border-radius: 0 0.6rem 0.6rem 0.6rem;
      padding: 0.5rem 0.75rem 1.1rem;
      max-width: 22rem;
      box-shadow: 0 1px 1px rgb(0 0 0 / 0.12);
      font-size: 0.85rem;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .header {
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    .image {
      background: #f0f2f5;
      border-radius: 0.4rem;
      padding: 1rem;
      text-align: center;
      margin-bottom: 0.35rem;
    }
    .footer {
      color: #667781;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }
    .time {
      position: absolute;
      right: 0.5rem;
      bottom: 0.2rem;
      font-size: 0.65rem;
      color: #667781;
    }
    .btn {
      background: #fff;
      color: #027eb5;
      border-radius: 0.5rem;
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem;
      text-align: center;
      min-width: 10rem;
    }
  `,
})
export class WhatsAppPreview {
  readonly body = input('');
  readonly variables = input<readonly string[]>([]);
  readonly header = input<string | null>(null);
  readonly imageUrl = input<string | null>(null);
  readonly footer = input<string | null>(null);
  readonly buttons = input<readonly TemplateButton[]>([]);

  protected readonly text = computed(() => renderTemplate(this.body(), this.variables()));
  protected readonly time = new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}
