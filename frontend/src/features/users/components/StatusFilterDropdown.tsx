"use client";

import type { ApiUserStatus } from "../types/users.types";
import { STATUS_FILTER_OPTIONS as OPTIONS } from "../utils/users.utils";

type Props = {
  value: ApiUserStatus | "ALL";
  onChange: (value: ApiUserStatus | "ALL") => void;
};

export default function StatusFilterDropdown({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ApiUserStatus | "ALL")}
      className="h-10 w-full md:w-44 px-4 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.key} value={opt.key}>{opt.label}</option>
      ))}
    </select>
  );
}
