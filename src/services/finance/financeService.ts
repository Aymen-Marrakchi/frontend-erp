import api from "@/services/api";

export type FinanceEntryType =
  | "PAYABLE_RECORDED"
  | "PAYABLE_PAYMENT"
  | "PAYABLE_CREDIT"
  | "RECEIVABLE_RECORDED"
  | "RECEIVABLE_PAYMENT"
  | "REVENUE_RECOGNIZED"
  | "INVOICE_LEGALIZED";

export interface FinanceEntry {
  _id: string;
  entryType: FinanceEntryType;
  direction: "INFLOW" | "OUTFLOW" | "NONE";
  sourceModule: "PURCHASE" | "COMMERCIAL";
  sourceType: string;
  sourceId: string;
  reference: string;
  counterpartyType: "SUPPLIER" | "CUSTOMER" | "INTERNAL";
  counterpartyId: string;
  counterpartyName: string;
  amount: number;
  currency: string;
  status: "OPEN" | "SETTLED" | "INFO";
  occurredAt: string;
  notes: string;
}

export interface FinanceDashboardResponse {
  totals: {
    totalPayablesOutstanding: number;
    totalPaidOut: number;
    totalReceivables: number;
    recognizedRevenue: number;
    netExpectedCash: number;
    overduePayables: number;
  };
  recentEntries: FinanceEntry[];
}

export interface FinanceReceivable {
  _id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  status: "SHIPPED" | "DELIVERED" | "CLOSED";
  amount: number;
  invoiceNo?: string;
  legalizationStatus?: "NON_LEGALISEE" | "LEGALISEE";
  paymentStatus?: "NON_PAYEE" | "PARTIELLEMENT_PAYEE" | "PENDING_CHEQUE" | "PAYEE";
  paymentMethod?: "UNSET" | "ESPECE" | "CHEQUE" | "VIREMENT" | "KUMBIL";
  promisedDate: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  closedAt: string | null;
  trackingNumber: string;
}

export interface FinancePayable {
  _id: string;
  invoiceNo: string;
  supplierId: string;
  supplierNo: string;
  supplierName: string;
  status: "APPROVED" | "PARTIALLY_PAID" | "PAID";
  totalTtc: number;
  amountPaid: number;
  creditNoteAmount: number;
  outstanding: number;
  legalizationStatus?: "NON_LEGALISEE" | "LEGALISEE";
  dueDate: string | null;
  invoiceDate: string | null;
  matchingStatus: "MATCHED" | "MISMATCH";
  isOverdue: boolean;
}

export interface TreasuryMovement {
  _id: string;
  reference: string;
  direction: "INFLOW" | "OUTFLOW";
  amount: number;
  method: string;
  date: string | null;
  counterparty: string;
}

export interface TreasuryResponse {
  summary: {
    actualOutflows: number;
    expectedInflows: number;
    openPayables: number;
    openReceivables: number;
    next30DaysSupplierDue: number;
  };
  cashMovements: TreasuryMovement[];
  recentEntries: FinanceEntry[];
}

export interface AccountingJournalLine {
  accountCode: string;
  accountName: string;
  side: "DEBIT" | "CREDIT";
  amount: number;
}

export interface AccountingJournalEntry {
  _id: string;
  sourceType: string;
  sourceId: string;
  reference: string;
  entryType: FinanceEntryType;
  sourceModule: "PURCHASE" | "COMMERCIAL";
  counterpartyName: string;
  occurredAt: string;
  notes: string;
  currency: string;
  lines: AccountingJournalLine[];
}

export interface AccountLedgerMovement {
  journalEntryId: string;
  reference: string;
  entryType: FinanceEntryType;
  occurredAt: string;
  side: "DEBIT" | "CREDIT";
  amount: number;
  counterpartyName: string;
}

export interface AccountingAccount {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
  entries: AccountLedgerMovement[];
}

export interface FinanceReportsResponse {
  balanceSheet: {
    assets: {
      receivables: number;
      cash: number;
      bank: number;
      total: number;
    };
    liabilities: {
      supplierPayables: number;
      pendingLegalization: number;
      total: number;
    };
  };
  profitAndLoss: {
    revenue: {
      salesRevenue: number;
      purchaseCredits: number;
      total: number;
    };
    expenses: {
      purchasesExpense: number;
      total: number;
    };
    netResult: number;
  };
  accounts: AccountingAccount[];
}

export const financeService = {
  async getDashboard() {
    const { data } = await api.get<FinanceDashboardResponse>("/finance/dashboard");
    return data;
  },
  async getReceivables() {
    const { data } = await api.get<FinanceReceivable[]>("/finance/receivables");
    return data;
  },
  async getPayables() {
    const { data } = await api.get<FinancePayable[]>("/finance/payables");
    return data;
  },
  async getTreasury() {
    const { data } = await api.get<TreasuryResponse>("/finance/treasury");
    return data;
  },
  async getEntries() {
    const { data } = await api.get<FinanceEntry[]>("/finance/entries");
    return data;
  },
  async getJournal() {
    const { data } = await api.get<AccountingJournalEntry[]>("/finance/journal");
    return data;
  },
  async getAccounts() {
    const { data } = await api.get<AccountingAccount[]>("/finance/accounts");
    return data;
  },
  async getAccountLedger(code: string) {
    const { data } = await api.get<AccountingAccount>(`/finance/accounts/${code}`);
    return data;
  },
  async getReports() {
    const { data } = await api.get<FinanceReportsResponse>("/finance/reports");
    return data;
  },
};
