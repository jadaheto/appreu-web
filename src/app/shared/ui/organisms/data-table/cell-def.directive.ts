import { Directive, inject, input, TemplateRef } from '@angular/core';

export interface CellContext<T = any> {
  $implicit: T;
  value: unknown;
  index: number;
}

/**
 * Plantilla personalizada para una columna:
 * `<ng-template uiCell="status" let-row let-value="value"><ui-badge [status]="value" /></ng-template>`
 */
@Directive({ selector: 'ng-template[uiCell]' })
export class UiCellDef<T = any> {
  readonly key = input.required<string>({ alias: 'uiCell' });
  readonly template = inject<TemplateRef<CellContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(_dir: UiCellDef<T>, ctx: unknown): ctx is CellContext<T> {
    return true;
  }
}
