# apreu-web

Frontend de **Apreu ERP** (gestión escolar multi-colegio). Angular 21 con
componentes standalone, signals, `OnPush`, control flow y una librería de UI
propia con Atomic Design (ADR-0006). Consume `apreu-api` (NestJS).

## Requisitos

- Node 24.4+ y npm 11 (Angular 22 exigirá Node ≥ 24.15).
- `apreu-api` corriendo (por defecto en `http://localhost:3000`, prefijo `/api`).

## Scripts

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo en `http://localhost:4200` (configuración `development`). |
| `npm run build` | Build de producción en `dist/apreu-web`. |
| `npm run build:dev` | Build de desarrollo (incluye el catálogo `/dev/ui`). |
| `npm test` | Pruebas unitarias (Vitest) en modo watch. |
| `npm run test:ci` | Pruebas una sola vez (`ng test --watch=false`). |
| `npm run format` / `format:check` | Prettier sobre `src/`. |

## Cómo correr contra la API

1. Levante `apreu-api` (ver su README).
2. `ng serve` reenvía `/api` a la API con `proxy.conf.mjs` (sin CORS). Si la API
   no está en `http://localhost:3000`, use `APREU_API_URL=http://localhost:3100 npm start`.
   Opcionalmente fije `defaultTenant` en `src/environments/environment.development.ts`
   para no escribir el código del colegio en cada login.
3. `npm start` y abra una de estas URLs:
   - `http://localhost:4200/<slug>/login` → fija el colegio `<slug>` y va al login.
   - `http://<slug>.localhost:4200/login` → colegio por subdominio (los navegadores
     resuelven `*.localhost`; `baseDomain` de desarrollo es `localhost`).
   - `http://localhost:4200/login` → el formulario pide el **código del colegio**.
4. Tras el login se redirige según `user.portal`: `/admin`, `/portal-empleado` o
   `/portal-estudiante`.

En producción `apiUrl` es `/api` (mismo dominio, detrás del proxy) y el colegio se
toma del subdominio `<slug>.apreu.co` (`baseDomain` en `environment.ts`).

## Arquitectura

```
src/
├── environments/              # environment.ts (prod) / environment.development.ts
├── styles/                    # _tokens.scss (claro/oscuro), _base.scss, _utilities.scss
├── testing/                   # Proveedores y datos de prueba compartidos
└── app/
    ├── app.ts / app.config.ts / app.routes.ts
    ├── core/                  # Singletons (sin UI propia salvo PortalShell)
    │   ├── config/            # APP_CONFIG (environment inyectable)
    │   ├── tenant/            # TenantService (subdominio, /<slug>/, sessionStorage) + tenantRouteGuard
    │   ├── http/              # ApiClient, ApiError, HttpContext flags, interceptores, Page<T>
    │   ├── auth/              # AuthService (signals), SessionStore, roles, permisos, guards
    │   ├── navigation/        # Menú por portal (matriz de roles) + NavigationService
    │   ├── notifications/     # ToastService, ConfirmService
    │   ├── errors/            # GlobalErrorHandler
    │   ├── theme/             # ThemeService (claro/oscuro), BrandingService (colores/logo del colegio)
    │   ├── routing/           # Rutas raíz (APP_PATHS) y TitleStrategy
    │   └── layout/            # PortalShell: conecta auth/menú/tema con los templates
    ├── shared/ui/             # Librería Atomic Design (ver abajo)
    ├── portals/               # Rutas hijas de cada portal (lazy)
    └── features/              # Contextos de negocio (data-access + pages) — ver features/README.md
        ├── auth/              # Login, cambio de contraseña, política de contraseñas
        ├── dashboard/         # Inicio de cada portal (KPIs listos para conectar)
        ├── errors/            # 403, 404, "en construcción"
        └── dev/               # Catálogo /dev/ui (solo desarrollo, por fileReplacements)
```

### Multi-tenant y sesión

- `TenantService.resolve()` corre al arrancar: subdominio → primer segmento de la
  ruta → `sessionStorage` → `defaultTenant`. El slug viaja en `X-Tenant`.
- La sesión (`accessToken`, expiración, tenant, usuario) se guarda en
  `sessionStorage` (por pestaña, como el tenant). Al expirar el token se cierra la
  sesión y el login muestra el aviso "Tu sesión expiró".
- Interceptores: `tenantInterceptor` → `authInterceptor` → `errorInterceptor`
  (401 ⇒ logout; red/403/429/5xx ⇒ toast; todo error ⇒ `ApiError` en español).
- Permisos: `GET /api/auth/permissions` (acepta `string[]`, `{ modules }` o
  `{ permissions }`). Si falla o no existe, el menú usa la matriz local de roles
  de `core/navigation/menu.config.ts` (análisis 01 §5.3).

### Librería `shared/ui`

Todos los componentes son standalone, `OnPush`, con `input()`/`output()`/`model()`,
accesibles (roles ARIA, foco, teclado) y sin lógica de negocio. Se importan desde
`src/app/shared/ui` (barrel `index.ts`).

| Nivel | Componentes |
|---|---|
| Átomos | `button[ui-button]`, `ui-icon` (Heroicons), `ui-input`, `ui-select`, `ui-textarea`, `ui-checkbox` (todos CVA), `ui-badge` (tonos y estados), `ui-avatar`, `ui-spinner`, `ui-label`, `a[ui-link]`, `button[ui-chip]`, `ui-money-text`, `ui-progress-bar` |
| Moléculas | `ui-form-field` (errores en español), `ui-search-box`, `ui-stat-card`, `ui-pagination`, `ui-alert`, `ui-empty-state`, `ui-confirm-dialog`, `ui-date-range` |
| Organismos | `ui-data-table` (+ `uiCell`), `ui-filter-bar`, `ui-modal`, `ui-tabs`, `ui-sidebar`, `ui-topbar`, `ui-bar-chart`, `ui-line-chart`, `ui-donut-chart` (SVG puro), `ui-printable-sheet`, `ui-toast-stack` |
| Templates | `ui-auth-layout`, `ui-shell-layout`, `ui-admin-layout`, `ui-employee-portal-layout`, `ui-student-portal-layout` |
| Utilidades | pipes `cop` y `dateEs`, `validationMessage`, `matchFieldsValidator` |

Catálogo navegable en `http://localhost:4200/dev/ui` (solo en desarrollo).

### Identidad visual

Reproduce el legacy PHP: *Plus Jakarta Sans* (texto) y *Space Mono* (cifras),
primario `#4f46e5` con degradado a `#7981f5` (135°), texto `#47557c`, fondo
`#f8fafc`, tarjetas `rounded-2xl` con sombra suave, sidebar de 256 px y topbar de
64 px. Los tokens están en `src/styles/_tokens.scss`; el tema oscuro se activa por
preferencia del sistema o con el botón del topbar (`data-theme`). El color de marca
de cada colegio se aplica en tiempo de ejecución con `BrandingService.apply()`.

## Pruebas

Vitest con TestBed (`npm run test:ci`). Cubren servicios, interceptores, guards,
navegación, átomos, moléculas, organismos, templates, páginas de auth/dashboard y
el enrutamiento completo (`app.spec.ts`).

## Pendientes conocidos

- `GET /api/auth/permissions` y los endpoints de KPIs (`/api/dashboard/{admin,employee,student}`)
  aún no existen en la API; la UI ya los consume con fallback.
- Branding por colegio (`GET /api/settings/branding`), notificaciones (campana),
  recuperación de contraseña y widget de IA quedan para sus contextos.
