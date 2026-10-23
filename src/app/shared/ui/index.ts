/**
 * Librería de componentes de Apreu (Atomic Design, ADR-0006).
 * Todos son standalone, OnPush, con `input()`/`output()` y sin lógica de negocio.
 * Catálogo visual: `/dev/ui` (solo en desarrollo).
 */
export * from './models';
export * from './forms/form-control';
export * from './forms/validation-messages';
export * from './pipes/cop-currency.pipe';
export * from './pipes/date-es.pipe';
export * from './pipes/markdown-lite.pipe';

// Átomos
export * from './atoms/avatar/avatar';
export * from './atoms/badge/badge';
export * from './atoms/button/button';
export * from './atoms/checkbox/checkbox';
export * from './atoms/chip/chip';
export * from './atoms/icon/icon';
export * from './atoms/icon/icon.registry';
export * from './atoms/input/input';
export * from './atoms/label/label';
export * from './atoms/link/link';
export * from './atoms/money-text/money-text';
export * from './atoms/progress-bar/progress-bar';
export * from './atoms/select/select';
export * from './atoms/spinner/spinner';
export * from './atoms/textarea/textarea';

// Moléculas
export * from './molecules/alert/alert';
export * from './molecules/confirm-dialog/confirm-dialog';
export * from './molecules/date-range/date-range';
export * from './molecules/empty-state/empty-state';
export * from './molecules/file-picker/file-picker';
export * from './molecules/form-field/form-field';
export * from './molecules/pagination/pagination';
export * from './molecules/rich-text-editor/rich-text-editor';
export * from './molecules/search-box/search-box';
export * from './molecules/stat-card/stat-card';

// Organismos
export * from './organisms/charts/bar-chart';
export * from './organisms/charts/chart-utils';
export * from './organisms/charts/donut-chart';
export * from './organisms/charts/line-chart';
export * from './organisms/data-table/cell-def.directive';
export * from './organisms/data-table/data-table';
export * from './organisms/data-table/data-table.models';
export * from './organisms/filter-bar/filter-bar';
export * from './organisms/modal/modal';
export * from './organisms/notifications-panel/notifications-panel';
export * from './organisms/printable-sheet/printable-sheet';
export * from './organisms/sidebar/sidebar';
export * from './organisms/tabs/tabs';
export * from './organisms/toast-stack/toast-stack';
export * from './organisms/topbar/topbar';

// Templates
export * from './templates/admin-layout/admin-layout';
export * from './templates/auth-layout/auth-layout';
export * from './templates/employee-portal-layout/employee-portal-layout';
export * from './templates/shell-layout/shell-layout';
export * from './templates/student-portal-layout/student-portal-layout';
export * from './forms/validators';
