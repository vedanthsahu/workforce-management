import { Card, CardContent } from "@/components/ui/card";
import { MapPin, ShieldCheck, Building2, Layers } from "lucide-react";
import { Office } from "../types/office.types";

export default function OfficeStats({ data }: { data: Office[] }) {
  const total = data.length;
  const active = data.filter((d) => d.status === "ACTIVE").length;
  const inactive = data.filter((d) => d.status === "INACTIVE").length;
  const seats = data.reduce((a, b) => a + b.seats, 0);

  return (
    <div className="grid grid-cols-4 gap-6">

      {/* TOTAL offices */}
      <Card className="rounded-2xl border shadow-sm hover:shadow-md transition">
        <CardContent className="flex items-center gap-4 p-6">

          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-100">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>

          <div>
            <p className="text-sm text-gray-500">Total Offices</p>
            <p className="text-2xl font-semibold">{total}</p>
            <p className="text-xs text-gray-400 mt-1">
              Across all tenants
            </p>
          </div>

        </CardContent>
      </Card>

      {/* ACTIVE */}
      <Card className="rounded-2xl border shadow-sm hover:shadow-md transition">
        <CardContent className="flex items-center gap-4 p-6">

          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-green-100">
            <ShieldCheck className="w-5 h-5 text-green-600" />
          </div>

          <div>
            <p className="text-sm text-gray-500">Active Offices</p>
            <p className="text-2xl font-semibold text-green-600">
              {active}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Currently active
            </p>
          </div>

        </CardContent>
      </Card>

      {/* INACTIVE */}
      <Card className="rounded-2xl border shadow-sm hover:shadow-md transition">
        <CardContent className="flex items-center gap-4 p-6">

          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-orange-100">
            <Building2 className="w-5 h-5 text-orange-600" />
          </div>

          <div>
            <p className="text-sm text-gray-500">Inactive Offices</p>
            <p className="text-2xl font-semibold">{inactive}</p>
            <p className="text-xs text-gray-400 mt-1">
              Currently inactive
            </p>
          </div>

        </CardContent>
      </Card>

      {/* TOTAL OFFICES / SEATS */}
      <Card className="rounded-2xl border shadow-sm hover:shadow-md transition">
        <CardContent className="flex items-center gap-4 p-6">

          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-purple-100">
            <Layers className="w-5 h-5 text-purple-600" />
          </div>

          <div>
            <p className="text-sm text-gray-500">Total Seats</p>
            <p className="text-2xl font-semibold">{seats}</p>
            <p className="text-xs text-gray-400 mt-1">
              Across all offices
            </p>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}