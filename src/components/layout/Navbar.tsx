"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  type CommercialNotification,
  notificationService,
} from "@/services/commercial/notificationService";
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
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState<CommercialNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const canViewNotifications =
    user?.role === "ADMIN" || user?.role === "COMMERCIAL_MANAGER";

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
        const notifications = await notificationService.getAll();
        if (!cancelled) {
          setNotifications(notifications);
          setUnreadCount(notifications.filter((item) => !item.isRead).length);
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
    setNotificationsOpen((current) => !current);
    setOpen(false);
  };

  const handleNotificationClick = async (notification: CommercialNotification) => {
    if (!notification.isRead) {
      try {
        await notificationService.markRead(notification._id);
        const nextNotifications = notifications.map((item) =>
          item._id === notification._id ? { ...item, isRead: true } : item
        );
        setNotifications(nextNotifications);
        setUnreadCount(nextNotifications.filter((item) => !item.isRead).length);
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

  const notificationBadgeClass = (eventType: CommercialNotification["eventType"]) =>
    eventType === "ORDER_DELIVERED"
      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20"
      : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20";

  return (
    <div className="sticky top-4 z-30">
      <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
        {/* Left */}
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {t("erpSubtitle")}
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">
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
                  className="absolute right-0 mt-3 w-[320px] overflow-hidden rounded-3xl border border-slate-700 bg-[#0c1327] shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Notifications
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {notificationCountLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[11px] font-medium text-slate-300 transition hover:text-white"
                    >
                      Close
                    </button>
                  </div>

                  <div className="max-h-[360px] overflow-y-auto px-2 py-2">
                    {notificationsLoading ? (
                      <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Bell size={14} />
                        </motion.div>
                        Loading notifications...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-500">
                        No notifications yet
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {notifications.slice(0, 6).map((notification) => (
                          <button
                            key={notification._id}
                            type="button"
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                              notification.isRead
                                ? "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"
                                : "border-white/12 bg-white/[0.06] hover:bg-white/[0.09]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-semibold text-white">
                                    {notification.title}
                                  </span>
                                  {!notification.isRead ? (
                                    <span className="h-2 w-2 rounded-full bg-sky-400" />
                                  ) : null}
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                                  {notification.message}
                                </p>
                                <p className="mt-2 text-[11px] text-slate-500">
                                  {notification.relatedOrderId?.orderNo ||
                                    notification.customerName ||
                                    "Internal alert"}
                                </p>
                              </div>
                              <span
                                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${notificationBadgeClass(
                                  notification.eventType
                                )}`}
                              >
                                {notification.eventType === "ORDER_DELIVERED" ? (
                                  <CheckCircle2 size={13} className="text-emerald-300" />
                                ) : (
                                  <Truck size={13} className="text-amber-300" />
                                )}
                                {notification.eventType === "ORDER_DELIVERED"
                                  ? "DELIVERED"
                                  : "SHIPPED"}
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
