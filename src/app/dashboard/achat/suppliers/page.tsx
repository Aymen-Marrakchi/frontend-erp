"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { supplierService, Supplier } from "@/services/purchase/supplierService";
import { supplementaryCategoryService, SupplementaryCategory } from "@/services/purchase/supplementaryCategoryService";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Search,
  Plus,
  Star,
  Ban,
  ShieldCheck,
  Pencil,
  X,
  Loader2,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400";

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

const emptyForm = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  rib: "",
  paymentTerms: "",
  category: "",
  rating: 0,
  notes: "",
  priceHt: 0,
  leadTimeDays: 0,
};

export default function PurchaseSuppliersPage() {
  const { language } = useLanguage();
  const text =
    language === "fr"
      ? {
          title: "Fournisseurs",
          subtitle: "Données de base pour l'achat, la catégorisation, les conditions de paiement et le blocage",
          add: "Ajouter fournisseur",
          total: "Total fournisseurs",
          active: "Actifs",
          blocked: "Bloqués",
          avgRating: "Note moyenne",
          directory: "Répertoire fournisseurs",
          found: "fournisseurs",
          search: "Rechercher fournisseur, contact, email, catégorie...",
          loading: "Chargement des fournisseurs...",
          empty: "Aucun fournisseur trouvé",
        }
      : {
          title: "Suppliers",
          subtitle: "Master data for procurement, categorisation, payment terms, and blocklist control",
          add: "Add Supplier",
          total: "Total Suppliers",
          active: "Active",
          blocked: "Blocked",
          avgRating: "Avg Rating",
          directory: "Supplier Directory",
          found: "suppliers",
          search: "Search supplier, contact, email, category...",
          loading: "Loading suppliers...",
          empty: "No suppliers found",
        };
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseCategories, setPurchaseCategories] = useState<SupplementaryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [blockTarget, setBlockTarget] = useState<Supplier | null>(null);
  const [blockReason, setBlockReason] = useState("");

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError("");
      const [supplierList, categoryList] = await Promise.all([
        supplierService.getAll(),
        supplementaryCategoryService.getActive(),
      ]);
      setSuppliers(supplierList);
      setPurchaseCategories(categoryList);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load suppliers"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter((supplier) =>
      [
        supplier.supplierNo,
        supplier.name,
        supplier.contactName,
        supplier.email,
        supplier.category,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [search, suppliers]);

  const stats = useMemo(
    () => ({
      total: suppliers.length,
      blocked: suppliers.filter((supplier) => supplier.isBlocked).length,
      active: suppliers.filter((supplier) => !supplier.isBlocked).length,
      avgRating:
        suppliers.length > 0
          ? (
              suppliers.reduce((sum, supplier) => sum + (supplier.rating || 0), 0) /
              suppliers.length
            ).toFixed(1)
          : "0.0",
    }),
    [suppliers]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setForm({
      name: supplier.name,
      contactName: supplier.contactName || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      rib: supplier.rib || "",
      paymentTerms: supplier.paymentTerms || "",
      category: supplier.category || "GENERAL",
      rating: supplier.rating || 0,
      notes: supplier.notes || "",
      priceHt: supplier.priceHt || 0,
      leadTimeDays: supplier.leadTimeDays || 0,
    });
    setShowForm(true);
    setError("");
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Supplier name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");
      if (editing) {
        await supplierService.update(editing._id, form);
      } else {
        await supplierService.create(form);
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      await fetchSuppliers();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to save supplier"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!blockTarget) return;
    try {
      setSaving(true);
      setError("");
      await supplierService.toggleBlock(blockTarget._id, blockReason);
      setBlockTarget(null);
      setBlockReason("");
      await fetchSuppliers();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to update supplier status"));
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
                <Building2 size={18} className="text-slate-600 dark:text-slate-300" />
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
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <Plus size={15} />
            {text.add}
          </button>
        </div>

        {error && !showForm && !blockTarget && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: text.total, value: stats.total, icon: Building2 },
            { label: text.active, value: stats.active, icon: ShieldCheck },
            { label: text.blocked, value: stats.blocked, icon: Ban },
            { label: text.avgRating, value: stats.avgRating, icon: Star },
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
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{text.directory}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {filtered.length} / {suppliers.length} {text.found}
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={text.search}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
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
                    <th className="px-6 py-3 font-medium">Fournisseur</th>
                    <th className="px-6 py-3 font-medium">Catégorie</th>
                    <th className="px-6 py-3 font-medium">Contact</th>
                    <th className="px-6 py-3 font-medium">PU (TND)</th>
                    <th className="px-6 py-3 font-medium">Délai (j)</th>
                    <th className="px-6 py-3 font-medium">Statut</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filtered.map((supplier) => (
                    <tr key={supplier._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-slate-950 dark:text-white">{supplier.name}</p>
                          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{supplier.supplierNo}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {purchaseCategories.find((c) => c.name === supplier.category)?.label ?? supplier.category ?? "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-600 dark:text-slate-300">
                          <p>{supplier.contactName || "—"}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{supplier.email || supplier.phone || "—"}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">
                        {supplier.priceHt > 0
                          ? supplier.priceHt.toLocaleString("fr-TN", { minimumFractionDigits: 3 })
                          : <span className="font-normal text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {supplier.leadTimeDays > 0 ? `${supplier.leadTimeDays} j` : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            supplier.isBlocked
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          }`}
                        >
                          {supplier.isBlocked ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(supplier)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setBlockTarget(supplier);
                              setBlockReason(supplier.blockedReason || "");
                            }}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl transition ${
                              supplier.isBlocked
                                ? "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
                                : "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20"
                            }`}
                          >
                            {supplier.isBlocked ? <ShieldCheck size={14} /> : <Ban size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                  {editing ? "Edit Supplier" : "New Supplier"}
                </h3>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                    setForm(emptyForm);
                    setError("");
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Supplier Name *</label>
                  <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Contact Name</label>
                  <input className={inputClass} value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input className={inputClass} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Category *</label>
                  <select
                    className={inputClass}
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  >
                    <option value="">— Select category —</option>
                    {purchaseCategories.map((cat) => (
                      <option key={cat._id} value={cat.name}>{cat.label}</option>
                    ))}
                  </select>
                  {purchaseCategories.length === 0 && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      No categories yet — create them in the Categories page.
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>PU (TND)</label>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    step={0.001}
                    placeholder="0,000"
                    value={form.priceHt}
                    onChange={(e) => setForm((f) => ({ ...f, priceHt: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Délai livraison (jours)</label>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    placeholder="ex : 7"
                    value={form.leadTimeDays}
                    onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>RIB</label>
                  <input className={inputClass} value={form.rib} onChange={(e) => setForm((f) => ({ ...f, rib: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Address</label>
                  <input className={inputClass} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                  {error}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                    setForm(emptyForm);
                    setError("");
                  }}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {editing ? "Save Changes" : "Create Supplier"}
                </button>
              </div>
            </div>
          </div>
        )}

        {blockTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                  {blockTarget.isBlocked ? "Unblock Supplier" : "Block Supplier"}
                </h3>
                <button
                  onClick={() => {
                    setBlockTarget(null);
                    setBlockReason("");
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                {blockTarget.name}
              </p>

              {!blockTarget.isBlocked && (
                <div className="mt-4">
                  <label className={labelClass}>Block Reason</label>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={3}
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                  />
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setBlockTarget(null);
                    setBlockReason("");
                  }}
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleToggleBlock}
                  disabled={saving}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-60 ${
                    blockTarget.isBlocked ? "bg-emerald-700 hover:bg-emerald-600" : "bg-rose-700 hover:bg-rose-600"
                  }`}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : blockTarget.isBlocked ? <ShieldCheck size={14} /> : <Ban size={14} />}
                  {blockTarget.isBlocked ? "Unblock" : "Block"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
