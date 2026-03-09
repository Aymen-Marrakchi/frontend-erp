"use client";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="px-4 py-4 sm:px-6 lg:px-8">
            <Navbar />
            <div className="mt-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}