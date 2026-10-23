import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { UiPrintableSheet } from './printable-sheet';

@Component({
  imports: [UiPrintableSheet],
  template: `
    <ui-printable-sheet
      institutionName="Colegio Demo"
      nit="900.123.456-7"
      address="Calle 1"
      city="Bogotá"
      documentTitle="Recibo de caja"
      documentNumber="RC-1"
      (printed)="printed = true"
    >
      <p class="content">Cuerpo</p>
      <p uiSheetFooter class="legal">Pie</p>
    </ui-printable-sheet>
  `,
})
class Host {
  printed = false;
}

describe('UiPrintableSheet', () => {
  afterEach(() => vi.restoreAllMocks());

  it('muestra encabezado institucional, cuerpo y pie', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.inst-name')?.textContent).toBe('Colegio Demo');
    expect(el.querySelector('.inst')?.textContent).toContain('NIT 900.123.456-7');
    expect(el.querySelector('.inst')?.textContent).toContain('Calle 1, Bogotá');
    expect(el.querySelector('.doc-title')?.textContent).toBe('Recibo de caja');
    expect(el.querySelector('.body .content')).not.toBeNull();
    expect(el.querySelector('.foot .legal')).not.toBeNull();
    expect(el.querySelector('.toolbar')?.classList).toContain('no-print');
  });

  it('imprime con window.print', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.toolbar button') as HTMLButtonElement).click();
    expect(print).toHaveBeenCalled();
    expect(fixture.componentInstance.printed).toBe(true);
  });
});
