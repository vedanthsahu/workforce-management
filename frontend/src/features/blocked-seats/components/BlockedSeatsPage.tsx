"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import SummaryCard from "./SummaryCard";
import FilterPanel from "./FilterPanel";
import BlockedSeatsTable from "./BlockedSeatsTable";
import { useBlockedSeatLocations } from "../hooks/useBlockedSeatLocations";
import { blockedSeatsService } from "../services/blockedSeatsService";
import type {
  BlockCategory,
  BlockedSeat,
  BlockedSeatFilters,
  BlockedSeatListResponse,
} from "../types/blockedSeats.types";
import {
  CATEGORY_LABELS,
  EMPTY_FILTERS,
  SUMMARY_CARDS,
} from "../utils/constants";

const EMPTY_RESPONSE: BlockedSeatListResponse = {
  items: [],
  summary: {
    active_blocks: 0,
    seats_blocked_today: 0,
    upcoming_blocks: 0,
    expiring_soon: 0,
    expired: 0,
  },
  pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
};
export default function BlockedSeatsPage() {
  const router = useRouter();
  const [category, setCategory] = useState<BlockCategory>("active");
  const [filters, setFilters] = useState<BlockedSeatFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<BlockedSeatFilters>(EMPTY_FILTERS);
  const [response, setResponse] = useState(EMPTY_RESPONSE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    sites,
    buildings,
    floors,
    loadBuildings,
    loadFloors,
    setBuildings,
    setFloors,
  } = useBlockedSeatLocations();
  const hasCriteria = Object.values(filters).some(Boolean);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    blockedSeatsService
      .list(category, appliedFilters, page)
      .then((data) => {
        if (!cancelled) setResponse(data);
      })
      .catch(() => {
        if (!cancelled) {
          setResponse(EMPTY_RESPONSE);
          setError("Unable to load blocked seats.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, appliedFilters, page, refreshKey]);
  const updateFilter = (key: keyof BlockedSeatFilters, value: string) => {
    if (key === "siteId") {
      setFilters((current) => ({
        ...current,
        siteId: value,
        buildingId: "",
        floorId: "",
      }));
      setBuildings([]);
      setFloors([]);
      void loadBuildings(value);
      return;
    }
    if (key === "buildingId") {
      setFilters((current) => ({ ...current, buildingId: value, floorId: "" }));
      setFloors([]);
      void loadFloors(value);
      return;
    }
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const cancelBlock = async (row: BlockedSeat) => {
    const reason = window.prompt(
      `Reason for unblocking seat ${row.seat_code}:`,
    );
    if (!reason?.trim()) return;
    try {
      await blockedSeatsService.cancel(row.block_id, reason.trim());
      setRefreshKey((value) => value + 1);
    } catch {
      setError("Unable to unblock the selected seat.");
    }
  };
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-4 sm:space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 text-xs text-muted-foreground">
              Dashboard <span className="px-1">/</span>{" "}
              <span className="font-semibold text-foreground">
                Blocked Seats
              </span>
            </div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              Blocked Seats
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Block and manage seats that are unavailable for booking.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/blocked-seats/block")}
            className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:self-auto"
          >
            <Plus size={17} />
            Block Seats
          </button>
        </header>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {SUMMARY_CARDS.map((card) => (
            <SummaryCard
              key={card.id}
              label={card.label}
              icon={card.icon}
              iconClass={card.iconClass}
              count={response.summary[card.summaryKey]}
              selected={category === card.id}
              onClick={() => {
                setCategory(card.id);
                setPage(1);
              }}
            />
          ))}
        </div>
        <FilterPanel
          filters={filters}
          sites={sites}
          buildings={buildings}
          floors={floors}
          onChange={updateFilter}
          enabled={hasCriteria}
          onSearch={() => {
            setAppliedFilters(filters);
            setPage(1);
          }}
        />
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <BlockedSeatsTable
          title={CATEGORY_LABELS[category]}
          rows={response.items}
          total={response.pagination.total}
          page={page}
          totalPages={Math.max(1, response.pagination.total_pages)}
          loading={loading}
          onPageChange={setPage}
          onCancel={(row) => void cancelBlock(row)}
        />
      </div>
    </main>
  );
}
