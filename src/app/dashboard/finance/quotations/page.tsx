"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { customerInvoiceService, type CustomerInvoice } from "@/services/commercial/customerInvoiceService";
import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, FileText, Loader2, Pencil, Printer, Search, Send, Trash2, X, XCircle } from "lucide-react";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

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

function r3(n: number) {
  return (Math.round((n + Number.EPSILON) * 1000) / 1000).toFixed(3);
}

function statusBadge(status: CustomerInvoice["quotationStatus"]) {
  switch (status) {
    case "PENDING":
      return { label: "En attente", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" };
    case "SENT":
      return { label: "Envoyé", cls: "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300" };
    case "ACCEPTED":
      return { label: "Accepté", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" };
    case "REJECTED":
      return { label: "Refusé", cls: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" };
    case "CANCELLED":
      return { label: "Annulé", cls: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400" };
    default:
      return { label: status, cls: "bg-slate-100 text-slate-600" };
  }
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
      <title>Devis · ${invoice.invoiceNo}</title>
    </head>
    <body style="font-family:Arial,sans-serif;color:#0f172a;padding:28px">
      <header style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px">
        <div>
          <div style="font-size:18px;font-weight:700">ERP · Finance</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">Devis client</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:700">${invoice.invoiceNo}</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">${new Date(
            invoice.issueDate || Date.now()
          ).toLocaleDateString("fr-TN")}</div>
        </div>
      </header>

      <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px">
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Client</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px">${invoice.customerName}</div>
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Commande</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px">${order?.orderNo || "-"}</div>
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Statut</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px">${invoice.quotationStatus}</div>
        </div>
      </section>

      <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
        <thead>
          <tr>
            <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;background:#f8fafc">SKU</th>
            <th style="border:1px solid #cbd5e1;padding:8px;text-align:left;background:#f8fafc">Produit</th>
            <th style="border:1px solid #cbd5e1;padding:8px;text-align:center;background:#f8fafc">Qté</th>
            <th style="border:1px solid #cbd5e1;padding:8px;text-align:right;background:#f8fafc">P.U. HT</th>
            <th style="border:1px solid #cbd5e1;padding:8px;text-align:right;background:#f8fafc">Montant HT</th>
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

export default function FinanceQuotationsPage() {
  const [documents, setDocuments] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<CustomerInvoice | null>(null);
  const [editPricingMode, setEditPricingMode] = useState<"HT_BASED" | "TTC_BASED">("HT_BASED");
  const [editPrices, setEditPrices] = useState<number[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const all = await customerInvoiceService.getAll();
      setDocuments(all.filter((d) => d.documentStage === "QUOTATION"));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Échec du chargement des devis"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return documents.filter((doc) =>
      [doc.invoiceNo, doc.customerName, doc.salesOrderId?.orderNo || "", doc.quotationStatus]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [documents, search]);

  const act = async (
    id: string,
    fn: () => Promise<unknown>
  ) => {
    try {
      setActionId(id);
      setError("");
      await fn();
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Action échouée"));
    } finally {
      setActionId(null);
    }
  };

  const openEdit = (doc: CustomerInvoice) => {
    const mode = doc.pricingMode ?? "HT_BASED";
    setEditInvoice(doc);
    setEditPricingMode(mode);
    setEditPrices(
      doc.lines.map((line) =>
        mode === "TTC_BASED" ? line.inputUnitPrice : line.baseUnitHt
      )
    );
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editInvoice) return;
    try {
      setSaving(true);
      setError("");
      await customerInvoiceService.configure(editInvoice._id, {
        pricingMode: editPricingMode,
        lineOverrides: editPrices.map((unitPrice, index) => ({ index, unitPrice })),
      });
      setEditOpen(false);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Échec de la modification"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Devis
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gérez les devis envoyés aux clients. Un devis doit être accepté avant que la commande puisse être confirmée.
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
            placeholder="Rechercher par numéro, client ou commande..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-white"
          />
        </div>

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400`}>
            <Loader2 size={16} className="animate-spin" />
            Chargement des devis...
          </div>
        ) : (
          <div className={`${surface} overflow-hidden`}>
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                Liste des devis
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Marquez chaque devis comme envoyé, puis enregistrez la réponse du client.
              </p>
            </div>

            {!filtered.length ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText size={32} className="mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-sm text-slate-400 dark:text-slate-500">Aucun devis trouvé</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((doc) => {
                  const badge = statusBadge(doc.quotationStatus);
                  const busy = actionId === doc._id;
                  const canEdit = !["ACCEPTED", "CANCELLED"].includes(doc.quotationStatus);
                  const canSend = ["PENDING", "REJECTED"].includes(doc.quotationStatus);
                  const canAccept = ["PENDING", "SENT"].includes(doc.quotationStatus);
                  const canReject = ["PENDING", "SENT"].includes(doc.quotationStatus);
                  const canCancel = !["ACCEPTED", "CANCELLED"].includes(doc.quotationStatus);
                  const canDelete = doc.quotationStatus === "PENDING";

                  return (
                    <div
                      key={doc._id}
                      className="grid w-full gap-3 px-6 py-4 md:grid-cols-[1.1fr_1fr_0.7fr_auto]"
                    >
                      {/* Identity */}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{doc.invoiceNo}</p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {doc.salesOrderId?.orderNo || "-"} · {doc.customerName}
                        </p>
                      </div>

                      {/* Amounts */}
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        <p>
                          TTC :{" "}
                          <span className="font-medium text-slate-900 dark:text-white">
                            {doc.totalTtc.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                          </span>
                        </p>
                        <p>
                          Commande :{" "}
                          <span className="font-medium text-slate-900 dark:text-white">
                            {doc.salesOrderId?.status || "-"}
                          </span>
                        </p>
                      </div>

                      {/* Status badge */}
                      <div className="flex items-center">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          onClick={() => openQuotationDocument(doc)}
                          title="Imprimer"
                          className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Printer size={14} />
                          Imprimer
                        </button>

                        {canEdit ? (
                          <button
                            onClick={() => openEdit(doc)}
                            disabled={busy}
                            title="Modifier le devis"
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-violet-300 px-3 py-2 text-sm font-medium text-violet-700 transition hover:bg-violet-50 disabled:opacity-60 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/30"
                          >
                            <Pencil size={14} />
                            Modifier
                          </button>
                        ) : null}

                        {canSend ? (
                          <button
                            onClick={() => act(doc._id, () => customerInvoiceService.markAsSent(doc._id))}
                            disabled={busy}
                            title="Marquer comme envoyé au client"
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-sky-300 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50 disabled:opacity-60 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/30"
                          >
                            <Send size={14} />
                            {busy ? "..." : "Envoyé"}
                          </button>
                        ) : null}

                        {canAccept ? (
                          <button
                            onClick={() => act(doc._id, () => customerInvoiceService.accept(doc._id))}
                            disabled={busy}
                            title="Le client a accepté le devis"
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                          >
                            <CheckCircle2 size={14} />
                            {busy ? "..." : "Accepté"}
                          </button>
                        ) : null}

                        {canReject ? (
                          <button
                            onClick={() => act(doc._id, () => customerInvoiceService.reject(doc._id))}
                            disabled={busy}
                            title="Le client a refusé le devis"
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30"
                          >
                            <XCircle size={14} />
                            {busy ? "..." : "Refusé"}
                          </button>
                        ) : null}

                        {canCancel ? (
                          <button
                            onClick={() => act(doc._id, () => customerInvoiceService.cancelQuotation(doc._id))}
                            disabled={busy}
                            title="Annuler le devis"
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-60 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/30"
                          >
                            <Ban size={14} />
                            {busy ? "..." : "Annuler"}
                          </button>
                        ) : null}

                        {canDelete ? (
                          <button
                            onClick={() => act(doc._id, () => customerInvoiceService.deleteById(doc._id))}
                            disabled={busy}
                            title="Supprimer le devis"
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                          >
                            <Trash2 size={14} />
                            {busy ? "..." : "Supprimer"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {editOpen && editInvoice ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Modifier le devis
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {editInvoice.invoiceNo} · {editInvoice.customerName}
                </p>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {(() => {
              const tva = editInvoice.tvaRate ?? 19;
              const fodec = editInvoice.fodecRate ?? 1;
              const timbre = editInvoice.timbreFiscal ?? 1;
              const multiplier = 1 + tva / 100 + fodec / 100;

              let prevHt = 0, prevVat = 0, prevFodec = 0, prevBeforeStamp = 0;
              editInvoice.lines.forEach((line, idx) => {
                const price = editPrices[idx] ?? 0;
                const qty = line.quantity;
                if (editPricingMode === "HT_BASED") {
                  const sh = price * qty;
                  prevHt += sh;
                  prevVat += sh * (tva / 100);
                  prevFodec += sh * (fodec / 100);
                  prevBeforeStamp += sh * multiplier;
                } else {
                  const buh = multiplier > 0 ? price / multiplier : price;
                  const sh = buh * qty;
                  prevHt += sh;
                  prevVat += sh * (tva / 100);
                  prevFodec += sh * (fodec / 100);
                  prevBeforeStamp += price * qty;
                }
              });
              const prevTtc = prevBeforeStamp + timbre;

              const exampleHt = 12;
              const exampleTtcHtBased = Math.round((exampleHt * multiplier + timbre + Number.EPSILON) * 1000) / 1000;
              const exampleBeforeStamp = 12;
              const exampleTtcTtcBased = Math.round((exampleBeforeStamp + timbre + Number.EPSILON) * 1000) / 1000;

              return (
                <div className="space-y-5">
                  {/* Mode selector */}
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Mode de tarification
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {(["HT_BASED", "TTC_BASED"] as const).map((mode) => {
                        const selected = editPricingMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setEditPricingMode(mode)}
                            className={`rounded-2xl border p-4 text-left transition ${
                              selected
                                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-slate-900"
                                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                            }`}
                          >
                            <p className="text-sm font-semibold">
                              {mode === "HT_BASED" ? "HT Based" : "TTC Based"}
                            </p>
                            {mode === "HT_BASED" ? (
                              <p className={`mt-1 text-xs leading-relaxed ${selected ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>
                                Vous saisissez le <strong>prix unitaire HT</strong>.<br />
                                Ex : PU = 12.000 → TTC = {exampleTtcHtBased.toFixed(3)} TND
                              </p>
                            ) : (
                              <p className={`mt-1 text-xs leading-relaxed ${selected ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>
                                Vous saisissez le <strong>prix avant timbre</strong> (TVA + FODEC inclus).<br />
                                Ex : PU = 12.000 → TTC = {exampleTtcTtcBased.toFixed(3)} TND
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Line price inputs */}
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Prix unitaires&nbsp;
                      <span className="normal-case font-normal">
                        ({editPricingMode === "HT_BASED" ? "HT — hors TVA et FODEC" : "avant timbre — TVA et FODEC inclus"})
                      </span>
                    </p>
                    <div className="space-y-2">
                      {editInvoice.lines.map((line, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-2.5 dark:border-slate-700"
                        >
                          <span className="flex-1 text-sm">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {line.productId?.name || `Ligne ${idx + 1}`}
                            </span>
                            <span className="ml-2 text-slate-400">× {line.quantity}</span>
                          </span>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={editPrices[idx] ?? ""}
                            onChange={(e) => {
                              const next = [...editPrices];
                              next[idx] = parseFloat(e.target.value) || 0;
                              setEditPrices(next);
                            }}
                            className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-right text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                          <span className="w-8 shrink-0 text-xs text-slate-400">TND</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live preview */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-800/40">
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500">
                        <span>Sous-total HT</span>
                        <span className="font-medium text-slate-900 dark:text-white">{r3(prevHt)} TND</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>TVA ({tva}%)</span>
                        <span className="font-medium text-slate-900 dark:text-white">{r3(prevVat)} TND</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>FODEC ({fodec}%)</span>
                        <span className="font-medium text-slate-900 dark:text-white">{r3(prevFodec)} TND</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Timbre fiscal</span>
                        <span className="font-medium text-slate-900 dark:text-white">{r3(timbre)} TND</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1.5 dark:border-slate-700">
                        <span className="font-semibold text-slate-900 dark:text-white">Total TTC</span>
                        <span className="font-bold text-slate-900 dark:text-white">{r3(prevTtc)} TND</span>
                      </div>
                    </div>
                  </div>

                  {["SENT", "REJECTED"].includes(editInvoice.quotationStatus) ? (
                    <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
                      La modification remettra le statut à «En attente» — le devis devra être renvoyé au client.
                    </p>
                  ) : null}
                </div>
              );
            })()}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Annuler
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ProtectedRoute>
  );
}
