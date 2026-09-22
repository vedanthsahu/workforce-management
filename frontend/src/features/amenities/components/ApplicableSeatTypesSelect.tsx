"use client";

import { Check, ChevronDown, X } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  APPLICABLE_SEAT_TYPES,
  APPLICABLE_SEAT_TYPE_LABELS,
  type ApplicableSeatType,
} from "../utils/applicableSeatTypes";

function labelFor(seatType: string): string {
  return APPLICABLE_SEAT_TYPE_LABELS[seatType as ApplicableSeatType] ?? seatType;
}

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  className?: string;
};

export default function ApplicableSeatTypesSelect({ value, onChange, className }: Props) {
  const toggle = (seatType: string) => {
    onChange(
      value.includes(seatType)
        ? value.filter((type) => type !== seatType)
        : [...value, seatType]
    );
  };

  const remove = (seatType: string) => {
    onChange(value.filter((type) => type !== seatType));
  };

  return (
    <Popover>
      <PopoverTrigger
        nativeButton={false}
        render={
          <div
            className={cn(
              "w-full min-h-9 px-2.5 py-1 flex flex-wrap items-center gap-1.5 bg-white border border-gray-200 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
              className
            )}
          >
            {value.length === 0 ? (
              <span className="text-gray-400">All space types</span>
            ) : (
              value.map((seatType) => (
                <span
                  key={seatType}
                  className="flex items-center gap-1 h-6 pl-2 pr-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium"
                >
                  {labelFor(seatType)}
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${labelFor(seatType)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(seatType);
                    }}
                    className="p-0.5 rounded-sm hover:bg-blue-100"
                  >
                    <X size={11} />
                  </span>
                </span>
              ))
            )}
            <ChevronDown size={14} className="shrink-0 text-gray-400 ml-auto" />
          </div>
        }
      />
      <PopoverContent
        align="start"
        className="w-(--anchor-width) gap-0 rounded-none border border-gray-300 bg-white p-0 shadow-none ring-0"
      >
        {APPLICABLE_SEAT_TYPES.map((seatType) => {
          const selected = value.includes(seatType);
          return (
            <button
              key={seatType}
              type="button"
              onClick={() => toggle(seatType)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-gray-600 hover:text-white"
            >
              {labelFor(seatType)}
              {selected && <Check size={14} />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
