"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  ShoppingCart,
  Menu,
  Calendar,
  DollarSign,
  BarChart3,
  FileText,
  Package,
  Truck,
  RotateCcw,
  Bell,
  TriangleAlert,
  ClipboardList,
} from "lucide-react";
import { motion } from "framer-motion";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

export default function Sidebar() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const dashboardPath = `/dashboard/${user.role.toLowerCase().replace("_manager", "")}`;

  const adminItems: NavItem[] = [
    { href: "/dashboard/admin", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/admin/hr", label: t("hr"), icon: Users },
    { href: "/dashboard/admin/marketing", label: t("marketing"), icon: Megaphone },
    { href: "/dashboard/admin/sales", label: t("onlineSales"), icon: ShoppingCart },
    { href: "/dashboard/admin/stock", label: t("stockModule"), icon: Package },
    { href: "/dashboard/admin/commercial", label: t("commercialModule"), icon: ShoppingCart },
    { href: "/dashboard/admin/finance", label: t("financeModule"), icon: DollarSign },
    { href: "/dashboard/admin/purchase", label: t("purchaseModule"), icon: Truck },
  ];

  const hrItems: NavItem[] = [
    { href: "/dashboard/hr", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/hr/employees", label: t("employees"), icon: Users },
    { href: "/dashboard/hr/attendance", label: t("attendance"), icon: Calendar },
    { href: "/dashboard/hr/payroll", label: t("payroll"), icon: DollarSign },
    { href: "/dashboard/hr/performance", label: t("performance"), icon: BarChart3 },
    { href: "/dashboard/hr/reports", label: t("reports"), icon: FileText },
  ];

  const salesItems: NavItem[] = [
    { href: "/dashboard/sales", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/sales/catalog", label: t("productCatalog"), icon: Package },
    { href: "/dashboard/sales/orders", label: t("onlineOrders"), icon: FileText },
    { href: "/dashboard/sales/stock", label: t("stockProduction"), icon: BarChart3 },
    { href: "/dashboard/sales/tracking", label: t("deliveryTracking"), icon: Truck },
    { href: "/dashboard/sales/returns", label: t("returnsRefunds"), icon: RotateCcw },
  ];

  const marketingItems: NavItem[] = [
    { href: "/dashboard/marketing", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/marketing/campaigns", label: t("campaigns"), icon: Megaphone },
    { href: "/dashboard/marketing/analytics", label: t("analytics"), icon: BarChart3 },
    { href: "/dashboard/marketing/segmentation", label: t("segmentation"), icon: Users },
    { href: "/dashboard/marketing/budget", label: t("budget"), icon: DollarSign },
    { href: "/dashboard/marketing/promotions", label: t("promotions"), icon: Calendar },
  ];

  const stockItems: NavItem[] = [
    { href: "/dashboard/stock", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/stock/products", label: t("products"), icon: Package },
    { href: "/dashboard/stock/items", label: t("stockItems"), icon: BarChart3 },
    { href: "/dashboard/stock/movements", label: t("movements"), icon: FileText },
    { href: "/dashboard/stock/thresholds", label: t("thresholdRules"), icon: Bell },
    { href: "/dashboard/stock/alerts", label: t("stockAlertsMenu"), icon: TriangleAlert },
    { href: "/dashboard/stock/inventories", label: t("inventories"), icon: ClipboardList },
  ];

  let items: NavItem[] = [{ href: dashboardPath, label: t("dashboard"), icon: LayoutDashboard }];

  if (user.role === "ADMIN") items = adminItems;
  if (user.role === "HR_MANAGER") items = hrItems;
  if (user.role === "SALES_MANAGER") items = salesItems;
  if (user.role === "MARKETING_MANAGER") items = marketingItems;
  if (user.role === "STOCK_MANAGER") items = stockItems;

  return (
    <motion.aside
      animate={{ width: collapsed ? 88 : 280 }}
      transition={{ duration: 0.2 }}
      className="sticky top-0 hidden h-screen flex-shrink-0 border-r border-slate-200 bg-white/95 px-4 py-5 backdrop-blur xl:block dark:border-slate-800 dark:bg-slate-950/95"
    >
      <div className="flex h-full flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div className="min-w-0">
            {!collapsed ? (
              <>
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  ERP Workspace
                </div>
                <div className="mt-1 text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                  ERP<span className="text-slate-400">.</span>
                </div>
              </>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-900 dark:bg-slate-800 dark:text-white">
                E
              </div>
            )}
          </div>

          <button
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Menu size={16} />
          </button>
        </div>

        <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          {!collapsed ? (
            <>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Logged in as
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {user.name}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                {user.role.replace(/_/g, " ")}
              </div>
            </>
          ) : (
            <div className="flex justify-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {user.name?.slice(0, 1).toUpperCase()}
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || (item.href !== dashboardPath && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                  active
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon
                  size={17}
                  className={active ? "" : "text-slate-400 group-hover:text-current"}
                />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </motion.aside>
  );
}