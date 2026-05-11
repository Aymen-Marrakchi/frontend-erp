"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { customerInvoiceService, type CustomerInvoice } from "@/services/commercial/customerInvoiceService";
import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Printer, Search } from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function badgeClass(stage: CustomerInvoice["documentStage"]) {
  return stage === "INVOICE"
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
    : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
}

function quotationStatusClass(status: CustomerInvoice["quotationStatus"]) {
  return status === "CANCELLED"
    ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
}

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

function openQuotationDocument(invoice: CustomerInvoice) {
  const order = invoice.salesOrderId;
  const rows = invoice.lines
    .map(
      (line) => `
        <tr>
          <td style="border:1px solid #cbd5e1;padding:8px">${line.productId?.sku || "-"}</td>
          <td style="border:1px solid #cbd5e1;padding:8px">${line.productId?.name || "-"}</td>
          <td style="border:1px solid #cbd5e1;padding:8px;text-align:center">${line.quantity}</td>
          <td style="border:1px solid #cbd5e1;padding:8px;text-align:right">${line.baseUnitHt.toFixed(3)} TND</td>
          <td style="border:1px solid #cbd5e1;padding:8px;text-align:right">${line.subtotalHt.toFixed(3)} TND</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>Quotation · ${invoice.invoiceNo}</title>
    </head>
    <body style="font-family:Arial,sans-serif;color:#0f172a;padding:28px">
      <header style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px">
        <div>
          <div style="font-size:18px;font-weight:700">ERP · Commercial</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">Customer quotation</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:700">${invoice.invoiceNo}</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">${new Date(
            invoice.issueDate || Date.now()
          ).toLocaleDateString("fr-TN")}</div>
        </div>
      </header>

      <section style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px">
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Client</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px">${invoice.customerName}</div>
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Order</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px">${order?.orderNo || "-"}</div>
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Pricing basis</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px">${invoice.pricingMode}</div>
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Stage</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px">${invoice.documentStage}</div>
        </div>
      </section>

      <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
        <thead>
          <tr>
            <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;background:#f8fafc">SKU</th>
            <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;background:#f8fafc">Product</th>
            <th style="border:1px solid #cbd5e1;padding:8px;text-align:center;background:#f8fafc">Qty</th>
            <th style="border:1px solid #cbd5e1;padding:8px;text-align:right;background:#f8fafc">Unit HT</th>
            <th style="border:1px solid #cbd5e1;padding:8px;text-align:right;background:#f8fafc">Line HT</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <section style="margin-left:auto;width:320px;font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span>HT</span><strong>${invoice.subtotalHt.toFixed(3)} TND</strong></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span>TVA</span><strong>${invoice.totalVat.toFixed(3)} TND</strong></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span>FODEC</span><strong>${invoice.totalFodec.toFixed(3)} TND</strong></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Timbre</span><strong>${invoice.timbreFiscal.toFixed(3)} TND</strong></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #334155;margin-top:6px;font-size:15px"><span>TTC</span><strong>${invoice.totalTtc.toFixed(3)} TND</strong></div>
      </section>
    </body>
  </html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }
}

export default function CommercialQuotationsPage() {
  const [documents, setDocuments] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setDocuments(await customerInvoiceService.getAll());
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Failed to load quotations"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return documents.filter((doc) =>
      [doc.invoiceNo, doc.customerName, doc.salesOrderId?.orderNo || "", doc.documentStage]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [documents, search]);

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Quotations
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Read-only visibility of the billing document created for each commercial order.
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
            placeholder="Search quotations, orders or customers..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-white"
          />
        </div>

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400`}>
            <Loader2 size={16} className="animate-spin" />
            Loading quotations
          </div>
        ) : (
          <div className={`${surface} overflow-hidden`}>
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                Commercial Billing Documents
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                You can see whether each document is still a quotation or has already moved to invoice stage.
              </p>
            </div>

            {!filtered.length ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText size={32} className="mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-sm text-slate-400 dark:text-slate-500">No quotation documents found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
                    <tr>
                      {["Document No.", "Order", "Customer", "Stage", "Settlement", "Payment Status", "Total", "Actions"].map((label) => (
                        <th key={label} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map((doc) => (
                      <tr key={doc._id}>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{doc.invoiceNo}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{doc.salesOrderId?.orderNo || "-"}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{doc.customerName}</td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(doc.documentStage)}`}>
                                {doc.documentStage === "QUOTATION" ? "Quotation" : "Invoice"}
                              </span>
                            </div>
                            {doc.documentStage === "QUOTATION" ? (
                              <div>
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${quotationStatusClass(doc.quotationStatus)}`}>
                                  {doc.quotationStatus === "CANCELLED" ? "Cancelled" : "Active"}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          {doc.settlementSplits?.length
                            ? `${doc.settlementSplits.length} split${doc.settlementSplits.length > 1 ? "s" : ""} · ${doc.paymentMethod}`
                            : doc.paymentMethod}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{doc.paymentStatus}</td>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          {doc.totalTtc.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                        </td>
                        <td className="px-6 py-4">
                          {doc.quotationStatus !== "CANCELLED" ? (
                            <button
                              onClick={() => openQuotationDocument(doc)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Printer size={14} />
                              Print
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
