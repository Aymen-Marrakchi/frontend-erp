"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { financeService, AccountingAccount } from "@/services/finance/financeService";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState } from "react";
import { Landmark, Loader2, RefreshCw } from "lucide-react";

function getErrorMessage(err: unknown, fallback: string) {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof err.response === "object" &&
    err.response !== null &&
    "data" in err.response &&
    typeof err.response.data === "object" &&
    err.response.data !== null &&
    "message" in err.response.data &&
    typeof err.response.data.message === "string"
  ) {
    return err.response.data.message;
  }
  return fallback;
}

export default function FinanceAccountsPage() {
  const { t } = useLanguage();

  const entryTypeLabel: Record<string, string> = {
    INVOICE_ISSUED: t("fin_entryInvoiceIssued"),
    REGLEMENT_RECU: t("fin_entryPaymentReceived"),
    PAYABLE_RECORDED: t("fin_supplierDebt"),
    PAYABLE_PAYMENT: t("fin_entrySupplierPayment"),
    PAYABLE_CREDIT: t("fin_entryCreditNote"),
    MANUAL_ENTRY: t("fin_entryManual"),
  };

  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
  const [selected, setSelected] = useState<AccountingAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resyncing, setResyncing] = useState(false);
  const [resyncMsg, setResyncMsg] = useState("");

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await financeService.getAccounts();
      setAccounts(data);
      setSelected((prev) => data.find((a) => a.accountCode === prev?.accountCode) || data[0] || null);
    } catch (err) {
      setError(getErrorMessage(err, t("fin_loadFailed")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, []);

  const handleResync = async () => {
    try {
      setResyncing(true);
      setResyncMsg("");
      const result = await financeService.resyncFinanceEntries();
      setResyncMsg(
        `${t("fin_resyncDone")} — ${result.totalClientInvoices} ${t("fin_clientInvoices")}, ${result.totalPurchaseInvoices} ${t("fin_supplierInvoices")}.`
      );
      await loadAccounts();
    } catch {
      setResyncMsg(t("fin_resyncFailed"));
    } finally {
      setResyncing(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Landmark size={18} className="text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {t("fin_accTitle")}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("fin_accSubtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={handleResync}
            disabled={resyncing}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw size={14} className={resyncing ? "animate-spin" : ""} />
            {resyncing ? t("fin_resyncing") : t("fin_resyncBtn")}
          </button>
        </div>

        {resyncMsg && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
            {resyncMsg}
          </div>
        )}

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white py-16 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            {t("fin_loadingLedger")}
          </div>
        ) : !accounts.length ? (
          <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-16 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
            {t("fin_noAccounts")}
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            {/* Account list */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-950 dark:text-white">{t("fin_accountsPanel")}</h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {accounts.map((account) => (
                  <button
                    key={account.accountCode}
                    onClick={() => setSelected(account)}
                    className={`w-full px-5 py-4 text-left transition ${
                      selected?.accountCode === account.accountCode
                        ? "bg-slate-100 dark:bg-slate-800/70"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {account.accountCode} · {account.accountName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {t("fin_debit")} {account.debit.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} ·
                          {t("fin_credit")} {account.credit.toLocaleString("fr-TN", { minimumFractionDigits: 3 })}
                        </p>
                      </div>
                      <div className={`shrink-0 text-right text-sm font-semibold ${
                        account.balance > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : account.balance < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}>
                        {account.balance > 0 ? "+" : ""}{account.balance.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} {t("fin_tnd")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Ledger detail */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  {selected
                    ? `${selected.accountCode} · ${selected.accountName}`
                    : t("fin_selectAccount")}
                </h2>
                {selected ? (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {t("fin_balance")}{" "}
                    <span className={`font-semibold ${
                      selected.balance > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : selected.balance < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-500 dark:text-slate-400"
                    }`}>
                      {selected.balance > 0 ? "+" : ""}{selected.balance.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} {t("fin_tnd")}
                    </span>
                  </p>
                ) : null}
              </div>

              {selected && selected.entries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-950/40">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium text-slate-500">{t("fin_date")}</th>
                        <th className="px-6 py-3 text-left font-medium text-slate-500">{t("fin_reference")}</th>
                        <th className="px-6 py-3 text-left font-medium text-slate-500">{t("fin_type")}</th>
                        <th className="px-6 py-3 text-right font-medium text-slate-500">{t("fin_debit")}</th>
                        <th className="px-6 py-3 text-right font-medium text-slate-500">{t("fin_credit")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selected.entries.map((entry) => (
                        <tr key={`${selected.accountCode}-${entry.journalEntryId}-${entry.side}-${entry.amount}`}>
                          <td className="px-6 py-3 text-slate-600 dark:text-slate-300">
                            {new Date(entry.occurredAt).toLocaleDateString("fr-TN")}
                          </td>
                          <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                            {entry.reference || "—"}
                          </td>
                          <td className="px-6 py-3 text-slate-600 dark:text-slate-300">
                            {entryTypeLabel[entry.entryType] || entry.entryType}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {entry.side === "DEBIT"
                              ? `+${entry.amount.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} ${t("fin_tnd")}`
                              : "—"}
                          </td>
                          <td className="px-6 py-3 text-right font-medium text-rose-600 dark:text-rose-400">
                            {entry.side === "CREDIT"
                              ? `−${entry.amount.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} ${t("fin_tnd")}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : selected ? (
                <div className="flex items-center justify-center py-16 text-sm text-slate-400 dark:text-slate-500">
                  {t("fin_noMovements")}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
