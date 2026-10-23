import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { UiAlert } from './alert/alert';
import { UiConfirmDialog } from './confirm-dialog/confirm-dialog';
import { DateRange, isRangeValid, UiDateRange } from './date-range/date-range';
import { UiEmptyState } from './empty-state/empty-state';
import { pageWindow, PageChange, UiPagination } from './pagination/pagination';
import { UiSearchBox } from './search-box/search-box';
import { UiStatCard } from './stat-card/stat-card';

describe('UiPagination', () => {
  @Component({
    imports: [UiPagination],
    template: `<ui-pagination
      [page]="page()"
      [pageSize]="10"
      [total]="total()"
      (pageChange)="changes.push($event)"
    />`,
  })
  class Host {
    page = signal(1);
    total = signal(95);
    changes: PageChange[] = [];
  }

  it('muestra el resumen y navega', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.summary')?.textContent).toContain('1–10');
    expect(el.querySelector('.summary')?.textContent).toContain('95');
    const prev = el.querySelector('[aria-label="Página anterior"]') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    (el.querySelector('[aria-label="Página siguiente"]') as HTMLButtonElement).click();
    (el.querySelector('[aria-label="Página 10"]') as HTMLButtonElement).click();
    expect(fixture.componentInstance.changes).toEqual([
      { page: 2, pageSize: 10 },
      { page: 10, pageSize: 10 },
    ]);
    expect(el.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('1');
  });

  it('cambia el tamaño de página volviendo a la 1', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.page.set(3);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = '50';
    select.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.changes.at(-1)).toEqual({ page: 1, pageSize: 50 });
  });

  it('pageWindow agrega elipsis', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(5, 20)).toEqual([1, 0, 4, 5, 6, 0, 20]);
    expect(pageWindow(1, 20)).toEqual([1, 2, 0, 20]);
  });
});

describe('UiSearchBox', () => {
  @Component({
    imports: [UiSearchBox],
    template: `<ui-search-box [(value)]="q" [debounce]="200" (search)="searches.push($event)" />`,
  })
  class Host {
    q = signal('');
    searches: string[] = [];
  }

  afterEach(() => vi.useRealTimers());

  it('emite con antirrebote y al limpiar', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'an';
    input.dispatchEvent(new Event('input'));
    input.value = 'ana ';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.searches).toEqual([]);
    vi.advanceTimersByTime(200);
    expect(fixture.componentInstance.searches).toEqual(['ana']);
    expect(fixture.componentInstance.q()).toBe('ana ');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.clear') as HTMLButtonElement).click();
    expect(fixture.componentInstance.searches).toEqual(['ana', '']);
  });

  it('Enter busca de inmediato', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(fixture.componentInstance.searches).toEqual(['x']);
  });
});

describe('UiStatCard', () => {
  @Component({
    imports: [UiStatCard],
    template: `<ui-stat-card
      label="Ingresos"
      [value]="value()"
      hint="12 pagos"
      icon="banknotes"
      tone="success"
      [delta]="delta()"
      [loading]="loading()"
      link="/finanzas"
      linkLabel="Ver más"
    />`,
  })
  class Host {
    value = signal<string | number | null>('$ 1.000');
    delta = signal<number | null>(5.25);
    loading = signal(false);
  }

  it('muestra valor, delta, enlace y estado de carga', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('ui-stat-card') as HTMLElement;
    expect(el.className).toContain('tone-success');
    expect(el.querySelector('.value')?.textContent).toContain('$ 1.000');
    expect(el.querySelector('.delta')?.textContent).toBe('+5.3 %');
    expect(el.querySelector('.delta')?.classList).toContain('up');
    expect(el.querySelector('a.link')?.getAttribute('href')).toBe('/finanzas');
    fixture.componentInstance.loading.set(true);
    fixture.componentInstance.delta.set(null);
    fixture.detectChanges();
    expect(el.querySelector('ui-spinner')).not.toBeNull();
    expect(el.querySelector('.delta')).toBeNull();
  });
});

describe('UiAlert', () => {
  @Component({
    imports: [UiAlert],
    template: `<ui-alert
      tone="error"
      title="Ups"
      dismissible
      [autoDismiss]="ms"
      (dismissed)="count = count + 1"
      >Falló</ui-alert
    >`,
  })
  class Host {
    ms = 0;
    count = 0;
  }

  afterEach(() => vi.useRealTimers());

  it('usa role=alert para errores y se puede cerrar', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('ui-alert') as HTMLElement;
    expect(el.getAttribute('role')).toBe('alert');
    expect(el.textContent).toContain('Ups');
    (el.querySelector('.close') as HTMLButtonElement).click();
    expect(fixture.componentInstance.count).toBe(1);
  });

  it('se cierra solo con autoDismiss', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.ms = 1000;
    fixture.detectChanges();
    vi.advanceTimersByTime(1000);
    expect(fixture.componentInstance.count).toBe(1);
  });
});

describe('UiEmptyState y UiConfirmDialog', () => {
  @Component({
    imports: [UiEmptyState, UiConfirmDialog],
    template: `
      <ui-empty-state title="Sin alumnos" message="Registra el primero"
        ><button id="cta">Nuevo</button></ui-empty-state
      >
      <ui-confirm-dialog
        title="¿Eliminar?"
        message="No se puede deshacer"
        tone="danger"
        confirmLabel="Eliminar"
        (confirmed)="answer = true"
        (cancelled)="answer = false"
      />
    `,
  })
  class Host {
    answer: boolean | null = null;
  }

  it('renderiza y emite la respuesta', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('ui-empty-state .title')?.textContent).toBe('Sin alumnos');
    expect(el.querySelector('ui-empty-state #cta')).not.toBeNull();
    const buttons = el.querySelectorAll('ui-confirm-dialog button');
    expect(buttons[1].className).toContain('ui-button--danger');
    (buttons[1] as HTMLButtonElement).click();
    expect(fixture.componentInstance.answer).toBe(true);
    (buttons[0] as HTMLButtonElement).click();
    expect(fixture.componentInstance.answer).toBe(false);
  });
});

describe('UiDateRange', () => {
  @Component({
    imports: [ReactiveFormsModule, UiDateRange],
    template: `<ui-date-range [formControl]="range" />`,
  })
  class Host {
    range = new FormControl<DateRange>({ from: '2026-01-01', to: null });
  }

  it('actualiza el rango y valida from <= to', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const [from, to] = Array.from(
      fixture.nativeElement.querySelectorAll('input'),
    ) as HTMLInputElement[];
    expect(from.value).toBe('2026-01-01');
    to.value = '2025-12-01';
    to.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.range.value).toEqual({ from: '2026-01-01', to: '2025-12-01' });
    expect(fixture.componentInstance.range.hasError('dateRange')).toBe(true);
    to.value = '2026-02-01';
    to.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.range.valid).toBe(true);
  });

  it('isRangeValid acepta extremos abiertos', () => {
    expect(isRangeValid({ from: null, to: '2026-01-01' })).toBe(true);
    expect(isRangeValid(null)).toBe(true);
  });
});
