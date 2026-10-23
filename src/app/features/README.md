# Cómo agregar un feature (contexto) en `apreu-web`

Cada contexto de negocio (usuarios, alumnos, finanzas, nómina…) vive en
`src/app/features/<contexto>/` y sigue ADR-0006:

```
features/<contexto>/
├── data-access/            # Servicios HTTP + modelos (interfaces) del contexto
│   ├── <contexto>.models.ts
│   └── <contexto>.service.ts
├── pages/                  # Páginas "smart" enrutadas (orquestan datos y estado)
│   ├── <pagina>-page.ts
│   └── <pagina>-page.html
├── components/             # (opcional) componentes específicos del contexto
└── <contexto>.routes.ts    # Rutas hijas, cargadas con lazy loading
```

Reglas:

- Las **páginas** inyectan servicios (`data-access`, `core`) y componen la UI con
  `shared/ui`. Los componentes de `shared/ui` **no** inyectan servicios de negocio:
  solo `input()`/`output()`.
- Todo componente es `standalone`, `ChangeDetectionStrategy.OnPush`, con signals y
  control flow (`@if`, `@for`, `@switch`).
- Textos en español; mensajes de error de la API ya vienen traducidos (`ApiError.message`).
- Pruebas unitarias (`*.spec.ts`) junto a cada servicio y página (Vitest + TestBed).

## 1. Data-access

```ts
// features/users/data-access/users.models.ts
import type { Role } from '../../../core';
export interface User { id: number; name: string; email: string; role: Role; isActive: boolean }
export interface UserFilters { search?: string; role?: Role | null; page?: number; pageSize?: number }

// features/users/data-access/users.service.ts
import { inject, Injectable } from '@angular/core';
import { ApiClient, Page } from '../../../core';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiClient);

  list(filters: UserFilters) {
    return this.api.get<Page<User>>('users', { params: { ...filters } });
  }
  create(dto: Omit<User, 'id'> & { password: string }) {
    return this.api.post<User>('users', dto);
  }
}
```

`ApiClient` antepone `environment.apiUrl`; los interceptores añaden `X-Tenant`,
`Authorization`, traducen los errores a `ApiError` y, ante un 401, cierran la sesión.
Errores de red, 403, 429 y 5xx muestran un toast automático; para manejarlos en la
página use `context: withContext({ skipErrorToast: true })`.

## 2. Página

```ts
@Component({
  selector: 'app-users-page',
  imports: [UiDataTable, UiCellDef, UiFilterBar, UiSearchBox, UiPagination, UiBadge, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-page.html',
})
export class UsersPage {
  private readonly users = inject(UsersService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly filters = signal<UserFilters>({ page: 1, pageSize: 20 });
  protected readonly result = rxResource({
    params: () => this.filters(),
    stream: ({ params }) => this.users.list(params),
  });
  protected readonly columns: TableColumn<User>[] = [
    { key: 'name', header: 'Usuario', sortable: true },
    { key: 'email', header: 'Email', mono: true, hideBelow: 'md' },
    { key: 'isActive', header: 'Estado' },
  ];
}
```

```html
<div class="page-header">
  <div><h1>Gestión de Usuarios</h1><p class="page-header__subtitle">Cuentas con acceso al sistema</p></div>
  <button ui-button variant="primary" icon="plus">Nuevo usuario</button>
</div>
<ui-filter-bar (apply)="..." (clear)="...">
  <ui-search-box placeholder="Buscar por nombre o email…" (search)="..." />
</ui-filter-bar>
<ui-data-table [columns]="columns" [rows]="result.value()?.items ?? []" [loading]="result.isLoading()">
  <ng-template uiCell="isActive" let-value="value">
    <ui-badge [status]="value ? 'active' : 'inactive'" />
  </ng-template>
  <ui-pagination uiTableFooter [page]="..." [pageSize]="..." [total]="result.value()?.total ?? 0" (pageChange)="..." />
</ui-data-table>
```

Formularios: `ReactiveFormsModule` + `ui-form-field` alrededor de `ui-input`,
`ui-select`, `ui-textarea`, `ui-checkbox` o `ui-date-range` (todos son
`ControlValueAccessor`). El form-field muestra los errores en español; para
errores del servidor use `[error]="mensaje"`. Confirmaciones:
`await confirm.ask({ title: '¿Eliminar?', tone: 'danger' })`. Notificaciones:
`toast.success('Guardado')`.

## 3. Rutas

1. Cree `features/<contexto>/<contexto>.routes.ts`:

   ```ts
   export default [
     { path: '', title: 'Usuarios', loadComponent: () => import('./pages/users-page').then((m) => m.UsersPage) },
   ] satisfies Routes;
   ```

2. Regístrelas en el portal que corresponda (`src/app/portals/admin.routes.ts`,
   `employee.routes.ts` o `student.routes.ts`) **antes** del comodín `**`
   (que muestra "Módulo en construcción"):

   ```ts
   {
     path: 'usuarios',
     canActivate: [roleGuard('admin')],          // o moduleGuard('users')
     loadChildren: () => import('../features/users/users.routes'),
   },
   ```

   El layout (sidebar, topbar con el `title` de la ruta, cambio de contraseña) lo pone
   `PortalShell`; la página solo renderiza su contenido.

3. Si el módulo debe aparecer en el menú, verifique/añada el ítem en
   `core/navigation/menu.config.ts` (clave del módulo, ruta, ícono y roles de
   fallback). La visibilidad real la decide `GET /api/auth/permissions` cuando está
   disponible; si no, se usan los `roles` del ítem.

Guards disponibles (`core/auth`): `authGuard`, `guestGuard`, `roleGuard(...roles)`
(superadmin siempre pasa), `portalGuard(portal)`, `moduleGuard(clave)`.

## 4. Vistas imprimibles

Recibos, certificados, boletines y desprendibles usan `ui-printable-sheet`
(encabezado institucional + cuerpo + pie + botón Imprimir que no sale en papel).
Para una ruta sin el layout del portal, regístrela a nivel raíz en `app.routes.ts`
con `canMatch: [authMatchGuard]`.

## 5. Catálogo

En desarrollo, `/dev/ui` muestra todos los componentes de `shared/ui` con
ejemplos de uso (`features/dev/pages/ui-catalog`).
