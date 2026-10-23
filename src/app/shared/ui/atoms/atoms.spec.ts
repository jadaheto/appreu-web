import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiAvatar, initials } from './avatar/avatar';
import { UiBadge } from './badge/badge';
import { UiChip } from './chip/chip';
import { UiIcon } from './icon/icon';
import { ICONS } from './icon/icon.registry';
import { UiLabel } from './label/label';
import { UiLink } from './link/link';
import { UiMoneyText } from './money-text/money-text';
import { UiProgressBar } from './progress-bar/progress-bar';
import { UiSpinner } from './spinner/spinner';

function render<T>(cmp: new () => T) {
  const fixture = TestBed.createComponent(cmp);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('UiIcon', () => {
  @Component({
    imports: [UiIcon],
    template: `<ui-icon name="home" [size]="24" /><ui-icon name="bell" label="Alertas" /><ui-icon
        name="nope"
      />`,
  })
  class Host {}

  it('dibuja el path del registro y es decorativo por defecto', () => {
    const { el } = render(Host);
    const [home, bell, missing] = Array.from(el.querySelectorAll('ui-icon'));
    expect(home.querySelector('path')?.getAttribute('d')).toBe(ICONS.home);
    expect(home.getAttribute('aria-hidden')).toBe('true');
    expect((home as HTMLElement).style.width).toBe('24px');
    expect(bell.getAttribute('role')).toBe('img');
    expect(bell.getAttribute('aria-label')).toBe('Alertas');
    expect(missing.querySelector('path')).toBeNull();
  });
});

describe('UiBadge', () => {
  @Component({
    imports: [UiBadge],
    template: `<ui-badge status="paid" /><ui-badge tone="danger" dot>Urgente</ui-badge
      ><ui-badge status="raro" />`,
  })
  class Host {}

  it('resuelve tono y etiqueta desde el estado', () => {
    const { el } = render(Host);
    const [paid, danger, unknown] = Array.from(el.querySelectorAll('ui-badge'));
    expect(paid.className).toContain('ui-badge--success');
    expect(paid.textContent?.trim()).toBe('Pagado');
    expect(danger.className).toContain('ui-badge--danger');
    expect(danger.querySelector('.dot')).not.toBeNull();
    expect(unknown.className).toContain('ui-badge--neutral');
    expect(unknown.textContent?.trim()).toBe('raro');
  });
});

describe('UiAvatar', () => {
  @Component({
    imports: [UiAvatar],
    template: `<ui-avatar [name]="name()" [src]="src()" size="lg" />`,
  })
  class Host {
    name = signal('ana maría pérez');
    src = signal<string | null>(null);
  }

  it('muestra iniciales y cambia a imagen', () => {
    const { fixture, el } = render(Host);
    const avatar = el.querySelector('ui-avatar')!;
    expect(avatar.textContent?.trim()).toBe('AM');
    expect(avatar.getAttribute('aria-label')).toBe('ana maría pérez');
    expect(avatar.className).toContain('ui-avatar--lg');
    fixture.componentInstance.src.set('/foto.png');
    fixture.detectChanges();
    expect(avatar.querySelector('img')?.getAttribute('src')).toBe('/foto.png');
    avatar.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(avatar.querySelector('img')).toBeNull();
  });

  it('initials cubre casos límite', () => {
    expect(initials('')).toBe('?');
    expect(initials('carlos')).toBe('CA');
    expect(initials('  Juan   Gómez ')).toBe('JG');
  });
});

describe('UiSpinner, UiLabel, UiLink, UiChip, UiMoneyText, UiProgressBar', () => {
  @Component({
    imports: [UiSpinner, UiLabel, UiLink, UiChip, UiMoneyText, UiProgressBar],
    template: `
      <ui-spinner size="lg" label="Cargando datos" />
      <ui-label for="x" required>Nombre</ui-label>
      <a ui-link href="#" icon="home">Inicio</a>
      <button ui-chip [active]="active()" [count]="3" (click)="active.set(!active())">
        Urgentes
      </button>
      <ui-money-text [amount]="-1500" signed />
      <ui-progress-bar [value]="value()" mode="auto" label="Recaudo" />
    `,
  })
  class Host {
    active = signal(false);
    value = signal(30);
  }

  it('renderizan con accesibilidad básica', () => {
    const { fixture, el } = render(Host);
    const spinner = el.querySelector('ui-spinner')!;
    expect(spinner.getAttribute('role')).toBe('status');
    expect(spinner.textContent).toContain('Cargando datos');

    const label = el.querySelector('label')!;
    expect(label.getAttribute('for')).toBe('x');
    expect(label.querySelector('.req')).not.toBeNull();

    expect(el.querySelector('a.ui-link ui-icon')).not.toBeNull();

    const chip = el.querySelector('button.ui-chip') as HTMLButtonElement;
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    chip.click();
    fixture.detectChanges();
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(chip.querySelector('.count')?.textContent).toBe('3');

    const money = el.querySelector('ui-money-text')!;
    expect(money.classList).toContain('negative');
    expect(money.textContent?.replace(/\s/g, ' ')).toContain('1.500');

    const bar = el.querySelector('ui-progress-bar')!;
    expect(bar.getAttribute('aria-valuenow')).toBe('30');
    expect(bar.querySelector('.fill--danger')).not.toBeNull();
    fixture.componentInstance.value.set(150);
    fixture.detectChanges();
    expect(bar.getAttribute('aria-valuenow')).toBe('100');
    expect(bar.querySelector('.fill--success')).not.toBeNull();
  });
});
