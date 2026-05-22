"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
import { useSearchParams } from "next/navigation";

import LayoutPreview from "@/features/managelayout/components/LayoutPreview";
import LayoutDetails from "@/features/managelayout/components/LayoutDetails";
import ManageLayoutHeader from "@/features/managelayout/components/ManageLayoutHeader";
import LayoutFilters from "@/features/managelayout/components/LayoutFilters";
import AdminTopbar from "@/features/admin/components/AdminTopbar";

export default function ManageLayoutPage() {
  const params = useSearchParams();

  const layoutId = params.get("layoutId");
  const floorId = params.get("floorId");

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">

        {/* Sidebar */}
        <AppSidebar user={null} />

        {/* RIGHT SIDE */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Topbar */}
          <AdminTopbar />

          {/* MAIN CONTENT */}
          <main className="flex-1 bg-gray-50 p-6 space-y-6 overflow-y-auto">

            {/* HEADER */}
            <ManageLayoutHeader />

            {/* FILTERS */}
            <LayoutFilters />

            {/* MAIN GRID */}
            <div className="grid grid-cols-12 gap-6 w-full">

              {/* LEFT SIDE */}
              <div className="col-span-8">
                <LayoutPreview />
              </div>

              {/* RIGHT SIDE */}
              <div className="col-span-4">
                <LayoutDetails />
              </div>

            </div>

          </main>

        </div>
      </div>
    </SidebarProvider>
  );
}