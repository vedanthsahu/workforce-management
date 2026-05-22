// import { DashboardPage as Dashboard } from "@/features/dashboard";

// export default function DashboardPage() {
//   return <Dashboard />;
// }

// app/(dashboard)/dashboard/page.tsx
import DashboardPage from "@/features/dashboard/components/DashboardPage";

export default function EmployeeDashboardPage() {
  return (
    <main className="flex-1 bg-gray-50 p-6 overflow-y-auto">
      <DashboardPage />
    </main>
  );
}