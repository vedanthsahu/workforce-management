"use client";
import { useState, useRef, useEffect } from "react";
import {
  Mail, Phone, MapPin, Briefcase,
  Building2, UserCheck, BadgeCheck,
  Camera, Loader2, TriangleAlert, RefreshCw,
  Layers, CalendarCheck2, CalendarClock, History,
  ChevronRight, CalendarDays,
  Building, Armchair, Check, Pencil, Save, X, ChevronDown,
  Sparkles, IdCard, BarChart3, SlidersHorizontal,
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

import { useProfile } from "../hooks/useProfile";
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
import { getAmenityColor } from "@/features/amenities/utils/amenityColors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const ROLE_BADGE: Record<string, string> = {
  TENANT_ADMIN: "bg-rose-50 text-rose-600 ring-rose-200",
  MANAGER:      "bg-violet-50 text-violet-600 ring-violet-200",
  EMPLOYEE:     "bg-blue-50 text-blue-600 ring-blue-200",
  FACILITATOR:  "bg-teal-50 text-teal-600 ring-teal-200",
  FRONT_OFFICE: "bg-amber-50 text-amber-600 ring-amber-200",
  FACILITIES:   "bg-orange-50 text-orange-600 ring-orange-200",
};

// Same role→color mapping as ROLE_BADGE, but as a solid white pill for use
// on top of the colorful identity banner (a tinted bg would be invisible there).
const ROLE_BADGE_ON_BANNER: Record<string, string> = {
  TENANT_ADMIN: "bg-white text-rose-600",
  MANAGER:      "bg-white text-violet-600",
  EMPLOYEE:     "bg-white text-blue-600",
  FACILITATOR:  "bg-white text-teal-600",
  FRONT_OFFICE: "bg-white text-amber-600",
  FACILITIES:   "bg-white text-orange-600",
};

