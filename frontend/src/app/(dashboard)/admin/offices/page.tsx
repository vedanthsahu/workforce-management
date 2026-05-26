"use client";

import { useOffices } from "@/features/offices/hooks/useOffices";
import OfficeStats from "@/features/offices/components/OfficeStats";
import OfficeFilters from "@/features/offices/components/OfficeFilters";
import OfficeTable from "@/features/offices/components/OfficeTable";
import AdminTopbar from "@/features/admin/components/AdminTopbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight } from "lucide-react";
// import router from "next/router";

export default function OfficesPage() {
  const { data } = useOffices();

  return (
    <>
      <AdminTopbar />
      <main className="flex-1 bg-[#f8fafc] p-6 space-y-6 overflow-y-auto">
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">

      {/* 🔥 BREADCRUMB */}
      <div className="flex items-center text-sm text-gray-500 gap-2">
        <span className="text-blue-600 font-medium">
          Admin
        </span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-blue-600 font-medium">Office</span>
        <ChevronRight className="w-4 h-4" />
        <span>Manage Offices</span>
      </div>

      {/* 🔥 HEADER */}
      <div className="flex justify-between items-start">

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Manage Offices
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View, add, edit and manage all offices across your organization.
          </p>
        </div>

        <Button className="bg-blue-600 text-white gap-2 rounded-xl shadow-sm">
          <Plus className="w-4 h-4" />
          Add Office
        </Button>

      </div>
      <div className="space-y-3">
         {/* 🔥 STATS */}
      <OfficeStats data={data} />
      </div>
     

      {/* 🔥 TABLE CARD */}
      <Card className="rounded-2xl shadow-sm border">

        <CardContent className="p-0">

          {/* FILTER */}
          <OfficeFilters />

          {/* TABLE */}
          <OfficeTable data={data} />

          {/* 🔥 FOOTER (IMPORTANT) */}
          <div className="flex justify-between items-center p-4 text-sm text-gray-500">

            <span>
              Showing 1 to {data.length} of {data.length} entries
            </span>

            <div className="flex gap-2 items-center">

              <button className="px-3 py-1 border rounded-md hover:bg-gray-100">
                ‹
              </button>

              <button className="px-3 py-1 bg-blue-600 text-white rounded-md">
                1
              </button>

              <button className="px-3 py-1 border rounded-md hover:bg-gray-100">
                2
              </button>

              <button className="px-3 py-1 border rounded-md hover:bg-gray-100">
                3
              </button>

              <button className="px-3 py-1 border rounded-md hover:bg-gray-100">
                ›
              </button>

            </div>

          </div>

        </CardContent>

      </Card>

    </div>
    </main>
      </>
  );
}