"use client";

import { useState, useEffect } from "react";
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
import { Office, UpdateOfficePayload } from "../types/office.types";
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
      return;
    }
    let cancelled = false;
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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReactivating, office.site_id]);

  const toggleBuilding = (id: string) => {
    setSelectedBuildingIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const toggleFloor = (id: string) => {
    setSelectedFloorIds((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

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

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Office</DialogTitle>
          <DialogDescription>Update office details and save changes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
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
              <Label>City</Label>
              <Input
                name="city"
                value={formData.city || ""}
                onChange={handleChange}
                placeholder="Enter city"
              />
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

          {isReactivating && (inactiveBuildings.length > 0 || inactiveFloors.length > 0) && (
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
          <Button onClick={handleSubmit} disabled={loading || !hasChanges}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
