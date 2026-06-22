"use client";
import { Building2, Building, Layers, Armchair, LucideIcon } from "lucide-react";
import { SummaryCardItem } from "@/features/summary/types/Admin dashboard.types";


interface SummaryCardsProps {
  cards: SummaryCardItem[];
  loading: boolean;
}

const cardClass =
  "flex items-center gap-4 rounded-lg border bg-card p-5 shadow-sm";
const iconWrapClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-sidebar text-sidebar-foreground";
const labelClass = "text-sm text-muted-foreground";
const valueClass = "text-2xl font-semibold leading-tight";

// Display-only mapping (icon per metric) — not business logic, so it stays in the component.
const ICONS: Record<string, LucideIcon> = {
  total_offices: Building2,
  total_buildings: Building,
  total_floors: Layers,
  total_seats: Armchair,
};

export const SummaryCards = ({ cards, loading }: SummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* SUMMARY CARDS */}
      {cards.map(({ key, label, value }) => {
        const Icon = ICONS[key];
        return (
          <div key={key} className={cardClass}>
            <div className={iconWrapClass}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className={labelClass}>{label}</p>
              <p className={valueClass}>
                {loading ? (
                  <span className="inline-block h-6 w-12 animate-pulse rounded bg-muted" />
                ) : (
                  value ?? "—"
                )}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};