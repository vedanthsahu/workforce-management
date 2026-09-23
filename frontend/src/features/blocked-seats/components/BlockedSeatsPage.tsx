"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import SummaryCard from "./SummaryCard";
import FilterPanel from "./FilterPanel";
import BlockedSeatsTable from "./BlockedSeatsTable";
import BlockedSeatActionPanel from "./BlockedSeatActionPanel";
import type { BlockedSeatAction } from "./BlockedSeatActionMenu";
import { useBlockedSeatLocations } from "../hooks/useBlockedSeatLocations";
import { blockedSeatsService } from "../services/blockedSeatsService";
import type {
  BlockCategory,
  BlockListScope,
  BlockedSeat,
  BlockedSeatFilters,
  BlockedSeatListResponse,
  BlockedSeatSummary,
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
  pagination: { total: 0, page: 1, limit: 10, total_pages: 0 },
};
const EMPTY_SUMMARY: BlockedSeatSummary = EMPTY_RESPONSE.summary;
const apiErrorMessage = (error: unknown, fallback: string) =>
  (
    error as {
      response?: {
        data?: { detail?: { message?: string }; error?: { message?: string } };
      };
    }
  ).response?.data?.detail?.message ??
  (
    error as {
      response?: { data?: { error?: { message?: string } } };
    }
  ).response?.data?.error?.message ??
  fallback;

export default function BlockedSeatsPage() {
  const router = useRouter();
  const [category, setCategory] = useState<BlockCategory>("active");
  const [listScope, setListScope] = useState<BlockListScope>("active");
  const [filters, setFilters] = useState<BlockedSeatFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<BlockedSeatFilters>(EMPTY_FILTERS);
  const [response, setResponse] = useState(
    () =>
      blockedSeatsService.getCachedList("active", EMPTY_FILTERS, 1) ??
      EMPTY_RESPONSE,
  );
  const [loading, setLoading] = useState(
    () => !blockedSeatsService.getCachedList("active", EMPTY_FILTERS, 1),
  );
  const [summary, setSummary] = useState(
    () => blockedSeatsService.getCachedSummary() ?? EMPTY_SUMMARY,
  );
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAction, setSelectedAction] = useState<{
    action: BlockedSeatAction;
    row: BlockedSeat;
  } | null>(null);
  const {
    sites,
    buildings,
    floors,
    loadingSites,
    loadingBuildings,
    loadingFloors,
    locationError,
    loadBuildings,
    loadFloors,
    setBuildings,
    setFloors,
  } = useBlockedSeatLocations();
  const hasCriteria = Object.values(filters).some(Boolean);
  useEffect(() => {
    router.prefetch("/admin/blocked-seats/block");
  }, [router]);
  useEffect(() => {
    let cancelled = false;
    blockedSeatsService
      .summary(refreshKey > 0)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        // The table remains usable if only the summary request fails.
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);
  useEffect(() => {
    let cancelled = false;
    const cached = blockedSeatsService.getCachedList(
      listScope,
      appliedFilters,
      page,
    );
    if (cached) setResponse(cached);
    setLoading(!cached);
    setError("");
    if (cached) return () => {
      cancelled = true;
    };
    blockedSeatsService
      .list(listScope, appliedFilters, page)
      .then((data) => {
        if (!cancelled) setResponse(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setResponse(EMPTY_RESPONSE);
          setError(apiErrorMessage(requestError, "Unable to load blocked spaces."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listScope, appliedFilters, page, refreshKey]);
  useEffect(() => {
    if (loading || error) return;
    void Promise.allSettled(
      SUMMARY_CARDS.map((card) => card.id)
        .filter((id) => id !== category)
        .map((id) => blockedSeatsService.list(id, EMPTY_FILTERS, 1)),
    );
  }, [category, error, loading]);
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
  useEffect(() => {
    if (
      filters.siteId &&
      !filters.buildingId &&
      !loadingBuildings &&
      buildings.length === 1
    ) {
      const buildingId = buildings[0].id;
      setFilters((current) => ({ ...current, buildingId, floorId: "" }));
      setFloors([]);
      void loadFloors(buildingId);
    }
  }, [
    buildings,
    filters.buildingId,
    filters.siteId,
    loadFloors,
    loadingBuildings,
    setFloors,
  ]);
  useEffect(() => {
    if (
      filters.buildingId &&
      !filters.floorId &&
      !loadingFloors &&
      floors.length === 1
    ) {
      setFilters((current) => ({ ...current, floorId: floors[0].id }));
    }
  }, [filters.buildingId, filters.floorId, floors, loadingFloors]);
  const handleAction = (action: BlockedSeatAction, row: BlockedSeat) => {
    setSelectedAction({ action, row });
  };
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FC] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-4 sm:space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[17px] font-bold leading-tight text-[#1A1A2E] sm:text-[20px]">
              Blocked Spaces
            </h1>
            <p className="mt-0.5 text-[11.5px] text-gray-400 sm:text-[12.5px]">
              Block and manage spaces that are unavailable for booking.
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/blocked-seats/block")}
            className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg bg-indigo-600 px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-indigo-700 sm:self-auto sm:text-[13px]"
          >
            <Plus size={17} />
            Block Spaces
          </button>
        </header>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {SUMMARY_CARDS.map((card) => (
            <SummaryCard
              key={card.id}
              label={card.label}
              icon={card.icon}
              iconClass={card.iconClass}
              count={summary[card.summaryKey]}
              selected={listScope !== "all" && category === card.id}
              onClick={() => {
                setCategory(card.id);
                setListScope(card.id);
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
          loadingSites={loadingSites}
          loadingBuildings={loadingBuildings}
          loadingFloors={loadingFloors}
          onChange={updateFilter}
          enabled={hasCriteria}
          onClear={() => {
            setFilters(EMPTY_FILTERS);
            setAppliedFilters(EMPTY_FILTERS);
            setListScope(category);
            setPage(1);
          }}
          onSearch={() => {
            setAppliedFilters(filters);
            setListScope("all");
            setPage(1);
          }}
        />
        {(locationError || error) && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {locationError || error}
          </p>
        )}
        <BlockedSeatsTable
          title={listScope === "all" ? "Filtered Blocks" : CATEGORY_LABELS[category]}
          rows={response.items}
          total={response.pagination.total}
          page={page}
          totalPages={Math.max(1, response.pagination.total_pages)}
          loading={loading}
          onPageChange={setPage}
          onAction={handleAction}
        />
      </div>
      {selectedAction && (
        <BlockedSeatActionPanel
          action={selectedAction.action}
          row={selectedAction.row}
          onClose={() => setSelectedAction(null)}
          onChanged={() => setRefreshKey((value) => value + 1)}
        />
      )}
    </main>
  );
}
