"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxItem,
} from "@/components/ui/combobox";
import { Office, UpdateOfficePayload } from "../types/office.types";
import {
  findStateOfCity,
  getCities,
  getStatesOfCountry,
} from "../utils/office.utils";

// Same looks as the Add Office form: read-only fields (code, counts) and
// dropdowns waiting on a parent field (State, City).
const readOnlyInputClass = "bg-gray-50 text-gray-500 cursor-not-allowed";
const comboInputClass =
  "placeholder:text-muted-foreground! disabled:opacity-100 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed";
import { officeService } from "../services/office.service";
import { buildingService } from "@/features/building/services/buildingService";
import { floorService } from "@/features/floor/services/floorService";
import ReactivateChecklist, {
  ReactivateChecklistFloor,
  ReactivateChecklistItem,
} from "./ReactivateChecklist";

interface EditOfficeModalProps {
  office: Office;
  open: boolean;
  onClose: () => void;
  onSuccess: (siteId: string) => void;
}

export default function EditOfficeModal({ office, open, onClose, onSuccess }: EditOfficeModalProps) {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<UpdateOfficePayload>({
    site_name: "",
    city: "",
    country: "",
    timezone: "",
    address_line1: "",
    address_line2: "",
    status: "ACTIVE",
  });

  // Inactive buildings/floors offered for reactivation when the office is
  // being switched from INACTIVE back to ACTIVE — these were cascade
  // -deactivated when the office itself went inactive (or were already
  // inactive for their own reasons), and reactivating the office alone
  // deliberately does not resurrect them (see location_service.py).
  const [inactiveBuildings, setInactiveBuildings] = useState<ReactivateChecklistItem[]>([]);
  const [inactiveFloors, setInactiveFloors] = useState<ReactivateChecklistFloor[]>([]);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<string[]>([]);
  const [selectedFloorIds, setSelectedFloorIds] = useState<string[]>([]);
  // True only while the inactive-buildings/floors fetch below is in flight --
  // Save must stay disabled until it settles, otherwise a fast click submits
  // before the admin ever had a chance to see/check any reactivate options.
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Re-sync from the source office every time the modal opens — not just
  // when `office` changes — so a Cancel discards any unsaved status/field
  // edits instead of leaving them staged for the next open. The modal stays
  // mounted between opens (parent only toggles `open`), so an
  // `[office]`-only effect would only run once per office.
  useEffect(() => {
    if (open && office) {
      setFormData({
        site_name: office.site_name || "",
        city: office.city || "",
        country: office.country || "",
        timezone: office.timezone || "",
        address_line1: office.address_line1 || "",
        address_line2: office.address_line2 || "",
        status: office.status || "ACTIVE",
      });
      setSelectedState(findStateOfCity(office.country || "", office.city || ""));
      setSelectedBuildingIds([]);
      setSelectedFloorIds([]);
      setInactiveBuildings([]);
      setInactiveFloors([]);
    }
  }, [open, office]);

  const isReactivating = open && office.status === "INACTIVE" && formData.status === "ACTIVE";

  // Fetch the office's currently-inactive buildings/floors only when the
  // user actually flips the switch back to ACTIVE, not on every open.
  useEffect(() => {
    if (!isReactivating) {
      setSelectedBuildingIds([]);
      setSelectedFloorIds([]);
      setInactiveBuildings([]);
      setInactiveFloors([]);
      setChecklistLoading(false);
      return;
    }
    let cancelled = false;
    setChecklistLoading(true);
    (async () => {
      try {
        const [buildings, floors] = await Promise.all([
          buildingService.getBuildings({ site_id: Number(office.site_id), status: "INACTIVE" }),
          floorService.getAllFloors({ site_id: office.site_id, status: "INACTIVE" }),
        ]);
        if (cancelled) return;
        setInactiveBuildings(buildings.map((b) => ({ id: b.building_id, name: b.building_name })));
        setInactiveFloors(
          floors.map((f) => ({ id: f.floor_id, name: f.floor_name, buildingId: f.building_id }))
        );
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setChecklistLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReactivating, office.site_id]);

  // Once the reactivate checklist has loaded, scroll it into view — it sits
  // below the fold, so otherwise the admin may not notice it appeared.
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const showChecklist =
    isReactivating && !checklistLoading && (inactiveBuildings.length > 0 || inactiveFloors.length > 0);
  useEffect(() => {
    if (!showChecklist) return;
    const el = scrollAreaRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [showChecklist]);

  const toggleBuilding = (id: string) => {
    setSelectedBuildingIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const toggleFloor = (id: string) => {
    setSelectedFloorIds((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  // State only narrows the city list; the site record has no state column,
  // so it stays out of formData (and the update payload).
  const [selectedState, setSelectedState] = useState("");
  const stateOptions = useMemo(() => getStatesOfCountry(formData.country), [formData.country]);
  const cityOptions = useMemo(
    () => getCities(formData.country, selectedState),
    [formData.country, selectedState]
  );
  // City is pickable once a state is chosen, or right away for countries
  // that have no states in the dataset.
  const cityStepReady = !!formData.country && (!!selectedState || stateOptions.length === 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload: UpdateOfficePayload = { ...formData };
      if (isReactivating) {
        if (selectedBuildingIds.length > 0) {
          payload.reactivate_building_ids = selectedBuildingIds.map(Number);
        }
        if (selectedFloorIds.length > 0) {
          payload.reactivate_floor_ids = selectedFloorIds.map(Number);
        }
      }
      await officeService.updateSite(office.site_id, payload);
      onClose();
      onSuccess(office.site_id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const hasChanges =
    formData.site_name !== (office.site_name || "") ||
    formData.city !== (office.city || "") ||
    formData.country !== (office.country || "") ||
    formData.timezone !== (office.timezone || "") ||
    formData.address_line1 !== (office.address_line1 || "") ||
    formData.address_line2 !== (office.address_line2 || "") ||
    formData.status !== (office.status || "ACTIVE");

  // Changing country/state clears City, so block saving a half-filled location.
  const isFormValid =
    !!formData.site_name.trim() &&
    !!formData.country.trim() &&
    !!formData.city.trim() &&
    !!formData.timezone.trim();

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Office</DialogTitle>
          <DialogDescription>Update office details and save changes.</DialogDescription>
        </DialogHeader>

        {/* Scrolls when the reactivate checklist makes the form taller than the screen. */}
        <div
          ref={scrollAreaRef}
          className="space-y-5 max-h-[65vh] overflow-y-auto p-1 -m-1 pr-3 -mr-3"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#e2e8f0 transparent" }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label>Office Name</Label>
              <Input
                name="site_name"
                value={formData.site_name || ""}
                onChange={handleChange}
                placeholder="Enter office name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Office Code</Label>
              <Input value={office.site_code || ""} readOnly className={readOnlyInputClass} />
            </div>

            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={formData.country || ""} readOnly className={readOnlyInputClass} />
            </div>

            <div className="space-y-1.5">
              <Label>State</Label>
              <Combobox
                items={stateOptions}
                value={selectedState || null}
                disabled={!formData.country || stateOptions.length === 0}
                onValueChange={(value) => {
                  setSelectedState(value ?? "");
                  setFormData((prev) => ({ ...prev, city: "" }));
                }}
              >
                <ComboboxInput
                  placeholder={
                    !formData.country
                      ? "Select a country first"
                      : stateOptions.length === 0
                        ? "No states for this country"
                        : "Select a state"
                  }
                  className={comboInputClass}
                />
                <ComboboxContent>
                  {(state: string) => (
                    <ComboboxItem key={state} value={state}>
                      {state}
                    </ComboboxItem>
                  )}
                </ComboboxContent>
              </Combobox>
            </div>

            <div className="space-y-1.5">
              <Label>
                City
                {!cityStepReady && (
                  <span className="text-[11px] font-normal text-gray-400">
                    (Select a state to edit city)
                  </span>
                )}
              </Label>
              {cityStepReady && cityOptions.length === 0 ? (
                // Some states have no cities in the dataset — let the admin type one.
                <Input
                  name="city"
                  value={formData.city || ""}
                  onChange={handleChange}
                  placeholder="Enter city"
                />
              ) : (
                <Combobox
                  items={cityOptions}
                  value={formData.city || null}
                  disabled={!cityStepReady}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, city: value ?? "" }))
                  }
                >
                  <ComboboxInput
                    placeholder={
                      !formData.country
                        ? "Select a country first"
                        : !cityStepReady
                          ? "Select a state first"
                          : "Select a city"
                    }
                    className={comboInputClass}
                  />
                  <ComboboxContent>
                    {(city: string) => (
                      <ComboboxItem key={city} value={city}>
                        {city}
                      </ComboboxItem>
                    )}
                  </ComboboxContent>
                </Combobox>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input value={formData.timezone || ""} readOnly className={readOnlyInputClass} />
            </div>

            {/* Buildings/floors are managed from their own pages — shown here for context only. */}
            <div className="space-y-1.5">
              <Label>Buildings</Label>
              <Input value={office.building_count ?? 0} readOnly className={readOnlyInputClass} />
            </div>

            <div className="space-y-1.5">
              <Label>Floors</Label>
              <Input value={office.floor_count ?? 0} readOnly className={readOnlyInputClass} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              value={formData.status || "ACTIVE"}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as "ACTIVE" | "INACTIVE" })
              }
              className="w-full h-10 px-4 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          {isReactivating && checklistLoading && (
            <p className="text-xs text-gray-500">Checking for inactive buildings/floors…</p>
          )}

          {showChecklist && (
            <div className="space-y-1.5">
              <Label>Reactivate associated buildings/floors</Label>
              <p className="text-xs text-gray-500">
                This office has {inactiveBuildings.length} inactive building(s) and {inactiveFloors.length}{" "}
                inactive floor(s). Select any you&apos;d like to reactivate along with the office — the rest
                will stay inactive.
              </p>
              <ReactivateChecklist
                buildings={inactiveBuildings}
                floors={inactiveFloors}
                selectedBuildingIds={selectedBuildingIds}
                selectedFloorIds={selectedFloorIds}
                onToggleBuilding={toggleBuilding}
                onToggleFloor={toggleFloor}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || checklistLoading || !hasChanges || !isFormValid}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
