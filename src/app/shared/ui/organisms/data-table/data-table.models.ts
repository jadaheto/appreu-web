export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

/** Definición de columna de `ui-data-table`. */
export interface TableColumn<T = any> {
  /** Clave de la propiedad de la fila (o id de la columna si se usa `value`). */
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  /** Ancho CSS (`'8rem'`, `'20%'`). */
  width?: string;
  /** Fuente monoespaciada (códigos, montos). */
  mono?: boolean;
  /** Oculta la columna por debajo de este ancho de pantalla. */
  hideBelow?: 'sm' | 'md' | 'lg';
  /** Accesor del valor (para mostrar y ordenar). Por defecto `row[key]`. */
  value?: (row: T) => unknown;
  /** Formato de presentación del valor. */
  format?: (value: unknown, row: T) => string;
}

/** Acción por fila (botón ícono en la última columna). */
export interface TableAction<T = any> {
  id: string;
  label: string;
  icon: string;
  tone?: 'default' | 'danger';
  hidden?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}

export interface TableActionEvent<T = any> {
  action: string;
  row: T;
}
