"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/context/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  DollarSign,
  ShoppingCart,
  Megaphone,
  Download,
  Pencil,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { adminService } from "@/services/admin/adminService";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  createdAt: string;
}

const ROLES = ["ADMIN", "HR_MANAGER", "MARKETING_MANAGER", "SALES_MANAGER", "EMPLOYEE"];
const DEPARTMENTS = ["None", "HR", "Marketing", "Online Sales"];

const roleLabel: Record<string, string> = {
  ADMIN: "Admin",
  HR_MANAGER: "HR Manager",
  MARKETING_MANAGER: "Marketing Manager",
  SALES_MANAGER: "Sales Manager",
  EMPLOYEE: "Employee",
};

const roleColor: Record<string, string> = {
  ADMIN: "bg-slate-900 text-white dark:bg-white dark:text-slate-950",
  HR_MANAGER: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  MARKETING_MANAGER: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  SALES_MANAGER: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  EMPLOYEE: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const deptColor: Record<string, string> = {
  HR: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  Marketing: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  "Online Sales": "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  None: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function Sparkline({
  data,
  dataKey,
  color,
}: {
  data: any[];
  dataKey: string;
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
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
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
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

export default function AdminDashboard() {
  const { t } = useLanguage();

  const [search, setSearch] = useState("");
  const [activeRange, setActiveRange] = useState<"6m" | "3m" | "1m">("6m");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "EMPLOYEE",
    department: "None",
  });
  const [formError, setFormError] = useState("");
  const [stats, setStats] = useState({ totalUsers: 0, byRole: [] as any[] });

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setUsers(await adminService.getAllUsers());
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStats(await adminService.getStats());
    } catch {}
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || "None",
    });
    setFormError("");
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!form.name || !form.email) {
      setFormError("Name and email are required");
      return;
    }

    if (form.role === "EMPLOYEE" && (!form.department || form.department === "None")) {
      setFormError("Department is required for employees");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      await adminService.updateUser(selectedUser!._id, {
        name: form.name,
        email: form.email,
        role: form.role,
        department: form.department,
      });
      await fetchUsers();
      setShowEdit(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const openDelete = (user: User) => {
    setSelectedUser(user);
    setShowDelete(true);
  };

  const handleDelete = async () => {
    try {
      setSubmitting(true);
      await adminService.deleteUser(selectedUser!._id);
      await fetchUsers();
      await fetchStats();
      setShowDelete(false);
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const employeesSparkData = [{ v: 110 }, { v: 115 }, { v: 118 }, { v: 120 }, { v: 122 }, { v: 124 }];
  const revenueSparkData = [{ v: 95000 }, { v: 103000 }, { v: 98500 }, { v: 110000 }, { v: 115000 }, { v: 120500 }];
  const ordersSparkData = [{ v: 280 }, { v: 310 }, { v: 295 }, { v: 330 }, { v: 348 }, { v: 356 }];
  const campaignsSparkData = [{ v: 4 }, { v: 5 }, { v: 6 }, { v: 5 }, { v: 7 }, { v: 7 }];

  const revenueMonthly = [
    { month: "Jan", revenue: 95000 },
    { month: "Feb", revenue: 103000 },
    { month: "Mar", revenue: 98500 },
    { month: "Apr", revenue: 110000 },
    { month: "May", revenue: 115000 },
    { month: "Jun", revenue: 120500 },
  ];

  const ordersMonthly = [
    { month: "Jan", orders: 280 },
    { month: "Feb", orders: 310 },
    { month: "Mar", orders: 295 },
    { month: "Apr", orders: 330 },
    { month: "May", orders: 348 },
    { month: "Jun", orders: 356 },
  ];

  const topModules = [
    { name: "Online Sales", usage: 97 },
    { name: "HR Module", usage: 88 },
    { name: "Marketing", usage: 75 },
    { name: "Inventory", usage: 61 },
    { name: "Finance", usage: 54 },
  ];

  const maxUsage = 97;

  const tooltipStyle = {
    backgroundColor: "#0f172a",
    border: "1px solid rgba(148,163,184,0.15)",
    borderRadius: "14px",
    fontSize: "12px",
    color: "#e2e8f0",
  };

  const surface =
    "rounded-3xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900";

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800";

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t("adminSubtitle")}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Admin <span className="text-slate-400 dark:text-slate-500">{t("dashboard")}</span>
            </h1>
          </div>

          <button className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            <Download size={15} />
            {t("exportCsv")}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: <Users size={16} />,
              iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
              badge: `${stats.totalUsers}`,
              badgeColor: "text-emerald-600 dark:text-emerald-400",
              label: t("totalEmployees"),
              value: String(stats.totalUsers),
              valueColor: "text-slate-950 dark:text-white",
              spark: employeesSparkData,
              sparkColor: "#10b981",
            },
            {
              icon: <DollarSign size={16} />,
              iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
              badge: "+8.2%",
              badgeColor: "text-blue-600 dark:text-blue-400",
              label: t("monthlyRevenue"),
              value: "120,500",
              valueColor: "text-slate-950 dark:text-white",
              spark: revenueSparkData,
              sparkColor: "#60a5fa",
            },
            {
              icon: <ShoppingCart size={16} />,
              iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
              badge: "+18",
              badgeColor: "text-amber-600 dark:text-amber-400",
              label: t("totalOrders"),
              value: "356",
              valueColor: "text-slate-950 dark:text-white",
              spark: ordersSparkData,
              sparkColor: "#f59e0b",
            },
            {
              icon: <Megaphone size={16} />,
              iconBg: "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
              badge: "+2",
              badgeColor: "text-violet-600 dark:text-violet-400",
              label: t("activeCampaigns"),
              value: "7",
              valueColor: "text-slate-950 dark:text-white",
              spark: campaignsSparkData,
              sparkColor: "#a78bfa",
            },
          ].map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`${surface} p-5`}
            >
              <div className="flex items-start justify-between">
                <div className={`rounded-2xl p-2.5 ${kpi.iconBg}`}>{kpi.icon}</div>
                <span className={`text-sm font-semibold ${kpi.badgeColor}`}>{kpi.badge}</span>
              </div>

              <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {kpi.label}
              </p>
              <p className={`mt-3 text-3xl font-bold tracking-tight ${kpi.valueColor}`}>{kpi.value}</p>

              <div className="mt-4 -mx-1">
                <Sparkline data={kpi.spark} dataKey="v" color={kpi.sparkColor} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            { label: t("newUsers"), value: "32", sub: "↑ 18% this month" },
            { label: t("serverLoad"), value: "72%", sub: t("optimalPerformance") },
            { label: t("pendingApprovals"), value: "5", sub: t("requiresAction") },
            { label: t("securityScore"), value: "80%", sub: t("lastAuditPassed") },
          ].map((s, i) => (
            <div key={i} className={`${surface} px-5 py-4`}>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {s.label}
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {s.value}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className={`${surface} space-y-5 p-6 xl:col-span-2`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  {t("businessOverview")}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {t("monthlyPerformance")}
                </p>
              </div>

              <div className="flex gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                {(["6m", "3m", "1m"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setActiveRange(r)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                      activeRange === r
                        ? "bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-8 py-1">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {t("totalRevenue")}
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                  642,000 TND
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {t("totalOrders")}
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                  1,919
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {t("revenueTND")}
                </p>
                <ResponsiveContainer width="100%" height={190}>
                  <ReBarChart data={revenueMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.18} />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle as any} formatter={(v) => [`${Number(v).toLocaleString()} TND`]} />
                    <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {t("ordersPerMonth")}
                </p>
                <ResponsiveContainer width="100%" height={190}>
                  <LineChart data={ordersMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.18} />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle as any} />
                    <Line type="monotone" dataKey="orders" stroke="#60a5fa" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Users Table */}
            <div className="pt-2">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    User Management
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Review, edit and manage system users.
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 sm:w-64 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus:border-slate-600 dark:focus:ring-slate-800"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 size={16} className="animate-spin" />
                  Loading users...
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                  {error}
                </div>
              ) : (
                <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr className="text-left text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        <th className="px-4 py-3 font-medium">{t("fullName")}</th>
                        <th className="px-4 py-3 font-medium">{t("emailField")}</th>
                        <th className="px-4 py-3 font-medium">{t("roleField")}</th>
                        <th className="px-4 py-3 font-medium">Department</th>
                        <th className="px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredUsers.map((u) => (
                        <tr
                          key={u._id}
                          className="transition hover:bg-slate-50 dark:hover:bg-slate-800/30"
                        >
                          <td className="px-4 py-4 font-medium text-slate-900 dark:text-white">
                            {u.name}
                          </td>
                          <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
                            {u.email}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleColor[u.role] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                              {roleLabel[u.role] || u.role}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${deptColor[u.department] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                              {u.department || "None"}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(u)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => openDelete(u)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20"
                              >
                                <Trash2 size={14} />
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
          </div>

          {/* Right Column */}
          <div className={`${surface} flex flex-col gap-8 p-6`}>
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                {t("topModules")}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t("usageThisMonth")}
              </p>

              <div className="mt-6 space-y-5">
                {topModules.map((m, i) => (
                  <div key={i}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <div>
                        <span className="mr-2 text-xs text-slate-400">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {m.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-950 dark:text-white">
                        {m.usage}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(m.usage / maxUsage) * 100}%` }}
                        transition={{ delay: 0.3 + i * 0.07, duration: 0.6 }}
                        className="h-full rounded-full bg-slate-900 dark:bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                {t("systemHealth")}
              </h3>

              <div className="mt-5 space-y-4">
                {[
                  { label: t("databaseUsage"), pct: 65, color: "bg-blue-500" },
                  { label: t("apiStability"), pct: 90, color: "bg-emerald-500" },
                  { label: t("securityScore"), pct: 80, color: "bg-violet-500" },
                ].map((g, i) => (
                  <div key={i}>
                    <div className="mb-1.5 flex justify-between">
                      <p className="text-sm text-slate-500 dark:text-slate-400">{g.label}</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{g.pct}%</p>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${g.pct}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                        className={`h-full rounded-full ${g.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {stats.byRole.length > 0 && (
                <div className="mt-7">
                  <h3 className="mb-3 text-base font-semibold text-slate-950 dark:text-white">
                    Users by Role
                  </h3>

                  <div className="space-y-2">
                    {stats.byRole.map((r: any) => (
                      <div key={r._id} className="flex items-center justify-between">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleColor[r._id] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>
                          {roleLabel[r._id] || r._id}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showEdit && selectedUser && (
            <Modal title="Edit User" onClose={() => setShowEdit(false)}>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Full Name
                  </label>
                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Email
                  </label>
                  <input
                    className={inputClass}
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Role
                  </label>
                  <select
                    className={inputClass}
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value, department: "None" })
                    }
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel[r]}
                      </option>
                    ))}
                  </select>
                </div>

                {form.role === "EMPLOYEE" && (
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Department
                    </label>
                    <select
                      className={`${inputClass} ${form.department === "None" ? "border-rose-300 dark:border-rose-700" : ""}`}
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d === "None" ? "— Select Department —" : d}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                    {formError}
                  </div>
                ) : null}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowEdit(false)}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleEdit}
                    disabled={submitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                    Save Changes
                  </button>
                </div>
              </div>
            </Modal>
          )}

          {showDelete && selectedUser && (
            <Modal title="Delete User" onClose={() => setShowDelete(false)}>
              <div className="space-y-4">
                <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-950 dark:text-white">
                    {selectedUser.name}
                  </span>
                  ? This action cannot be undone.
                </p>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowDelete(false)}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleDelete}
                    disabled={submitting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-60 dark:hover:bg-rose-500"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}