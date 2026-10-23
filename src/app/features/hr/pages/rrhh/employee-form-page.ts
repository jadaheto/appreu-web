import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  signal,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { ToastService } from '../../../../core';
import {
  TabItem,
  UiAlert,
  UiButton,
  UiCheckbox,
  UiFormField,
  UiInput,
  UiModal,
  UiSelect,
  UiSpinner,
  UiTabs,
  UiTextarea,
} from '../../../../shared/ui';
import { EmployeesService } from '../../data-access/employees.service';
import {
  ARL_RISK_CLASSES,
  BANK_ACCOUNT_TYPE_LABELS,
  BANK_ACCOUNT_TYPES,
  BankAccountType,
  CONTRACT_TYPE_LABELS,
  CONTRACT_TYPES,
  ContractType,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  DocumentType,
  Employee,
  EmployeeAccountResult,
  EmployeeData,
  EMPLOYEE_TYPE_LABELS,
  EMPLOYEE_TYPES,
  EmployeeType,
  Gender,
  GENDER_LABELS,
  GENDERS,
  optionsOf,
} from '../../data-access/hr.models';
import { apiMessage, blankToNull, isoDate } from '../../data-access/hr-ui';
import { HR_BASE } from './hr-links';
import { resourceValue } from '../../../../core/resource/resource-value';

type StepId = 'personal' | 'contract' | 'social' | 'deductions';

/** Campos de cada paso, para saltar al primero con errores. */
const STEP_FIELDS: Record<StepId, readonly string[]> = {
  personal: [
    'firstName',
    'lastName',
    'documentType',
    'documentNumber',
    'birthDate',
    'gender',
    'email',
    'phone',
    'address',
  ],
  contract: ['employeeType', 'position', 'department', 'hireDate', 'contractType', 'baseSalary'],
  social: ['bankName', 'bankAccount', 'accountType', 'eps', 'pensionFund', 'arl', 'arlRiskClass'],
  deductions: [
    'fixedLibranza',
    'fixedSindicato',
    'fixedEmbargo',
    'withholdingPrepaidHealth',
    'withholdingHousingInterest',
    'voluntaryPension',
  ],
};

const money = () => [Validators.min(0)];

/**
 * Alta y edición de empleados (`hr/employees.php`): datos personales, cargo y
 * contrato, banco y seguridad social, deducciones fijas y retención. Las reglas
 * (documento único, salario integral ≥ 13 SMMLV, etc.) las valida la API.
 */
