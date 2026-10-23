import type { Portal, Role } from '../auth/roles';
import { APP_PATHS } from '../routing/app-paths';
import type { NavSection } from './nav.model';

const A = `/${APP_PATHS.admin}`;
const E = `/${APP_PATHS.employeePortal}`;
const S = `/${APP_PATHS.studentPortal}`;

const ADMIN_ALL: Role[] = ['admin', 'finance', 'hr'];
const ADMIN: Role[] = ['admin'];
const FIN: Role[] = ['admin', 'finance'];
const HR: Role[] = ['admin', 'hr'];
const COMMS: Role[] = ['admin', 'finance', 'hr'];
const STAFF: Role[] = ['teacher', 'employee'];
const FAMILY: Role[] = ['student', 'parent'];

/**
 * Menú por portal con la matriz de roles propuesta (análisis 01 §5.3 y rutas de
 * cada contexto). `superadmin` ve todo. Si la API devuelve permisos, estos
 * mandan y los `roles` solo se usan como fallback.
 *
 * Para agregar un módulo: añada aquí el ítem y la ruta perezosa en el
 * `*.routes.ts` del portal (ver `features/README.md`).
 */
export const MENU: Record<Portal, NavSection[]> = {
  admin: [
    {
      items: [
        {
          key: 'dashboard',
          label: 'Dashboard',
          icon: 'home',
          route: A,
          exact: true,
          roles: ADMIN_ALL,
        },
      ],
    },
    {
      title: 'Académico',
      items: [
        { key: 'students', label: 'Alumnos', icon: 'users', route: `${A}/alumnos`, roles: ADMIN },
        {
          key: 'academic',
          label: 'G. Académica',
          icon: 'academic-cap',
          route: `${A}/academico`,
          roles: ADMIN,
        },
        {
          key: 'periods',
          label: 'Períodos Acad.',
          icon: 'calendar',
          route: `${A}/periodos`,
          roles: ADMIN,
        },
        {
          key: 'incidents',
          label: 'Incidencias',
          icon: 'exclamation-triangle',
          route: `${A}/incidencias`,
          roles: HR,
        },
      ],
    },
    {
      title: 'Finanzas',
      items: [
        {
          key: 'finance',
          label: 'Finanzas & Caja',
          icon: 'banknotes',
          route: `${A}/finanzas`,
          roles: FIN,
        },
        {
          key: 'e-invoicing',
          label: 'Facturación DIAN',
          icon: 'document-check',
          route: `${A}/facturacion`,
          roles: FIN,
        },
        {
          key: 'accounting',
          label: 'Contabilidad',
          icon: 'calculator',
          route: `${A}/contabilidad`,
          roles: FIN,
        },
        {
          key: 'inventory',
          label: 'Inventario',
          icon: 'cube',
          route: `${A}/inventario`,
          roles: ADMIN,
        },
      ],
    },
    {
      title: 'Talento Humano',
      items: [
        { key: 'hr', label: 'Capital Humano', icon: 'briefcase', route: `${A}/rrhh`, roles: HR },
        {
          key: 'payroll',
          label: 'Nómina Electrónica',
          icon: 'wallet',
          route: `${A}/nomina`,
          roles: ['admin', 'hr', 'finance'],
        },
        { key: 'stickers', label: 'Stickers', icon: 'tag', route: `${A}/stickers`, roles: HR },
      ],
    },
    {
      title: 'Comunicaciones',
      items: [
        {
          key: 'whatsapp',
          label: 'WhatsApp',
          icon: 'chat-bubble',
          route: `${A}/whatsapp`,
          roles: COMMS,
        },
        { key: 'email', label: 'Correos', icon: 'envelope', route: `${A}/correos`, roles: COMMS },
        {
          key: 'marketing',
          label: 'Marketing IA',
          icon: 'megaphone',
          route: `${A}/marketing`,
          roles: ADMIN,
        },
      ],
    },
    {
      title: 'Administración',
      items: [
        { key: 'users', label: 'Usuarios', icon: 'key', route: `${A}/usuarios`, roles: ADMIN },
        {
          key: 'settings',
          label: 'Configuración',
          icon: 'cog',
          route: `${A}/configuracion`,
          roles: ADMIN,
        },
        {
          key: 'audit',
          label: 'Auditoría',
          icon: 'shield-check',
          route: `${A}/auditoria`,
          roles: ADMIN,
        },
        {
          key: 'ai-logs',
          label: 'Monitor IA',
          icon: 'cpu-chip',
          route: `${A}/monitor-ia`,
          roles: [],
        },
      ],
    },
  ],
  employee: [
    {
      items: [
        { key: 'dashboard', label: 'Mi Portal', icon: 'home', route: E, exact: true, roles: STAFF },
      ],
    },
    {
      title: 'Docencia',
      items: [
        {
          key: 'grades',
          label: 'Calificar Grupos',
          icon: 'clipboard',
          route: `${E}/calificaciones`,
          roles: ['teacher'],
        },
        {
          key: 'my-groups',
          label: 'Mis Grupos',
          icon: 'academic-cap',
          route: `${E}/mis-grupos`,
          roles: ['teacher'],
        },
        {
          key: 'qr-attendance',
          label: 'Lector QR',
          icon: 'qr-code',
          route: `${E}/asistencia-qr`,
          roles: ['teacher'],
        },
      ],
    },
    {
      title: 'Mi información',
      items: [
        {
          key: 'my-profile',
          label: 'Mis datos',
          icon: 'user',
          route: `${E}/mis-datos`,
          roles: STAFF,
        },
        {
          key: 'payslips',
          label: 'Desprendibles de Pago',
          icon: 'banknotes',
          route: `${E}/desprendibles`,
          roles: STAFF,
        },
        {
          key: 'certificates',
          label: 'Certificado Laboral',
          icon: 'document-text',
          route: `${E}/certificados`,
          roles: STAFF,
        },
        {
          key: 'leaves',
          label: 'Permisos y Novedades',
          icon: 'calendar',
          route: `${E}/permisos`,
          roles: STAFF,
        },
        { key: 'stickers', label: 'Stickers', icon: 'tag', route: `${E}/stickers`, roles: STAFF },
        {
          key: 'ai-history',
          label: 'Mi Historial IA',
          icon: 'cpu-chip',
          route: `${E}/historial-ia`,
          roles: STAFF,
        },
      ],
    },
  ],
  student: [
    {
      items: [
        {
          key: 'dashboard',
          label: 'Mi Portal',
          icon: 'home',
          route: S,
          exact: true,
          roles: FAMILY,
        },
      ],
    },
    {
      title: 'Académico',
      items: [
        {
          key: 'my-grades',
          label: 'Mis Notas',
          icon: 'chart-bar',
          route: `${S}/notas`,
          roles: FAMILY,
        },
        {
          key: 'report-cards',
          label: 'Boletines',
          icon: 'clipboard',
          route: `${S}/boletines`,
          roles: FAMILY,
        },
        {
          key: 'attendance',
          label: 'Asistencia',
          icon: 'qr-code',
          route: `${S}/asistencia`,
          roles: FAMILY,
        },
        {
          key: 'incidents',
          label: 'Mis Incidencias',
          icon: 'exclamation-triangle',
          route: `${S}/incidencias`,
          roles: FAMILY,
        },
      ],
    },
    {
      title: 'Pagos',
      items: [
        {
          key: 'my-charges',
          label: 'Mis Pagos',
          icon: 'banknotes',
          route: `${S}/pagos`,
          roles: FAMILY,
        },
        {
          key: 'my-invoices',
          label: 'Mis Facturas',
          icon: 'document-text',
          route: `${S}/facturas`,
          roles: FAMILY,
        },
      ],
    },
    {
      title: 'Documentos',
      items: [
        {
          key: 'id-card',
          label: 'Carnet Digital',
          icon: 'identification',
          route: `${S}/carnet`,
          roles: FAMILY,
        },
        {
          key: 'certificate',
          label: 'Certificado',
          icon: 'document-check',
          route: `${S}/certificado`,
          roles: FAMILY,
        },
        { key: 'profile', label: 'Mi Perfil', icon: 'user', route: `${S}/perfil`, roles: FAMILY },
        {
          key: 'ai-history',
          label: 'Apreu IA',
          icon: 'cpu-chip',
          route: `${S}/historial-ia`,
          roles: ['student'],
        },
      ],
    },
  ],
};
