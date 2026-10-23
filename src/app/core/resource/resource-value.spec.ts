import { Injector, resource } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { resourceValue } from './resource-value';

describe('resourceValue', () => {
  const settle = async () => {
    TestBed.tick();
    await new Promise((r) => setTimeout(r));
    TestBed.tick();
  };

  it('devuelve el valor cuando el recurso resolvió', async () => {
    const r = resource({ loader: async () => [1, 2], injector: TestBed.inject(Injector) });
    expect(resourceValue(r)).toBeUndefined();
    expect(resourceValue(r, [])).toEqual([]);
    await settle();
    expect(resourceValue(r)).toEqual([1, 2]);
  });

  it('no lanza cuando el recurso está en error (value() sí lanza)', async () => {
    const r = resource({
      loader: async (): Promise<number[]> => {
        throw new Error('500');
      },
      injector: TestBed.inject(Injector),
    });
    await settle();
    expect(r.status()).toBe('error');
    expect(() => r.value()).toThrow();
    expect(resourceValue(r)).toBeUndefined();
    expect(resourceValue(r, [])).toEqual([]);
  });
});
