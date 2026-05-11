"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { customerInvoiceService, type CustomerInvoice, type CustomerInvoicePayment } from "@/services/commercial/customerInvoiceService";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCheck, CreditCard, Loader2, Search, Wallet, X } from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

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

function remainingAmount(invoice: CustomerInvoice) {
  return Math.max(0, Number(invoice.totalTtc || 0) - Number(invoice.amountPaid || 0));
}

function paymentStatusLabel(status: CustomerInvoice["paymentStatus"]) {
  switch (status) {
    case "NON_PAYEE":
      return "Non payée";
    case "PARTIELLEMENT_PAYEE":
      return "Partiellement payée";
    case "PENDING_CHEQUE":
      return "Chèque en attente";
    case "PAYEE":
      return "Payée";
    default:
      return status;
  }
}

function paymentStatusClass(status: CustomerInvoice["paymentStatus"]) {
  switch (status) {
    case "NON_PAYEE":
      return "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300";
    case "PARTIELLEMENT_PAYEE":
      return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300";
    case "PENDING_CHEQUE":
      return "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300";
    default:
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
  }
}

export default function FinancePaymentsPage() {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [payOpen, setPayOpen] = useState(false);
  const [kambyalOpen, setKambyalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"ESPECE" | "CHEQUE" | "VIREMENT">("ESPECE");
  const [payReference, setPayReference] = useState("");

  const [kambyalCount, setKambyalCount] = useState("3");
  const [kambyalMode, setKambyalMode] = useState("DAYS_30");
  const [kambyalStartDate, setKambyalStartDate] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await customerInvoiceService.getAll();
      const pending = data.filter(
        (invoice) =>
          invoice.documentStage === "INVOICE" &&
          ["NON_PAYEE", "PARTIELLEMENT_PAYEE", "PENDING_CHEQUE"].includes(invoice.paymentStatus)
      );
      setInvoices(pending);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load règlements"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unpaidInvoices = useMemo(
    () =>
      invoices.filter((inv) =>
        ["NON_PAYEE", "PARTIELLEMENT_PAYEE"].includes(inv.paymentStatus)
      ),
    [invoices]
  );

  const chequeInvoices = useMemo(
    () => invoices.filter((inv) => inv.paymentStatus === "PENDING_CHEQUE"),
    [invoices]
  );

  const filteredUnpaid = useMemo(() => {
    const query = search.toLowerCase();
    return unpaidInvoices.filter((invoice) =>
      [invoice.invoiceNo, invoice.customerName, invoice.salesOrderId?.orderNo || ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [unpaidInvoices, search]);

  const filteredCheques = useMemo(() => {
    const query = search.toLowerCase();
    return chequeInvoices.filter((invoice) =>
      [invoice.invoiceNo, invoice.customerName, invoice.salesOrderId?.orderNo || ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [chequeInvoices, search]);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice._id === selectedInvoiceId) || null,
    [invoices, selectedInvoiceId]
  );

  const openPay = (invoice: CustomerInvoice) => {
    setSelectedInvoiceId(invoice._id);
    setPayAmount(String(remainingAmount(invoice)));
    setPayMethod("ESPECE");
    setPayReference("");
    setPayOpen(true);
  };

  const openKambyal = (invoice: CustomerInvoice) => {
    setSelectedInvoiceId(invoice._id);
    setKambyalCount("3");
    setKambyalMode("DAYS_30");
    setKambyalStartDate(new Date().toISOString().slice(0, 10));
    setKambyalOpen(true);
  };

  const savePay = async () => {
    if (!selectedInvoice) return;
    try {
      setSaving(true);
      setError("");
      const payload: Record<string, unknown> = {
        method: payMethod,
        amount: Number(payAmount),
      };
      if (payMethod !== "CHEQUE" && payReference.trim()) {
        payload.reference = payReference.trim();
      }
      await customerInvoiceService.registerPayment(selectedInvoice._id, payload);
      setPayOpen(false);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to save règlement"));
    } finally {
      setSaving(false);
    }
  };

  const saveKambyal = async () => {
    if (!selectedInvoice) return;
    try {
      setSaving(true);
      setError("");
      await customerInvoiceService.configure(selectedInvoice._id, {
        paymentMethod: "KUMBIL",
        installmentPlan: {
          mode: kambyalMode,
          installmentsCount: Math.max(1, Number(kambyalCount || 1)),
          startDate: new Date(kambyalStartDate || new Date()).toISOString(),
          remainingOnly: true,
        },
      });
      setKambyalOpen(false);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create Kambyal plan"));
    } finally {
      setSaving(false);
    }
  };

  const encaisserCheque = async (invoice: CustomerInvoice, payment: CustomerInvoicePayment) => {
    const key = `${invoice._id}:${payment._id}`;
    try {
      setClearingId(key);
      setError("");
      await customerInvoiceService.clearCheque(invoice._id, payment._id);
      await load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to clear cheque"));
    } finally {
      setClearingId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "FINANCE_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Règlements
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Enregistrez les règlements clients et encaissez les chèques après le délai de 8 jours.
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
            placeholder="Rechercher par facture, commande ou client..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-white"
          />
        </div>

        {loading ? (
          <div className={`${surface} flex items-center justify-center gap-2 py-16 text-sm text-slate-500 dark:text-slate-400`}>
            <Loader2 size={16} className="animate-spin" />
            Chargement...
          </div>
        ) : (
          <>
            {/* Unpaid invoices */}
            <div className={`${surface} overflow-hidden`}>
              <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Factures à régler
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Factures non payées ou partiellement payées.
                </p>
              </div>

              {!filteredUnpaid.length ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <CreditCard size={32} className="mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Aucune facture impayée
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUnpaid.map((invoice) => (
                    <div
                      key={invoice._id}
                      className="grid gap-4 px-6 py-4 md:grid-cols-[1.1fr_0.9fr_0.8fr_auto]"
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {invoice.invoiceNo}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                          {invoice.salesOrderId?.orderNo || "-"} · {invoice.customerName}
                        </p>
                      </div>

                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        <p>
                          Total:{" "}
                          <span className="font-medium text-slate-900 dark:text-white">
                            {invoice.totalTtc.toLocaleString("fr-TN", {
                              minimumFractionDigits: 3,
                            })}{" "}
                            TND
                          </span>
                        </p>
                        <p>
                          Restant:{" "}
                          <span className="font-medium text-slate-900 dark:text-white">
                            {remainingAmount(invoice).toLocaleString("fr-TN", {
                              minimumFractionDigits: 3,
                            })}{" "}
                            TND
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center md:justify-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusClass(
                            invoice.paymentStatus
                          )}`}
                        >
                          {paymentStatusLabel(invoice.paymentStatus)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          onClick={() => openPay(invoice)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-900"
                        >
                          <Wallet size={14} />
                          Régler
                        </button>
                        <button
                          onClick={() => openKambyal(invoice)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <CreditCard size={14} />
                          Kambyal
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending cheques */}
            <div className={`${surface} overflow-hidden`}>
              <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Chèques en attente d'encaissement
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Chèques reçus, encaissables après le délai de compensation de 8 jours.
                </p>
              </div>

              {!filteredCheques.length ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <CheckCheck size={32} className="mb-3 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Aucun chèque en attente
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCheques.map((invoice) => {
                    const pendingPayments = invoice.payments.filter(
                      (p) => p.method === "CHEQUE" && p.status === "PENDING"
                    );
                    return (
                      <div key={invoice._id} className="px-6 py-4">
                        <div className="mb-3">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {invoice.invoiceNo}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            {invoice.salesOrderId?.orderNo || "-"} · {invoice.customerName}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {pendingPayments.map((payment) => {
                            const key = `${invoice._id}:${payment._id}`;
                            const dueDate = payment.dueDate ? new Date(payment.dueDate) : null;
                            const isCleared = dueDate ? dueDate <= new Date() : true;
                            return (
                              <div
                                key={payment._id}
                                className="flex items-center justify-between rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 dark:border-sky-900/30 dark:bg-sky-950/20"
                              >
                                <div className="text-sm">
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    {payment.reference || "CHQ"} —{" "}
                                    {Number(payment.amount).toLocaleString("fr-TN", {
                                      minimumFractionDigits: 3,
                                    })}{" "}
                                    TND
                                  </p>
                                  {dueDate ? (
                                    <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                                      Encaissable le{" "}
                                      {dueDate.toLocaleDateString("fr-TN")}
                                      {!isCleared ? (
                                        <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                          (délai non échu)
                                        </span>
                                      ) : null}
                                    </p>
                                  ) : null}
                                </div>
                                <button
                                  onClick={() => encaisserCheque(invoice, payment)}
                                  disabled={!isCleared || clearingId === key}
                                  className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
                                >
                                  <CheckCheck size={14} />
                                  {clearingId === key ? "..." : "Encaisser"}
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
          </>
        )}

        {payOpen && selectedInvoice ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                    Enregistrer un règlement
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedInvoice.invoiceNo} · {selectedInvoice.customerName}
                  </p>
                </div>
                <button
                  onClick={() => setPayOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <p>
                    Montant restant :{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {remainingAmount(selectedInvoice).toLocaleString("fr-TN", {
                        minimumFractionDigits: 3,
                      })}{" "}
                      TND
                    </strong>
                  </p>
                </div>

                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-600 dark:text-slate-300">
                    Mode de règlement
                  </span>
                  <select
                    className={inputClass}
                    value={payMethod}
                    onChange={(e) =>
                      setPayMethod(e.target.value as "ESPECE" | "CHEQUE" | "VIREMENT")
                    }
                  >
                    <option value="ESPECE">Espèces</option>
                    <option value="CHEQUE">Chèque</option>
                    <option value="VIREMENT">Virement bancaire</option>
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-600 dark:text-slate-300">Montant</span>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.001"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </label>

                {payMethod === "CHEQUE" ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                    La référence chèque sera générée automatiquement <strong>CHQ-XXXX</strong>. Le chèque sera encaissable après 8 jours.
                  </div>
                ) : (
                  <label className="block text-sm">
                    <span className="mb-1.5 block text-slate-600 dark:text-slate-300">
                      Référence
                    </span>
                    <input
                      className={inputClass}
                      value={payReference}
                      onChange={(e) => setPayReference(e.target.value)}
                    />
                  </label>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setPayOpen(false)}
                  className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Annuler
                </button>
                <button
                  onClick={savePay}
                  disabled={saving || !payAmount}
                  className="rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {kambyalOpen && selectedInvoice ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                    Plan Kambyal
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedInvoice.invoiceNo} · {selectedInvoice.customerName}
                  </p>
                </div>
                <button
                  onClick={() => setKambyalOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-600 dark:text-slate-300">
                    Nombre de traites
                  </span>
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    value={kambyalCount}
                    onChange={(e) => setKambyalCount(e.target.value)}
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-600 dark:text-slate-300">
                    Périodicité
                  </span>
                  <select
                    className={inputClass}
                    value={kambyalMode}
                    onChange={(e) => setKambyalMode(e.target.value)}
                  >
                    <option value="DAYS_30">30 jours</option>
                    <option value="DAYS_60">60 jours</option>
                    <option value="DAYS_90">90 jours</option>
                  </select>
                </label>

                <label className="block text-sm">
                  <span className="mb-1.5 block text-slate-600 dark:text-slate-300">
                    Date de départ
                  </span>
                  <input
                    className={inputClass}
                    type="date"
                    value={kambyalStartDate}
                    onChange={(e) => setKambyalStartDate(e.target.value)}
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setKambyalOpen(false)}
                  className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  Annuler
                </button>
                <button
                  onClick={saveKambyal}
                  disabled={saving}
                  className="rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                >
                  {saving ? "Enregistrement..." : "Créer"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  );
}
