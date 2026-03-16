"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { purchaseOrderService, PurchaseOrder } from "@/services/purchase/purchaseOrderService";
import { purchaseRequestService } from "@/services/purchase/purchaseRequestService";
import { tenderService, Tender } from "@/services/purchase/tenderService";
import { supplierService, Supplier } from "@/services/purchase/supplierService";
import {
  FileText,
  Search,
  Plus,
  Loader2,
  CheckCircle2,
  Send,
  PackageCheck,
  Archive,
  X,
} from "lucide-react";

type ApprovedRequest = {
  _id: string;
  requestNo: string;
  requestedQuantity: number;
  reason: string;
  productId?: { _id: string; name: string; sku: string };
  status: "APPROVED";
};

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

export default function PurchaseOrdersPage() {
  const { language } = useLanguage();
  const text =
    language === "fr"
      ? {
          title: "Bons de Commande",
          subtitle: "Générez les BC depuis les DA ou AO approuvés puis suivez leur cycle fournisseur",
          add: "Nouveau BC",
          tableTitle: "Bons de Commande",
          search: "Rechercher BC, fournisseur, DA, AO...",
          loading: "Chargement des BC...",
          empty: "Aucun bon de commande pour le moment",
        }
      : {
          title: "Purchase Orders",
          subtitle: "Generate BC from approved DA or awarded AO, then validate and follow the supplier order lifecycle",
          add: "New BC",
          tableTitle: "Purchase Orders",
          search: "Search BC, supplier, DA, AO...",
          loading: "Loading BC...",
          empty: "No purchase orders yet",
        };
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<ApprovedRequest[]>([]);
  const [awardedTenders, setAwardedTenders] = useState<Tender[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [sourceType, setSourceType] = useState<"DA" | "AO">("DA");
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedTenderId, setSelectedTenderId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [orderData, requestData, tenderData, supplierData] = await Promise.all([
        purchaseOrderService.getAll(),
        purchaseRequestService.getAll(),
        tenderService.getAll(),
        supplierService.getAll(),
      ]);
      setOrders(orderData);
      setApprovedRequests(
        requestData.filter(
          (request: ApprovedRequest | (ApprovedRequest & { status: string })) =>
            request.status === "APPROVED"
        )
      );
      setAwardedTenders(tenderData.filter((tender) => tender.status === "AWARDED"));
      setSuppliers(supplierData.filter((supplier) => !supplier.isBlocked));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load purchase orders"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((order) =>
      [
        order.orderNo,
        order.supplierId?.name,
        order.purchaseRequestId?.requestNo,
        order.tenderId?.tenderNo,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [orders, search]);

  const createOrder = async () => {
    try {
      setSaving(true);
      setError("");
      await purchaseOrderService.create({
        purchaseRequestId: sourceType === "DA" ? selectedRequestId : undefined,
        tenderId: sourceType === "AO" ? selectedTenderId : undefined,
        supplierId: selectedSupplierId,
        deliveryTerms,
        paymentTerms,
      });
      setShowCreate(false);
      setSelectedRequestId("");
      setSelectedTenderId("");
      setSelectedSupplierId("");
      setDeliveryTerms("");
      setPaymentTerms("");
      await fetchAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create purchase order"));
    } finally {
      setSaving(false);
    }
  };

  const advanceStatus = async (order: PurchaseOrder) => {
    const nextStatusMap: Record<string, "VALIDATED" | "SENT" | "CLOSED" | null> = {
      DRAFT: "VALIDATED",
      VALIDATED: "SENT",
      SENT: null,
      RECEIVED: "CLOSED",
      CLOSED: null,
    };

    const nextStatus = nextStatusMap[order.status];
    if (!nextStatus) return;

    try {
      setError("");
      await purchaseOrderService.updateStatus(order._id, nextStatus);
      await fetchAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update purchase order status"));
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
                <FileText size={18} className="text-slate-600 dark:text-slate-300" />
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

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            { label: "Draft", value: orders.filter((order) => order.status === "DRAFT").length, icon: FileText },
            { label: "Validated", value: orders.filter((order) => order.status === "VALIDATED").length, icon: CheckCircle2 },
            { label: "Sent", value: orders.filter((order) => order.status === "SENT").length, icon: Send },
            { label: "Received", value: orders.filter((order) => order.status === "RECEIVED").length, icon: PackageCheck },
            { label: "Closed", value: orders.filter((order) => order.status === "CLOSED").length, icon: Archive },
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
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{text.tableTitle}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filtered.length} of {orders.length} BC
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
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              {text.empty}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-3 font-medium">BC</th>
                    <th className="px-6 py-3 font-medium">Supplier</th>
                    <th className="px-6 py-3 font-medium">Source</th>
                    <th className="px-6 py-3 font-medium">HT</th>
                    <th className="px-6 py-3 font-medium">TVA</th>
                    <th className="px-6 py-3 font-medium">TTC</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filtered.map((order) => (
                    <tr key={order._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {order.orderNo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-900 dark:text-white">{order.supplierId?.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {order.tenderId?.tenderNo || order.purchaseRequestId?.requestNo || "Manual"}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {order.subtotalHt.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {order.totalVat.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {order.totalTtc.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {order.status !== "CLOSED" && order.status !== "SENT" && (
                          <button
                            onClick={() => advanceStatus(order)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {order.status === "DRAFT" && <CheckCircle2 size={11} />}
                            {order.status === "VALIDATED" && <Send size={11} />}
                            {order.status === "RECEIVED" && <Archive size={11} />}
                            {order.status === "DRAFT" && "Validate"}
                            {order.status === "VALIDATED" && "Send"}
                            {order.status === "RECEIVED" && "Close"}
                          </button>
                        )}
                        {order.status === "SENT" && (
                          <Link
                            href="/dashboard/achat/receipts"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                          >
                            <PackageCheck size={11} />
                            Receive Goods
                          </Link>
                        )}
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
            <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Create Purchase Order</h3>
                <button
                  onClick={() => setShowCreate(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType("DA")}
                    className={`flex-1 rounded-2xl border py-2.5 text-sm font-medium transition ${
                      sourceType === "DA"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    From DA
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType("AO")}
                    className={`flex-1 rounded-2xl border py-2.5 text-sm font-medium transition ${
                      sourceType === "AO"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    From AO
                  </button>
                </div>

                {sourceType === "DA" ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Approved DA
                    </label>
                    <select className={inputClass} value={selectedRequestId} onChange={(e) => setSelectedRequestId(e.target.value)}>
                      <option value="">— Select approved DA —</option>
                      {approvedRequests.map((request) => (
                        <option key={request._id} value={request._id}>
                          {request.requestNo} · {request.productId?.name || "Product"} · Qty {request.requestedQuantity}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Awarded AO
                    </label>
                    <select className={inputClass} value={selectedTenderId} onChange={(e) => setSelectedTenderId(e.target.value)}>
                      <option value="">— Select awarded AO —</option>
                      {awardedTenders.map((tender) => (
                        <option key={tender._id} value={tender._id}>
                          {tender.tenderNo} · {tender.purchaseRequestId?.requestNo}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Supplier
                  </label>
                  <select className={inputClass} value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)}>
                    <option value="">— Select supplier —</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name} ({supplier.supplierNo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Delivery Terms
                    </label>
                    <input className={inputClass} value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Payment Terms
                    </label>
                    <input className={inputClass} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createOrder}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Create BC
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
