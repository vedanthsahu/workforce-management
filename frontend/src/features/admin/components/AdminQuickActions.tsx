"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

import {
  UploadCloud,
  Building2,
  Armchair,
  Tag,
  Ban,
  BarChart3,
} from "lucide-react";

export default function AdminQuickActions() {
  const actions = [
    {
      title: "Upload Floor Layout",
      desc: "Upload and manage floor layouts",
      icon: UploadCloud,
      color: "bg-indigo-50 text-indigo-600",
      route: "/admin/layouts/upload",
    },
    {
      title: "Add Floor",
      desc: "Create a new floor for an office",
      icon: Building2,
      color: "bg-green-50 text-green-600",
      route: "/admin/floors",
    },
    {
      title: "Manage Seats",
      desc: "Add, edit or import seats",
      icon: Armchair,
      color: "bg-green-50 text-green-600",
      route: "/admin/seats",
    },
    {
      title: "Manage Amenities",
      desc: "Configure available amenities",
      icon: Tag,
      color: "bg-indigo-50 text-indigo-600",
      route: "/admin/amenities",
    },
    {
      title: "Seat Status",
      desc: "Manage blocked or maintenance seats",
      icon: Ban,
      color: "bg-red-50 text-red-600",
      route: "/admin/seat-status",
    },
    {
      title: "Reports",
      desc: "View occupancy and utilization reports",
      icon: BarChart3,
      color: "bg-indigo-50 text-indigo-600",
      route: "/admin/reports",
    },
  ];

  return (
    <div>
      <h2 className="text-sm font-semibold mb-4">
        Quick Actions
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {actions.map((item, index) => {
          const Icon = item.icon;

          return (
            <Link key={index} href={item.route}>
              <Card className="p-5 rounded-xl cursor-pointer transition hover:shadow-md gap-0 border">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                    item.color
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.desc}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}