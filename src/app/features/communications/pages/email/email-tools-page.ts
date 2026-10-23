import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../../core';
import { SelectOption, UiAlert, UiButton, UiFormField, UiSelect } from '../../../../shared/ui';
import { extensionOf, formatBytes } from '../../../../shared/ui';
import {
  EMAIL_IMAGE_EXTENSIONS,
  EmailImageKind,
  MAX_EMAIL_IMAGE_BYTES,
  SmtpProfile,
  SmtpTestResult,
} from '../../data-access/communications.models';
import { EmailService } from '../../data-access/email.service';
import { reportError } from '../../data-access/report-error';

interface ImageSlot {
  kind: EmailImageKind;
  title: string;
  description: string;
}

/** Valida una imagen del correo (PNG, JPG, GIF o WebP de máx. 2 MB). */
export function validateEmailImage(file: File): string | null {
  if (!EMAIL_IMAGE_EXTENSIONS.includes(extensionOf(file.name)))
    return 'Formato no permitido. Usa PNG, JPG, GIF o WebP.';
  if (file.size > MAX_EMAIL_IMAGE_BYTES)
    return `La imagen es muy grande (máx. ${formatBytes(MAX_EMAIL_IMAGE_BYTES)}).`;
  if (file.size === 0) return 'El archivo está vacío.';
  return null;
}

/** `/admin/correos/herramientas` (solo administradores): prueba SMTP e imágenes del correo de facturas. */
@Component({
  selector: 'app-email-tools-page',
  imports: [FormsModule, RouterLink, UiAlert, UiButton, UiFormField, UiSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './email-tools-page.html',
  styleUrl: '../comms.scss',
  styles: `
    .slot {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .thumb {
      height: 7rem;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-subtle);
      overflow: hidden;
      background: var(--color-surface-2);
    }
    .thumb img {
      max-height: 100%;
      max-width: 100%;
      object-fit: contain;
    }
  `,
})
export class EmailToolsPage {
  private readonly email = inject(EmailService);
  private readonly toast = inject(ToastService);

  protected profile: SmtpProfile = 'general';
  protected readonly profiles: SelectOption<SmtpProfile>[] = [
    { value: 'general', label: 'Correo general (avisos)' },
    { value: 'invoicing', label: 'Correo de facturación' },
  ];
  protected readonly testing = signal(false);
  protected readonly testResult = signal<SmtpTestResult | null>(null);
  protected readonly testError = signal<string | null>(null);

  protected readonly slots: ImageSlot[] = [
    {
      kind: 'logo',
      title: 'Logo del correo',
      description: 'Encabezado de los correos de facturas.',
    },
    {
      kind: 'promo',
      title: 'Banner promocional',
      description: 'Imagen al pie del correo de facturas.',
    },
  ];
  protected readonly previews = signal<Partial<Record<EmailImageKind, string>>>({});
  protected readonly uploading = signal<EmailImageKind | null>(null);
  protected readonly imageErrors = signal<Partial<Record<EmailImageKind, string>>>({});
  protected readonly accept = EMAIL_IMAGE_EXTENSIONS.map((e) => `.${e}`).join(',');

  constructor() {
    inject(DestroyRef).onDestroy(() =>
      Object.values(this.previews()).forEach((url) => url && URL.revokeObjectURL(url)),
    );
  }

  protected runSmtpTest(): void {
    this.testing.set(true);
    this.testResult.set(null);
    this.testError.set(null);
    this.email.testSmtp(this.profile).subscribe({
      next: (res) => {
        this.testing.set(false);
        this.testResult.set(res);
        this.toast.success(`Correo de prueba enviado a ${res.to}.`);
      },
      error: (err) => {
        this.testing.set(false);
        this.testError.set(reportError(this.toast, err));
      },
    });
  }

  protected upload(kind: EmailImageKind, input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const error = validateEmailImage(file);
    this.imageErrors.update((e) => ({ ...e, [kind]: error ?? undefined }));
    if (error) return;
    this.uploading.set(kind);
    this.email.uploadImage(kind, file).subscribe({
      next: () => {
        this.uploading.set(null);
        const old = this.previews()[kind];
        if (old) URL.revokeObjectURL(old);
        this.previews.update((p) => ({ ...p, [kind]: URL.createObjectURL(file) }));
        this.toast.success('Imagen actualizada.');
      },
      error: (err) => {
        this.uploading.set(null);
        this.imageErrors.update((e) => ({ ...e, [kind]: reportError(this.toast, err) }));
      },
    });
  }
}
