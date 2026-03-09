"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Role } from "@/types/user";

interface Props {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user === undefined) return;

    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(false);
  }, [user, router]);

  if (loading || user === undefined) return null;
  if (!user) return null;

  if (user.role === "ADMIN") {
    return <>{children}</>;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center text-white">
        <h1 className="text-2xl font-bold">Access Denied</h1>
      </div>
    );
  }

  return <>{children}</>;
}