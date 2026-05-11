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
  return "Échec du chargement des rapports";
}

function tnd(value: number | undefined | null) {
  return `${(value ?? 0).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`;
}

function Row({ label, value, bold }: { label: string; value: number | undefined | null; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "border-t border-slate-100 pt-2 dark:border-slate-800" : ""}`}>
      <span className={bold ? "font-semibold text-slate-900 dark:text-white" : ""}>{label}</span>
      <span className={bold ? "font-semibold text-slate-900 dark:text-white" : ""}>{tnd(value)}</span>
    </div>
  );
}

const card = "rounded-2xl border border-slate-100 p-5 dark:border-slate-800";
const surface = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900";

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
              Rapports financiers
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Bilan et compte de résultat générés automatiquement depuis les écritures comptables
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

        {loading || !reports ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white py-16 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            Chargement des rapports...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Balance sheet */}
            <div className={surface}>
              <h2 className="mb-5 font-semibold text-slate-950 dark:text-white">Bilan</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={card}>
                  <h3 className="mb-4 text-sm font-medium text-slate-900 dark:text-white">Actif</h3>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <Row label="411 — Créances clients" value={reports.balanceSheet.assets.receivables} />
                    <Row label="531 — Caisse" value={reports.balanceSheet.assets.cash} />
                    <Row label="512 — Banque" value={reports.balanceSheet.assets.bank} />
                    <Row label="Total actif" value={reports.balanceSheet.assets.total} bold />
                  </div>
                </div>
                <div className={card}>
                  <h3 className="mb-4 text-sm font-medium text-slate-900 dark:text-white">Passif</h3>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <Row label="401 — Dettes fournisseurs" value={reports.balanceSheet.liabilities.supplierPayables} />
                    <Row label="4457 — TVA collectée" value={reports.balanceSheet.liabilities.tvaCollectee} />
                    <Row label="44581 — FODEC collecté" value={reports.balanceSheet.liabilities.fodecCollecte} />
                    <Row label="4371 — Timbre fiscal à décaisser" value={reports.balanceSheet.liabilities.timbreADecaisser} />
                    <Row label="4028 — Retenues à la source à décaisser" value={reports.balanceSheet.liabilities.rsADecaisser} />
                    <Row label="Total passif" value={reports.balanceSheet.liabilities.total} bold />
                  </div>
                </div>
              </div>
            </div>

            {/* P&L */}
            <div className={surface}>
              <h2 className="mb-5 font-semibold text-slate-950 dark:text-white">Compte de résultat</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={card}>
                  <h3 className="mb-4 text-sm font-medium text-slate-900 dark:text-white">Produits</h3>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <Row label="706 — Ventes de marchandises" value={reports.profitAndLoss.revenue.salesRevenue} />
                    <Row label="609 — Avoirs fournisseurs" value={reports.profitAndLoss.revenue.purchaseCredits} />
                    <Row label="Total produits" value={reports.profitAndLoss.revenue.total} bold />
                  </div>
                </div>
                <div className={card}>
                  <h3 className="mb-4 text-sm font-medium text-slate-900 dark:text-white">Charges</h3>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <Row label="607 — Achats de marchandises" value={reports.profitAndLoss.expenses.purchasesExpense} />
                    <Row label="60800 — FODEC sur achats" value={reports.profitAndLoss.expenses.fodecAchats} />
                    <Row label="6371 — Timbre fiscal" value={reports.profitAndLoss.expenses.timbreFiscal} />
                    <Row label="Total charges" value={reports.profitAndLoss.expenses.total} bold />
                  </div>
                </div>
              </div>

              {/* TVA net */}
              <div className={`${card} mt-4`}>
                <h3 className="mb-4 text-sm font-medium text-slate-900 dark:text-white">Position TVA / FODEC</h3>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <Row label="4457 — TVA collectée (ventes)" value={reports.profitAndLoss.tax.tvaCollectee} />
                  <Row label="4456 — TVA déductible (achats)" value={reports.profitAndLoss.tax.tvaDeductible} />
                  <Row label="TVA nette due" value={reports.profitAndLoss.tax.tvaNet} bold />
                  <div className="pt-2" />
                  <Row label="44581 — FODEC collecté (ventes)" value={reports.profitAndLoss.tax.fodecCollecte} />
                  <Row label="4371 — Timbre à décaisser" value={reports.profitAndLoss.tax.timbreADecaisser} />
                  <Row label="4028 — RS à décaisser" value={reports.profitAndLoss.tax.rsADecaisser} />
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-semibold text-white dark:bg-slate-950">
                Résultat net : {tnd(reports.profitAndLoss.netResult)}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
