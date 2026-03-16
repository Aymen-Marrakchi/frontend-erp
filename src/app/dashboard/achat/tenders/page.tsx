"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useMemo, useState } from "react";
import { tenderService, Tender } from "@/services/purchase/tenderService";
import { purchaseRequestService } from "@/services/purchase/purchaseRequestService";
import { supplierService, Supplier } from "@/services/purchase/supplierService";
import {
  ClipboardList,
  Search,
  Plus,
  Loader2,
  Send,
  CheckCircle2,
  Building2,
  Scale,
  X,
} from "lucide-react";

type ApprovedRequest = {
  _id: string;
  requestNo: string;
  requestedQuantity: number;
  reason: string;
  department: string;
  productId?: { _id: string; name: string; sku: string };
  status: "APPROVED";
};

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

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

export default function PurchaseTendersPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<ApprovedRequest[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [offerTender, setOfferTender] = useState<Tender | null>(null);
  const [offerForm, setOfferForm] = useState({
    supplierId: "",
    amountHt: "",
    leadTimeDays: "",
    notes: "",
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [tenderData, requestData, supplierData] = await Promise.all([
        tenderService.getAll(),
        purchaseRequestService.getAll(),
        supplierService.getAll(),
      ]);
      setTenders(tenderData);
      setApprovedRequests(
        requestData.filter(
          (request: ApprovedRequest | (ApprovedRequest & { status: string })) =>
            request.status === "APPROVED"
        )
      );
      setSuppliers(supplierData.filter((supplier) => !supplier.isBlocked));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load tenders"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tenders.filter((tender) =>
      [
        tender.tenderNo,
        tender.purchaseRequestId?.requestNo,
        tender.purchaseRequestId?.productId?.name,
        tender.selectedSupplierId?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [search, tenders]);

  const createTender = async () => {
    if (!selectedRequestId) {
      setError("Select an approved purchase request");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await tenderService.create({
        purchaseRequestId: selectedRequestId,
        supplierIds: selectedSuppliers,
        notes,
      });
      setShowCreate(false);
      setSelectedRequestId("");
      setSelectedSuppliers([]);
      setNotes("");
      await fetchAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to create tender"));
    } finally {
      setSaving(false);
    }
  };

  const sendTender = async (id: string) => {
    try {
      setError("");
      await tenderService.send(id);
      await fetchAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to send tender"));
    }
  };

  const addOffer = async () => {
    if (!offerTender) return;
    try {
      setSaving(true);
      setError("");
      await tenderService.addOffer(offerTender._id, {
        supplierId: offerForm.supplierId,
        amountHt: Number(offerForm.amountHt),
        leadTimeDays: Number(offerForm.leadTimeDays),
        notes: offerForm.notes,
      });
      setOfferTender(null);
      setOfferForm({ supplierId: "", amountHt: "", leadTimeDays: "", notes: "" });
      await fetchAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to add offer"));
    } finally {
      setSaving(false);
    }
  };

  const selectOffer = async (tenderId: string, offerId: string) => {
    try {
      setError("");
      await tenderService.selectOffer(tenderId, offerId);
      await fetchAll();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to select supplier"));
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
                <Scale size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Appels d&apos;Offres
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Create tenders from approved requests, compare supplier offers, and award the best one
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <Plus size={15} />
            New AO
          </button>
        </div>

        {error && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Total AO", value: tenders.length, icon: ClipboardList },
            { label: "Sent", value: tenders.filter((tender) => tender.status === "SENT").length, icon: Send },
            { label: "Comparing", value: tenders.filter((tender) => tender.status === "COMPARING").length, icon: Scale },
            { label: "Awarded", value: tenders.filter((tender) => tender.status === "AWARDED").length, icon: CheckCircle2 },
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
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Tender Comparison Board</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filtered.length} of {tenders.length} tenders
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search AO, DA, product, supplier..."
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Loading tenders...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              No tenders yet
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {filtered.map((tender) => (
                <div key={tender._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{tender.tenderNo}</h3>
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-white dark:bg-white dark:text-slate-950">
                          {tender.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        DA {tender.purchaseRequestId?.requestNo} · {tender.purchaseRequestId?.productId?.name || "Product"} · Qty {tender.purchaseRequestId?.requestedQuantity}
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Department: {tender.purchaseRequestId?.department}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {tender.status === "DRAFT" && (
                        <button
                          onClick={() => sendTender(tender._id)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                        >
                          <Send size={12} />
                          Send AO
                        </button>
                      )}

                      {["SENT", "COMPARING"].includes(tender.status) && (
                        <button
                          onClick={() => {
                            setOfferTender(tender);
                            setOfferForm({ supplierId: "", amountHt: "", leadTimeDays: "", notes: "" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <Plus size={12} />
                          Add Offer
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Invited Suppliers</p>
                      <div className="mt-3 space-y-2">
                        {tender.supplierIds.map((supplier) => (
                          <div key={supplier._id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-900 dark:text-white">
                              {supplier.name}
                            </span>
                            <span className="text-xs text-slate-400">{supplier.supplierNo}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Offers Comparison</p>
                      <div className="mt-3 space-y-2">
                        {tender.offers.length === 0 ? (
                          <p className="text-sm text-slate-400">No offers yet</p>
                        ) : (
                          tender.offers.map((offer) => (
                            <div
                              key={offer._id}
                              className={`rounded-2xl border px-4 py-3 ${
                                offer.status === "SELECTED"
                                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20"
                                  : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    {offer.supplierId?.name}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {offer.amountHt.toLocaleString("fr-TN", { minimumFractionDigits: 2 })} TND HT · {offer.leadTimeDays} days
                                  </p>
                                  {offer.notes && (
                                    <p className="mt-1 text-xs text-slate-400">{offer.notes}</p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {offer.status}
                                  </span>
                                  {tender.status !== "AWARDED" && (
                                    <button
                                      onClick={() => selectOffer(tender._id, offer._id)}
                                      className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100"
                                    >
                                      <CheckCircle2 size={11} />
                                      Select
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Create AO from approved DA</h3>
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
                    Approved Purchase Request
                  </label>
                  <select
                    className={inputClass}
                    value={selectedRequestId}
                    onChange={(e) => setSelectedRequestId(e.target.value)}
                  >
                    <option value="">— Select approved DA —</option>
                    {approvedRequests.map((request) => (
                      <option key={request._id} value={request._id}>
                        {request.requestNo} · {request.productId?.name || "Product"} · Qty {request.requestedQuantity}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Suppliers
                  </label>
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                    {suppliers.map((supplier) => (
                      <label key={supplier._id} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={selectedSuppliers.includes(supplier._id)}
                          onChange={(e) =>
                            setSelectedSuppliers((current) =>
                              e.target.checked
                                ? [...current, supplier._id]
                                : current.filter((id) => id !== supplier._id)
                            )
                          }
                        />
                        <Building2 size={14} className="text-slate-400" />
                        <span>{supplier.name}</span>
                        <span className="text-xs text-slate-400">{supplier.category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Notes
                  </label>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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
                    onClick={createTender}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Create AO
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {offerTender && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Add Supplier Offer</h3>
                <button
                  onClick={() => setOfferTender(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Supplier
                  </label>
                  <select
                    className={inputClass}
                    value={offerForm.supplierId}
                    onChange={(e) => setOfferForm((current) => ({ ...current, supplierId: e.target.value }))}
                  >
                    <option value="">— Select supplier —</option>
                    {offerTender.supplierIds.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name} ({supplier.supplierNo})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Amount HT
                    </label>
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={offerForm.amountHt}
                      onChange={(e) => setOfferForm((current) => ({ ...current, amountHt: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                      Lead Time (days)
                    </label>
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={offerForm.leadTimeDays}
                      onChange={(e) => setOfferForm((current) => ({ ...current, leadTimeDays: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    Notes
                  </label>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={3}
                    value={offerForm.notes}
                    onChange={(e) => setOfferForm((current) => ({ ...current, notes: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setOfferTender(null)}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addOffer}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Save Offer
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
