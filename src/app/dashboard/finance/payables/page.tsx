"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { financeService, FinancePayable } from "@/services/finance/financeService";
import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

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
  return "Failed to load payables";
}

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

export default function FinancePayablesPage() {
  const { language } = useLanguage();
  const text =
    language === "fr"
      ? {
          title: "Dettes",
          subtitle: "Les factures fournisseurs qui remontent de l'Achat vers la Finance",
          loading: "Chargement des dettes",
          outstanding: "Restant dû",
          paid: "Payé",
          overdue: "Factures en retard",
          exposure: "Exposition des factures fournisseurs",
          noPayables: "Aucune dette pour le moment",
          status: "Statut",
          matching: "Rapprochement",
          invoice: "Facture",
          due: "Échéance",
          credit: "Avoir",
          overdueLabel: "En retard",
          current: "À jour",
        }
      : {
          title: "Payables",
          subtitle: "Supplier invoices flowing from Purchase into Finance",
          loading: "Loading payables",
          outstanding: "Outstanding",
          paid: "Paid",
          overdue: "Overdue Invoices",
          exposure: "Supplier Invoice Exposure",
          noPayables: "No payables yet",
          status: "Status",
          matching: "Matching",
          invoice: "Invoice",
          due: "Due",
          credit: "Credit",
          overdueLabel: "Overdue",
          current: "Current",
        };
  const [items, setItems] = useState<FinancePayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setItems(await financeService.getPayables());
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const totals = useMemo(
    () => ({
      outstanding: items.reduce((sum, item) => sum + item.outstanding, 0),
      paid: items.reduce((sum, item) => sum + item.amountPaid, 0),
      overdue: items.filter((item) => item.isOverdue).length,
    }),
    [items]
  );

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{text.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {text.subtitle}
          </p>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400`}>
            <Loader2 size={16} className="animate-spin" />
            {text.loading}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className={`${surface} p-5`}>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{text.outstanding}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {totals.outstanding.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                </p>
              </div>
              <div className={`${surface} p-5`}>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{text.paid}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {totals.paid.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                </p>
              </div>
              <div className={`${surface} p-5`}>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{text.overdue}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{totals.overdue}</p>
              </div>
            </div>

            <div className={`${surface} overflow-hidden`}>
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-950 dark:text-white">{text.exposure}</h2>
              </div>

              {!items.length ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <FileText size={32} className="mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">{text.noPayables}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => (
                    <div key={item._id} className="grid gap-3 px-6 py-4 md:grid-cols-[1.2fr_1fr_0.8fr_0.9fr_0.9fr]">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{item.invoiceNo}</p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {item.supplierName} {item.supplierNo ? `(${item.supplierNo})` : ""}
                        </p>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        <p>{text.status}: <span className="font-medium text-slate-900 dark:text-white">{item.status}</span></p>
                        <p>{text.matching}: {item.matchingStatus}</p>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        <p>{text.invoice}: {item.invoiceDate ? new Date(item.invoiceDate).toLocaleDateString("fr-TN") : "-"}</p>
                        <p>{text.due}: {item.dueDate ? new Date(item.dueDate).toLocaleDateString("fr-TN") : "-"}</p>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        <p>Paid: {item.amountPaid.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND</p>
                        <p>{text.credit}: {item.creditNoteAmount.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {item.outstanding.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                        </p>
                        <p className={item.isOverdue ? "text-rose-500" : "text-slate-400"}>
                          {item.isOverdue ? text.overdueLabel : text.current}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
