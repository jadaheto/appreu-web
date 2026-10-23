import { parsePermissions } from './permissions';

describe('parsePermissions', () => {
  it('acepta un arreglo de módulos', () => {
    expect([...parsePermissions(['students', 'finance'])!]).toEqual(['students', 'finance']);
  });

  it('acepta { modules: [{ key }] } y omite los no permitidos', () => {
    const set = parsePermissions({
      modules: [{ key: 'users' }, { module: 'settings', allowed: false }, { code: 'hr' }],
    });
    expect(set!.has('users')).toBe(true);
    expect(set!.has('settings')).toBe(false);
    expect(set!.has('hr')).toBe(true);
  });

  it('reduce permisos con punto a su módulo', () => {
    const set = parsePermissions({ permissions: ['users.read', 'settings.branding.read'] });
    expect(set!.has('users')).toBe(true);
    expect(set!.has('users.read')).toBe(true);
    expect(set!.has('settings')).toBe(true);
  });

  it('devuelve null si el formato no se reconoce', () => {
    expect(parsePermissions(null)).toBeNull();
    expect(parsePermissions({ foo: 1 })).toBeNull();
    expect(parsePermissions('x')).toBeNull();
  });
});
