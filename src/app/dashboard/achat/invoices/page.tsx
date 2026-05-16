"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useMemo, useState } from "react";
import { purchaseInvoiceService, PurchaseInvoice } from "@/services/purchase/purchaseInvoiceService";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Receipt,
  Search,
  Wallet,
  XCircle,
} from "lucide-react";

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const STATUS_BADGE: Record<string, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  REJECTED: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  PARTIALLY_PAID: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_APPROVAL: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  PARTIALLY_PAID: "Part. payée",
  PAID: "Soldée",
};

export default function PurchaseInvoicesPage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      setInvoices(await purchaseInvoiceService.getAll());
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erreur lors du chargement des factures"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter((inv) =>
      [inv.invoiceNo, inv.supplierInvoiceRef, inv.supplierId?.name, inv.purchaseOrderId?.orderNo]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [invoices, search]);

  const updateStatus = async (invoice: PurchaseInvoice, status: "APPROVED" | "REJECTED") => {
    try {
      setError("");
      await purchaseInvoiceService.updateStatus(invoice._id, {
        status,
        rejectionReason: status === "REJECTED" ? "Rejetée lors de la revue achat" : undefined,
      });
      await fetchAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erreur lors de la mise à jour du statut"));
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE_MANAGER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Achats · ERP
          </p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Receipt size={18} className="text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                Factures fournisseurs
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Créées automatiquement à la réception — approuvez pour envoyer à la Finance.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "En attente", value: invoices.filter((i) => i.status === "PENDING_APPROVAL").length, icon: FileText, bg: "bg-amber-50 dark:bg-amber-950/30", color: "text-amber-600 dark:text-amber-400" },
            { label: "Approuvées", value: invoices.filter((i) => i.status === "APPROVED").length, icon: CheckCircle2, bg: "bg-sky-50 dark:bg-sky-950/30", color: "text-sky-600 dark:text-sky-400" },
            { label: "Soldées", value: invoices.filter((i) => i.status === "PAID").length, icon: Wallet, bg: "bg-emerald-50 dark:bg-emerald-950/30", color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Désaccord", value: invoices.filter((i) => i.matchingStatus === "MISMATCH").length, icon: XCircle, bg: "bg-rose-50 dark:bg-rose-950/30", color: "text-rose-600 dark:text-rose-400" },
          ].map((card) => (
            <div key={card.label} className={`${surface} flex items-center gap-4 px-5 py-5`}>
              <div className={`rounded-2xl p-3 ${card.bg}`}>
                <card.icon size={16} className={card.color} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className={`${surface} overflow-hidden`}>
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Liste des factures</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filteredInvoices.length} / {invoices.length} factures
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher facture, fournisseur, BC…"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              Chargement…
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              Aucune facture — elles sont créées automatiquement lors des réceptions.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-3 font-medium">Facture</th>
                    <th className="px-6 py-3 font-medium">Fournisseur</th>
                    <th className="px-6 py-3 font-medium">BC</th>
                    <th className="px-6 py-3 font-medium">HT</th>
                    <th className="px-6 py-3 font-medium">TTC</th>
                    <th className="px-6 py-3 font-medium">Rapproch.</th>
                    <th className="px-6 py-3 font-medium">Statut</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {inv.invoiceNo}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {inv.supplierInvoiceRef}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-900 dark:text-white">{inv.supplierId?.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{inv.purchaseOrderId?.orderNo}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {Number(inv.subtotalHt || 0).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {Number(inv.totalTtc || 0).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          inv.matchingStatus === "MATCHED"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        }`}>
                          {inv.matchingStatus === "MATCHED" ? "Conforme" : "Désaccord"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[inv.status] ?? ""}`}>
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {inv.status === "PENDING_APPROVAL" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateStatus(inv, "APPROVED")}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                            >
                              <CheckCircle2 size={11} />
                              Approuver
                            </button>
                            <button
                              onClick={() => updateStatus(inv, "REJECTED")}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
                            >
                              <XCircle size={11} />
                              Rejeter
                            </button>
                          </div>
                        )}
                        {(inv.status === "APPROVED" || inv.status === "PARTIALLY_PAID") && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            En attente de paiement (Finance)
                          </span>
                        )}
                        {inv.status === "PAID" && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ Soldée</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
