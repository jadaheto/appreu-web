import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiBadge } from '../../atoms/badge/badge';
import { UiCellDef } from './cell-def.directive';
import { compareValues, UiDataTable } from './data-table';
import { SortState, TableAction, TableActionEvent, TableColumn } from './data-table.models';

interface Row {
  id: number;
  name: string;
  amount: number;
  status: string;
}

@Component({
  imports: [UiDataTable, UiCellDef, UiBadge],
  template: `
    <ui-data-table
      [columns]="columns"
      [rows]="rows()"
      [actions]="actions"
      [loading]="loading()"
      selectable
      rowClickable
      [(sort)]="sort"
      [(selection)]="selection"
      emptyTitle="Nada por aquí"
      (action)="events.push($event)"
      (rowClick)="clicked = $event"
    >
      <ng-template uiCell="status" let-value="value"
        ><ui-badge [status]="$any(value)"
      /></ng-template>
      <span uiTableFooter class="foot">pie</span>
    </ui-data-table>
  `,
})
class Host {
  columns: TableColumn<Row>[] = [
    { key: 'name', header: 'Nombre', sortable: true },
    { key: 'amount', header: 'Monto', sortable: true, align: 'end', format: (v) => `$${v}` },
    { key: 'status', header: 'Estado' },
  ];
  actions: TableAction<Row>[] = [
    { id: 'edit', label: 'Editar', icon: 'pencil' },
    { id: 'delete', label: 'Eliminar', icon: 'trash', tone: 'danger', hidden: (r) => r.id === 1 },
  ];
  rows = signal<Row[]>([
    { id: 1, name: 'Carla', amount: 30, status: 'paid' },
    { id: 2, name: 'ana', amount: 10, status: 'pending' },
    { id: 3, name: 'Bruno', amount: 20, status: 'overdue' },
  ]);
  loading = signal(false);
  sort = signal<SortState | null>(null);
  selection = signal<readonly Row[]>([]);
  events: TableActionEvent<Row>[] = [];
  clicked: Row | null = null;
}

describe('UiDataTable', () => {
  function setup() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const names = () =>
      Array.from(el.querySelectorAll('tbody tr')).map((tr) =>
        tr.querySelectorAll('td')[1]?.textContent?.trim(),
      );
    return { fixture, el, host: fixture.componentInstance, names };
  }

  it('renderiza encabezados, celdas formateadas y plantillas', () => {
    const { el, names } = setup();
    expect(Array.from(el.querySelectorAll('th')).map((th) => th.textContent?.trim())).toContain(
      'Nombre',
    );
    expect(names()).toEqual(['Carla', 'ana', 'Bruno']);
    expect(el.querySelector('tbody tr td.align-end')?.textContent?.trim()).toBe('$30');
    expect(el.querySelectorAll('tbody ui-badge').length).toBe(3);
    expect(el.querySelector('.footer .foot')).not.toBeNull();
  });

  it('ordena en cliente: asc → desc → sin orden', () => {
    const { fixture, el, host, names } = setup();
    const sortBtn = () => el.querySelector('th button.sort') as HTMLButtonElement;
    sortBtn().click();
    fixture.detectChanges();
    expect(host.sort()).toEqual({ key: 'name', direction: 'asc' });
    expect(names()).toEqual(['ana', 'Bruno', 'Carla']);
    expect(el.querySelectorAll('th')[1].getAttribute('aria-sort')).toBe('ascending');
    sortBtn().click();
    fixture.detectChanges();
    expect(names()).toEqual(['Carla', 'Bruno', 'ana']);
    sortBtn().click();
    fixture.detectChanges();
    expect(host.sort()).toBeNull();
    expect(names()).toEqual(['Carla', 'ana', 'Bruno']);
  });

  it('selección por fila y total', () => {
    const { fixture, el, host } = setup();
    const boxes = () =>
      Array.from(el.querySelectorAll('input[type=checkbox]')) as HTMLInputElement[];
    boxes()[2].click();
    fixture.detectChanges();
    expect(host.selection().map((r) => r.id)).toEqual([2]);
    expect(boxes()[0].indeterminate).toBe(true);
    boxes()[0].click();
    fixture.detectChanges();
    expect(host.selection().length).toBe(3);
    boxes()[0].click();
    fixture.detectChanges();
    expect(host.selection().length).toBe(0);
  });

  it('acciones por fila respetan hidden y emiten el evento', () => {
    const { el, host } = setup();
    const firstRowActions = el.querySelectorAll('tbody tr')[0].querySelectorAll('.actions button');
    expect(firstRowActions.length).toBe(1);
    const secondRowDelete = el
      .querySelectorAll('tbody tr')[1]
      .querySelector('[aria-label="Eliminar"]') as HTMLButtonElement;
    secondRowDelete.click();
    expect(host.events).toEqual([{ action: 'delete', row: host.rows()[1] }]);
    expect(host.clicked).toBeNull();
  });

  it('emite rowClick al pulsar una celda', () => {
    const { el, host } = setup();
    (el.querySelectorAll('tbody tr')[2].querySelectorAll('td')[1] as HTMLElement).click();
    expect(host.clicked?.id).toBe(3);
  });

  it('estados vacío y de carga', () => {
    const { fixture, el, host } = setup();
    host.rows.set([]);
    fixture.detectChanges();
    expect(el.querySelector('ui-empty-state')?.textContent).toContain('Nada por aquí');
    host.loading.set(true);
    fixture.detectChanges();
    expect(el.querySelector('tbody ui-spinner')).not.toBeNull();
  });

  it('compareValues ordena números, vacíos y texto en español', () => {
    expect(compareValues(1, 2)).toBeLessThan(0);
    expect(compareValues(null, 'a')).toBe(1);
    expect(compareValues('árbol', 'Bote')).toBeLessThan(0);
    expect(compareValues('item 2', 'item 10')).toBeLessThan(0);
  });
});
