import { isRole, portalForRole, PORTAL_HOME, roleLabel } from './roles';

describe('roles', () => {
  it('asigna el portal como el backend', () => {
    expect(portalForRole('superadmin')).toBe('admin');
    expect(portalForRole('hr')).toBe('admin');
    expect(portalForRole('teacher')).toBe('employee');
    expect(portalForRole('parent')).toBe('student');
  });

  it('traduce etiquetas y valida roles', () => {
    expect(roleLabel('finance')).toBe('Finanzas');
    expect(roleLabel('desconocido')).toBe('desconocido');
    expect(roleLabel(null)).toBe('');
    expect(isRole('admin')).toBe(true);
    expect(isRole('root')).toBe(false);
    expect(PORTAL_HOME.employee).toBe('/portal-empleado');
  });
});
