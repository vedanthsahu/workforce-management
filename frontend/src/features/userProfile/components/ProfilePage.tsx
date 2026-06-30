


"use client";

/**
 * ProfilePage.tsx
 * src/features/profile/components/ProfilePage.tsx
 */

import { useState, useRef, useEffect } from "react";
import {
  Mail, Phone, MapPin, Briefcase,
  Building2, UserCheck, BadgeCheck,
  Camera, Loader2, TriangleAlert, RefreshCw,
  Layers, Zap, CalendarCheck2, CalendarClock, History,
  ChevronRight, CalendarDays,
  Building, Armchair, Check, Pencil, Save, X, ChevronDown,
} from "lucide-react";

import { Button }    from "@/components/ui/button";
import { Skeleton }  from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Label }     from "@/components/ui/label";
import { Textarea }  from "@/components/ui/textarea";
import { Input }     from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

import { useProfile }            from "../hooks/useProfile";
import {
  getAvailableAmenities,
  getSites,
  getBuildingsBySite,
  getFloorsByBuilding,
} from "../services/profile.service.";
import type {
  EditProfileForm, EditPreferencesForm, ProfileData,
  SeatPreferences, ApiBooking, ApiAmenity,
  ApiSite, ApiBuilding, ApiFloor,
} from "../types/profile.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const ROLE_BADGE: Record<string, string> = {
  TENANT_ADMIN: "bg-rose-50 text-rose-600 ring-rose-200",
  MANAGER:      "bg-violet-50 text-violet-600 ring-violet-200",
  EMPLOYEE:     "bg-blue-50 text-blue-600 ring-blue-200",
  TALENT:       "bg-teal-50 text-teal-600 ring-teal-200",
  SECURITY:     "bg-amber-50 text-amber-600 ring-amber-200",
  FACILITIES:   "bg-orange-50 text-orange-600 ring-orange-200",
};

function RolePill({ role }: { role: string }) {
  const style = ROLE_BADGE[role] ?? "bg-gray-50 text-gray-600 ring-gray-200";
  const label = role.charAt(0) + role.slice(1).toLowerCase().replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 ${style}`}>
      {label}
    </span>
  );
}

function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    CONFIRMED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CANCELLED: "bg-red-50 text-red-600 ring-red-200",
    PENDING:   "bg-amber-50 text-amber-600 ring-amber-200",
  };
  const style = map[status?.toUpperCase()] ?? "bg-gray-50 text-gray-600 ring-gray-200";
  const label = status ? status.charAt(0) + status.slice(1).toLowerCase() : "—";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold ring-1 ${style}`}>
      {label}
    </span>
  );
}

function formatBookingDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return dateStr; }
}

function groupBookingsByMonth(bookings: ApiBooking[]) {
  const groups: Record<string, ApiBooking[]> = {};
  const sorted = [...bookings].sort(
    (a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime()
  );
  for (const b of sorted) {
    try {
      const key = new Date(b.booking_date).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    } catch {
      if (!groups["Other"]) groups["Other"] = [];
      groups["Other"].push(b);
    }
  }
  return groups;
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 font-medium leading-none mb-1">{label}</p>
        <p className="text-[13px] text-gray-800 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function SkillTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11.5px] font-medium ring-1 ring-indigo-100">
      {label}
    </span>
  );
}

// ─── Cascade Select ───────────────────────────────────────────────────────────

