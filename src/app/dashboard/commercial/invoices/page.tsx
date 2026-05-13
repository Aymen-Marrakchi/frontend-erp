"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { customerInvoiceService, type CustomerInvoice } from "@/services/commercial/customerInvoiceService";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Search } from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

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

export default function CommercialInvoicesPage() {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await customerInvoiceService.getAll();
      setInvoices(data);
      if (!selectedId && data[0]?._id) {
        setSelectedId(data[0]._id);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load customer invoices"));
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return invoices
      .filter((invoice) =>
        [invoice.invoiceNo, invoice.customerName, invoice.salesOrderId?.orderNo || ""]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
  }, [invoices, search]);

  const selectedInvoice = useMemo(
    () => filtered.find((invoice) => invoice._id === selectedId) || filtered[0] || null,
    [filtered, selectedId]
  );

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Customer Invoices
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Read-only visibility of invoices created automatically from commercial orders.
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
            placeholder="Search by invoice, customer or order..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-white"
          />
        </div>

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400`}>
            <Loader2 size={16} className="animate-spin" />
            Loading invoices
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className={`${surface} overflow-hidden`}>
              <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                <h2 className="font-semibold text-slate-950 dark:text-white">Invoices</h2>
              </div>
              {!filtered.length ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <FileText size={32} className="mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">No customer invoices yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((invoice) => (
                    <button
                      key={invoice._id}
                      onClick={() => setSelectedId(invoice._id)}
                      className={`grid w-full gap-3 px-6 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40 md:grid-cols-[1.2fr_1fr_0.8fr] ${
                        selectedInvoice?._id === invoice._id ? "bg-slate-50 dark:bg-slate-800/40" : ""
                      }`}
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{invoice.invoiceNo}</p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {invoice.customerName} · {invoice.salesOrderId?.orderNo || "-"}
                        </p>
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        <p>{invoice.legalizationStatus}</p>
                        <p>{invoice.paymentStatus}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {invoice.totalTtc.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                        </p>
                        <p className="text-xs text-slate-400">{invoice.paymentMethod}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={`${surface} p-6`}>
              <h2 className="font-semibold text-slate-950 dark:text-white">Invoice Details</h2>
              {!selectedInvoice ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Select an invoice first</p>
              ) : (
                <div className="mt-4 space-y-4 text-sm">
                  <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                    <p className="font-medium text-slate-900 dark:text-white">{selectedInvoice.invoiceNo}</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      {selectedInvoice.customerName} · {selectedInvoice.salesOrderId?.orderNo || "-"}
                    </p>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">
                      Issue date:{" "}
                      <span className="font-medium text-slate-900 dark:text-white">
                        {selectedInvoice.issueDate
                          ? new Date(selectedInvoice.issueDate).toLocaleDateString("fr-TN")
                          : "-"}
                      </span>
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Pricing mode:{" "}
                      <span className="font-medium text-slate-900 dark:text-white">
                        {selectedInvoice.pricingMode}
                      </span>
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Payment method:{" "}
                      <span className="font-medium text-slate-900 dark:text-white">
                        {selectedInvoice.paymentMethod}
                      </span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                    <p>HT: <span className="font-medium text-slate-900 dark:text-white">{selectedInvoice.subtotalHt.toFixed(3)} TND</span></p>
                    <p>TVA: <span className="font-medium text-slate-900 dark:text-white">{selectedInvoice.totalVat.toFixed(3)} TND</span></p>
                    <p>FODEC: <span className="font-medium text-slate-900 dark:text-white">{selectedInvoice.totalFodec.toFixed(3)} TND</span></p>
                    <p>Timbre: <span className="font-medium text-slate-900 dark:text-white">{selectedInvoice.timbreFiscal.toFixed(3)} TND</span></p>
                    <p className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                      TTC: <span className="font-semibold text-slate-900 dark:text-white">{selectedInvoice.totalTtc.toFixed(3)} TND</span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                    <p className="mb-2 font-medium text-slate-900 dark:text-white">Lines</p>
                    <div className="space-y-2">
                      {selectedInvoice.lines.map((line) => (
                        <div key={line._id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2 dark:border-slate-800">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {line.productId?.name || "Unknown product"}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {line.productId?.sku || "—"} · Qty {line.quantity}
                            </p>
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {line.subtotalHt.toFixed(3)} TND
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