@Component({
  selector: 'app-employee-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    UiAlert,
    UiButton,
    UiCheckbox,
    UiFormField,
    UiInput,
    UiModal,
    UiSelect,
    UiSpinner,
    UiTabs,
    UiTextarea,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './employee-form-page.html',
  styles: `
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-3);
      margin-top: var(--space-6);
    }
    .full {
      grid-column: 1 / -1;
    }
    .section-title {
      font-weight: 700;
      margin: var(--space-5) 0 var(--space-3);
    }
    .mb {
      display: block;
      margin-bottom: var(--space-4);
    }
  `,
})
export class EmployeeFormPage {
  private readonly employees = inject(EmployeesService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  /** `:id` de la ruta; 0 = alta. */
  readonly id = input(0, { transform: numberAttribute });
  protected readonly isEdit = computed(() => this.id() > 0);
  protected readonly base = HR_BASE;

  protected readonly steps: TabItem[] = [
    { id: 'personal', label: 'Datos personales', icon: 'user' },
    { id: 'contract', label: 'Cargo y contrato', icon: 'briefcase' },
    { id: 'social', label: 'Banco y seguridad social', icon: 'shield-check' },
    { id: 'deductions', label: 'Deducciones y retención', icon: 'calculator' },
  ];
  protected readonly step = signal<string | null>('personal');
  protected readonly stepIndex = computed(() =>
    this.steps.findIndex((s) => s.id === (this.step() ?? 'personal')),
  );

  protected readonly documentTypes = optionsOf(DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS);
  protected readonly genders = optionsOf(GENDERS, GENDER_LABELS);
  protected readonly employeeTypes = optionsOf(EMPLOYEE_TYPES, EMPLOYEE_TYPE_LABELS);
  protected readonly contractTypes = optionsOf(CONTRACT_TYPES, CONTRACT_TYPE_LABELS);
  protected readonly accountTypes = optionsOf(BANK_ACCOUNT_TYPES, BANK_ACCOUNT_TYPE_LABELS);
  protected readonly riskClasses = ARL_RISK_CLASSES.map((c) => ({
    value: c as number,
    label: `Clase ${['I', 'II', 'III', 'IV', 'V'][c - 1]}`,
  }));

  protected readonly form = this.fb.group({
    firstName: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
    lastName: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
    documentType: this.fb.control<DocumentType>('cc', Validators.required),
    documentNumber: this.fb.control('', [Validators.required, Validators.maxLength(30)]),
    birthDate: this.fb.control(''),
    gender: this.fb.control<Gender>('F', Validators.required),
    email: this.fb.control('', [Validators.email, Validators.maxLength(150)]),
    phone: this.fb.control('', Validators.maxLength(20)),
    address: this.fb.control('', Validators.maxLength(500)),
    employeeType: this.fb.control<EmployeeType>('docente', Validators.required),
    position: this.fb.control('', Validators.maxLength(100)),
    department: this.fb.control('', Validators.maxLength(100)),
    hireDate: this.fb.control(isoDate()),
    contractType: this.fb.control<ContractType>('indefinido', Validators.required),
    baseSalary: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    integralSalary: this.fb.control(false),
    bankName: this.fb.control('', Validators.maxLength(100)),
    bankAccount: this.fb.control('', Validators.maxLength(50)),
    accountType: this.fb.control<BankAccountType>('ahorros'),
    eps: this.fb.control('', Validators.maxLength(100)),
    pensionFund: this.fb.control('', Validators.maxLength(100)),
    arl: this.fb.control('', Validators.maxLength(100)),
    arlRiskClass: this.fb.control<number>(1),
    fixedLibranza: this.fb.control<number | null>(0, money()),
    fixedSindicato: this.fb.control<number | null>(0, money()),
    fixedEmbargo: this.fb.control<number | null>(0, money()),
    embargoIsAlimony: this.fb.control(false),
    withholdingDependents: this.fb.control(false),
    withholdingPrepaidHealth: this.fb.control<number | null>(0, money()),
    withholdingHousingInterest: this.fb.control<number | null>(0, money()),
    voluntaryPension: this.fb.control<number | null>(0, money()),
    createUserAccount: this.fb.control(true),
  });

  protected readonly existing = rxResource({
    params: () => (this.isEdit() ? this.id() : null),
    stream: ({ params }) => (params ? this.employees.get(params) : of(null)),
  });
  protected readonly loadError = computed(() =>
    this.existing.error() ? apiMessage(this.existing.error()) : null,
  );

  protected readonly saving = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly account = signal<EmployeeAccountResult | null>(null);
  protected readonly accountOpen = signal(false);
  private createdId: number | null = null;

  constructor() {
    effect(() => {
      const e = resourceValue(this.existing, null);
      if (e) untracked(() => this.patch(e));
    });
  }

  private patch(e: Employee): void {
    this.form.patchValue({
      firstName: e.firstName,
      lastName: e.lastName,
      documentType: e.documentType,
      documentNumber: e.documentNumber,
      birthDate: e.birthDate ?? '',
      gender: e.gender,
      email: e.email ?? '',
      phone: e.phone ?? '',
      address: e.address ?? '',
      employeeType: e.employeeType,
      position: e.position ?? '',
      department: e.department ?? '',
      hireDate: e.hireDate ?? '',
      contractType: e.contractType,
      baseSalary: e.baseSalary,
      integralSalary: e.integralSalary,
      bankName: e.bankAccount.bankName ?? '',
      bankAccount: e.bankAccount.number ?? '',
      accountType: e.bankAccount.type,
      eps: e.socialSecurity.eps ?? '',
      pensionFund: e.socialSecurity.pensionFund ?? '',
      arl: e.socialSecurity.arl ?? '',
      arlRiskClass: e.socialSecurity.arlRiskClass,
      fixedLibranza: e.recurringDeductions.libranza,
      fixedSindicato: e.recurringDeductions.sindicato,
      fixedEmbargo: e.recurringDeductions.embargo,
      embargoIsAlimony: e.recurringDeductions.embargoIsAlimony,
      withholdingDependents: e.withholding.hasDependents,
      withholdingPrepaidHealth: e.withholding.prepaidHealth,
      withholdingHousingInterest: e.withholding.housingInterest,
      voluntaryPension: e.withholding.voluntaryPension,
    });
    this.form.markAsPristine();
  }

  protected go(delta: number): void {
    const next = this.steps[this.stepIndex() + delta];
    if (next) this.step.set(next.id);
  }

  private toPayload(): EmployeeData {
    const v = this.form.getRawValue();
    return {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      documentType: v.documentType,
      documentNumber: v.documentNumber.trim(),
      birthDate: blankToNull(v.birthDate),
      gender: v.gender,
      phone: blankToNull(v.phone),
      email: blankToNull(v.email),
      address: blankToNull(v.address),
      employeeType: v.employeeType,
      position: blankToNull(v.position),
      department: blankToNull(v.department),
      hireDate: blankToNull(v.hireDate),
      contractType: v.contractType,
      baseSalary: Number(v.baseSalary),
      integralSalary: v.integralSalary,
      fixedLibranza: v.fixedLibranza ?? 0,
      fixedSindicato: v.fixedSindicato ?? 0,
      fixedEmbargo: v.fixedEmbargo ?? 0,
      embargoIsAlimony: v.embargoIsAlimony,
      bankName: blankToNull(v.bankName),
      bankAccount: blankToNull(v.bankAccount),
      accountType: v.accountType,
      eps: blankToNull(v.eps),
      pensionFund: blankToNull(v.pensionFund),
      arl: blankToNull(v.arl),
      arlRiskClass: v.arlRiskClass,
      withholdingDependents: v.withholdingDependents,
      withholdingPrepaidHealth: v.withholdingPrepaidHealth ?? 0,
      withholdingHousingInterest: v.withholdingHousingInterest ?? 0,
      voluntaryPension: v.voluntaryPension ?? 0,
    };
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const controls = this.form.controls as Record<string, { invalid: boolean }>;
      const firstInvalid = (Object.keys(STEP_FIELDS) as StepId[]).find((s) =>
        STEP_FIELDS[s].some((f) => controls[f]?.invalid),
      );
      if (firstInvalid) this.step.set(firstInvalid);
      this.toast.warning('Revisa los campos marcados antes de guardar.');
      return;
    }
    this.saving.set(true);
    this.serverError.set(null);
    const payload = this.toPayload();

    if (this.isEdit()) {
      this.employees.update(this.id(), payload).subscribe({
        next: (e) => {
          this.saving.set(false);
          this.form.markAsPristine();
          this.toast.success('Empleado actualizado.');
          void this.router.navigate([HR_BASE, 'empleados', e.id]);
        },
        error: (err: unknown) => this.fail(err),
      });
      return;
    }

    this.employees
      .register({ ...payload, createUserAccount: this.form.controls.createUserAccount.value })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.form.markAsPristine();
          this.toast.success(`Empleado ${res.employee.code} registrado.`);
          this.createdId = res.employee.id;
          if (res.account) {
            this.account.set(res.account);
            this.accountOpen.set(true);
          } else {
            this.goToCreated();
          }
        },
        error: (err: unknown) => this.fail(err),
      });
  }

  protected goToCreated(): void {
    this.accountOpen.set(false);
    if (this.createdId) void this.router.navigate([HR_BASE, 'empleados', this.createdId]);
  }

  private fail(err: unknown): void {
    this.saving.set(false);
    this.serverError.set(apiMessage(err));
  }
}
