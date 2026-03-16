"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useMemo, useState } from "react";
import { purchaseInvoiceService, PurchaseInvoice } from "@/services/purchase/purchaseInvoiceService";
import { purchaseOrderService, PurchaseOrder } from "@/services/purchase/purchaseOrderService";
import { purchaseReceiptService, PurchaseReceipt } from "@/services/purchase/purchaseReceiptService";
import { supplierService, Supplier } from "@/services/purchase/supplierService";
import { purchaseSettingService, PurchaseSettings } from "@/services/purchase/purchaseSettingService";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Wallet,
  X,
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

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400";

export default function PurchaseInvoicesPage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [settings, setSettings] = useState<PurchaseSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [receiptIds, setReceiptIds] = useState<string[]>([]);
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subtotalHt, setSubtotalHt] = useState("");
  const [applyTva, setApplyTva] = useState(true);
  const [applyFodec, setApplyFodec] = useState(true);
  const [notes, setNotes] = useState("");

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [invoiceData, orderData, receiptData, supplierData, settingsData] = await Promise.all([
        purchaseInvoiceService.getAll(),
        purchaseOrderService.getAll(),
        purchaseReceiptService.getAll(),
        supplierService.getAll(),
        purchaseSettingService.get(),
      ]);
      setInvoices(invoiceData);
      setOrders(orderData);
      setReceipts(receiptData);
      setSuppliers(supplierData.filter((supplier) => !supplier.isBlocked));
      setSettings(settingsData);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load supplier invoices"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const invoiceableOrders = useMemo(
    () => orders.filter((order) => ["SENT", "RECEIVED", "CLOSED"].includes(order.status)),
    [orders]
  );

  const orderReceipts = useMemo(
    () => receipts.filter((receipt) => receipt.purchaseOrderId?._id === purchaseOrderId),
    [receipts, purchaseOrderId]
  );

  useEffect(() => {
    const order = orders.find((item) => item._id === purchaseOrderId);
    if (!order) {
      setReceiptIds([]);
      setSubtotalHt("");
      return;
    }
    setSupplierId(order.supplierId?._id || "");
    setSubtotalHt(order.subtotalHt.toFixed(3));
    setReceiptIds([]);
  }, [purchaseOrderId, orders]);

  const taxPreview = useMemo(() => {
    const baseHt = Number(subtotalHt || 0);
    const vatRate = applyTva ? Number(settings?.defaultVatRate || 0) : 0;
    const fodecRate = applyFodec ? Number(settings?.defaultFodecRate || 0) : 0;
    const timbreFiscal = Number(settings?.defaultTimbreFiscal || 0);
    const totalVat = baseHt * (vatRate / 100);
    const totalFodec = baseHt * (fodecRate / 100);
    const totalBeforeStamp = baseHt + totalVat + totalFodec;
    const totalTtc = totalBeforeStamp + timbreFiscal;

    return { totalVat, totalFodec, totalBeforeStamp, totalTtc, timbreFiscal };
  }, [applyFodec, applyTva, settings, subtotalHt]);

  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter((invoice) =>
      [invoice.invoiceNo, invoice.supplierInvoiceRef, invoice.supplierId?.name, invoice.purchaseOrderId?.orderNo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [invoices, search]);

  const createInvoice = async () => {
    try {
      setSaving(true);
      setError("");
      await purchaseInvoiceService.create({
        supplierInvoiceRef,
        supplierId,
        purchaseOrderId,
        receiptIds,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: new Date(dueDate).toISOString(),
        applyTva,
        applyFodec,
        notes,
      });
      setShowCreate(false);
      setSupplierId("");
      setPurchaseOrderId("");
      setReceiptIds([]);
      setSupplierInvoiceRef("");
      setInvoiceDate("");
      setDueDate("");
      setSubtotalHt("");
      setApplyTva(true);
      setApplyFodec(true);
      setNotes("");
      await fetchAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create supplier invoice"));
    } finally {
      setSaving(false);
    }
  };

  const updateInvoiceStatus = async (
    invoice: PurchaseInvoice,
    status: "APPROVED" | "REJECTED" | "PARTIALLY_PAID" | "PAID"
  ) => {
    try {
      setError("");
      await purchaseInvoiceService.updateStatus(invoice._id, {
        status,
        amountPaid: status === "PARTIALLY_PAID" ? invoice.totalTtc / 2 : undefined,
        rejectionReason: status === "REJECTED" ? "Rejected during purchase review" : undefined,
      });
      await fetchAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update invoice status"));
    }
  };

  const toggleReceipt = (id: string) => {
    setReceiptIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "PURCHASE_MANAGER"]}>
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Purchasing · ERP
          </p>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Receipt size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Supplier Invoices <span className="text-slate-400 dark:text-slate-500">Management</span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Register supplier invoices, keep BC and receipt matching clean, and follow approval or payment status.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              <Plus size={15} />
              New Invoice
            </button>
          </div>
        </div>

        {error && !showCreate && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Pending", value: invoices.filter((i) => i.status === "PENDING_APPROVAL").length, icon: FileText, bg: "bg-amber-50 dark:bg-amber-950/30", color: "text-amber-600 dark:text-amber-400" },
            { label: "Approved", value: invoices.filter((i) => i.status === "APPROVED").length, icon: CheckCircle2, bg: "bg-emerald-50 dark:bg-emerald-950/30", color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Paid", value: invoices.filter((i) => i.status === "PAID").length, icon: Wallet, bg: "bg-blue-50 dark:bg-blue-950/30", color: "text-blue-600 dark:text-blue-400" },
            { label: "Mismatch", value: invoices.filter((i) => i.matchingStatus === "MISMATCH").length, icon: XCircle, bg: "bg-rose-50 dark:bg-rose-950/30", color: "text-rose-600 dark:text-rose-400" },
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

        <div className={`${surface} overflow-hidden`}>
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Supplier Invoices</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filteredInvoices.length} of {invoices.length} invoices
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice, supplier, BC..."
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              Loading invoices...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              No supplier invoices yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-3 font-medium">Invoice</th>
                    <th className="px-6 py-3 font-medium">Supplier</th>
                    <th className="px-6 py-3 font-medium">BC</th>
                    <th className="px-6 py-3 font-medium">HT</th>
                    <th className="px-6 py-3 font-medium">TVA</th>
                    <th className="px-6 py-3 font-medium">FODEC</th>
                    <th className="px-6 py-3 font-medium">TTC</th>
                    <th className="px-6 py-3 font-medium">3-Way Match</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice._id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {invoice.invoiceNo}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {invoice.supplierInvoiceRef}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-900 dark:text-white">{invoice.supplierId?.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{invoice.purchaseOrderId?.orderNo}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {Number(invoice.subtotalHt || 0).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {Number(invoice.totalVat || 0).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {Number(invoice.totalFodec || 0).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {Number(invoice.totalTtc || 0).toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            invoice.matchingStatus === "MATCHED"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                          }`}
                        >
                          {invoice.matchingStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {invoice.status}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              invoice.legalizationStatus === "LEGALISEE"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            }`}
                          >
                            {invoice.legalizationStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {invoice.status === "PENDING_APPROVAL" && (
                            <>
                              <button
                                onClick={() => updateInvoiceStatus(invoice, "APPROVED")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                              >
                                <CheckCircle2 size={11} />
                                Approve
                              </button>
                              <button
                                onClick={() => updateInvoiceStatus(invoice, "REJECTED")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
                              >
                                <XCircle size={11} />
                                Reject
                              </button>
                            </>
                          )}
                          {invoice.status === "APPROVED" && (
                            <>
                              <button
                                onClick={() => updateInvoiceStatus(invoice, "PARTIALLY_PAID")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300"
                              >
                                <Wallet size={11} />
                                Partial Pay
                              </button>
                              <button
                                onClick={() => updateInvoiceStatus(invoice, "PAID")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              >
                                <ShieldCheck size={11} />
                                Mark Paid
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Create Supplier Invoice</h3>
                <button
                  onClick={() => setShowCreate(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                    <ShieldCheck size={16} />
                    <span className="font-medium">Settings tax defaults</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3 text-slate-600 dark:text-slate-300">
                    <p>
                      TVA:{" "}
                      <span className="font-medium text-slate-950 dark:text-white">
                        {Number(settings?.defaultVatRate || 0).toFixed(3)}%
                      </span>
                    </p>
                    <p>
                      FODEC:{" "}
                      <span className="font-medium text-slate-950 dark:text-white">
                        {Number(settings?.defaultFodecRate || 0).toFixed(3)}%
                      </span>
                    </p>
                    <p>
                      Timbre:{" "}
                      <span className="font-medium text-slate-950 dark:text-white">
                        {Number(settings?.defaultTimbreFiscal || 0).toFixed(3)} TND
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Purchase Order</label>
                  <select className={inputClass} value={purchaseOrderId} onChange={(e) => setPurchaseOrderId(e.target.value)}>
                    <option value="">— Select BC —</option>
                    {invoiceableOrders.map((order) => (
                      <option key={order._id} value={order._id}>
                        {order.orderNo} · {order.supplierId?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Supplier</label>
                  <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                    <option value="">— Select supplier —</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name} ({supplier.supplierNo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Supplier Invoice Ref</label>
                  <input className={inputClass} value={supplierInvoiceRef} onChange={(e) => setSupplierInvoiceRef(e.target.value)} />
                </div>

                <div>
                  <label className={labelClass}>Invoice Date</label>
                  <input type="date" className={inputClass} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                </div>

                <div>
                  <label className={labelClass}>Due Date</label>
                  <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>

                <div>
                  <label className={labelClass}>HT</label>
                  <input type="number" className={inputClass} value={subtotalHt} readOnly disabled />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    HT is taken automatically from the selected BC and receipts.
                  </p>
                </div>

                <div>
                  <label className={labelClass}>Tax inclusion</label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input type="checkbox" checked={applyTva} onChange={(e) => setApplyTva(e.target.checked)} />
                      Include TVA
                    </label>
                    <label className="mt-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input type="checkbox" checked={applyFodec} onChange={(e) => setApplyFodec(e.target.checked)} />
                      Include FODEC
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
                  <p className="font-medium text-slate-900 dark:text-white">Automatic totals</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <p className="text-slate-600 dark:text-slate-300">
                      TVA:{" "}
                      <span className="font-medium text-slate-950 dark:text-white">
                        {taxPreview.totalVat.toFixed(3)} TND
                      </span>
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      FODEC:{" "}
                      <span className="font-medium text-slate-950 dark:text-white">
                        {taxPreview.totalFodec.toFixed(3)} TND
                      </span>
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      Timbre:{" "}
                      <span className="font-medium text-slate-950 dark:text-white">
                        {taxPreview.timbreFiscal.toFixed(3)} TND
                      </span>
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      TTC:{" "}
                      <span className="font-medium text-slate-950 dark:text-white">
                        {taxPreview.totalTtc.toFixed(3)} TND
                      </span>
                    </p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Receipts for 3-Way Match</label>
                  <div className="max-h-32 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    {orderReceipts.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">No receipts linked to this BC yet</p>
                    ) : (
                      orderReceipts.map((receipt) => (
                        <label key={receipt._id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={receiptIds.includes(receipt._id)}
                            onChange={() => toggleReceipt(receipt._id)}
                          />
                          {receipt.receiptNo} · {receipt.receiptStatus}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Notes</label>
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
                  onClick={createInvoice}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create Invoice
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