function CascadeSelect({
  label, value, onChange, options, placeholder, disabled, loading,
}: {
  label:        string;
  value:        string;
  onChange:     (val: string) => void;
  options:      { value: string; label: string }[];
  placeholder?: string;
  disabled?:    boolean;
  loading?:     boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px]">{label}</Label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          className="w-full h-9 rounded-md border border-gray-200 bg-white pl-3 pr-8 text-[13px] text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">{loading ? "Loading…" : (placeholder ?? "Select…")}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

// ─── Amenity checkbox group ───────────────────────────────────────────────────

function AmenitiesCheckboxGroup({
  amenities, selected, onChange, loading,
}: {
  amenities: ApiAmenity[];
  selected:  string[];
  onChange:  (ids: string[]) => void;
  loading:   boolean;
}) {
  const groups = amenities.reduce<Record<string, ApiAmenity[]>>((acc, a) => {
    const cat = a.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {});

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (amenities.length === 0) {
    return <p className="text-[12px] text-gray-400 italic">No amenities available.</p>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([category, items]) => (
        <div key={category}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            {category}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {items.map((a) => {
              const on = selected.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggle(a.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-[11.5px] font-medium transition-colors ${
                    on
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                    on ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                  }`}>
                    {on && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{a.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {selected.length > 0 && (
        <p className="text-[11px] text-indigo-600 font-medium">
          {selected.length} amenit{selected.length === 1 ? "y" : "ies"} selected
        </p>
      )}
    </div>
  );
}

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({ booking }: { booking: ApiBooking }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
        <Armchair className="w-4 h-4 text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-[12.5px] font-semibold text-gray-800 truncate">Seat {booking.seat_code}</p>
          <BookingStatusBadge status={booking.booking_status} />
        </div>
        <p className="text-[11.5px] text-gray-500 truncate">
          {booking.site_name} · {booking.building_name}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {booking.floor_name} · {formatBookingDate(booking.booking_date)}
        </p>
      </div>
    </div>
  );
}

// ─── Booking History Modal ────────────────────────────────────────────────────

function BookingHistoryModal({
  open, onClose, current, future, past,
}: {
  open: boolean; onClose: () => void;
  current: ApiBooking[]; future: ApiBooking[]; past: ApiBooking[];
}) {
  const [tab, setTab] = useState<"all" | "upcoming" | "past">("all");
  const allBookings  = [...current, ...future, ...past];
  const upcomingList = [...current, ...future];
  const activeList   = tab === "all" ? allBookings : tab === "upcoming" ? upcomingList : past;
  const grouped      = groupBookingsByMonth(activeList);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-lg max-h-[90dvh] sm:max-h-[85vh] flex flex-col p-0 gap-0 rounded-xl">
        <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 shrink-0">
          <DialogTitle className="text-[15px]">Booking History</DialogTitle>
        </DialogHeader>
        <div className="flex gap-1.5 px-4 sm:px-5 pb-3 shrink-0">
          {(["all", "upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                tab === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span className={`ml-1 text-[11px] ${tab === t ? "text-indigo-200" : "text-gray-400"}`}>
                {t === "all" ? allBookings.length : t === "upcoming" ? upcomingList.length : past.length}
              </span>
            </button>
          ))}
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5 min-h-0">
          {activeList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <CalendarDays className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-[13px] text-gray-500 font-medium">No bookings found</p>
            </div>
          ) : (
            Object.entries(grouped).map(([month, bookings]) => (
              <div key={month}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{month}</p>
                <div className="space-y-2">
                  {bookings.map((b) => <BookingCard key={b.booking_id} booking={b} />)}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="px-4 sm:px-5 py-3 border-t border-gray-100 shrink-0">
          <Button variant="outline" size="sm" className="w-full text-[12.5px]" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Profile Dialog — Bio + Skills only ──────────────────────────────────

function EditProfileDialog({
  open, profile, onClose, onSave, isSaving,
}: {
  open: boolean; profile: ProfileData;
  onClose: () => void; onSave: (form: EditProfileForm) => Promise<void>; isSaving: boolean;
}) {
  const [bio, setBio]           = useState(profile.bio);
  const [skills, setSkills]     = useState<string[]>(profile.skills);
  const [skillInput, setSkillInput] = useState("");
  const [error, setError]       = useState("");

  // Reset when dialog opens with fresh profile
  useEffect(() => {
    if (open) {
      setBio(profile.bio);
      setSkills(profile.skills);
      setSkillInput("");
      setError("");
    }
  }, [open, profile.bio, profile.skills]);

  const handleSkillAdd = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setSkillInput("");
  };

  const handleSubmit = async () => {
    setError("");
    try {
      await onSave({ bio, skills });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-md max-h-[90dvh] sm:max-h-[85vh] flex flex-col p-0 gap-0 rounded-xl">
        <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 shrink-0 border-b border-gray-100">
          <DialogTitle className="text-[15px]">Edit About Me</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 min-h-0">
          {/* Bio */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="text-[13px] resize-none"
              rows={4}
              placeholder="Share a little about yourself — your role, interests, or what you're working on."
            />
          </div>

          {/* Skills */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Skills</Label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSkillAdd())}
                className="h-9 text-[13px]"
                placeholder="Add skill & press Enter"
              />
              <Button variant="outline" size="sm" className="h-9 text-[12px] shrink-0" onClick={handleSkillAdd}>
                Add
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-medium ring-1 ring-indigo-100">
                    {s}
                    <button
                      onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-[12px] text-red-500 flex items-center gap-1.5">
              <TriangleAlert className="w-3.5 h-3.5" />{error}
            </p>
          )}
        </div>

        <DialogFooter className="px-4 sm:px-5 py-3 border-t border-gray-100 shrink-0 flex flex-row gap-2 sm:justify-end">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-[12.5px]" disabled={isSaving} onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none text-[12.5px] bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5" />Save changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Preferences Dialog ──────────────────────────────────────────────────

function EditPreferencesDialog({
  open, preferences, onClose, onSave, isSaving,
}: {
  open: boolean; preferences: SeatPreferences;
  onClose: () => void; onSave: (form: EditPreferencesForm) => Promise<void>; isSaving: boolean;
}) {
  // ── Cascade state ──────────────────────────────────────────────────────
  const [sites,     setSites]     = useState<ApiSite[]>([]);
  const [buildings, setBuildings] = useState<ApiBuilding[]>([]);
  const [floors,    setFloors]    = useState<ApiFloor[]>([]);

  const [loadingSites,     setLoadingSites]     = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFloors,    setLoadingFloors]    = useState(false);

  const [selectedSiteId,     setSelectedSiteId]     = useState(preferences.preferredOfficeId   ?? "");
  const [selectedBuildingId, setSelectedBuildingId] = useState(preferences.preferredBuildingId ?? "");
  const [selectedFloorId,    setSelectedFloorId]    = useState(preferences.preferredFloorId    ?? "");

  // ── Amenities ──────────────────────────────────────────────────────────
  const [availableAmenities, setAvailableAmenities] = useState<ApiAmenity[]>([]);
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);
  const [loadingAmenities,   setLoadingAmenities]   = useState(false);
  const [amenitiesError,     setAmenitiesError]     = useState(false);

  const [error, setError] = useState("");

  // Load sites + amenities when dialog opens
  useEffect(() => {
    if (!open) return;

    setSelectedSiteId(preferences.preferredOfficeId   ?? "");
    setSelectedBuildingId(preferences.preferredBuildingId ?? "");
    setSelectedFloorId(preferences.preferredFloorId    ?? "");
    setError("");

    // Sites
    setLoadingSites(true);
    getSites().then((data) => { setSites(data); setLoadingSites(false); });

    // Amenities
    setLoadingAmenities(true);
    setAmenitiesError(false);
    getAvailableAmenities()
      .then((list) => {
        setAvailableAmenities(list);
        const currentIds = new Set(preferences.preferredAmenities.map((a) => a.id));
        setSelectedAmenityIds(list.filter((a) => currentIds.has(a.id)).map((a) => a.id));
      })
      .catch(() => setAmenitiesError(true))
      .finally(() => setLoadingAmenities(false));
  }, [open]);

  // When site changes → load buildings, reset downstream
  useEffect(() => {
    if (!selectedSiteId) { setBuildings([]); setFloors([]); setSelectedBuildingId(""); setSelectedFloorId(""); return; }
    setLoadingBuildings(true);
    setBuildings([]);
    setFloors([]);
    setSelectedBuildingId("");
    setSelectedFloorId("");
    getBuildingsBySite(selectedSiteId).then((data) => { setBuildings(data); setLoadingBuildings(false); });
  }, [selectedSiteId]);

  // When building changes → load floors, reset floor
  useEffect(() => {
    if (!selectedBuildingId) { setFloors([]); setSelectedFloorId(""); return; }
    setLoadingFloors(true);
    setFloors([]);
    setSelectedFloorId("");
    getFloorsByBuilding(selectedBuildingId).then((data) => { setFloors(data); setLoadingFloors(false); });
  }, [selectedBuildingId]);

  const handleSubmit = async () => {
    setError("");
    try {
      await onSave({
        preferredOfficeId:   selectedSiteId,
        preferredBuildingId: selectedBuildingId,
        preferredFloorId:    selectedFloorId,
        preferredAmenityIds: selectedAmenityIds,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  const siteOptions     = sites.map((s) => ({ value: s.site_id,       label: s.site_name       }));
  const buildingOptions = buildings.map((b) => ({ value: b.building_id,   label: b.building_name   }));
  const floorOptions    = floors.map((f) => ({ value: f.floor_id,      label: f.floor_name      }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-md max-h-[90dvh] sm:max-h-[85vh] flex flex-col p-0 gap-0 rounded-xl">
        <DialogHeader className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 shrink-0 border-b border-gray-100">
          <DialogTitle className="text-[15px]">Edit Preferences</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 min-h-0">
          {/* Office (Site) */}
          <CascadeSelect
            label="Select Office"
            value={selectedSiteId}
            onChange={setSelectedSiteId}
            options={siteOptions}
            placeholder="Select an office"
            loading={loadingSites}
          />

          {/* Building */}
          <CascadeSelect
            label="Select Building"
            value={selectedBuildingId}
            onChange={setSelectedBuildingId}
            options={buildingOptions}
            placeholder={selectedSiteId ? "Select a building" : "Select an office first"}
            disabled={!selectedSiteId}
            loading={loadingBuildings}
          />

          {/* Floor */}
          <CascadeSelect
            label="Select Floor"
            value={selectedFloorId}
            onChange={setSelectedFloorId}
            options={floorOptions}
            placeholder={selectedBuildingId ? "Select a floor" : "Select a building first"}
            disabled={!selectedBuildingId}
            loading={loadingFloors}
          />

          {/* Amenities */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Default Amenity Preferences</Label>
            {amenitiesError ? (
              <div className="flex items-center gap-2 text-[12px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
                Could not load amenities. Please try again.
              </div>
            ) : (
              <AmenitiesCheckboxGroup
                amenities={availableAmenities}
                selected={selectedAmenityIds}
                onChange={setSelectedAmenityIds}
                loading={loadingAmenities}
              />
            )}
          </div>

          {error && (
            <p className="text-[12px] text-red-500 flex items-center gap-1.5">
              <TriangleAlert className="w-3.5 h-3.5" />{error}
            </p>
          )}
        </div>

        <DialogFooter className="px-4 sm:px-5 py-3 border-t border-gray-100 shrink-0 flex flex-row gap-2 sm:justify-end">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-[12.5px]" disabled={isSaving} onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none text-[12.5px] bg-indigo-600 hover:bg-indigo-700 gap-1.5" onClick={handleSubmit} disabled={isSaving}>
            {isSaving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</>
              : <><Save className="w-3.5 h-3.5" />Save changes</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-start gap-5">
          <Skeleton className="w-20 h-20 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <Skeleton className="h-4 w-36 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Preference display row ───────────────────────────────────────────────────

function PrefDisplayRow({
  icon: Icon, label, value,
  color = "bg-gray-50", iconColor = "text-gray-400",
}: {
  icon: React.ElementType; label: string; value: string;
  color?: string; iconColor?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-400 font-medium leading-none mb-1">{label}</p>
        <p className="text-[12.5px] text-gray-700 font-medium leading-snug">{value}</p>
      </div>
    </div>
  );
}

// ─── Amenity chip ─────────────────────────────────────────────────────────────

function AmenityChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[11.5px] font-medium ring-1 ring-amber-100">
      <Zap className="w-3 h-3 mr-1.5 text-amber-400" />
      {name}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const {
    data, isLoading, isFatal, fatalError, errors,
    isSavingProfile, isSavingPreferences, isUploadingAvatar,
    refetch, handleUpdateProfile, handleUpdatePreferences, handleUploadAvatar,
  } = useProfile();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editPrefsOpen,   setEditPrefsOpen]   = useState(false);
  const [historyOpen,     setHistoryOpen]     = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (isFatal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <TriangleAlert className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-gray-800 mb-1">
            {fatalError?.message ?? "Failed to load profile"}
          </p>
          <p className="text-[12px] text-gray-400">{fatalError?.code}</p>
        </div>
        <Button variant="outline" size="sm" className="text-[12.5px] gap-1.5" onClick={refetch}>
          <RefreshCw className="w-3.5 h-3.5" />Retry
        </Button>
      </div>
    );
  }

  if (isLoading || !data) return <ProfileSkeleton />;

  const { profile, preferences, activitySummary, bookings } = data;
  const initials = getInitials(profile.displayName);
  const prefErr  = errors.find((e) => e.section === "preferences");

  return (
    <>
      {/* Dialogs */}
      <EditProfileDialog
        open={editProfileOpen}
        profile={profile}
        onClose={() => setEditProfileOpen(false)}
        onSave={handleUpdateProfile}
        isSaving={isSavingProfile}
      />
      <EditPreferencesDialog
        open={editPrefsOpen}
        preferences={preferences}
        onClose={() => setEditPrefsOpen(false)}
        onSave={handleUpdatePreferences}
        isSaving={isSavingPreferences}
      />
      <BookingHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        current={bookings.current}
        future={bookings.future}
        past={bookings.past}
      />

      {/* Hidden avatar input */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadAvatar(file);
          e.target.value = "";
        }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-bold text-gray-900 tracking-tight">My Profile</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">View and manage your personal information.</p>
        </div>

        {/* ── Identity card ─────────────────────────────────────────────── */}
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-center gap-5 sm:gap-7">
            {/* Avatar */}
            <div className="relative shrink-0 ml-0 sm:ml-2">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-[80px] h-[80px] rounded-full object-cover ring-2 ring-gray-100"
                />
              ) : (
                <div className="w-[80px] h-[80px] rounded-full bg-indigo-100 flex items-center justify-center text-[22px] font-bold text-indigo-700 ring-2 ring-gray-100 select-none">
                  {initials}
                </div>
              )}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
              >
                {isUploadingAvatar
                  ? <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                  : <Camera className="w-3 h-3 text-gray-500" />}
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h2 className="text-[18px] font-bold text-gray-900 leading-tight">{profile.displayName}</h2>
                <RolePill role={profile.role} />
              </div>
              <p className="text-[12.5px] text-gray-400 mb-2.5">
                {profile.jobTitle}
                {profile.department !== "—" && <> &nbsp;·&nbsp; {profile.department}</>}
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-center sm:items-center gap-y-1.5 gap-x-5">
                <div className="flex items-center gap-1.5 text-[12.5px] text-gray-600">
                  <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />{profile.email}
                </div>
                {profile.phone !== "—" && (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />{profile.phone}
                  </div>
                )}
                {profile.workLocation !== "—" && (
                  <div className="flex items-center gap-1.5 text-[12.5px] text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />{profile.workLocation}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left / main column (2 cols) ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

             {/* About Me */}
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13.5px] font-semibold text-gray-800">About Me</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-[12px] text-gray-500 hover:text-gray-800"
                  onClick={() => setEditProfileOpen(true)}
                >
                  <Pencil className="w-3 h-3" />Edit
                </Button>
              </div>
              <p className="text-[12.5px] text-gray-500 leading-relaxed mb-4">
                {profile.bio ||
                  "Tell your teammates a bit about yourself."}
              </p>
              {profile.skills.length > 0 && (
  <>
    <p className="text-[12px] font-semibold text-gray-700 mb-2">Skills</p>
    <div className="flex flex-wrap gap-1.5">
      {profile.skills.map((s) => (
        <SkillTag key={s} label={s} />
      ))}
    </div>
  </>
)}
            </Card>

            {/* Personal Information */}
            <Card>
              <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3">
                <h3 className="text-[13.5px] font-semibold text-gray-800">Personal Information</h3>
              </div>
              <Separator />
              <div className="px-4 sm:px-5 py-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <InfoRow icon={BadgeCheck}  label="Employee ID"       value={profile.employeeId} />
                <InfoRow icon={UserCheck}   label="Reporting Manager" value={profile.reportingManager} />
                <InfoRow icon={MapPin}      label="Work Location"     value={profile.workLocation} />
                <InfoRow icon={Building2}   label="Department"        value={profile.department} />
                <InfoRow icon={Briefcase}   label="Designation"       value={profile.jobTitle} />
                <InfoRow icon={Phone}       label="Mobile Number"     value={profile.phone} />
              </div>
            </Card>

           

            {/* Activity Summary — moved to left column */}
            <Card className="p-4 sm:p-5">
              <h3 className="text-[13.5px] font-semibold text-gray-800 mb-4">Activity Summary</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { icon: CalendarCheck2, value: activitySummary.totalBookings,    label: "Total Bookings",    bg: "bg-indigo-50", iconBg: "bg-indigo-100", num: "text-indigo-700", sub: "text-indigo-500", iconCls: "text-indigo-600" },
                  { icon: CalendarClock,  value: activitySummary.upcomingBookings, label: "Upcoming Bookings", bg: "bg-amber-50",  iconBg: "bg-amber-100",  num: "text-amber-700",  sub: "text-amber-500",  iconCls: "text-amber-600" },
                  { icon: History,        value: activitySummary.pastBookings,     label: "Past Bookings",     bg: "bg-gray-50",   iconBg: "bg-gray-100",   num: "text-gray-700",   sub: "text-gray-400",   iconCls: "text-gray-500" },
                ].map(({ icon: Icon, value, label, bg, iconBg, num, sub, iconCls }) => (
                  <div key={label} className={`flex flex-col items-center justify-center p-3 rounded-xl ${bg} text-center`}>
                    <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center mb-2`}>
                      <Icon className={`w-4 h-4 ${iconCls}`} />
                    </div>
                    <p className={`text-[22px] font-bold ${num} leading-none`}>{value}</p>
                    <p className={`text-[11px] ${sub} font-medium mt-1 leading-tight`}>{label}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setHistoryOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <span className="block text-center text-[12.5px] font-medium text-indigo-600">View Booking History</span>
                <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Card>
          </div>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Work Details */}
            <Card className="p-4 sm:p-5">
              <h3 className="text-[13.5px] font-semibold text-gray-800 mb-4">Work Details</h3>
              <div className="space-y-3">
                {[
                  // { label: "Employee ID",   value: profile.employeeId },
                  { label: "Department",    value: profile.department },
                  { label: "Designation",   value: profile.jobTitle },
                  { label: "Work Location", value: profile.workLocation },
                  { label: "Manager",       value: profile.reportingManager },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-[12px] text-gray-400 shrink-0">{label}</span>
                    <span className="text-[12.5px] text-gray-700 font-medium text-right truncate">{value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Preferences — moved to right column */}
            <Card>
              <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3">
                <h3 className="text-[13.5px] font-semibold text-gray-800">Preferences</h3>
                {prefErr ? (
                  <span className="text-[11px] text-amber-500 flex items-center gap-1">
                    <TriangleAlert className="w-3 h-3" />{prefErr.message}
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-[12px] text-gray-500 hover:text-gray-800"
                    onClick={() => setEditPrefsOpen(true)}
                  >
                    <Pencil className="w-3 h-3" />Edit
                  </Button>
                )}
              </div>
              <Separator />
              <div className="px-4 sm:px-5 py-1">
                <PrefDisplayRow
                  icon={Building}
                  label="Default Office"
                  value={preferences.preferredOfficeName}
                  color="bg-blue-50"
                  iconColor="text-blue-400"
                />
                <PrefDisplayRow
                  icon={Building2}
                  label="Default Building"
                  value={preferences.preferredBuildingName}
                  color="bg-indigo-50"
                  iconColor="text-indigo-400"
                />
                <PrefDisplayRow
                  icon={Layers}
                  label="Default Floor"
                  value={preferences.preferredFloorName}
                  color="bg-violet-50"
                  iconColor="text-violet-400"
                />
              </div>
              <div className="px-4 sm:px-5 pb-4">
                <p className="text-[11px] text-gray-400 font-medium mb-2">Default Amenity Preferences</p>
                {preferences.preferredAmenities.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {preferences.preferredAmenities.map((a) => (
                      <AmenityChip key={a.id} name={a.name} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-gray-400 italic">No amenities selected.</p>
                )}
              </div>
            </Card>

          </div>
        </div>
      </div>
      </div>
    </>
  );
}