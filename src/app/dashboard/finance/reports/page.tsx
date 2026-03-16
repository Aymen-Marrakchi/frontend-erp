"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { financeService, FinanceReportsResponse } from "@/services/finance/financeService";
import { useEffect, useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";

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
  return "Failed to load finance reports";
}

function formatTnd(value: number) {
  return `${value.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`;
}

export default function FinanceReportsPage() {
  const [reports, setReports] = useState<FinanceReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        setReports(await financeService.getReports());
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
            <BarChart3 size={18} className="text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Financial Reports
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Practical balance sheet and P&amp;L views generated from ERP accounting events
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600">
            {error}
          </div>
        ) : null}

        {loading || !reports ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white py-16 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            Loading reports
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold text-slate-950 dark:text-white">Balance Sheet</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 p-5 dark:border-slate-800">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">Assets</h3>
                  <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between"><span>Receivables</span><span>{formatTnd(reports.balanceSheet.assets.receivables)}</span></div>
                    <div className="flex justify-between"><span>Cash</span><span>{formatTnd(reports.balanceSheet.assets.cash)}</span></div>
                    <div className="flex justify-between"><span>Bank</span><span>{formatTnd(reports.balanceSheet.assets.bank)}</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900 dark:border-slate-800 dark:text-white"><span>Total</span><span>{formatTnd(reports.balanceSheet.assets.total)}</span></div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 p-5 dark:border-slate-800">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">Liabilities</h3>
                  <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between"><span>Supplier Payables</span><span>{formatTnd(reports.balanceSheet.liabilities.supplierPayables)}</span></div>
                    <div className="flex justify-between"><span>Pending Legalization</span><span>{formatTnd(reports.balanceSheet.liabilities.pendingLegalization)}</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900 dark:border-slate-800 dark:text-white"><span>Total</span><span>{formatTnd(reports.balanceSheet.liabilities.total)}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold text-slate-950 dark:text-white">Profit &amp; Loss</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 p-5 dark:border-slate-800">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">Revenue</h3>
                  <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between"><span>Sales Revenue</span><span>{formatTnd(reports.profitAndLoss.revenue.salesRevenue)}</span></div>
                    <div className="flex justify-between"><span>Purchase Credits</span><span>{formatTnd(reports.profitAndLoss.revenue.purchaseCredits)}</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900 dark:border-slate-800 dark:text-white"><span>Total</span><span>{formatTnd(reports.profitAndLoss.revenue.total)}</span></div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 p-5 dark:border-slate-800">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">Expenses</h3>
                  <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between"><span>Purchases Expense</span><span>{formatTnd(reports.profitAndLoss.expenses.purchasesExpense)}</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900 dark:border-slate-800 dark:text-white"><span>Total</span><span>{formatTnd(reports.profitAndLoss.expenses.total)}</span></div>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-slate-100 px-5 py-4 text-sm font-semibold text-slate-900 dark:bg-slate-800 dark:text-white">
                Net Result: {formatTnd(reports.profitAndLoss.netResult)}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
