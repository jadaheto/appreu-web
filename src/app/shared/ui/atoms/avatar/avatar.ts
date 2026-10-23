import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Iniciales: dos primeras letras de las dos primeras palabras (o del único nombre). */
export function initials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Avatar con foto o iniciales sobre el degradado de marca. */
@Component({
  selector: 'ui-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-avatar',
    '[class]': '"ui-avatar--" + size()',
    role: 'img',
    '[attr.aria-label]': 'name()',
  },
  template: `
    @if (src() && !failed()) {
      <img [src]="src()" alt="" (error)="failed.set(true)" />
    } @else {
      <span aria-hidden="true">{{ text() }}</span>
    }
  `,
  styles: `
    :host {
      --s: 2.5rem;
      width: var(--s);
      height: var(--s);
      border-radius: 50%;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: var(--gradient-primary);
      color: #fff;
      font-weight: 700;
      font-size: calc(var(--s) * 0.38);
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    :host(.ui-avatar--xs) {
      --s: 1.5rem;
    }
    :host(.ui-avatar--sm) {
      --s: 2rem;
    }
    :host(.ui-avatar--lg) {
      --s: 3.5rem;
    }
    :host(.ui-avatar--xl) {
      --s: 5rem;
    }
  `,
})
export class UiAvatar {
  readonly name = input<string>('');
  readonly src = input<string | null>(null);
  readonly size = input<AvatarSize>('md');

  protected readonly failed = signal(false);
  protected readonly text = computed(() => initials(this.name()));
}
