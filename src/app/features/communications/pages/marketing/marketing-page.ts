import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DateEsPipe, UiAlert, UiButton, UiEmptyState, UiSpinner } from '../../../../shared/ui';
import { AiService } from '../../data-access/ai.service';
import { MarketingTypeInfo } from '../../data-access/communications.models';
import { resourceValue } from '../../../../core/resource/resource-value';

/** Colores del catálogo de la API → variables del tema. */
export const MARKETING_COLORS: Record<string, string> = {
  blue: 'var(--color-info)',
  pink: '#db2777',
  orange: '#ea580c',
  emerald: 'var(--color-success)',
  purple: '#7c3aed',
  amber: 'var(--color-warning)',
};

/** `/admin/marketing`: generadores de contenido con IA e historial reciente del usuario. */
@Component({
  selector: 'app-marketing-page',
  imports: [RouterLink, DateEsPipe, UiAlert, UiButton, UiEmptyState, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './marketing-page.html',
  styleUrl: './marketing.scss',
})
export class MarketingPage {
  /** Lectura segura de los resources en la plantilla (no lanza en estado de error). */
  protected readonly val = resourceValue;
  private readonly ai = inject(AiService);

  protected readonly types = rxResource({ stream: () => this.ai.marketingTypes() });
  protected readonly recent = rxResource({
    stream: () => this.ai.marketingHistory({ page: 1, pageSize: 3 }),
  });

  protected color(info: MarketingTypeInfo): string {
    return MARKETING_COLORS[info.color] ?? 'var(--color-primary)';
  }

  protected titleOf(type: string): string {
    return resourceValue(this.types)?.find((t) => t.type === type)?.title ?? type;
  }

  protected iconOf(type: string): string {
    return resourceValue(this.types)?.find((t) => t.type === type)?.icon ?? '✨';
  }
}
