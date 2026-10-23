import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiClient, Page } from '../../../core';
import {
  Account,
  AccountFilters,
  AccountingDashboard,
  AccountingPeriod,
  ApiPaginated,
  AuxiliaryLedger,
  BalanceSheet,
  CreateAccountRequest,
  CreateJournalEntryRequest,
  CreatePeriodRequest,
  ExportableReport,
  ReportFormat,
  GeneralJournal,
  GeneralLedger,
  IncomeStatement,
  JournalEntry,
  JournalEntryFilters,
  JournalEntryRequest,
  PostingRule,
  PostingRules,
  ReportQuery,
  ReverseJournalEntryRequest,
  SeedPucResult,
  ThirdParty,
  ThirdPartyFilters,
  ThirdPartyRequest,
  TrialBalance,
  UpdateAccountRequest,
} from './accounting.models';

/** Convierte el paginado de la API (`limit`) a la convención `Page<T>` del front. */
export function toPage<T>(page: ApiPaginated<T>): Page<T> {
  return { items: page.items, total: page.total, page: page.page, pageSize: page.limit };
}

/** Cliente HTTP de `/api/accounting/**`. */
@Injectable({ providedIn: 'root' })
export class AccountingService {
  private readonly api = inject(ApiClient);

  // ---- Dashboard ----
  dashboard(month?: string | null): Observable<AccountingDashboard> {
    return this.api.get<AccountingDashboard>('accounting/dashboard', { params: { month } });
  }

  // ---- Plan de cuentas ----
  accounts(filters: AccountFilters = {}): Observable<Account[]> {
    return this.api.get<Account[]>('accounting/accounts', { params: { ...filters } });
  }
  accountTree(): Observable<Account[]> {
    return this.accounts({ tree: true });
  }
  transactionalAccounts(): Observable<Account[]> {
    return this.accounts({ transactional: true });
  }
  createAccount(dto: CreateAccountRequest): Observable<Account> {
    return this.api.post<Account>('accounting/accounts', dto);
  }
  updateAccount(id: number, dto: UpdateAccountRequest): Observable<Account> {
    return this.api.patch<Account>(`accounting/accounts/${id}`, dto);
  }
  deleteAccount(id: number): Observable<void> {
    return this.api.delete<void>(`accounting/accounts/${id}`);
  }
  seedPuc(): Observable<SeedPucResult> {
    return this.api.post<SeedPucResult>('accounting/accounts/seed-puc');
  }

  // ---- Terceros ----
  thirdParties(filters: ThirdPartyFilters = {}): Observable<Page<ThirdParty>> {
    const { pageSize, ...rest } = filters;
    return this.api
      .get<ApiPaginated<ThirdParty>>('accounting/third-parties', {
        params: { ...rest, limit: pageSize },
      })
      .pipe(map(toPage));
  }
  createThirdParty(dto: ThirdPartyRequest): Observable<ThirdParty> {
    return this.api.post<ThirdParty>('accounting/third-parties', dto);
  }
  updateThirdParty(id: number, dto: ThirdPartyRequest): Observable<ThirdParty> {
    return this.api.patch<ThirdParty>(`accounting/third-parties/${id}`, dto);
  }
  setThirdPartyActive(id: number, active: boolean): Observable<ThirdParty> {
    return this.api.post<ThirdParty>(
      `accounting/third-parties/${id}/${active ? 'activate' : 'deactivate'}`,
    );
  }
  deleteThirdParty(id: number): Observable<void> {
    return this.api.delete<void>(`accounting/third-parties/${id}`);
  }

  // ---- Periodos ----
  periods(): Observable<AccountingPeriod[]> {
    return this.api.get<AccountingPeriod[]>('accounting/periods');
  }
  currentPeriod(): Observable<AccountingPeriod | null> {
    return this.api.get<AccountingPeriod | null>('accounting/periods/current');
  }
  createPeriod(dto: CreatePeriodRequest): Observable<AccountingPeriod> {
    return this.api.post<AccountingPeriod>('accounting/periods', dto);
  }
  closePeriod(id: number): Observable<AccountingPeriod> {
    return this.api.post<AccountingPeriod>(`accounting/periods/${id}/close`);
  }
  reopenPeriod(id: number, reason: string): Observable<AccountingPeriod> {
    return this.api.post<AccountingPeriod>(`accounting/periods/${id}/reopen`, { reason });
  }

