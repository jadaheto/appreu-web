import { TestBed } from '@angular/core/testing';
import { makeUser } from '../../../testing/test-providers';
import { SessionStore } from './session.store';

describe('SessionStore', () => {
  let store: SessionStore;
  beforeEach(() => {
    sessionStorage.clear();
    store = TestBed.inject(SessionStore);
  });

  const session = (overrides = {}) => ({
    token: 't',
    expiresAt: Date.now() + 1000,
    tenant: 'a',
    user: makeUser(),
    ...overrides,
  });

  it('guarda y expone token y usuario', () => {
    store.set(session());
    expect(store.token()).toBe('t');
    expect(store.user()?.name).toBe('Ana Pérez');
    expect(sessionStorage.getItem('apreu.session')).toContain('"token":"t"');
  });

  it('restaura una sesión vigente del mismo tenant', () => {
    store.set(session());
    store.clear();
    sessionStorage.setItem('apreu.session', JSON.stringify(session()));
    expect(store.restore('a')).not.toBeNull();
    expect(store.token()).toBe('t');
  });

  it('descarta sesiones expiradas, corruptas o de otro tenant', () => {
    sessionStorage.setItem('apreu.session', JSON.stringify(session({ expiresAt: Date.now() - 1 })));
    expect(store.restore('a')).toBeNull();
    sessionStorage.setItem('apreu.session', JSON.stringify(session()));
    expect(store.restore('b')).toBeNull();
    expect(sessionStorage.getItem('apreu.session')).toBeNull();
    sessionStorage.setItem('apreu.session', '{no-json');
    expect(store.restore('a')).toBeNull();
  });

  it('actualiza el usuario conservando el token', () => {
    store.set(session());
    store.updateUser(makeUser({ name: 'Otro' }));
    expect(store.user()?.name).toBe('Otro');
    expect(store.token()).toBe('t');
  });
});
