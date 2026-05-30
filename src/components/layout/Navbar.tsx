"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  type AppNotification,
  appNotificationService,
} from "@/services/notificationService";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  HelpCircle,
  ChevronDown,
  Bell,
  Truck,
  CheckCircle2,
  CreditCard,
  ShoppingCart,
  Package,
  AlertTriangle,
} from "lucide-react";

const MODULE_ROLES: Record<string, string[]> = {
  COMMERCIAL: ["ADMIN", "COMMERCIAL_MANAGER"],
  FINANCE: ["ADMIN", "FINANCE_MANAGER"],
  STOCK: ["ADMIN", "STOCK_MANAGER", "DEPOT_MANAGER"],
  PURCHASE: ["ADMIN", "PURCHASE_MANAGER"],
};

const MODULE_LABEL: Record<string, string> = {
  COMMERCIAL: "Commercial",
  FINANCE: "Finance",
  STOCK: "Stock",
  PURCHASE: "Achats",
};

const MODULE_BADGE: Record<string, string> = {
  COMMERCIAL: "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/20",
  FINANCE: "bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/20",
  STOCK: "bg-orange-100 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/20",
  PURCHASE: "bg-violet-100 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/20",
};

function NotificationIcon({ notification }: { notification: AppNotification }) {
  const { module, eventType } = notification;
  if (module === "COMMERCIAL") {
    return eventType === "ORDER_DELIVERED" ? (
      <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-300" />
    ) : (
      <Truck size={13} className="text-amber-600 dark:text-amber-300" />
    );
  }
  if (module === "FINANCE") return <CreditCard size={13} className="text-blue-600 dark:text-blue-300" />;
  if (module === "PURCHASE") return <ShoppingCart size={13} className="text-violet-600 dark:text-violet-300" />;
  if (module === "STOCK") {
    return eventType === "OUT_OF_STOCK" ? (
      <AlertTriangle size={13} className="text-red-600 dark:text-red-300" />
    ) : (
      <Package size={13} className="text-orange-600 dark:text-orange-300" />
    );
  }
  return <Bell size={13} className="text-slate-500 dark:text-slate-300" />;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const canViewNotifications = user?.role
    ? Object.values(MODULE_ROLES).some((roles) => roles.includes(user.role))
    : false;

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      if (!canViewNotifications) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      try {
        setNotificationsLoading(true);
        const data = await appNotificationService.getAll();
        if (!cancelled) {
          setNotifications(data);
          setUnreadCount(data.filter((n) => !n.isRead).length);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      } finally {
        if (!cancelled) {
          setNotificationsLoading(false);
        }
      }
    }

    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [canViewNotifications]);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "fr" : "en");
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const handleOpenNotifications = () => {
    if (!canViewNotifications) return;
    setNotificationsOpen((v) => !v);
    setOpen(false);
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    if (!notification.isRead) {
      try {
        await appNotificationService.markRead(notification._id);
        const next = notifications.map((n) =>
          n._id === notification._id ? { ...n, isRead: true } : n
        );
        setNotifications(next);
        setUnreadCount(next.filter((n) => !n.isRead).length);
      } catch {
        // noop
      }
    }
    setNotificationsOpen(false);
  };

  const getInitials = (name?: string) => {
    if (!name) return "A";
    return name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const roleName =
    user?.role
      ?.replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "";

  const notificationCountLabel = `${unreadCount}/${notifications.length}`;

  return (
    <div className="sticky top-4 z-30">
      <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
        {/* Left */}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
            {roleName || "Dashboard"}
          </div>
        </div>

        {/* Right */}
        <div className="ml-4 flex items-center gap-2 sm:gap-3">
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={handleOpenNotifications}
              disabled={!canViewNotifications}
              className={`relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                canViewNotifications
                  ? "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  : "border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-700"
              }`}
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>

            <AnimatePresence>
              {notificationsOpen && canViewNotifications ? (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 mt-3 w-[340px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Notifications
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {notificationCountLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[11px] font-medium text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      Fermer
                    </button>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto px-2 py-2">
                    {notificationsLoading ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500 dark:text-slate-400">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Bell size={14} />
                        </motion.div>
                        Chargement...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                        Aucune notification
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {notifications.slice(0, 8).map((notification) => (
                          <button
                            key={notification._id}
                            type="button"
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                              notification.isRead
                                ? "border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-transparent dark:hover:bg-slate-800/40"
                                : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                                    {notification.title}
                                  </span>
                                  {!notification.isRead ? (
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500 dark:bg-sky-400" />
                                  ) : null}
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                                  {notification.message}
                                </p>
                                <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                                  {notification.createdAt
                                    ? new Date(notification.createdAt).toLocaleString("fr-FR", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : ""}
                                </p>
                              </div>
                              <span
                                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                                  MODULE_BADGE[notification.module] ?? "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/20"
                                }`}
                              >
                                <NotificationIcon notification={notification} />
                                {MODULE_LABEL[notification.module] ?? notification.module}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            onClick={toggleLanguage}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {language === "en" ? "FR" : "EN"}
          </button>

          <button
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className={`flex items-center gap-3 rounded-2xl border px-2 py-2 transition ${
                open
                  ? "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {getInitials(user?.name)}
              </div>

              <div className="hidden text-left md:block">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {user?.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {roleName}
                </div>
              </div>

              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 mt-3 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {getInitials(user?.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {user?.name}
                        </div>
                        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {user?.email ?? roleName}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <User size={15} className="text-slate-400" />
                      {t("profile")}
                    </Link>

                    <Link
                      href="/dashboard/settings"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Settings size={15} className="text-slate-400" />
                      {t("settings")}
                    </Link>

                    <Link
                      href="/dashboard/support"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <HelpCircle size={15} className="text-slate-400" />
                      Support
                    </Link>
                  </div>

                  <div className="border-t border-slate-200 p-2 dark:border-slate-800">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    >
                      <LogOut size={15} />
                      {t("logout")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
