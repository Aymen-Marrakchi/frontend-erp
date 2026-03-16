"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useMemo, useState } from "react";
import { purchaseInvoiceService, PurchaseInvoice } from "@/services/purchase/purchaseInvoiceService";
import { purchasePaymentService, PurchasePayment, PurchasePaymentSummary } from "@/services/purchase/purchasePaymentService";
import {
  AlertTriangle,
  CreditCard,
  Loader2,
  Plus,
  Search,
  Wallet,
  X,
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

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

export default function PurchasePaymentsPage() {
  const { language } = useLanguage();
  const text =
    language === "fr"
      ? {
          title: "Paiements fournisseurs",
          subtitle: "Enregistrez les règlements, suivez les échéances et les soldes fournisseurs en temps réel",
          add: "Nouveau paiement",
          outstanding: "Restant dû",
          paid: "Payé",
          overdue: "En retard",
          dueSuppliers: "Fournisseurs à payer",
          history: "Historique des paiements",
          search: "Rechercher paiement, facture, fournisseur...",
          loading: "Chargement des paiements...",
          empty: "Aucun paiement fournisseur pour le moment",
          balances: "Soldes fournisseurs",
          noBalances: "Aucun solde fournisseur restant",
        }
      : {
          title: "Supplier Payments",
          subtitle: "Register settlements, follow due invoices, and monitor supplier balances in real time",
          add: "New Payment",
          outstanding: "Outstanding",
          paid: "Paid",
          overdue: "Overdue",
          dueSuppliers: "Suppliers Due",
          history: "Payment History",
          search: "Search payment, invoice, supplier...",
          loading: "Loading payments...",
          empty: "No supplier payments yet",
          balances: "Supplier Balances",
          noBalances: "No outstanding supplier balances",
        };
  const [payments, setPayments] = useState<PurchasePayment[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [summary, setSummary] = useState<PurchasePaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"BANK_TRANSFER" | "CHECK" | "CASH">("BANK_TRANSFER");
  const [paymentDate, setPaymentDate] = useState("");
  const [notes, setNotes] = useState("");

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [paymentData, invoiceData, summaryData] = await Promise.all([
        purchasePaymentService.getAll(),
        purchaseInvoiceService.getAll(),
        purchasePaymentService.getSummary(),
      ]);
      setPayments(paymentData);
      setInvoices(invoiceData);
      setSummary(summaryData);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load supplier payments"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const payableInvoices = useMemo(
    () => invoices.filter((invoice) => ["APPROVED", "PARTIALLY_PAID"].includes(invoice.status)),
    [invoices]
  );

  const selectedInvoice = useMemo(
    () => payableInvoices.find((invoice) => invoice._id === selectedInvoiceId) || null,
    [payableInvoices, selectedInvoiceId]
  );

  useEffect(() => {
    if (!selectedInvoice) return;
    const remaining = Math.max(0, selectedInvoice.totalTtc - (selectedInvoice.amountPaid || 0));
    setAmount(remaining.toFixed(3));
  }, [selectedInvoice]);

  const filteredPayments = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter((payment) =>
      [payment.paymentNo, payment.supplierId?.name, payment.purchaseInvoiceId?.invoiceNo, payment.method]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [payments, search]);

  const createPayment = async () => {
    try {
      if (!selectedInvoice) {
        throw new Error("Select an approved supplier invoice");
      }

      setSaving(true);
      setError("");
      await purchasePaymentService.create({
        supplierId: selectedInvoice.supplierId._id,
        purchaseInvoiceId: selectedInvoice._id,
        method,
        amount: Number(amount),
        paymentDate: new Date(paymentDate).toISOString(),
        notes,
      });

      setShowCreate(false);
      setSelectedInvoiceId("");
      setAmount("");
      setMethod("BANK_TRANSFER");
      setPaymentDate("");
      setNotes("");
      await fetchAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to register supplier payment"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE_MANAGER"]}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Purchasing · ERP
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <CreditCard size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {text.title}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {text.subtitle}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <Plus size={15} />
            {text.add}
          </button>
        </div>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              label: text.outstanding,
              value: summary?.totalOutstanding || 0,
              icon: Wallet,
              formatMoney: true,
            },
            {
              label: text.paid,
              value: summary?.totalPaid || 0,
              icon: CreditCard,
              formatMoney: true,
            },
            {
              label: text.overdue,
              value: summary?.overdueCount || 0,
              icon: AlertTriangle,
              formatMoney: false,
            },
            {
              label: text.dueSuppliers,
              value: summary?.supplierBalances.length || 0,
              icon: Wallet,
              formatMoney: false,
            },
          ].map((card) => (
            <div key={card.label} className={`${surface} flex items-center gap-4 px-5 py-5`}>
              <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                <card.icon size={16} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                  {card.formatMoney
                    ? `${card.value.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`
                    : card.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.7fr,1fr]">
          <div className={`${surface} overflow-hidden`}>
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{text.history}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {filteredPayments.length} of {payments.length} payments
                </p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={text.search}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" /> {text.loading}
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                {text.empty}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      <th className="px-6 py-3 font-medium">Payment</th>
                      <th className="px-6 py-3 font-medium">Supplier</th>
                      <th className="px-6 py-3 font-medium">Invoice</th>
                      <th className="px-6 py-3 font-medium">Method</th>
                      <th className="px-6 py-3 font-medium">Amount</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredPayments.map((payment) => (
                      <tr key={payment._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {payment.paymentNo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-900 dark:text-white">{payment.supplierId?.name}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{payment.purchaseInvoiceId?.invoiceNo}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{payment.method}</td>
                        <td className="px-6 py-4 text-slate-900 dark:text-white">
                          {payment.amount.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {new Date(payment.paymentDate).toLocaleDateString("fr-TN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={`${surface} p-6`}>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{text.balances}</h2>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={14} className="animate-spin" />
                  Loading balances...
                </div>
              ) : !summary || summary.supplierBalances.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{text.noBalances}</p>
              ) : (
                summary.supplierBalances
                  .filter((entry) => entry.balance > 0)
                  .sort((a, b) => b.balance - a.balance)
                  .map((entry) => {
                    const supplier = invoices.find((invoice) => invoice.supplierId._id === entry.supplierId)?.supplierId;
                    return (
                      <div key={entry.supplierId} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                        <p className="font-medium text-slate-900 dark:text-white">{supplier?.name || entry.supplierId}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {entry.balance.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND outstanding
                        </p>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Register Supplier Payment</h3>
                <button
                  onClick={() => setShowCreate(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Approved Invoice
                  </label>
                  <select className={inputClass} value={selectedInvoiceId} onChange={(e) => setSelectedInvoiceId(e.target.value)}>
                    <option value="">— Select invoice —</option>
                    {payableInvoices.map((invoice) => (
                      <option key={invoice._id} value={invoice._id}>
                        {invoice.invoiceNo} · {invoice.supplierId.name} · Remaining{" "}
                        {(invoice.totalTtc - (invoice.amountPaid || 0)).toFixed(3)} TND
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Method
                  </label>
                  <select className={inputClass} value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHECK">Check</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Amount
                  </label>
                  <input type="number" min={0} step="0.001" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Payment Date
                  </label>
                  <input type="date" className={inputClass} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Notes
                  </label>
                  <textarea className={`${inputClass} min-h-24`} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={createPayment}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Register Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
