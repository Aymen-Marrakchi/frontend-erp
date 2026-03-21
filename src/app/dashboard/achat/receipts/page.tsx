"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useMemo, useState } from "react";
import { purchaseOrderService, PurchaseOrder } from "@/services/purchase/purchaseOrderService";
import { purchaseReceiptService, PurchaseReceipt } from "@/services/purchase/purchaseReceiptService";
import { stockDepotService, type Depot } from "@/services/stock/stockDepotService";
import {
  ClipboardCheck,
  Loader2,
  PackageCheck,
  Plus,
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

type ReceiptDraftLine = {
  purchaseOrderLineId: string;
  productLabel: string;
  orderedQuantity: number;
  alreadyReceivedQuantity: number;
  remainingQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  qualityStatus: "ACCEPTED" | "WITH_RESERVATION" | "REJECTED";
  discrepancyNotes: string;
  lotRef: string;
};

export default function PurchaseReceiptsPage() {
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedDepotId, setSelectedDepotId] = useState("");
  const [notes, setNotes] = useState("");
  const [draftLines, setDraftLines] = useState<ReceiptDraftLine[]>([]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [receiptData, orderData, depotData] = await Promise.all([
        purchaseReceiptService.getAll(),
        purchaseOrderService.getAll(),
        stockDepotService.getAll(),
      ]);
      setReceipts(receiptData);
      setOrders(orderData);
      setDepots(depotData.filter((depot) => depot.status === "ACTIVE"));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load purchase receipts"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const receivableOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "SENT" &&
          order.lines.some((line) => (line.receivedQuantity || 0) < line.quantity)
      ),
    [orders]
  );

  useEffect(() => {
    const selectedOrder = receivableOrders.find((order) => order._id === selectedOrderId);
    if (!selectedOrder) {
      setDraftLines([]);
      return;
    }

    setDraftLines(
      selectedOrder.lines
        .map((line) => {
          const alreadyReceivedQuantity = line.receivedQuantity || 0;
          const remainingQuantity = Math.max(0, line.quantity - alreadyReceivedQuantity);

          return {
            purchaseOrderLineId: line._id,
            productLabel: `${line.productId.name} (${line.productId.sku})`,
            orderedQuantity: line.quantity,
            alreadyReceivedQuantity,
            remainingQuantity,
            receivedQuantity: remainingQuantity,
            acceptedQuantity: remainingQuantity,
            qualityStatus: "ACCEPTED" as const,
            discrepancyNotes: "",
            lotRef: "",
          };
        })
        .filter((line) => line.remainingQuantity > 0)
    );
  }, [selectedOrderId, receivableOrders]);

  const filteredReceipts = useMemo(() => {
    const q = search.toLowerCase();
    return receipts.filter((receipt) =>
      [receipt.receiptNo, receipt.purchaseOrderId?.orderNo, receipt.supplierId?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [receipts, search]);

  const updateLine = (
    lineId: string,
    key: keyof ReceiptDraftLine,
    value: string | number
  ) => {
    setDraftLines((current) =>
      current.map((line) => {
        if (line.purchaseOrderLineId !== lineId) return line;

        const next = { ...line, [key]: value } as ReceiptDraftLine;

        if (key === "receivedQuantity") {
          const clamped = Math.min(line.remainingQuantity, Math.max(0, Number(value) || 0));
          next.receivedQuantity = clamped;
          next.acceptedQuantity = Math.min(next.acceptedQuantity, clamped);
        }

        if (key === "acceptedQuantity") {
          next.acceptedQuantity = Math.min(
            line.receivedQuantity,
            Math.max(0, Number(value) || 0)
          );
        }

        return next;
      })
    );
  };

  const createReceipt = async () => {
    try {
      setSaving(true);
      setError("");
      const lines = draftLines
        .filter((line) => line.receivedQuantity > 0)
        .map((line) => ({
          purchaseOrderLineId: line.purchaseOrderLineId,
          receivedQuantity: line.receivedQuantity,
          acceptedQuantity: line.acceptedQuantity,
          qualityStatus: line.qualityStatus,
          discrepancyNotes: line.discrepancyNotes,
          lotRef: line.lotRef,
        }));

      if (!selectedOrderId || lines.length === 0) {
        throw new Error("Select a sent purchase order and add at least one received line");
      }
      if (!selectedDepotId) {
        throw new Error("Select a depot for this receipt");
      }

      await purchaseReceiptService.create({
        purchaseOrderId: selectedOrderId,
        depotId: selectedDepotId,
        lines,
        notes,
      });

      setShowCreate(false);
      setSelectedOrderId("");
      setSelectedDepotId("");
      setNotes("");
      setDraftLines([]);
      await fetchAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create purchase receipt"));
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
                <ClipboardCheck size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Bons de Reception
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Receive supplier goods, validate accepted quantities, and update stock automatically
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <Plus size={15} />
            New Receipt
          </button>
        </div>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Receipts", value: receipts.length, icon: ClipboardCheck },
            { label: "Sent BC", value: receivableOrders.length, icon: PackageCheck },
            {
              label: "Litigation",
              value: receipts.filter((receipt) => receipt.receiptStatus === "LITIGATION").length,
              icon: ShieldAlert,
            },
            {
              label: "Full",
              value: receipts.filter((receipt) => receipt.receiptStatus === "FULL").length,
              icon: PackageCheck,
            },
          ].map((card) => (
            <div key={card.label} className={`${surface} flex items-center gap-4 px-5 py-5`}>
              <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                <card.icon size={16} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className={`${surface} overflow-hidden`}>
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Reception History</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filteredReceipts.length} of {receipts.length} receipts
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search receipt, BC, supplier..."
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Loading receipts...
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              No receipts yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-3 font-medium">BR</th>
                    <th className="px-6 py-3 font-medium">BC</th>
                    <th className="px-6 py-3 font-medium">Supplier</th>
                    <th className="px-6 py-3 font-medium">Depot</th>
                    <th className="px-6 py-3 font-medium">Lines</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredReceipts.map((receipt) => (
                    <tr key={receipt._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {receipt.receiptNo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-900 dark:text-white">
                        {receipt.purchaseOrderId?.orderNo}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {receipt.supplierId?.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {receipt.depotId?.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {receipt.lines.length}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {receipt.receiptStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {new Date(receipt.createdAt).toLocaleString("fr-TN")}
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
            <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Create Purchase Receipt</h3>
                <button
                  onClick={() => setShowCreate(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Sent BC
                  </label>
                  <select
                    className={inputClass}
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                  >
                    <option value="">— Select sent purchase order —</option>
                    {receivableOrders.map((order) => (
                      <option key={order._id} value={order._id}>
                        {order.orderNo} · {order.supplierId?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Depot
                  </label>
                  <select
                    className={inputClass}
                    value={selectedDepotId}
                    onChange={(e) => setSelectedDepotId(e.target.value)}
                  >
                    <option value="">— Select depot —</option>
                    {depots.map((depot) => (
                      <option key={depot._id} value={depot._id}>
                        {depot.name}
                      </option>
                    ))}
                  </select>
                </div>

                {draftLines.length > 0 && (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          <th className="px-4 py-3 font-medium">Product</th>
                          <th className="px-4 py-3 font-medium">Ordered</th>
                          <th className="px-4 py-3 font-medium">Received</th>
                          <th className="px-4 py-3 font-medium">Remaining</th>
                          <th className="px-4 py-3 font-medium">This Receipt</th>
                          <th className="px-4 py-3 font-medium">Accepted</th>
                          <th className="px-4 py-3 font-medium">Quality</th>
                          <th className="px-4 py-3 font-medium">Lot</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {draftLines.map((line) => (
                          <tr key={line.purchaseOrderLineId}>
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                              {line.productLabel}
                            </td>
                            <td className="px-4 py-3">{line.orderedQuantity}</td>
                            <td className="px-4 py-3">{line.alreadyReceivedQuantity}</td>
                            <td className="px-4 py-3">{line.remainingQuantity}</td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                max={line.remainingQuantity}
                                className={inputClass}
                                value={line.receivedQuantity}
                                onChange={(e) =>
                                  updateLine(
                                    line.purchaseOrderLineId,
                                    "receivedQuantity",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                max={line.receivedQuantity}
                                className={inputClass}
                                value={line.acceptedQuantity}
                                onChange={(e) =>
                                  updateLine(
                                    line.purchaseOrderLineId,
                                    "acceptedQuantity",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                className={inputClass}
                                value={line.qualityStatus}
                                onChange={(e) =>
                                  updateLine(
                                    line.purchaseOrderLineId,
                                    "qualityStatus",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="ACCEPTED">Accepted</option>
                                <option value="WITH_RESERVATION">With Reservation</option>
                                <option value="REJECTED">Rejected</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                className={inputClass}
                                value={line.lotRef}
                                onChange={(e) =>
                                  updateLine(line.purchaseOrderLineId, "lotRef", e.target.value)
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Notes
                  </label>
                  <textarea
                    className={`${inputClass} min-h-24`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reception observations, discrepancies, supplier issue..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createReceipt}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Create Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
