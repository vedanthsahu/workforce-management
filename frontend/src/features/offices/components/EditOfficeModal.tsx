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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Office, UpdateOfficePayload } from "../types/office.types";
import { officeService } from "../services/office.service";
import { X } from "lucide-react";

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

  useEffect(() => {
    if (office) {
      setFormData({
        site_name: office.site_name || "",
        city: office.city || "",
        country: office.country || "",
        timezone: office.timezone || "",
        address_line1: office.address_line1 || "",
        address_line2: office.address_line2 || "",
        status: office.status || "ACTIVE",
      });
    }
  }, [office]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await officeService.updateSite(office.site_id, formData);
      onClose();
      onSuccess(office.site_id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
            <Select
              value={formData.status || "ACTIVE"}
              onValueChange={(value) => {
                if (!value) return;
                setFormData({ ...formData, status: value as "ACTIVE" | "INACTIVE" });
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
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
