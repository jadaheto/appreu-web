import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { AvatarSize, UiAvatar } from '../../../shared/ui';
import { StudentsService } from '../data-access/students.service';
import { resourceValue } from '../../../core/resource/resource-value';

/**
 * Foto del estudiante. `GET /students/:id/photo` exige el token, así que no
 * sirve un `<img src>` directo: se descarga como Blob y se muestra con un
 * object URL (se libera al cambiar o destruir). Sin foto, muestra iniciales.
 */
@Component({
  selector: 'app-student-photo',
  imports: [UiAvatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (square()) {
      <div class="square">
        @if (url(); as src) {
          <img [src]="src" [attr.alt]="'Foto de ' + name()" />
        } @else {
          <span aria-hidden="true">{{ initials() }}</span>
          <span class="sr-only">{{ name() }}</span>
        }
      </div>
    } @else {
      <ui-avatar [name]="name()" [src]="url()" [size]="size()" />
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .square {
      width: 6rem;
      height: 7rem;
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--gradient-primary);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 700;
    }
    .square img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
})
export class StudentPhoto {
  private readonly students = inject(StudentsService);

  readonly studentId = input.required<number>();
  readonly name = input('');
  readonly initials = input('');
  readonly available = input(false, { transform: booleanAttribute });
  readonly size = input<AvatarSize>('md');
  /** Formato rectangular de carnet (96×112). */
  readonly square = input(false, { transform: booleanAttribute });
  /** Cambiarlo fuerza a recargar la foto (tras subir una nueva). */
  readonly version = input(0);

  private readonly blob = rxResource({
    params: () => ({ id: this.studentId(), available: this.available(), v: this.version() }),
    stream: ({ params }) => (params.available ? this.students.photo(params.id) : of(null)),
  });

  protected readonly url = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const blob = resourceValue(this.blob, null);
      if (!blob || typeof URL.createObjectURL !== 'function') {
        this.url.set(null);
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      this.url.set(objectUrl);
      onCleanup(() => URL.revokeObjectURL(objectUrl));
    });
  }
}
