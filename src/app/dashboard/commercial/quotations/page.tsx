"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { devisService, type Devis } from "@/services/commercial/devisService";
import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Printer, Search } from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function statusBadgeClass(status: Devis["status"]) {
  switch (status) {
    case "ACCEPTED": return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
    case "REJECTED":
    case "CANCELLED": return "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    case "SENT": return "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300";
    default: return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
  }
}

function statusLabel(status: Devis["status"]) {
  switch (status) {
    case "PENDING": return "En attente";
    case "SENT": return "Envoyé";
    case "ACCEPTED": return "Accepté";
    case "REJECTED": return "Refusé";
    case "CANCELLED": return "Annulé";
    default: return status;
  }
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

function openDevisDocument(devis: Devis) {
  const order = devis.salesOrderId;
  const rows = devis.lines
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
      <title>Devis · ${devis.devisNo}</title>
    </head>
    <body style="font-family:Arial,sans-serif;color:#0f172a;padding:28px">
      <header style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px">
        <div>
          <div style="font-size:18px;font-weight:700">ERP · Commercial</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">Devis client</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:700">${devis.devisNo}</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">${new Date(
            devis.issueDate || Date.now()
          ).toLocaleDateString("fr-TN")}</div>
        </div>
      </header>

      <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px">
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Client</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px">${devis.customerName}</div>
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Commande</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px">${order?.orderNo || "-"}</div>
        </div>
        <div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px">
          <div style="font-size:10px;text-transform:uppercase;color:#94a3b8">Pricing</div>
          <div style="font-size:14px;font-weight:600;margin-top:4px">${devis.pricingMode}</div>
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
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span>HT</span><strong>${devis.subtotalHt.toFixed(3)} TND</strong></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span>TVA</span><strong>${devis.totalVat.toFixed(3)} TND</strong></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span>FODEC</span><strong>${devis.totalFodec.toFixed(3)} TND</strong></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Timbre</span><strong>${devis.timbreFiscal.toFixed(3)} TND</strong></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #334155;margin-top:6px;font-size:15px"><span>TTC</span><strong>${devis.totalTtc.toFixed(3)} TND</strong></div>
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
  const [documents, setDocuments] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setDocuments(await devisService.getAll());
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
      [doc.devisNo, doc.customerName, doc.salesOrderId?.orderNo || "", doc.status]
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
            Devis
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Consultez les devis générés pour chaque commande commerciale.
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
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50">
                    <tr>
                      {["N° Devis", "Commande", "Client", "Statut", "Total TTC", "Actions"].map((label) => (
                        <th key={label} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map((doc) => (
                      <tr key={doc._id}>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{doc.devisNo}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{doc.salesOrderId?.orderNo || "-"}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{doc.customerName}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(doc.status)}`}>
                            {statusLabel(doc.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                          {doc.totalTtc.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => openDevisDocument(doc)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <Printer size={14} />
                            Imprimer
                          </button>
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
