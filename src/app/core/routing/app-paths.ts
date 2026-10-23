/**
 * Segmentos de primer nivel de la aplicación. Se usan en las rutas y para
 * distinguir un slug de tenant (`/<slug>/login`) de una ruta propia.
 */
export const APP_PATHS = {
  login: 'login',
  changePassword: 'cambiar-contrasena',
  admin: 'admin',
  employeePortal: 'portal-empleado',
  studentPortal: 'portal-estudiante',
  forbidden: 'acceso-denegado',
  notFound: 'no-encontrado',
  verifyCertificate: 'verificar',
  dev: 'dev',
} as const;

/** Segmentos que nunca pueden interpretarse como slug de tenant. */
export const RESERVED_SEGMENTS: ReadonlySet<string> = new Set<string>([
  ...Object.values(APP_PATHS),
  'api',
  'assets',
  'media',
  'favicon.ico',
]);
