import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatDateEs, UiPrintableSheet } from '../../../shared/ui';
import { formatIsoDate, formatScore } from '../data-access/academic.labels';
import type { GradeLine, ReportCardDocument } from '../data-access/academic.models';
import { GradeValue } from './grade-value';
import { PerformanceBadge } from './performance-badge';

interface AreaGroup {
  area: string;
  lines: GradeLine[];
}

/**
 * Boletín imprimible (legacy `bulletin_view.php`): encabezado institucional,
 * banda del estudiante, notas por área con desempeño, promedio, inasistencias
 * y firmas. Los valores vienen calculados por la API. Las acciones extra
 * (descargar PDF, volver) se proyectan con `[sheetActions]`.
 */
@Component({
  selector: 'app-report-card-sheet',
  imports: [UiPrintableSheet, GradeValue, PerformanceBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let d = doc();
    <ui-printable-sheet
      [institutionName]="d.institution.name"
      [nit]="d.institution.nit ?? ''"
      [address]="d.institution.address ?? ''"
      [logoUrl]="d.institution.logo"
      documentTitle="Informe académico"
      [documentNumber]="d.period.name + ' · ' + d.period.academicYear"
      [issuedAt]="'Generado ' + generated()"
      printLabel="Imprimir boletín"
    >
      <div uiSheetActions class="actions"><ng-content select="[sheetActions]" /></div>

      <section class="student" aria-label="Datos del estudiante">
        <div>
          <span class="k">Estudiante</span><span class="v">{{ d.student.fullName }}</span>
        </div>
        <div>
          <span class="k">Código</span><span class="v font-mono">{{ d.student.code }}</span>
        </div>
        <div>
          <span class="k">Grado / Salón</span>
          <span class="v">{{
            d.classroom ? d.classroom.gradeName + ' · ' + d.classroom.name : '—'
          }}</span>
        </div>
        <div>
          <span class="k">Período</span>
          <span class="v">{{ d.period.name }} ({{ range() }})</span>
        </div>
        @if (d.student.documentNumber) {
          <div>
            <span class="k">Documento</span
            ><span class="v font-mono">{{ d.student.documentNumber }}</span>
          </div>
        }
        <div>
          <span class="k">Director de grupo</span
          ><span class="v">{{ d.groupDirectorName ?? '—' }}</span>
        </div>
      </section>

      <table class="grades">
        <caption class="sr-only">
          Calificaciones por asignatura
        </caption>
        <thead>
          <tr>
            <th scope="col">Asignatura</th>
            <th scope="col" class="num">Cogn. 60%</th>
            <th scope="col" class="num">Proc. 30%</th>
            <th scope="col" class="num">Acti. 10%</th>
            <th scope="col" class="num">Definitiva</th>
            <th scope="col">Desempeño</th>
          </tr>
        </thead>
        @for (group of areas(); track group.area) {
          <tbody>
            <tr class="area">
              <th colspan="6" scope="rowgroup">{{ group.area }}</th>
            </tr>
            @for (line of group.lines; track line.subjectId) {
              <tr>
                <td>
                  <span class="subject">{{ line.subjectName }}</span>
                  @if (line.teacherName) {
                    <span class="teacher">Prof. {{ line.teacherName }}</span>
                  }
                  @if (line.observations) {
                    <span class="obs">{{ line.observations }}</span>
                  }
                </td>
                <td class="num font-mono">{{ score(line.cognitive) }}</td>
                <td class="num font-mono">{{ score(line.procedural) }}</td>
                <td class="num font-mono">{{ score(line.attitudinal) }}</td>
                <td class="num">
                  <app-grade-value
                    [value]="line.finalScore"
                    [passing]="line.passing"
                    [strong]="true"
                  />
                </td>
                <td><app-performance-badge [performance]="line.performance" /></td>
              </tr>
            }
          </tbody>
        } @empty {
          <tbody>
            <tr>
              <td colspan="6" class="empty">El boletín no tiene asignaturas calificadas.</td>
            </tr>
          </tbody>
        }
        <tfoot>
          <tr>
            <th scope="row" colspan="4">Promedio general</th>
            <td class="num">
              <app-grade-value [value]="d.averageScore" [passing]="d.passing" [strong]="true" />
            </td>
            <td><app-performance-badge [performance]="d.averagePerformance" /></td>
          </tr>
        </tfoot>
      </table>

      <p class="summary">
        Inasistencias en el período: <strong class="font-mono">{{ d.absences }}</strong> · Estado:
        <strong>{{ d.passing ? 'Aprobado' : 'Con asignaturas por recuperar' }}</strong>
      </p>

      <div uiSheetFooter class="signatures">
        <div>
          <span class="line"></span>Director(a) de grupo<br />{{ d.groupDirectorName ?? '' }}
        </div>
        <div><span class="line"></span>Rector(a)</div>
      </div>
    </ui-printable-sheet>
  `,
  styles: `
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .student {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
      gap: var(--space-2) var(--space-4);
      padding: var(--space-3);
      border: 1px solid var(--color-border-soft);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-4);
    }
    .student > div {
      display: flex;
      flex-direction: column;
    }
    .k {
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-text-subtle);
    }
    .v {
      font-weight: 600;
      color: var(--color-text-strong);
    }
    .grades {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }
    .grades th,
    .grades td {
      padding: 0.4rem 0.5rem;
      border-bottom: 1px solid var(--color-border-soft);
      text-align: left;
      vertical-align: top;
    }
    .grades thead th {
      font-size: var(--text-xs);
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .num {
      text-align: right !important;
      white-space: nowrap;
    }
    .area th {
      background: var(--color-surface-2);
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .subject {
      display: block;
      font-weight: 600;
    }
    .teacher,
    .obs {
      display: block;
      font-size: var(--text-xs);
      color: var(--color-text-muted);
    }
    .obs {
      font-style: italic;
    }
    tfoot th,
    tfoot td {
      border-top: 2px solid var(--color-border);
      font-weight: 700;
    }
    .empty {
      text-align: center !important;
      color: var(--color-text-muted);
    }
    .summary {
      margin-top: var(--space-3);
      font-size: var(--text-sm);
    }
    .signatures {
      display: flex;
      justify-content: space-around;
      gap: var(--space-6);
      margin-top: var(--space-8);
      text-align: center;
      font-size: var(--text-sm);
    }
    .line {
      display: block;
      width: 14rem;
      max-width: 100%;
      border-top: 1px solid var(--color-text);
      margin-bottom: 0.25rem;
    }
    @media print {
      .grades {
        font-size: 11px;
      }
      .area th {
        background: #eee !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `,
})
export class ReportCardSheet {
  readonly doc = input.required<ReportCardDocument>();

  protected readonly areas = computed<AreaGroup[]>(() => {
    const groups = new Map<string, GradeLine[]>();
    for (const line of this.doc().lines) {
      const list = groups.get(line.area) ?? [];
      list.push(line);
      groups.set(line.area, list);
    }
    return Array.from(groups, ([area, lines]) => ({ area, lines }));
  });
  protected readonly range = computed(
    () =>
      `${formatIsoDate(this.doc().period.startDate)} – ${formatIsoDate(this.doc().period.endDate)}`,
  );
  protected readonly generated = computed(() => formatDateEs(this.doc().generatedAt));
  protected readonly score = formatScore;
}
