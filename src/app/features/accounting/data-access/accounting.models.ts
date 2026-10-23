/**
 * Modelos del contexto Contabilidad. Reflejan los read models de
 * `apreu-api/src/modules/accounting/application/*view*.ts`.
 */

export const ACCOUNT_TYPES = [
  'activo',
  'pasivo',
  'patrimonio',
  'ingreso',
  'gasto',
  'costo',
  'orden',
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type AccountNature = 'debito' | 'credito';
export type AccountLevel = 1 | 2 | 3 | 4 | 5;

export interface Account {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  nature: AccountNature;
  level: AccountLevel;
  levelName: string;
  isTransactional: boolean;
  parentId: number | null;
  children?: Account[];
}

export interface AccountFilters {
  tree?: boolean;
  transactional?: boolean;
  search?: string;
}

export interface CreateAccountRequest {
  code: string;
  name: string;
  type?: AccountType;
  isTransactional: boolean;
  /** Omitido = se infiere por prefijo; `null` = raíz. */
  parentId?: number | null;
}

export interface UpdateAccountRequest {
  name?: string;
  isTransactional?: boolean;
}

export interface SeedPucResult {
  inserted: number;
  skipped: number;
}

export const DOCUMENT_TYPES = ['NIT', 'CC', 'CE', 'TI', 'Pasaporte'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface ThirdParty {
  id: number;
  documentType: DocumentType;
  documentNumber: string;
  dv: string | null;
  /** Documento con DV calculado por la API, p. ej. `900123456-7`. */
  document: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  isActive: boolean;
}

export interface ThirdPartyFilters {
  search?: string;
  isActive?: boolean | null;
  page?: number;
  pageSize?: number;
}

export interface ThirdPartyRequest {
  documentType: DocumentType;
  documentNumber: string;
  dv?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
}

export type PeriodStatus = 'open' | 'closed';

export interface AccountingPeriod {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  closedAt: string | null;
  closedBy: number | null;
  reopenedAt: string | null;
  reopenedBy: number | null;
  reopenReason: string | null;
}

export interface CreatePeriodRequest {
  name: string;
  startDate: string;
  endDate: string;
}

export const VOUCHER_TYPES = ['RC', 'CE', 'FC', 'FV', 'NC', 'ND', 'NI', 'SALA'] as const;
export type VoucherType = (typeof VOUCHER_TYPES)[number];
export type JournalEntryStatus = 'draft' | 'posted' | 'voided';

export interface JournalLine {
  accountId: number;
  accountCode: string | null;
  accountName: string | null;
  thirdPartyId: number | null;
  thirdPartyName: string | null;
  description: string | null;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: number;
  periodId: number;
  date: string;
  type: VoucherType;
  typeLabel: string;
  number: string | null;
  displayNumber: string | null;
  description: string;
  status: JournalEntryStatus;
  totalDebit: number;
  totalCredit: number;
  createdBy: number | null;
  createdAt: string | null;
  postedAt: string | null;
  postedBy: number | null;
  voidedAt: string | null;
  voidedBy: number | null;
  voidReason: string | null;
  sourceType: string | null;
  sourceId: string | null;
  reversalOfId: number | null;
  lines?: JournalLine[];
}

export interface JournalEntryFilters {
  from?: string | null;
  to?: string | null;
  type?: VoucherType | null;
  status?: JournalEntryStatus | null;
  page?: number;
  pageSize?: number;
}

export interface JournalLineRequest {
  accountId: number;
  thirdPartyId?: number | null;
  description?: string;
  debit?: number;
  credit?: number;
}

export interface JournalEntryRequest {
  periodId?: number;
  date: string;
  type: VoucherType;
  description: string;
  lines: JournalLineRequest[];
}

export interface CreateJournalEntryRequest extends JournalEntryRequest {
  /** `false` = guardar como borrador. */
  postImmediately?: boolean;
}

export interface ReverseJournalEntryRequest {
  reason: string;
  date?: string;
  type?: VoucherType;
}

// ---- Reportes -----------------------------------------------------------

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: AccountType;
  level: AccountLevel;
  openingBalance: number;
  debit: number;
  credit: number;
  closingBalance: number;
  debitBalance: number;
  creditBalance: number;
}

export interface TrialBalance {
  from: string;
  to: string;
  level: AccountLevel | null;
  rows: TrialBalanceRow[];
  totals: { debit: number; credit: number; debitBalance: number; creditBalance: number };
  balanced: boolean;
}

/** Paginado tal como lo devuelve la API (`limit` en lugar de `pageSize`). */
export interface ApiPaginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface GeneralJournal {
  from: string;
  to: string;
  entries: ApiPaginated<JournalEntry>;
  totals: { debit: number; credit: number };
}

export interface NaturalBalanceRow {
  code: string;
  name: string;
  nature: AccountNature;
  openingBalance: number;
  debit: number;
  credit: number;
  closingBalance: number;
}

export interface AuxiliaryLine {
  date: string;
  entryId: number;
  voucher: string;
  entryDescription: string;
  thirdPartyId: number | null;
  thirdPartyName: string | null;
  description: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface GeneralLedger {
  from: string;
  to: string;
  rows: NaturalBalanceRow[];
  lines: AuxiliaryLine[] | null;
}

export interface AuxiliaryLedger {
  from: string;
  to: string;
  account: Account;
  thirdPartyId: number | null;
  openingBalance: number;
  lines: AuxiliaryLine[];
  totals: { debit: number; credit: number };
  closingBalance: number;
}

export interface StatementSection {
  rows: { code: string; name: string; amount: number }[];
  total: number;
}

export interface IncomeStatement {
  from: string;
  to: string;
  income: StatementSection;
  costs: StatementSection;
  expenses: StatementSection;
  grossProfit: number;
  netIncome: number;
}

export interface BalanceSheet {
  asOf: string;
  assets: StatementSection;
  liabilities: StatementSection;
  equity: StatementSection;
  periodResult: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
}

export interface AccountingDashboard {
  month: string;
  from: string;
  to: string;
  income: number;
  costs: number;
  expenses: number;
  netIncome: number;
  entriesCount: number;
  latestEntries: JournalEntry[];
  currentPeriod: AccountingPeriod | null;
}

export const EXPORTABLE_REPORTS = [
  'trial-balance',
  'journal',
  'ledger',
  'auxiliary',
  'income-statement',
  'balance-sheet',
] as const;
export type ExportableReport = (typeof EXPORTABLE_REPORTS)[number];

/** Formatos de exportación de `GET /accounting/reports/{report}/export`. */
export const REPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export interface ReportQuery {
  from?: string;
  to?: string;
  asOf?: string;
  level?: AccountLevel | null;
  accountId?: number | null;
  thirdPartyId?: number | null;
  type?: VoucherType | null;
  page?: number;
  pageSize?: number;
}

// ---- Parametrización de asientos automáticos ------------------------------

export interface PostingRule {
  key: string;
  accountId: number;
  accountCode: string | null;
  accountName: string | null;
}

export interface PostingRules {
  supportedKeys: { example: string; description: string }[];
  rules: PostingRule[];
}