function RolePill({ role, onBanner = false }: { role: string; onBanner?: boolean }) {
  const style = onBanner
    ? (ROLE_BADGE_ON_BANNER[role] ?? "bg-white text-gray-600")
    : (ROLE_BADGE[role] ?? "bg-gray-50 text-gray-600 ring-gray-200");
  const label = role.charAt(0) + role.slice(1).toLowerCase().replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${onBanner ? "" : "ring-1"} ${style}`}>
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
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeading({ icon: Icon, title, color = "bg-indigo-100 text-indigo-600" }: { icon: React.ElementType; title: string; color?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <h3 className="text-[13.5px] font-semibold text-gray-800">{title}</h3>
    </div>
  );
}

const INFO_ROW_COLORS = [
  { bg: "bg-violet-100",  icon: "text-violet-600"  },
  { bg: "bg-blue-100",    icon: "text-blue-600"    },
  { bg: "bg-rose-100",    icon: "text-rose-600"    },
  { bg: "bg-emerald-100", icon: "text-emerald-600" },
  { bg: "bg-amber-100",   icon: "text-amber-600"   },
  { bg: "bg-teal-100",    icon: "text-teal-600"    },
];

function InfoRow({ icon: Icon, label, value, colorIndex = 0 }: { icon: React.ElementType; label: string; value: string; colorIndex?: number }) {
  const { bg, icon } = INFO_ROW_COLORS[colorIndex % INFO_ROW_COLORS.length];
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`w-3.5 h-3.5 ${icon}`} />
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
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11.5px] font-medium ring-1 ring-indigo-100 hover:bg-indigo-100 hover:ring-indigo-200 transition-colors">
      {label}
    </span>
  );
}

// ─── Cascade Select ───────────────────────────────────────────────────────────

function CascadeSelect({
  label, value, onChange, options, disabled, loading, placeholder,
}: {
  label:        string;
  value:        string;
  onChange:     (val: string) => void;
  options:      { value: string; label: string }[];
  disabled?:    boolean;
  loading?:     boolean;
  placeholder?: string;
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
          {!value && <option value="" disabled hidden>{placeholder ?? ""}</option>}
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
              // Per-category coloring disabled for now — profile page only.
              // const color = getAmenityColor(a.name, a.category);
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
                  {/* <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} /> */}
                  <span className="w-2 h-2 rounded-full shrink-0 bg-gray-400" />
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
          <DialogTitle className="text-[15px] flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <History className="w-3.5 h-3.5" />
            </span>
            Booking History
          </DialogTitle>
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
          <DialogTitle className="text-[15px] flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            Edit About Me
          </DialogTitle>
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

  // Fetch the building list for the selected site. Selection resets are
  // handled explicitly by handleSiteChange (user-driven only) — this effect
  // must never touch selectedBuildingId/selectedFloorId, otherwise it races
  // with the [open] hydration effect above and clobbers the restored value.
  useEffect(() => {
    if (!selectedSiteId) { setBuildings([]); return; }
    setLoadingBuildings(true);
    getBuildingsBySite(selectedSiteId).then((data) => { setBuildings(data); setLoadingBuildings(false); });
  }, [selectedSiteId]);

  // Fetch the floor list for the selected building — same rule: no selection resets here.
  useEffect(() => {
    if (!selectedBuildingId) { setFloors([]); return; }
    setLoadingFloors(true);
    getFloorsByBuilding(selectedBuildingId).then((data) => { setFloors(data); setLoadingFloors(false); });
  }, [selectedBuildingId]);

  const handleSiteChange = (id: string) => {
    setSelectedSiteId(id);
    setSelectedBuildingId("");
    setSelectedFloorId("");
  };

  const handleBuildingChange = (id: string) => {
    setSelectedBuildingId(id);
    setSelectedFloorId("");
  };

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
          <DialogTitle className="text-[15px] flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </span>
            Edit Preferences
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 min-h-0">
          {/* Office (Site) */}
          <CascadeSelect
            label="Select Office"
            value={selectedSiteId}
            onChange={handleSiteChange}
            options={siteOptions}
            loading={loadingSites}
            placeholder="Select office"
          />

          {/* Building */}
          <CascadeSelect
            label="Select Building"
            value={selectedBuildingId}
            onChange={handleBuildingChange}
            options={buildingOptions}
            disabled={!selectedSiteId}
            loading={loadingBuildings}
            placeholder="Select building"
          />

          {/* Floor */}
          <CascadeSelect
            label="Select Floor"
            value={selectedFloorId}
            onChange={setSelectedFloorId}
            options={floorOptions}
            disabled={!selectedBuildingId}
            loading={loadingFloors}
            placeholder="Select floor"
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
    <div className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-indigo-50/40 via-white to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Page header */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-64" />
        </div>

        {/* Identity card */}
        <Card className="overflow-hidden p-0!">
          <div className="bg-gradient-to-br from-indigo-600/20 via-indigo-600/20 to-indigo-700/20 px-5 sm:px-8 py-7 sm:py-9">
            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-5 sm:gap-7">
              <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-2 w-full">
                <Skeleton className="h-4 w-40 mx-auto sm:mx-0" />
                <Skeleton className="h-3 w-28 mx-auto sm:mx-0" />
                <Skeleton className="h-3 w-52 mx-auto sm:mx-0" />
              </div>
            </div>
          </div>
        </Card>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-4 sm:p-5 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </Card>
            <Card className="p-4 sm:p-5 space-y-3">
              <Skeleton className="h-4 w-40 mb-1" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            </Card>
            <Card className="p-4 sm:p-5 space-y-3">
              <Skeleton className="h-4 w-32 mb-1" />
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-11 w-full rounded-xl" />
            </Card>
          </div>
          <div className="space-y-5">
            <Card className="p-4 sm:p-5 space-y-3">
              <Skeleton className="h-4 w-28 mb-1" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </Card>
            <Card className="p-4 sm:p-5 space-y-3">
              <Skeleton className="h-4 w-24 mb-1" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </Card>
          </div>
        </div>
      </div>
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
      <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0 mt-0.5`}>
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

