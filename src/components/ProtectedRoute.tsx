"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Role } from "@/types/user";

const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/dashboard/admin",
  HR_MANAGER: "/dashboard/hr",
  MARKETING_MANAGER: "/dashboard/marketing",
  SALES_MANAGER: "/dashboard/sales",
  STOCK_MANAGER: "/dashboard/stock",
  DEPOT_MANAGER: "/dashboard/depot",
  COMMERCIAL_MANAGER: "/dashboard/commercial",
  FINANCE_MANAGER: "/dashboard/finance",
  PURCHASE_MANAGER: "/dashboard/achat",
  EMPLOYEE: "/dashboard/employee",
};

interface Props {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (user === undefined) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (allowedRoles && user.role !== "ADMIN" && !allowedRoles.includes(user.role)) {
      router.push(ROLE_HOME[user.role] ?? "/dashboard");
      return;
    }

    setReady(true);
  }, [user, router, allowedRoles]);

  if (!ready || user === undefined) return null;

  return <>{children}</>;
}
