"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useMemo, useState } from "react";
import { purchaseInvoiceService, PurchaseInvoice } from "@/services/purchase/purchaseInvoiceService";
import { purchaseReceiptService, PurchaseReceipt } from "@/services/purchase/purchaseReceiptService";
import { purchaseReturnService, PurchaseReturn } from "@/services/purchase/purchaseReturnService";
import {
  AlertTriangle,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
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

type DraftReturnLine = {
  purchaseReceiptLineId: string;
  productLabel: string;
  acceptedQuantity: number;
  quantity: number;
  lotRef: string;
};

export default function PurchaseReturnsPage() {
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState("");
  const [purchaseReceiptId, setPurchaseReceiptId] = useState("");
  const [reason, setReason] = useState<"DEFECT" | "DELIVERY_ERROR" | "NON_CONFORMITY">("DEFECT");
  const [refundAmount, setRefundAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [draftLines, setDraftLines] = useState<DraftReturnLine[]>([]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [returnData, invoiceData, receiptData] = await Promise.all([
        purchaseReturnService.getAll(),
        purchaseInvoiceService.getAll(),
        purchaseReceiptService.getAll(),
      ]);
      setReturns(returnData);
      setInvoices(invoiceData);
      setReceipts(receiptData);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load supplier returns"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice._id === purchaseInvoiceId) || null,
    [invoices, purchaseInvoiceId]
  );

  const invoiceReceipts = useMemo(
    () =>
      receipts.filter((receipt) =>
        selectedInvoice ? selectedInvoice.receiptIds.some((item) => item._id === receipt._id) : false
      ),
    [receipts, selectedInvoice]
  );

  useEffect(() => {
    const receipt = receipts.find((item) => item._id === purchaseReceiptId);
    if (!receipt) {
      setDraftLines([]);
      return;
    }

    setDraftLines(
      receipt.lines
        .filter((line) => line.acceptedQuantity > 0)
        .map((line) => ({
          purchaseReceiptLineId: line._id,
          productLabel: `${line.productId.name} (${line.productId.sku})`,
          acceptedQuantity: line.acceptedQuantity,
          quantity: line.acceptedQuantity,
          lotRef: line.lotRef || "",
        }))
    );
  }, [purchaseReceiptId, receipts]);

  const filteredReturns = useMemo(() => {
    const q = search.toLowerCase();
    return returns.filter((purchaseReturn) =>
      [
        purchaseReturn.returnNo,
        purchaseReturn.supplierId?.name,
        purchaseReturn.purchaseInvoiceId?.invoiceNo,
        purchaseReturn.purchaseReceiptId?.receiptNo,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [returns, search]);

  const updateLineQty = (lineId: string, quantity: number) => {
    setDraftLines((current) =>
      current.map((line) =>
        line.purchaseReceiptLineId === lineId
          ? {
              ...line,
              quantity: Math.min(line.acceptedQuantity, Math.max(0, quantity || 0)),
            }
          : line
      )
    );
  };

  const createReturn = async () => {
    try {
      if (!selectedInvoice || !purchaseReceiptId) {
        throw new Error("Select the supplier invoice and receipt first");
      }

      setSaving(true);
      setError("");
      await purchaseReturnService.create({
        supplierId: selectedInvoice.supplierId._id,
        purchaseInvoiceId: selectedInvoice._id,
        purchaseReceiptId,
        reason,
        lines: draftLines
          .filter((line) => line.quantity > 0)
          .map((line) => ({
            purchaseReceiptLineId: line.purchaseReceiptLineId,
            quantity: line.quantity,
            lotRef: line.lotRef,
          })),
        refundAmount: Number(refundAmount || 0),
        notes,
      });

      setShowCreate(false);
      setPurchaseInvoiceId("");
      setPurchaseReceiptId("");
      setReason("DEFECT");
      setRefundAmount("");
      setNotes("");
      setDraftLines([]);
      await fetchAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create supplier return"));
    } finally {
      setSaving(false);
    }
  };

  const updateReturnStatus = async (
    purchaseReturn: PurchaseReturn,
    status: "REFUNDED" | "REPLACED" | "CLOSED"
  ) => {
    try {
      setError("");
      await purchaseReturnService.updateStatus(purchaseReturn._id, status);
      await fetchAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update supplier return status"));
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
                <RotateCcw size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Supplier Returns
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Create return notes, deduct stock, and follow refund or replacement with suppliers
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <Plus size={15} />
            New Return
          </button>
        </div>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Open", value: returns.filter((item) => item.status === "CREATED").length, icon: RotateCcw },
            { label: "Refunded", value: returns.filter((item) => item.status === "REFUNDED").length, icon: ShieldAlert },
            { label: "Replaced", value: returns.filter((item) => item.status === "REPLACED").length, icon: AlertTriangle },
            { label: "Closed", value: returns.filter((item) => item.status === "CLOSED").length, icon: ShieldAlert },
          ].map((card) => (
            <div key={card.label} className={`${surface} flex items-center gap-4 px-5 py-5`}>
              <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                <card.icon size={16} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`${surface} overflow-hidden`}>
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Supplier Return Notes</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filteredReturns.length} of {returns.length} returns
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search return, supplier, invoice..."
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Loading supplier returns...
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              No supplier returns yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-3 font-medium">Return</th>
                    <th className="px-6 py-3 font-medium">Supplier</th>
                    <th className="px-6 py-3 font-medium">Invoice</th>
                    <th className="px-6 py-3 font-medium">Receipt</th>
                    <th className="px-6 py-3 font-medium">Reason</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredReturns.map((purchaseReturn) => (
                    <tr key={purchaseReturn._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {purchaseReturn.returnNo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-900 dark:text-white">{purchaseReturn.supplierId?.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{purchaseReturn.purchaseInvoiceId?.invoiceNo}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{purchaseReturn.purchaseReceiptId?.receiptNo}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{purchaseReturn.reason}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {purchaseReturn.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {purchaseReturn.status === "CREATED" && (
                            <>
                              <button
                                onClick={() => updateReturnStatus(purchaseReturn, "REFUNDED")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                              >
                                Refund
                              </button>
                              <button
                                onClick={() => updateReturnStatus(purchaseReturn, "REPLACED")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300"
                              >
                                Replace
                              </button>
                              <button
                                onClick={() => updateReturnStatus(purchaseReturn, "CLOSED")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              >
                                Close
                              </button>
                            </>
                          )}
                          {(purchaseReturn.status === "REFUNDED" || purchaseReturn.status === "REPLACED") && (
                            <button
                              onClick={() => updateReturnStatus(purchaseReturn, "CLOSED")}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              Close
                            </button>
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
            <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Create Supplier Return</h3>
                <button
                  onClick={() => setShowCreate(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Supplier Invoice
                  </label>
                  <select className={inputClass} value={purchaseInvoiceId} onChange={(e) => setPurchaseInvoiceId(e.target.value)}>
                    <option value="">— Select invoice —</option>
                    {invoices.map((invoice) => (
                      <option key={invoice._id} value={invoice._id}>
                        {invoice.invoiceNo} · {invoice.supplierId.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Linked Receipt
                  </label>
                  <select className={inputClass} value={purchaseReceiptId} onChange={(e) => setPurchaseReceiptId(e.target.value)}>
                    <option value="">— Select receipt —</option>
                    {invoiceReceipts.map((receipt) => (
                      <option key={receipt._id} value={receipt._id}>
                        {receipt.receiptNo} · {receipt.receiptStatus}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Reason
                  </label>
                  <select className={inputClass} value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
                    <option value="DEFECT">Defect</option>
                    <option value="DELIVERY_ERROR">Delivery Error</option>
                    <option value="NON_CONFORMITY">Non Conformity</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Refund Amount
                  </label>
                  <input type="number" min={0} step="0.001" className={inputClass} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
                </div>
              </div>

              {draftLines.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        <th className="px-4 py-3 font-medium">Product</th>
                        <th className="px-4 py-3 font-medium">Accepted Qty</th>
                        <th className="px-4 py-3 font-medium">Return Qty</th>
                        <th className="px-4 py-3 font-medium">Lot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {draftLines.map((line) => (
                        <tr key={line.purchaseReceiptLineId}>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{line.productLabel}</td>
                          <td className="px-4 py-3">{line.acceptedQuantity}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={0}
                              max={line.acceptedQuantity}
                              className={inputClass}
                              value={line.quantity}
                              onChange={(e) => updateLineQty(line.purchaseReceiptLineId, Number(e.target.value))}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input className={inputClass} value={line.lotRef} readOnly />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                  Notes
                </label>
                <textarea className={`${inputClass} min-h-24`} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={createReturn}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Create Return
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
