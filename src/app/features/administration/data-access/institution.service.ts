import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient, withContext } from '../../../core';
import {
  InstitutionProfile,
  SETTINGS_SECTIONS,
  SettingsSectionMetadata,
  SettingsSectionValues,
  SettingValue,
  UpdateInstitutionRequest,
} from './administration.models';

/** Datos de la institución, logo y pestañas de configuración (`/api/institution/**`). */
@Injectable({ providedIn: 'root' })
export class InstitutionService {
  private readonly api = inject(ApiClient);

  /** `null` si el colegio aún no registró sus datos (404). */
  profile(): Observable<InstitutionProfile> {
    return this.api.get<InstitutionProfile>('institution', {
      context: withContext({ skipErrorToast: true }),
    });
  }

  update(dto: UpdateInstitutionRequest): Observable<InstitutionProfile> {
    return this.api.put<InstitutionProfile>('institution', dto);
  }

  uploadLogo(file: File): Observable<InstitutionProfile> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.api.post<InstitutionProfile>('institution/logo', form);
  }

  /**
   * El logo se sirve en `GET /api/institution/logo` pero exige `X-Tenant`, que un
   * `<img src>` no envía: se descarga con el cliente HTTP y se muestra como blob.
   */
  logo(): Observable<Blob> {
    return this.api.download('institution/logo', {
      context: withContext({ skipErrorToast: true }),
    });
  }

  /** Secciones y campos que el rol puede configurar (sin DIAN, que es de e-invoicing). */
  catalog(): Observable<SettingsSectionMetadata[]> {
    return this.api
      .get<SettingsSectionMetadata[]>('institution/settings')
      .pipe(
        map((sections) =>
          sections.filter((s) => (SETTINGS_SECTIONS as readonly string[]).includes(s.key)),
        ),
      );
  }

  section(key: string): Observable<SettingsSectionValues> {
    return this.api.get<SettingsSectionValues>(`institution/settings/${key}`);
  }

  updateSection(
    key: string,
    values: Record<string, SettingValue>,
  ): Observable<SettingsSectionValues> {
    return this.api.put<SettingsSectionValues>(`institution/settings/${key}`, { values });
  }
}
