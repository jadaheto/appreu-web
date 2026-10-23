import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { TabItem, UiAlert, UiBadge, UiButton, UiSpinner, UiTabs } from '../../../../shared/ui';
import { StudentPhoto } from '../../components/student-photo';
import {
  labelOf,
  STUDENT_DOCUMENT_LABELS,
  STUDENT_STATUS_LABELS,
  STUDENT_STATUS_TONES,
  toneOf,
} from '../../data-access/students.models';
import { StudentsService } from '../../data-access/students.service';
import { AccountsTab } from './student-detail/accounts-tab';
import { CertificatesTab } from './student-detail/certificates-tab';
import { DataTab } from './student-detail/data-tab';
import { FinanceTab } from './student-detail/finance-tab';
import { GuardianTab } from './student-detail/guardian-tab';
import { IdCardTab } from './student-detail/id-card-tab';
import { IncidentsTab } from './student-detail/incidents-tab';
import { PhotoTab } from './student-detail/photo-tab';
import { StatusTab } from './student-detail/status-tab';
import { resourceValue } from '../../../../core/resource/resource-value';

const TAB_IDS = [
  'datos',
  'acudiente',
  'foto',
  'cuentas',
  'finanzas',
  'incidencias',
  'certificados',
  'carnet',
  'estado',
] as const;
type TabId = (typeof TAB_IDS)[number];

/** Ficha 360 del estudiante (análisis 03 §4.3/§4.4). */
@Component({
  selector: 'app-student-detail-page',
  imports: [
    AccountsTab,
    CertificatesTab,
    DataTab,
    FinanceTab,
    GuardianTab,
    IdCardTab,
    IncidentsTab,
    PhotoTab,
    RouterLink,
    StatusTab,
    StudentPhoto,
    UiAlert,
    UiBadge,
    UiButton,
    UiSpinner,
    UiTabs,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './student-detail-page.html',
  styleUrl: './student-detail-page.scss',
})
export class StudentDetailPage {
  private readonly students = inject(StudentsService);
  private readonly router = inject(Router);

  /** Parámetro de ruta `:id`. */
  readonly id = input<string>();
  /** Query param `?tab=` (pestaña inicial). */
  readonly tab = input<string>();

  protected readonly studentId = computed(() => Number(this.id()));
  protected readonly activeTab = signal<TabId>('datos');
  protected readonly photoVersion = signal(0);

  protected readonly profile = rxResource({
    params: () => this.studentId(),
    stream: ({ params }) =>
      Number.isInteger(params) && params > 0 ? this.students.profile(params) : of(null),
  });
  protected readonly data = computed(() => resourceValue(this.profile, null));
  protected readonly student = computed(() => this.data()?.student ?? null);

  protected readonly tabs = computed<TabItem[]>(() => {
    const d = this.data();
    const pendingCerts = d?.certificates.filter((c) => c.status === 'pending').length ?? 0;
    return [
      { id: 'datos', label: 'Datos', icon: 'user' },
      { id: 'acudiente', label: 'Acudiente', icon: 'users' },
      { id: 'foto', label: 'Foto', icon: 'identification' },
      { id: 'cuentas', label: 'Cuentas del portal', icon: 'key' },
      {
        id: 'finanzas',
        label: 'Finanzas',
        icon: 'banknotes',
        badge: d?.finance.overdueCount || null,
      },
      { id: 'incidencias', label: 'Incidencias', icon: 'exclamation-triangle' },
      {
        id: 'certificados',
        label: 'Certificados',
        icon: 'document-check',
        badge: pendingCerts || null,
      },
      { id: 'carnet', label: 'Carnet', icon: 'qr-code' },
      { id: 'estado', label: 'Estado', icon: 'cog' },
    ];
  });

  constructor() {
    effect(() => {
      const tab = this.tab();
      if (tab && (TAB_IDS as readonly string[]).includes(tab)) this.activeTab.set(tab as TabId);
    });
  }

  protected selectTab(id: string | null): void {
    if (!id || !(TAB_IDS as readonly string[]).includes(id)) return;
    this.activeTab.set(id as TabId);
    void this.router.navigate([], {
      queryParams: { tab: id === 'datos' ? null : id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected reload(): void {
    this.profile.reload();
  }

  protected onPhotoUploaded(): void {
    this.photoVersion.update((v) => v + 1);
    this.profile.reload();
  }

  protected statusLabel(status: string): string {
    return labelOf(STUDENT_STATUS_LABELS, status);
  }
  protected statusTone(status: string) {
    return toneOf(STUDENT_STATUS_TONES, status);
  }
  protected documentLabel(type: string): string {
    return labelOf(STUDENT_DOCUMENT_LABELS, type);
  }
}