function AmenityChip({ name, category }: { name: string; category?: string }) {
  const color = getAmenityColor(name, category);
  const Icon = color.icon;
  return (
    // Per-category coloring disabled for now — profile page only, other
    // surfaces (e.g. book flow) still use getAmenityColor's colors as-is.
    // <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11.5px] font-medium ring-1 ${color.bg} ${color.text} ${color.border.replace("border-", "ring-")}`}>
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[11.5px] font-medium ring-1 bg-gray-50 text-gray-600 ring-gray-200">
      <Icon className="w-3 h-3 mr-1.5" />
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
      <div className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-indigo-50/40 via-white to-white flex items-center justify-center px-6">
        <Card className="flex flex-col items-center gap-4 text-center px-8 py-10 max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <TriangleAlert className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-800 mb-1">
              {fatalError?.message ?? "Failed to load profile"}
            </p>
            <p className="text-[12px] text-gray-400">{fatalError?.code}</p>
          </div>
          <Button size="sm" className="text-[12.5px] gap-1.5 bg-indigo-600 hover:bg-indigo-700" onClick={refetch}>
            <RefreshCw className="w-3.5 h-3.5" />Retry
          </Button>
        </Card>
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

      <div className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-indigo-50/40 via-white to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-bold text-gray-900 tracking-tight">My Profile</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">View and manage your personal information.</p>
        </div>

        {/* ── Identity card — avatar + info sit directly on the gradient in white ── */}
        <Card className="overflow-hidden p-0!">
          <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 px-5 sm:px-8 py-5 sm:py-6">
            {/* Decorative wave + glow overlay */}
            <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 800 200">
              <path d="M0,110 C150,190 350,30 500,110 C650,190 800,70 800,110 L800,200 L0,200 Z" fill="white" />
            </svg>
            <div className="absolute w-56 h-56 rounded-full bg-white/[0.07] -top-20 -right-10 pointer-events-none" />
            <div className="absolute w-32 h-32 rounded-full bg-white/[0.06] -bottom-10 right-36 pointer-events-none" />

            <div className="relative flex flex-col items-center sm:flex-row sm:items-center gap-5 sm:gap-7">
              {/* Avatar */}
              <div className="relative shrink-0">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-4 ring-white/40 shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/15 flex items-center justify-center text-[24px] sm:text-[26px] font-bold text-white ring-4 ring-white/40 shadow-lg select-none">
                    {initials}
                  </div>
                )}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
                >
                  {isUploadingAvatar
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                    : <Camera className="w-3.5 h-3.5 text-gray-600" />}
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                  <h2 className="text-[19px] sm:text-[21px] font-bold text-white leading-tight">{profile.displayName}</h2>
                  <RolePill role={profile.role} onBanner />
                </div>
                <p className="text-[13px] text-white/80 mb-3">
                  {profile.jobTitle}
                  {profile.department !== "—" && <> &nbsp;·&nbsp; {profile.department}</>}
                </p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-center sm:items-center gap-y-1.5 gap-x-5">
                  <div className="flex items-center gap-1.5 text-[12.5px] text-white/90">
                    <Mail className="w-3.5 h-3.5 text-white/70 shrink-0" />{profile.email}
                  </div>
                  {profile.phone !== "—" && (
                    <div className="flex items-center gap-1.5 text-[12.5px] text-white/90">
                      <Phone className="w-3.5 h-3.5 text-white/70 shrink-0" />{profile.phone}
                    </div>
                  )}
                  {profile.workLocation !== "—" && (
                    <div className="flex items-center gap-1.5 text-[12.5px] text-white/90">
                      <MapPin className="w-3.5 h-3.5 text-white/70 shrink-0" />{profile.workLocation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left / main column (2 cols) ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

             {/* About Me */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-indigo-50/60 border-b border-indigo-100">
                <SectionHeading icon={Sparkles} title="About Me" color="bg-indigo-100 text-indigo-600" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-[12px] text-gray-500 hover:text-gray-800"
                  onClick={() => setEditProfileOpen(true)}
                >
                  <Pencil className="w-3 h-3" />Edit
                </Button>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-[12.5px] text-gray-600 leading-relaxed mb-4 pl-3 border-l-2 border-indigo-100">
                  {profile.bio ||
                    <span className="text-gray-400 italic">Tell your teammates a bit about yourself.</span>}
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
              </div>
            </Card>

            {/* Personal Information */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-blue-50/60 border-b border-blue-100">
                <SectionHeading icon={IdCard} title="Personal Information" color="bg-blue-100 text-blue-600" />
              </div>
              <div className="px-4 sm:px-5 py-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <InfoRow icon={BadgeCheck}  label="Employee ID"       value={profile.employeeId}       colorIndex={0} />
                <InfoRow icon={UserCheck}   label="Reporting Manager" value={profile.reportingManager} colorIndex={1} />
                <InfoRow icon={MapPin}      label="Work Location"     value={profile.workLocation}     colorIndex={2} />
                <InfoRow icon={Building2}   label="Department"        value={profile.department}       colorIndex={3} />
                <InfoRow icon={Briefcase}   label="Designation"       value={profile.jobTitle}         colorIndex={4} />
                <InfoRow icon={Phone}       label="Mobile Number"     value={profile.phone}             colorIndex={5} />
              </div>
            </Card>

            {/* Activity Summary — moved to left column */}
            <Card className="overflow-hidden">
              <div className="px-4 sm:px-5 py-3 bg-amber-50/60 border-b border-amber-100">
                <SectionHeading icon={BarChart3} title="Activity Summary" color="bg-amber-100 text-amber-600" />
              </div>
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { icon: CalendarCheck2, value: activitySummary.totalBookings,    label: "Total Bookings",    bg: "bg-indigo-100", iconBg: "bg-indigo-500", num: "text-indigo-700", sub: "text-indigo-500" },
                    { icon: CalendarClock,  value: activitySummary.upcomingBookings, label: "Upcoming Bookings", bg: "bg-amber-100",  iconBg: "bg-amber-500",  num: "text-amber-700",  sub: "text-amber-500" },
                    { icon: History,        value: activitySummary.pastBookings,     label: "Past Bookings",     bg: "bg-violet-100", iconBg: "bg-violet-500", num: "text-violet-700", sub: "text-violet-500" },
                  ].map(({ icon: Icon, value, label, bg, iconBg, num, sub }) => (
                    <div key={label} className={`flex flex-col items-center justify-center p-3 rounded-xl ${bg} text-center hover:shadow-sm transition-shadow duration-200`}>
                      <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center mb-2`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <p className={`text-[22px] font-bold ${num} leading-none`}>{value}</p>
                      <p className={`text-[11px] ${sub} font-medium mt-1 leading-tight`}>{label}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-[0.99] transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                    <History className="w-4 h-4 text-white" />
                  </div>
                  <span className="flex-1 text-left text-[12.5px] font-semibold text-indigo-600">View Booking History</span>
                  <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 group-hover:text-indigo-600 transition-all shrink-0" />
                </button>
              </div>
            </Card>
          </div>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Work Details */}
            <Card className="overflow-hidden">
              <div className="px-4 sm:px-5 py-3 bg-emerald-50/60 border-b border-emerald-100">
                <SectionHeading icon={Briefcase} title="Work Details" color="bg-emerald-100 text-emerald-600" />
              </div>
              <div className="px-4 sm:px-5 py-1">
                <PrefDisplayRow icon={Building2}  label="Department"    value={profile.department}   color="bg-emerald-100" iconColor="text-emerald-600" />
                <PrefDisplayRow icon={Briefcase}  label="Designation"   value={profile.jobTitle}     color="bg-blue-100"    iconColor="text-blue-600" />
                <PrefDisplayRow icon={MapPin}     label="Work Location" value={profile.workLocation} color="bg-rose-100"    iconColor="text-rose-600" />
                <PrefDisplayRow icon={UserCheck}  label="Manager"       value={profile.reportingManager} color="bg-amber-100" iconColor="text-amber-600" />
              </div>
            </Card>

            {/* Preferences — moved to right column */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-violet-50/60 border-b border-violet-100">
                <SectionHeading icon={SlidersHorizontal} title="Preferences" color="bg-violet-100 text-violet-600" />
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
              <div className="px-4 sm:px-5 py-1">
                <PrefDisplayRow
                  icon={Building}
                  label="Default Office"
                  value={preferences.preferredOfficeName}
                  color="bg-blue-100"
                  iconColor="text-blue-600"
                />
                <PrefDisplayRow
                  icon={Building2}
                  label="Default Building"
                  value={preferences.preferredBuildingName}
                  color="bg-indigo-100"
                  iconColor="text-indigo-600"
                />
                <PrefDisplayRow
                  icon={Layers}
                  label="Default Floor"
                  value={preferences.preferredFloorName}
                  color="bg-violet-100"
                  iconColor="text-violet-600"
                />
              </div>
              <div className="px-4 sm:px-5 pb-4">
                <p className="text-[11px] text-gray-400 font-medium mb-2">Default Amenity Preferences</p>
                {preferences.preferredAmenities.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {preferences.preferredAmenities.map((a) => (
                      <AmenityChip key={a.id} name={a.name} category={a.category} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-gray-400 italic border border-dashed border-gray-200 rounded-lg px-3 py-2.5 text-center">
                    No amenities selected.
                  </p>
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