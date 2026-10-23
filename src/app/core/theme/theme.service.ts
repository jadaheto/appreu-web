import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { LocalStorageService } from '../storage/browser-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'apreu.theme';

/** Tema claro/oscuro: escribe `data-theme` en `<html>` (los tokens viven en `styles/_tokens.scss`). */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(LocalStorageService);
  private readonly prefersDark = signal(this.matchDark());

  readonly mode = signal<ThemeMode>(this.storage.get<ThemeMode>(STORAGE_KEY) ?? 'system');
  readonly isDark = computed(() =>
    this.mode() === 'system' ? this.prefersDark() : this.mode() === 'dark',
  );

  constructor() {
    effect(() => {
      const mode = this.mode();
      const root = this.document.documentElement;
      if (mode === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', mode);
      this.storage.set(STORAGE_KEY, mode);
    });
  }

  toggle(): void {
    this.mode.set(this.isDark() ? 'light' : 'dark');
  }

  private matchDark(): boolean {
    try {
      return (
        this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
      );
    } catch {
      return false;
    }
  }
}
