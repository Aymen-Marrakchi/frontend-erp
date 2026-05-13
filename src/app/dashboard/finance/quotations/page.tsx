"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { devisService, type Devis } from "@/services/commercial/devisService";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, FileText, Loader2, Printer, Search, Trash2 } from "lucide-react";

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

function statusBadge(status: Devis["status"]) {
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

function openQuotationDocument(invoice: Devis) {
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
      <title>Devis · ${invoice.devisNo}</title>
    </head>
    <body style="font-family:Arial,sans-serif;color:#0f172a;padding:28px">
      <header style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px">
        <div>
          <div style="font-size:18px;font-weight:700">ERP · Finance</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">Devis client</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:700">${invoice.devisNo}</div>
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
          <div style="font-size:14px;font-weight:600;margin-top:4px">${invoice.status}</div>
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
  const [documents, setDocuments] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const all = await devisService.getAll();
      setDocuments(all);
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
      [doc.devisNo, doc.customerName, doc.salesOrderId?.orderNo || "", doc.status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [documents, search]);

  const act = async (id: string, fn: () => Promise<unknown>) => {
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

  const handleDelete = async (id: string) => {
    await act(id, () => devisService.deleteById(id));
    setDeleteConfirmId(null);
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Devis
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Consultez les devis générés pour les commandes en cours.
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
            {!filtered.length ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText size={32} className="mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-sm text-slate-400 dark:text-slate-500">Aucun devis trouvé</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((doc) => {
                  const badge = statusBadge(doc.status);
                  const busy = actionId === doc._id;
                  const canAccept = ["PENDING", "SENT"].includes(doc.status);

                  return (
                    <div
                      key={doc._id}
                      className="grid w-full gap-3 px-6 py-4 md:grid-cols-[1.1fr_1fr_0.7fr_auto]"
                    >
                      {/* Identity */}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{doc.devisNo}</p>
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

                      {/* Actions dropdown */}
                      <div className="relative flex items-center justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === doc._id ? null : doc._id); }}
                          disabled={busy}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          {busy ? <Loader2 size={13} className="animate-spin" /> : null}
                          Actions
                          <ChevronDown size={13} className={`transition-transform ${openMenuId === doc._id ? "rotate-180" : ""}`} />
                        </button>

                        {openMenuId === doc._id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div
                            className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
                          >
                            <button
                              onClick={() => { setOpenMenuId(null); openQuotationDocument(doc); }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Printer size={14} className="text-slate-400" />
                              Imprimer
                            </button>

                            <button
                              onClick={() => { setOpenMenuId(null); act(doc._id, () => devisService.accept(doc._id)); }}
                              disabled={!canAccept}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-slate-50 disabled:cursor-default disabled:opacity-50 dark:hover:bg-slate-800"
                            >
                              <CheckCircle2 size={14} className={canAccept ? "text-emerald-500" : "text-slate-300"} />
                              <span className={canAccept ? "text-slate-700 dark:text-slate-200" : "text-slate-400"}>
                                Accepter
                              </span>
                            </button>

                            <div className="mx-3 border-t border-slate-100 dark:border-slate-800" />

                            <button
                              onClick={() => { setOpenMenuId(null); setDeleteConfirmId(doc._id); }}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20"
                            >
                              <Trash2 size={14} />
                              Supprimer
                            </button>
                          </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {deleteConfirmId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-950 dark:text-white">Supprimer le devis ?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Cette action est irréversible. Le devis sera définitivement supprimé.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={actionId === deleteConfirmId}
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {actionId === deleteConfirmId && <Loader2 size={13} className="animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ProtectedRoute>
  );
}
