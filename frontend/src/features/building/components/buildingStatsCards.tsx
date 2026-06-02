"use client";

import { Building2, MapPin, Lock, Layers } from "lucide-react";

const Card = ({ icon, title, value, subtitle, bg }: any) => (
  <div className="bg-white border rounded-xl p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>
      {icon}
    </div>

    <div>
      <p className="text-gray-500 text-sm">{title}</p>
      <h2 className="text-xl font-semibold">{value}</h2>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  </div>
);

export default function BuildingStatsCards() {
  return (
    <div className="grid grid-cols-4 gap-6 mb-6">
      <Card icon={<Building2 className="w-5 h-5 text-blue-600" />} title="Total Buildings" value="12" subtitle="Across all sites" bg="bg-blue-100" />
      <Card icon={<MapPin className="w-5 h-5 text-green-600" />} title="Active Buildings" value="10" subtitle="Currently active" bg="bg-green-100" />
      <Card icon={<Lock className="w-5 h-5 text-orange-600" />} title="Inactive Buildings" value="2" subtitle="Currently inactive" bg="bg-orange-100" />
      <Card icon={<Layers className="w-5 h-5 text-purple-600" />} title="Total Capacity" value="3,450" subtitle="Total seats" bg="bg-purple-100" />
    </div>
  );
}