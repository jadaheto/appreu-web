import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiIcon } from '../../atoms/icon/icon';

/**
 * Layout de autenticación (login, recuperación, cambio obligatorio de
 * contraseña): logo degradado con birrete, "Apreu", subtítulo, tarjeta
 * central `max-w-md` y pie legal.
 */
@Component({
  selector: 'ui-auth-layout',
  imports: [UiIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg" aria-hidden="true"></div>
    <main class="wrap">
      <header class="brand">
        @if (logoUrl()) {
          <img [src]="logoUrl()" [alt]="brandName()" />
        } @else {
          <span class="logo" aria-hidden="true"
            ><ui-icon name="academic-cap" [size]="34" [strokeWidth]="1.5"
          /></span>
        }
        <p class="name text-gradient">{{ brandName() }}</p>
        <p class="subtitle">{{ subtitle() }}</p>
      </header>
      <section class="card">
        @if (title()) {
          <h1>{{ title() }}</h1>
        }
        <ng-content />
      </section>
      <footer>
        <p>{{ footnote() }}</p>
        <p>© {{ year }} Apreu ERP · Todos los derechos reservados</p>
      </footer>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      position: relative;
      background: var(--color-bg);
    }
    .bg {
      position: fixed;
      inset: 0;
      background:
        radial-gradient(40rem 30rem at 10% -10%, var(--color-primary-soft), transparent 70%),
        radial-gradient(30rem 25rem at 110% 110%, var(--color-primary-soft), transparent 70%);
      pointer-events: none;
    }
    .wrap {
      position: relative;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .brand {
      text-align: center;
      margin-bottom: 1.75rem;
    }
    .brand img {
      max-height: 72px;
      max-width: 200px;
      object-fit: contain;
    }
    .logo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 4rem;
      height: 4rem;
      border-radius: var(--radius-lg);
      background: var(--gradient-primary);
      color: #fff;
      box-shadow: 0 8px 20px color-mix(in srgb, var(--color-primary) 30%, transparent);
    }
    .name {
      font-size: var(--text-3xl);
      font-weight: 800;
      margin-top: 0.75rem;
    }
    .subtitle {
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
    .card {
      width: 100%;
      max-width: 28rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      padding: 2rem;
      animation: ui-fade-in-up 0.4s ease both;
    }
    @media (max-width: 479px) {
      .card {
        padding: 1.5rem 1.25rem;
      }
    }
    h1 {
      font-size: var(--text-xl);
      margin-bottom: 1.5rem;
    }
    footer {
      margin-top: 1.75rem;
      text-align: center;
      font-size: var(--text-xs);
      color: var(--color-text-subtle);
      max-width: 28rem;
      display: grid;
      gap: 0.35rem;
    }
  `,
})
export class UiAuthLayout {
  readonly brandName = input('Apreu');
  readonly subtitle = input('Sistema de Gestión Escolar ERP');
  readonly logoUrl = input<string | null>(null);
  readonly title = input('');
  readonly footnote = input(
    'Acceso exclusivo para personal autorizado. ¿Problemas con tu acceso? Contacta al administrador.',
  );
  protected readonly year = new Date().getFullYear();
}
