"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState } from "react";
import { customerService, type Customer } from "@/services/commercial/customerService";
import {
  Users, Plus, Pencil, ToggleLeft, ToggleRight,
  Building2, Phone, Mail, MapPin, Search, X, Loader2, UserCheck, UserX,
} from "lucide-react";

const surface =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400";

const empty = { name: "", email: "", phone: "", company: "", address: "", city: "", governorate: "", notes: "" };

const TUNISIA_GOVERNORATES = [
  "Ariana","Béja","Ben Arous","Bizerte","Gabès","Gafsa","Jendouba",
  "Kairouan","Kasserine","Kébili","Kef","Mahdia","Manouba","Médenine",
  "Monastir","Nabeul","Sfax","Sidi Bouzid","Siliana","Sousse",
  "Tataouine","Tozeur","Tunis","Zaghouan",
];

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-fuchsia-500", "bg-teal-500",
];

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function CustomersPage() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setCustomers(await customerService.getAll());
    } catch {
      setError("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setError(""); setShowForm(true); };
  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email || "", phone: c.phone || "", company: c.company || "", address: c.address || "", city: c.city || "", governorate: c.governorate || "", notes: c.notes || "" });
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Customer name is required"); return; }
    try {
      setSaving(true);
      setError("");
      if (editing) await customerService.update(editing._id, form);
      else await customerService.create(form);
      setShowForm(false);
      await fetchAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setTogglingId(id);
      await customerService.toggleActive(id);
      await fetchAll();
    } catch {
      setError("Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const total = customers.length;
  const active = customers.filter((c) => c.active).length;
  const inactive = total - active;

  return (
    <ProtectedRoute allowedRoles={["ADMIN", "COMMERCIAL_MANAGER"]}>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t("commercialModule") || "Commercial"} · ERP
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                <Users size={18} className="text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                  {t("customersTitle") || "Customers"}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("customersSub") || "Manage your customer database"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <Plus size={15} /> {t("addCustomer") || "Add Customer"}
          </button>
        </div>

        {/* ── Error banner ── */}
        {error && !showForm && (
          <div className="flex items-start justify-between rounded-3xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
            <button onClick={() => setError("")} className="ml-4 shrink-0 hover:opacity-70"><X size={14} /></button>
          </div>
        )}

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: total, icon: <Users size={16} />, color: "text-slate-900 dark:text-white" },
            { label: t("active") || "Active", value: active, icon: <UserCheck size={16} />, color: "text-emerald-600 dark:text-emerald-400" },
            { label: t("inactive") || "Inactive", value: inactive, icon: <UserX size={16} />, color: "text-rose-500 dark:text-rose-400" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`${surface} px-6 py-5`}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{label}</p>
                <span className="text-slate-300 dark:text-slate-600">{icon}</span>
              </div>
              <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Search bar ── */}
        <div className={`${surface} flex items-center gap-3 px-5 py-3.5`}>
          <Search size={15} className="shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search") || "Search by name, company or email…"}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none dark:text-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Customer grid ── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${surface} py-16 text-center`}>
            <Users size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("noCustomers") || "No customers found"}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <div key={c._id} className={`${surface} p-5 transition-opacity ${!c.active ? "opacity-50" : ""}`}>

                {/* Avatar + name */}
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white ${avatarColor(c.name)}`}>
                    {getInitials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{c.name}</p>
                    {c.company ? (
                      <p className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        <Building2 size={11} /> {c.company}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-600">—</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                    {c.active ? (t("active") || "Active") : (t("inactive") || "Inactive")}
                  </span>
                </div>

                {/* Contact info */}
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  {c.email && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Mail size={12} className="shrink-0 text-slate-400" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Phone size={12} className="shrink-0 text-slate-400" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {(c.city || c.address) && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin size={12} className="shrink-0 text-slate-400" />
                      <span className="truncate">{[c.city, c.address].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  {!c.email && !c.phone && !c.city && !c.address && (
                    <p className="text-xs text-slate-400 dark:text-slate-600">No contact info</p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => openEdit(c)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Pencil size={12} /> {t("edit") || "Edit"}
                  </button>
                  <button
                    onClick={() => handleToggle(c._id)}
                    disabled={togglingId === c._id}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border py-2 text-xs font-medium transition disabled:opacity-50 ${
                      c.active
                        ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/20"
                        : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
                    }`}
                  >
                    {togglingId === c._id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : c.active ? (
                      <ToggleRight size={12} />
                    ) : (
                      <ToggleLeft size={12} />
                    )}
                    {c.active ? (t("deactivate") || "Deactivate") : (t("activate") || "Activate")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Create / Edit Modal ── */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">

              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                    <Users size={16} className="text-slate-600 dark:text-slate-300" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                    {editing ? (t("editCustomer") || "Edit Customer") : (t("addCustomer") || "Add Customer")}
                  </h2>
                </div>
                <button onClick={() => { setShowForm(false); setError(""); }} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={16} />
                </button>
              </div>

              {/* Modal body */}
              <div className="space-y-4 p-6">
                <div>
                  <label className={labelClass}>{t("customerName") || "Full Name"} <span className="text-rose-500 normal-case tracking-normal">*</span></label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t("company") || "Company"}</label>
                    <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t("phone") || "Phone"}</label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+213 …" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t("email") || "Email"}</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contact@example.com" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Région</label>
                    <select value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })} className={inputClass}>
                      <option value="">— Sélectionner —</option>
                      {TUNISIA_GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t("address") || "Address"}</label>
                    <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Rue…" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>{t("notes") || "Notes"}</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder={t("notesOptional") || "Optional notes…"} className={`${inputClass} resize-none`} />
                </div>

                {error && (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                    {error}
                  </p>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
                <button
                  onClick={() => { setShowForm(false); setError(""); }}
                  className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t("cancel") || "Cancel"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {t("save") || "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
