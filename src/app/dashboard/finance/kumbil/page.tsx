"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import {
  customerInvoiceService,
  type CustomerInvoice,
} from "@/services/commercial/customerInvoiceService";
import { useLanguage } from "@/context/LanguageContext";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Search, Trash2 } from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function getErrorMessage(err: unknown, fallback: string) {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message ===
      "string"
  ) {
    return (err as { response: { data: { message: string } } }).response.data.message;
  }
  return fallback;
}

export default function KumbilPage() {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setInvoices(await customerInvoiceService.getAllKumbil());
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("fin_kumbilLoadError")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter((inv) =>
      [inv.invoiceNo, inv.customerName, inv.salesOrderId?.orderNo || ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [invoices, search]);

  const withPending = useMemo(
    () => filtered.filter((inv) => inv.installments.some((t) => t.status !== "PAID")),
    [filtered]
  );

  const handleCancel = async (invoice: CustomerInvoice, index: number) => {
    const key = `${invoice._id}:${index}`;
    if (!confirm("Supprimer cette traite ? Elle sera retirée du calendrier.")) return;
    try {
      setDeletingKey(key);
      setError("");
      await customerInvoiceService.cancelInstallment(invoice._id, index);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, t("fin_kumbilDeleteError")));
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {t("fin_kumbilTitle")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("fin_kumbilSubtitle")}
          </p>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        ) : null}

        <div className={`${surface} flex items-center gap-3 px-5 py-3.5`}>
          <Search size={15} className="shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("fin_kumbilSearch")}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-white"
          />
        </div>

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400`}>
            <Loader2 size={16} className="animate-spin" />
            {t("fin_loading")}
          </div>
        ) : !withPending.length ? (
          <div className={`${surface} flex flex-col items-center justify-center py-16`}>
            <CalendarDays size={32} className="mb-3 text-slate-300 dark:text-slate-700" />
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {t("fin_noKumbil")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {withPending.map((invoice) => {
              const pending = invoice.installments.filter((t) => t.status !== "PAID");
              return (
                <div key={invoice._id} className={`${surface} overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {invoice.invoiceNo}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        {invoice.salesOrderId?.orderNo || "-"} · {invoice.customerName}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {invoice.totalTtc.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} {t("fin_tnd")}
                      </p>
                      <p className="text-slate-400 dark:text-slate-500">
                        {pending.length} {pending.length !== 1 ? t("fin_kumbilDrafts") : t("fin_kumbilDraft")} {t("fin_kumbilPending")}
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {invoice.installments.map((installment, index) => {
                      if (installment.status === "PAID") return null;
                      const key = `${invoice._id}:${index}`;
                      const due = new Date(installment.dueDate + (installment.dueDate.includes("T") ? "" : "T12:00:00"));
                      return (
                        <div
                          key={installment._id}
                          className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-violet-100 text-sm font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {installment.plannedAmount.toLocaleString("fr-TN", {
                                  minimumFractionDigits: 3,
                                })}{" "}
                                {t("fin_tnd")}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <CalendarDays size={11} />
                                <span>{t("fin_kumbilDue")}</span>
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                  {due.toLocaleDateString("fr-TN", {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </span>
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleCancel(invoice, index)}
                            disabled={deletingKey === key}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-300 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/20"
                          >
                            <Trash2 size={14} />
                            {deletingKey === key ? "..." : t("fin_delete")}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
