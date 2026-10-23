import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, ToastService, toApiError } from '../../../../core';
import { UiAlert, UiButton, UiEmptyState, UiFormField, UiTextarea } from '../../../../shared/ui';
import { MarkdownLitePipe } from '../../../../shared/ui';
import { AiService } from '../../data-access/ai.service';
import {
  MARKETING_TYPES,
  MarketingGeneration,
  MarketingType,
  MAX_MARKETING_CONTEXT,
  MIN_MARKETING_CONTEXT,
} from '../../data-access/communications.models';
import { MARKETING_COLORS } from './marketing-page';
import { resourceValue } from '../../../../core/resource/resource-value';

/** `/admin/marketing/generar/:type`: genera contenido con el flujo de IA de marketing. */
@Component({
  selector: 'app-marketing-generator-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MarkdownLitePipe,
    UiAlert,
    UiButton,
    UiEmptyState,
    UiFormField,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './marketing-generator-page.html',
  styleUrl: './marketing.scss',
})
export class MarketingGeneratorPage {
  private readonly ai = inject(AiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Parámetro de ruta `:type`. */
  readonly type = input<string>('estrategia');

  protected readonly types = rxResource({ stream: () => this.ai.marketingTypes() });
  protected readonly validType = computed<MarketingType | null>(() =>
    (MARKETING_TYPES as readonly string[]).includes(this.type())
      ? (this.type() as MarketingType)
      : null,
  );
  protected readonly info = computed(
    () => resourceValue(this.types)?.find((t) => t.type === this.validType()) ?? null,
  );
  protected readonly accent = computed(
    () => MARKETING_COLORS[this.info()?.color ?? ''] ?? 'var(--color-primary)',
  );
  protected readonly isAdmin = computed(() => this.auth.hasRole('admin'));

  protected readonly form = this.fb.group({
    context: this.fb.control('', [
      Validators.required,
      Validators.minLength(MIN_MARKETING_CONTEXT),
      Validators.maxLength(MAX_MARKETING_CONTEXT),
    ]),
  });
  protected readonly maxContext = MAX_MARKETING_CONTEXT;
  protected readonly generating = signal(false);
  protected readonly result = signal<MarketingGeneration | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notConfigured = signal(false);

  protected generate(): void {
    this.form.markAllAsTouched();
    const type = this.validType();
    if (this.form.invalid || !type || this.generating()) return;
    this.generating.set(true);
    this.error.set(null);
    this.ai.generate(type, this.form.getRawValue().context.trim()).subscribe({
      next: (g) => {
        this.generating.set(false);
        this.result.set(g);
        this.toast.success('Contenido generado y guardado en tu historial.');
      },
      error: (err) => {
        this.generating.set(false);
        const e = toApiError(err);
        this.notConfigured.set(e.code === 'MARKETING_AI_NOT_CONFIGURED');
        this.error.set(e.message);
      },
    });
  }

  protected async copy(text: string | null): Promise<void> {
    if (!text) return;
    try {
      await this.document.defaultView?.navigator.clipboard.writeText(text);
      this.toast.success('Contenido copiado al portapapeles.');
    } catch {
      this.toast.error('No se pudo copiar. Selecciona el texto manualmente.');
    }
  }

  protected crmEntries(data: Record<string, unknown>): { key: string; value: string }[] {
    return Object.entries(data ?? {}).map(([key, value]) => ({
      key: key.replace(/_/g, ' '),
      value: String(value),
    }));
  }
}
