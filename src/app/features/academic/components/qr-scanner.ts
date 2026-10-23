import { DOCUMENT } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { UiAlert, UiButton } from '../../../shared/ui';

/** API mínima de `BarcodeDetector` (Shape Detection API, no incluida en lib.dom). */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

/** `true` si el navegador expone `BarcodeDetector` y `getUserMedia`. */
export function qrScanSupported(win: (Window & typeof globalThis) | null): boolean {
  return (
    !!win &&
    'BarcodeDetector' in win &&
    !!win.navigator?.mediaDevices &&
    typeof win.navigator.mediaDevices.getUserMedia === 'function'
  );
}

const SCAN_INTERVAL_MS = 350;
/** Ignora relecturas del mismo código durante este tiempo. */
const REPEAT_WINDOW_MS = 4000;

/**
 * Lector de QR con la cámara usando `BarcodeDetector` del navegador (sin
 * librerías). Si no está disponible, informa y la página ofrece la entrada
 * manual del código. Emite el texto leído (`detected`).
 */
@Component({
  selector: 'app-qr-scanner',
  imports: [UiAlert, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!supported) {
      <ui-alert tone="warning" title="Cámara no disponible para leer QR">
        Este navegador no soporta la lectura de códigos QR. Usa la entrada manual del código
        (también funciona con lectores USB que escriben el texto).
      </ui-alert>
    } @else {
      <div class="viewer" [class.on]="running()">
        <video #video playsinline muted aria-label="Vista de la cámara"></video>
        @if (running()) {
          <span class="scanline" aria-hidden="true"></span>
        } @else {
          <p class="idle">La cámara está apagada.</p>
        }
      </div>
      @if (error(); as e) {
        <ui-alert tone="error" class="mt">{{ e }}</ui-alert>
      }
      <div class="controls">
        @if (running()) {
          <button ui-button type="button" variant="secondary" icon="x-mark" (click)="stop()">
            Detener lector
          </button>
        } @else {
          <button
            ui-button
            type="button"
            variant="primary"
            icon="qr-code"
            [disabled]="disabled()"
            [loading]="starting()"
            (click)="start()"
          >
            Escanear QR
          </button>
        }
      </div>
    }
  `,
  styles: `
    .viewer {
      position: relative;
      aspect-ratio: 4 / 3;
      background: #0f172a;
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: grid;
      place-items: center;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: none;
    }
    .viewer.on video {
      display: block;
    }
    .idle {
      position: absolute;
      color: #cbd5e1;
      font-size: var(--text-sm);
    }
    .scanline {
      position: absolute;
      left: 8%;
      right: 8%;
      height: 2px;
      background: #22c55e;
      box-shadow: 0 0 8px #22c55e;
      animation: scan 2s ease-in-out infinite alternate;
    }
    @keyframes scan {
      from {
        top: 12%;
      }
      to {
        top: 88%;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .scanline {
        animation: none;
        top: 50%;
      }
    }
    .controls {
      margin-top: var(--space-3);
      display: flex;
      gap: var(--space-2);
    }
    .mt {
      margin-top: var(--space-3);
    }
  `,
})
export class QrScanner {
  private readonly document = inject(DOCUMENT);
  private readonly win = this.document.defaultView;

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly detected = output<string>();

  protected readonly supported = qrScanSupported(this.win);
  protected readonly running = signal(false);
  protected readonly starting = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private stream: MediaStream | null = null;
  private detector: BarcodeDetectorLike | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private last: { value: string; at: number } | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  async start(): Promise<void> {
    if (!this.supported || this.running() || !this.win) return;
    this.error.set(null);
    this.starting.set(true);
    try {
      const Ctor = (this.win as unknown as { BarcodeDetector: BarcodeDetectorCtor })
        .BarcodeDetector;
      this.detector = new Ctor({ formats: ['qr_code'] });
      this.stream = await this.win.navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      const video = this.video()?.nativeElement;
      if (!video) throw new Error('Sin visor');
      video.srcObject = this.stream;
      await video.play();
      this.running.set(true);
      this.loop();
    } catch (err) {
      this.stop();
      const name = (err as { name?: string })?.name;
      this.error.set(
        name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Habilítalo en el navegador o usa la entrada manual.'
          : 'No se pudo iniciar la cámara. Usa la entrada manual del código.',
      );
    } finally {
      this.starting.set(false);
    }
  }

  stop(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    const video = this.video()?.nativeElement;
    if (video) video.srcObject = null;
    this.running.set(false);
  }

  private loop(): void {
    this.timer = setTimeout(async () => {
      const video = this.video()?.nativeElement;
      if (!this.running() || !video || !this.detector) return;
      try {
        if (video.readyState >= 2) {
          const codes = await this.detector.detect(video);
          const value = codes[0]?.rawValue?.trim();
          if (value) this.emit(value);
        }
      } catch {
        /* fotograma ilegible: se reintenta */
      }
      if (this.running()) this.loop();
    }, SCAN_INTERVAL_MS);
  }

  private emit(value: string): void {
    const now = Date.now();
    if (this.last && this.last.value === value && now - this.last.at < REPEAT_WINDOW_MS) return;
    this.last = { value, at: now };
    this.detected.emit(value);
  }
}
