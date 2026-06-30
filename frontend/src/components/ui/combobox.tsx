"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"

import { cn } from "@/lib/utils"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"

const Combobox = ComboboxPrimitive.Root

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <div className="relative w-full">
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        className={cn(
          "h-10 w-full px-4 pr-9 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500",
          className
        )}
        {...props}
      />
      <ComboboxPrimitive.Icon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
        <ChevronDownIcon className="size-4" />
      </ComboboxPrimitive.Icon>
    </div>
  )
}

type ComboboxContentProps = Omit<ComboboxPrimitive.Popup.Props, "children"> & {
  children?: ComboboxPrimitive.List.Props["children"];
};

function ComboboxContent({ className, children, ...props }: ComboboxContentProps) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner side="bottom" sideOffset={4} className="isolate z-50 w-(--anchor-width)">
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white text-sm shadow-md",
            className
          )}
          {...props}
        >
          <ComboboxPrimitive.Empty className="px-4 py-2 text-gray-400">
            No results found
          </ComboboxPrimitive.Empty>
          <ComboboxPrimitive.List>{children}</ComboboxPrimitive.List>
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex cursor-pointer items-center justify-between gap-2 px-4 py-2 outline-none data-highlighted:bg-blue-50",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator className="text-blue-600">
        <CheckIcon className="size-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxItem,
  SearchIcon as ComboboxSearchIcon,
}
