"use client";

import {
  Pencil,
  Wifi,
  Coffee,
  Monitor,
  VolumeX,
  Building,
  DoorOpen,
  Tag,
} from "lucide-react";

import { Amenity } from "../types/amenities.types";

import { amenitiesService } from "../services/amenitiesService";

type Props = {
  data: Amenity[];
  onEdit: (amenity: Amenity) => void;
};

const iconMap: Record<string, any> = {
  wifi: Wifi,
  coffee: Coffee,
  monitor: Monitor,
  "volume-x": VolumeX,
  elevator: Building,
  window: DoorOpen,
};

export default function AmenitiesTable({
  data,
  onEdit,
}: Props) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm table-auto">

        {/* HEADER */}
        <thead className="text-xs text-gray-500 bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-4 text-left">
              Amenity Name
            </th>

            <th className="px-6 py-4 text-left">
              Category
            </th>

            <th className="px-6 py-4 text-left">
              Description
            </th>

            <th className="px-6 py-4 text-center">
              Icon
            </th>

            <th className="px-6 py-4 text-center">
              Status
            </th>

            <th className="px-6 py-4 text-center">
              Assigned Seats
            </th>

            <th className="px-6 py-4 text-center">
              Actions
            </th>
          </tr>
        </thead>

        {/* BODY */}
        <tbody className="divide-y divide-gray-100">
          {data.map((amenity) => {
            const Icon =
              iconMap[
                amenity.icon_name?.toLowerCase()
              ] || Tag;

            return (
              <tr
                key={amenity.amenity_id}
                className="hover:bg-gray-50"
              >
                {/* AMENITY NAME */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">

                    <div className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-100">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>

                    <div>
                      <p className="font-medium text-gray-900">
                        {amenity.amenity_name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {amenity.amenity_key}
                      </p>
                    </div>

                  </div>
                </td>

                {/* CATEGORY */}
                <td className="px-6 py-4">
                  <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                    {amenity.category_name}
                  </span>
                </td>

                {/* DESCRIPTION */}
                <td className="px-6 py-4 text-gray-600 max-w-xs">
                  {amenity.description}
                </td>

                {/* ICON */}
                <td className="px-6 py-4 text-center">
                  <Icon className="w-5 h-5 mx-auto text-gray-700" />
                </td>

                {/* STATUS */}
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-3 py-1 text-xs rounded-full ${
                      amenity.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {amenity.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </td>

                {/* ASSIGNED SEATS */}
                <td className="px-6 py-4 text-center font-medium">
                  {amenity.assigned_seat_count.toLocaleString()}
                </td>

                {/* ACTIONS */}
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() =>
                      onEdit(amenity)
                    }
                    className="p-2 border rounded-lg hover:bg-gray-100 transition"
                  >
                    <Pencil
                      size={14}
                      className="text-blue-600"
                    />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>

      </table>
    </div>
  );
}