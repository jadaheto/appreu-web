import { DOCUMENT } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { UiButton } from '../../atoms/button/button';

/**
 * Hoja imprimible (recibos, certificados, boletines, desprendibles):
 * encabezado institucional (logo, nombre, NIT, dirección), título y número
 * del documento, cuerpo proyectado, pie (`[uiSheetFooter]`) y botón de
 * imprimir que no aparece en papel. Tamaño carta.
 */
@Component({
  selector: 'ui-printable-sheet',
  imports: [UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './printable-sheet.html',
  styleUrl: './printable-sheet.scss',
})
export class UiPrintableSheet {
  private readonly document = inject(DOCUMENT);

  readonly institutionName = input('');
  readonly nit = input('');
  readonly address = input('');
  readonly city = input('');
  readonly phone = input('');
  readonly logoUrl = input<string | null>(null);
  readonly logoSize = input(64);
  readonly documentTitle = input('');
  readonly documentNumber = input('');
  readonly issuedAt = input('');
  readonly showToolbar = input(true, { transform: booleanAttribute });
  readonly printLabel = input('Imprimir');
  readonly printed = output<void>();

  protected readonly location = computed(() =>
    [this.address(), this.city()].filter(Boolean).join(', '),
  );

  protected print(): void {
    this.printed.emit();
    this.document.defaultView?.print();
  }
}
