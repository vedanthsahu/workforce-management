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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Amenity } from "../types/amenities.types";
import { useEditAmenity } from "../hooks/useEditAmenity";

type Props = {
  amenity: Amenity;
  open: boolean;
  onClose: () => void;
  // Now passes the edited amenity_id back up
  onSuccess: (amenityId: string) => void;
};

export default function EditAmenityModal({
  amenity,
  open,
  onClose,
  onSuccess,
}: Props) {
  const { loading, formData, categories, handleChange, handleUpdate } =
    useEditAmenity(amenity);

  const hasChanges =
    formData.amenity_name !== amenity.amenity_name ||
    formData.description !== amenity.description ||
    String(formData.category_id) !== String(amenity.category_id) ||
    formData.is_active !== amenity.is_active;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Amenity</DialogTitle>
          <DialogDescription>Update amenity details and save changes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label>Amenity Name</Label>
              <Input
                value={formData.amenity_name}
                onChange={(e) => handleChange("amenity_name", e.target.value)}
                placeholder="Enter amenity name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={String(formData.category_id)}
                onValueChange={(value) => {
                  if (value) handleChange("category_id", value);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.category_id} value={String(category.category_id)}>
                      {category.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Enter short description"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={formData.is_active ? "ACTIVE" : "INACTIVE"}
              onValueChange={(value) => {
                if (value) handleChange("is_active", value === "ACTIVE");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!hasChanges) return;
              const success = await handleUpdate();
              if (success) {
                onSuccess(amenity.amenity_id);
                onClose();
              }
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
