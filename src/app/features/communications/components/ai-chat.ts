import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toApiError } from '../../../core';
import { UiButton, UiIcon } from '../../../shared/ui';
import { AiService } from '../data-access/ai.service';
import { MAX_CHAT_MESSAGE } from '../data-access/communications.models';
import { MarkdownLitePipe } from '../../../shared/ui';

export interface ChatMessage {
  from: 'user' | 'ai' | 'error';
  text: string;
}

/**
 * Conversación con el asistente IA (`POST /api/ai/chat`): burbujas, indicador
 * de escritura y errores en línea. Base para el widget flotante global.
 */
@Component({
  selector: 'app-ai-chat',
  imports: [FormsModule, MarkdownLitePipe, UiButton, UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat">
      <header>
        <span class="logo" aria-hidden="true"><ui-icon name="cpu-chip" [size]="20" /></span>
        <div>
          <strong>Apreu IA</strong>
          <p>Asistente inteligente</p>
        </div>
      </header>
      <div
        #log
        class="messages"
        role="log"
        aria-live="polite"
        aria-label="Conversación con Apreu IA"
      >
        <p class="bubble ai">¡Hola! Soy Apreu IA. ¿En qué puedo ayudarte hoy?</p>
        @for (m of messages(); track $index) {
          @switch (m.from) {
            @case ('user') {
              <p class="bubble user">{{ m.text }}</p>
            }
            @case ('ai') {
              <p class="bubble ai" [innerHTML]="m.text | markdownLite"></p>
            }
            @case ('error') {
              <p class="bubble error" role="alert">⚠️ {{ m.text }}</p>
            }
          }
        }
        @if (sending()) {
          <p class="typing">Apreu IA está escribiendo<span aria-hidden="true">…</span></p>
        }
      </div>
      <form (ngSubmit)="send()" class="composer">
        <label class="sr-only" for="ai-chat-input">Mensaje para Apreu IA</label>
        <input
          id="ai-chat-input"
          name="message"
          [(ngModel)]="draft"
          [maxlength]="max"
          autocomplete="off"
          placeholder="Escribe tu mensaje…"
          [disabled]="sending()"
        />
        <button
          ui-button
          type="submit"
          variant="primary"
          icon="arrow-up"
          iconOnly
          aria-label="Enviar mensaje"
          [disabled]="!draft.trim() || sending()"
        ></button>
      </form>
    </div>
  `,
  styles: `
    .chat {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius-lg);
      overflow: hidden;
      background: var(--color-surface);
      box-shadow: var(--shadow-card);
    }
    header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      background: var(--gradient-primary);
      color: #fff;
    }
    header p {
      font-size: var(--text-xs);
      opacity: 0.85;
    }
    .logo {
      display: inline-flex;
      padding: 0.45rem;
      border-radius: 50%;
      background: rgb(255 255 255 / 0.2);
    }
    .messages {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      padding: 1rem;
      height: 22rem;
      overflow-y: auto;
      background: var(--color-surface-2);
    }
    .bubble {
      max-width: 85%;
      padding: 0.6rem 0.85rem;
      border-radius: 1rem;
      font-size: var(--text-sm);
      line-height: 1.5;
      word-break: break-word;
    }
    .ai {
      align-self: flex-start;
      background: var(--color-surface);
      border: 1px solid var(--color-border-soft);
      border-bottom-left-radius: 0.25rem;
    }
    .user {
      align-self: flex-end;
      background: var(--color-primary);
      color: #fff;
      border-bottom-right-radius: 0.25rem;
      white-space: pre-wrap;
    }
    .error {
      align-self: flex-start;
      background: var(--color-danger-bg);
      color: var(--color-danger);
      border: 1px solid var(--color-danger-border);
    }
    .typing {
      font-size: var(--text-xs);
      color: var(--color-text-subtle);
      font-style: italic;
    }
    .composer {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem;
      border-top: 1px solid var(--color-border-soft);
    }
    .composer input {
      flex: 1;
      min-width: 0;
      padding: 0.6rem 0.9rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-full);
      background: var(--color-surface);
      color: var(--color-text-strong);
    }
    .composer input:focus {
      outline: 0;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-ring);
    }
  `,
})
export class AiChat {
  private readonly ai = inject(AiService);
  private readonly log = viewChild<ElementRef<HTMLElement>>('log');

  /** Se emite tras cada respuesta exitosa (para refrescar el historial). */
  readonly answered = output<void>();

  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly sending = signal(false);
  protected readonly max = MAX_CHAT_MESSAGE;
  protected draft = '';

  constructor() {
    afterRenderEffect(() => {
      this.messages();
      this.sending();
      const el = this.log()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || this.sending()) return;
    this.draft = '';
    this.messages.update((list) => [...list, { from: 'user', text }]);
    this.sending.set(true);
    this.ai.chat(text).subscribe({
      next: ({ response }) => {
        this.sending.set(false);
        this.messages.update((list) => [...list, { from: 'ai', text: response }]);
        this.answered.emit();
      },
      error: (err) => {
        this.sending.set(false);
        const e = toApiError(err);
        const text =
          e.status === 429
            ? 'Has enviado muchos mensajes seguidos. Espera un momento e inténtalo de nuevo.'
            : e.isNetworkError
              ? 'Error de conexión. Intenta de nuevo.'
              : e.message;
        this.messages.update((list) => [...list, { from: 'error', text }]);
      },
    });
  }
}
