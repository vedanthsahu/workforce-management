"use client";

import { useAuthContext } from "@/features/auth/context/AuthContext";
import DashboardPage from "@/features/dashboard/components/DashboardPage";
import AdminDashboardPage from "@/features/admin/components/AdminDashboardPage";
import SecurityDashboardPage from "@/features/security/components/SecurityDashboardPage";

export default function DashboardRoutePage() {
  const { user, isLoading } = useAuthContext();

  if (isLoading || user === undefined) return null;

  if (user?.role === "TENANT_ADMIN") {
    return <AdminDashboardPage />;
  }

  if (user?.role === "SECURITY") {
    return (
      <main className="flex-1 bg-[#F7F8FC] p-6 overflow-y-auto">
        <SecurityDashboardPage />
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#F7F8FC] p-6 overflow-y-auto">
      <DashboardPage />
    </main>
  );
}