  // ---- Comprobantes / asientos ----
  journalEntries(filters: JournalEntryFilters = {}): Observable<Page<JournalEntry>> {
    const { pageSize, ...rest } = filters;
    return this.api
      .get<ApiPaginated<JournalEntry>>('accounting/journal-entries', {
        params: { ...rest, limit: pageSize },
      })
      .pipe(map(toPage));
  }
  journalEntry(id: number): Observable<JournalEntry> {
    return this.api.get<JournalEntry>(`accounting/journal-entries/${id}`);
  }
  createJournalEntry(dto: CreateJournalEntryRequest): Observable<JournalEntry> {
    return this.api.post<JournalEntry>('accounting/journal-entries', dto);
  }
  updateDraft(id: number, dto: JournalEntryRequest): Observable<JournalEntry> {
    return this.api.put<JournalEntry>(`accounting/journal-entries/${id}`, dto);
  }
  deleteDraft(id: number): Observable<void> {
    return this.api.delete<void>(`accounting/journal-entries/${id}`);
  }
  postEntry(id: number): Observable<JournalEntry> {
    return this.api.post<JournalEntry>(`accounting/journal-entries/${id}/post`);
  }
  voidEntry(id: number, reason: string): Observable<JournalEntry> {
    return this.api.post<JournalEntry>(`accounting/journal-entries/${id}/void`, { reason });
  }
  reverseEntry(id: number, dto: ReverseJournalEntryRequest): Observable<JournalEntry> {
    return this.api.post<JournalEntry>(`accounting/journal-entries/${id}/reverse`, dto);
  }

  // ---- Reportes ----
  trialBalance(q: ReportQuery): Observable<TrialBalance> {
    return this.api.get<TrialBalance>('accounting/reports/trial-balance', {
      params: { from: q.from, to: q.to, level: q.level },
    });
  }
  generalJournal(q: ReportQuery): Observable<GeneralJournal> {
    return this.api.get<GeneralJournal>('accounting/reports/journal', {
      params: { from: q.from, to: q.to, type: q.type, page: q.page, limit: q.pageSize },
    });
  }
  generalLedger(q: ReportQuery): Observable<GeneralLedger> {
    return this.api.get<GeneralLedger>('accounting/reports/ledger', {
      params: { from: q.from, to: q.to, accountId: q.accountId },
    });
  }
  auxiliaryLedger(q: ReportQuery): Observable<AuxiliaryLedger> {
    return this.api.get<AuxiliaryLedger>('accounting/reports/auxiliary', {
      params: { from: q.from, to: q.to, accountId: q.accountId, thirdPartyId: q.thirdPartyId },
    });
  }
  incomeStatement(q: ReportQuery): Observable<IncomeStatement> {
    return this.api.get<IncomeStatement>('accounting/reports/income-statement', {
      params: { from: q.from, to: q.to },
    });
  }
  balanceSheet(asOf: string): Observable<BalanceSheet> {
    return this.api.get<BalanceSheet>('accounting/reports/balance-sheet', { params: { asOf } });
  }
  /** Descarga el reporte en CSV, XLSX (Excel) o PDF con membrete del colegio. */
  exportReport(
    report: ExportableReport,
    q: ReportQuery,
    format: ReportFormat = 'csv',
  ): Observable<Blob> {
    return this.api.download(`accounting/reports/${report}/export`, {
      params: {
        format,
        from: q.from,
        to: q.to,
        asOf: q.asOf,
        level: q.level,
        accountId: q.accountId,
        thirdPartyId: q.thirdPartyId,
        type: q.type,
      },
    });
  }

  // ---- Parametrización ----
  postingRules(): Observable<PostingRules> {
    return this.api.get<PostingRules>('accounting/posting-rules');
  }
  setPostingRule(key: string, accountId: number): Observable<PostingRule> {
    return this.api.put<PostingRule>(`accounting/posting-rules/${encodeURIComponent(key)}`, {
      accountId,
    });
  }
  deletePostingRule(key: string): Observable<void> {
    return this.api.delete<void>(`accounting/posting-rules/${encodeURIComponent(key)}`);
  }
}
