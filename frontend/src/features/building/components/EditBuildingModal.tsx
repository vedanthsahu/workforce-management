"use client";

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

import { Building } from "../types/building.types";
import { useEditBuilding } from "../hooks/useEditBuilding";
import ReactivateChecklist from "@/features/offices/components/ReactivateChecklist";
import AncestorStatusRow from "@/features/offices/components/AncestorStatusRow";

type Props = {
  building: Building;
  open: boolean;
  onClose: () => void;
  onSuccess: (buildingId: string) => void;
};

export default function EditBuildingModal({
  building,
  open,
  onClose,
  onSuccess,
}: Props) {
  const {
    loading,
    formData,
    inactiveFloors,
    selectedFloorIds,
    isReactivating,
    toggleFloor,
    officeInfo,
    officeInfoLoading,
    officeNeedsReactivation,
    handleChange,
    handleUpdate,
  } = useEditBuilding(building, onSuccess, open);

  const hasChanges =
    formData.building_name !== building.building_name ||
    formData.status !== building.status;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Building</DialogTitle>
          <DialogDescription>Update building details and save changes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <AncestorStatusRow
            label="Office"
            name={officeInfo?.name ?? building.site_name}
            status={officeInfo?.status ?? ""}
            loading={officeInfoLoading || !officeInfo}
          />

          <div className="space-y-1.5">
            <Label>Building Name</Label>
            <Input
              value={formData.building_name}
              onChange={(e) => handleChange("building_name", e.target.value)}
              placeholder="Enter building name"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full h-10 px-4 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          {isReactivating && (officeNeedsReactivation || inactiveFloors.length > 0) && (
            <div className="space-y-1.5">
              <Label>Reactivate associated items</Label>
              <p className="text-xs text-gray-500">
                {officeNeedsReactivation && (
                  <>
                    This building&apos;s office is currently inactive and will be reactivated automatically
                    so the building can go active.{" "}
                  </>
                )}
                {inactiveFloors.length > 0 && (
                  <>
                    This building has {inactiveFloors.length} inactive floor(s). Select any you&apos;d like
                    to reactivate along with the building — the rest will stay inactive.
                  </>
                )}
              </p>
              <ReactivateChecklist
                office={officeNeedsReactivation && officeInfo ? { id: building.site_id, name: officeInfo.name } : null}
                buildings={[]}
                floors={inactiveFloors.map((f) => ({ ...f, buildingId: building.building_id }))}
                selectedBuildingIds={[]}
                selectedFloorIds={selectedFloorIds}
                onToggleBuilding={() => {}}
                onToggleFloor={toggleFloor}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await handleUpdate();
              onClose();
            }}
            disabled={loading || !hasChanges}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
