"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { stockMovementService } from "@/services/stock/stockMovementService";
import { stockProductService } from "@/services/stock/stockProductService";

interface Product {
  _id: string;
  sku: string;
  name: string;
  unit: string;
  isLotTracked: boolean;
}

interface Movement {
  _id: string;
  productId: Product;
  type: string;
  quantity: number;
  previousOnHand: number;
  newOnHand: number;
  previousReserved: number;
  newReserved: number;
  sourceModule?: string;
  sourceType?: string;
  reason?: string;
  lotMode?: "FIFO" | "LIFO" | "MANUAL" | null;
  lotRef?: string;
  createdAt: string;
}

interface MovementFormState {
  productId: string;
  quantity: string;
  reason: string;
  notes: string;
  lotMode: "" | "FIFO" | "LIFO" | "MANUAL";
  lotRef: string;
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.16 }}
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export default function StockMovementsPage() {
  const { t } = useLanguage();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [showEntry, setShowEntry] = useState(false);
  const [showExit, setShowExit] = useState(false);

  const emptyForm: MovementFormState = {
    productId: "",
    quantity: "",
    reason: "",
    notes: "",
    lotMode: "",
    lotRef: "",
  };

  const [form, setForm] = useState<MovementFormState>(emptyForm);

  const surface =
    "rounded-3xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900";

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

  const labelClass =
    "mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400";

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [movementData, productData] = await Promise.all([
        stockMovementService.getAll(),
        stockProductService.getAll(),
      ]);
      setMovements(movementData);
      setProducts(productData.filter((p: any) => p.status === "ACTIVE"));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load movements");
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === form.productId),
    [products, form.productId]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return movements.filter((m) => {
      const matchSearch =
        m.productId?.name?.toLowerCase().includes(q) ||
        m.productId?.sku?.toLowerCase().includes(q) ||
        (m.reason || "").toLowerCase().includes(q) ||
        (m.sourceModule || "").toLowerCase().includes(q);

      const matchType = typeFilter === "ALL" ? true : m.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [movements, search, typeFilter]);

  const totals = useMemo(() => {
    return {
      entries: movements.filter((m) => m.type === "ENTRY").length,
      exits: movements.filter((m) => m.type === "EXIT").length,
      reservations: movements.filter((m) => m.type === "RESERVATION").length,
      deductions: movements.filter((m) => m.type === "DEDUCTION").length,
    };
  }, [movements]);

  const validateForm = () => {
    if (!form.productId || !form.quantity) {
      setFormError("Product and quantity are required");
      return false;
    }
    if (Number(form.quantity) <= 0) {
      setFormError("Quantity must be greater than 0");
      return false;
    }
    if (selectedProduct?.isLotTracked && !form.lotMode) {
      setFormError("Lot mode is required for lot-tracked products");
      return false;
    }
    if (selectedProduct?.isLotTracked && form.lotMode === "MANUAL" && !form.lotRef.trim()) {
      setFormError("Lot reference is required for manual lot mode");
      return false;
    }
    return true;
  };

  const commonPayload = () => ({
    productId: form.productId,
    quantity: Number(form.quantity),
    reason: form.reason.trim(),
    notes: form.notes.trim(),
    lotMode: form.lotMode || undefined,
    lotRef: form.lotRef.trim() || undefined,
    sourceModule: "STOCK",
  });

  const handleEntry = async () => {
    if (!validateForm()) return;
    try {
      setSubmitting(true);
      setFormError("");
      await stockMovementService.createEntry({
        ...commonPayload(),
        sourceType: "MANUAL_ENTRY",
      });
      await fetchAll();
      setShowEntry(false);
      setForm(emptyForm);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to create entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = async () => {
    if (!validateForm()) return;
    try {
      setSubmitting(true);
      setFormError("");
      await stockMovementService.createExit({
        ...commonPayload(),
        sourceType: "MANUAL_EXIT",
      });
      await fetchAll();
      setShowExit(false);
      setForm(emptyForm);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to create exit");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "STOCK_MANAGER"]}>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Stock Module · ERP
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {t("movements")} <span className="text-slate-400 dark:text-slate-500">Journal</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setForm(emptyForm);
                setFormError("");
                setShowEntry(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowDownToLine size={15} />
              {t("addEntry")}
            </button>

            <button
              onClick={() => {
                setForm(emptyForm);
                setFormError("");
                setShowExit(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <ArrowUpFromLine size={15} />
              {t("addExit")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { label: "Entries", value: String(totals.entries), icon: <ArrowDownToLine size={16} /> },
            { label: "Exits", value: String(totals.exits), icon: <ArrowUpFromLine size={16} /> },
            { label: "Reservations", value: String(totals.reservations), icon: <FileText size={16} /> },
            { label: "Deductions", value: String(totals.deductions), icon: <FileText size={16} /> },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`${surface} flex items-center gap-4 px-5 py-5`}
            >
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {card.icon}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {card.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className={`${surface} overflow-hidden`}>
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                {t("movements")}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filtered.length} {t("ofText")} {movements.length} {t("records")}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800"
                  placeholder={t("search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="ALL">{t("allTypes")}</option>
                <option value="ENTRY">ENTRY</option>
                <option value="EXIT">EXIT</option>
                <option value="RESERVATION">RESERVATION</option>
                <option value="RELEASE">RELEASE</option>
                <option value="DEDUCTION">DEDUCTION</option>
                <option value="ADJUSTMENT">ADJUSTMENT</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              Loading...
            </div>
          ) : error ? (
            <div className="px-6 py-10 text-sm text-rose-600 dark:text-rose-400">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              {t("noResults")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-3 font-medium">{t("date")}</th>
                    <th className="px-6 py-3 font-medium">{t("product")}</th>
                    <th className="px-6 py-3 font-medium">{t("movementType")}</th>
                    <th className="px-6 py-3 font-medium">{t("amount")}</th>
                    <th className="px-6 py-3 font-medium">Prev On Hand</th>
                    <th className="px-6 py-3 font-medium">New On Hand</th>
                    <th className="px-6 py-3 font-medium">Prev Reserved</th>
                    <th className="px-6 py-3 font-medium">New Reserved</th>
                    <th className="px-6 py-3 font-medium">Source</th>
                    <th className="px-6 py-3 font-medium">{t("reason")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filtered.map((m, i) => (
                    <motion.tr
                      key={m._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {m.productId?.name || "—"}
                      </td>
                      <td className="px-6 py-4">{m.type}</td>
                      <td className="px-6 py-4">{m.quantity}</td>
                      <td className="px-6 py-4">{m.previousOnHand}</td>
                      <td className="px-6 py-4">{m.newOnHand}</td>
                      <td className="px-6 py-4">{m.previousReserved}</td>
                      <td className="px-6 py-4">{m.newReserved}</td>
                      <td className="px-6 py-4">{m.sourceModule || "—"}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {m.reason || "—"}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(showEntry || showExit) && (
          <Modal
            title={showEntry ? t("addEntry") : t("addExit")}
            onClose={() => {
              setShowEntry(false);
              setShowExit(false);
            }}
          >
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t("product")}</label>
                <select
                  className={inputClass}
                  value={form.productId}
                  onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                >
                  <option value="">— Select Product —</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.sku} · {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>{t("amount")}</label>
                <input
                  className={inputClass}
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>

              {selectedProduct?.isLotTracked && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t("movementType")}</label>
                    <select
                      className={inputClass}
                      value={form.lotMode}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          lotMode: e.target.value as MovementFormState["lotMode"],
                        }))
                      }
                    >
                      <option value="">— Select Mode —</option>
                      <option value="FIFO">FIFO</option>
                      <option value="LIFO">LIFO</option>
                      <option value="MANUAL">MANUAL</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Lot Ref</label>
                    <input
                      className={inputClass}
                      value={form.lotRef}
                      onChange={(e) => setForm((f) => ({ ...f, lotRef: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>{t("reason")}</label>
                <input
                  className={inputClass}
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  className={`${inputClass} min-h-[90px] resize-none`}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {formError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                  {formError}
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEntry(false);
                    setShowExit(false);
                  }}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={showEntry ? handleEntry : handleExit}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {showEntry ? t("addEntry") : t("addExit")}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </ProtectedRoute>
  );
}