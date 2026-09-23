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

import { Floor } from "../types/floor.types";
import { useEditFloor } from "../hooks/useEditFloor";
import AncestorStatusRow from "@/features/offices/components/AncestorStatusRow";
import ReactivateChecklist from "@/features/offices/components/ReactivateChecklist";

type Props = {
  floor: Floor;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditFloorModal({
  floor,
  open,
  onClose,
  onSuccess,
}: Props) {
  const {
    loading,
    formData,
    officeInfo,
    buildingInfo,
    ancestorsLoading,
    isReactivating,
    officeNeedsReactivation,
    buildingNeedsReactivation,
    handleChange,
    handleUpdate,
  } = useEditFloor(floor, open);

  const hasChanges =
    formData.floor_name !== floor.floor_name ||
    formData.status !== floor.status;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Floor</DialogTitle>
          <DialogDescription>Update floor details and save changes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <AncestorStatusRow
              label="Office"
              name={officeInfo?.name ?? "—"}
              status={officeInfo?.status ?? ""}
              loading={ancestorsLoading || !officeInfo}
            />
            <AncestorStatusRow
              label="Building"
              name={buildingInfo?.name ?? floor.building_name}
              status={buildingInfo?.status ?? ""}
              loading={ancestorsLoading || !buildingInfo}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Floor Name</Label>
            <Input
              value={formData.floor_name}
              onChange={(e) => handleChange("floor_name", e.target.value)}
              placeholder="Enter floor name"
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

          {isReactivating && (officeNeedsReactivation || buildingNeedsReactivation) && (
            <div className="space-y-1.5">
              <Label>Reactivate associated items</Label>
              <p className="text-xs text-gray-500">
                This floor&apos;s {officeNeedsReactivation && buildingNeedsReactivation
                  ? "office and building are"
                  : officeNeedsReactivation
                    ? "office is"
                    : "building is"}{" "}
                currently inactive and will be reactivated automatically so the floor can go active.
              </p>
              <ReactivateChecklist
                office={officeNeedsReactivation && officeInfo ? { id: floor.site_id, name: officeInfo.name } : null}
                lockedBuilding={
                  buildingNeedsReactivation && buildingInfo
                    ? { id: floor.building_id, name: buildingInfo.name }
                    : null
                }
                buildings={[]}
                floors={[]}
                selectedBuildingIds={[]}
                selectedFloorIds={[]}
                onToggleBuilding={() => {}}
                onToggleFloor={() => {}}
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
              const success = await handleUpdate();
              if (success) { onSuccess(); onClose(); }
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
