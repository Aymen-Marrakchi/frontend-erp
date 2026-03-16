"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { financeService, AccountingJournalEntry } from "@/services/finance/financeService";
import { useEffect, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";

function getErrorMessage(err: unknown) {
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
  return "Failed to load accounting journal";
}

export default function FinanceJournalPage() {
  const [entries, setEntries] = useState<AccountingJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        setEntries(await financeService.getJournal());
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <BookOpen size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Accounting Journal
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Auto-generated debit and credit lines from ERP finance events
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white py-16 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            Loading journal
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div
                key={entry._id}
                className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                  <div>
                    <h2 className="font-semibold text-slate-950 dark:text-white">
                      {entry.reference || entry.sourceType}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {entry.entryType} · {entry.counterpartyName || "Internal"} ·{" "}
                      {new Date(entry.occurredAt).toLocaleString("fr-TN")}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {entry.sourceModule}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-950/40">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium text-slate-500">Account</th>
                        <th className="px-6 py-3 text-left font-medium text-slate-500">Name</th>
                        <th className="px-6 py-3 text-right font-medium text-slate-500">Debit</th>
                        <th className="px-6 py-3 text-right font-medium text-slate-500">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {entry.lines.map((line, index) => (
                        <tr key={`${entry._id}-${line.accountCode}-${index}`}>
                          <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                            {line.accountCode}
                          </td>
                          <td className="px-6 py-3 text-slate-600 dark:text-slate-300">
                            {line.accountName}
                          </td>
                          <td className="px-6 py-3 text-right text-slate-900 dark:text-white">
                            {line.side === "DEBIT"
                              ? `${line.amount.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`
                              : "-"}
                          </td>
                          <td className="px-6 py-3 text-right text-slate-900 dark:text-white">
                            {line.side === "CREDIT"
                              ? `${line.amount.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
