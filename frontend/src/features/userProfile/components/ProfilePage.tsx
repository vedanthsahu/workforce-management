"use client";

/**
 * ProfilePage.tsx
 *
 * Drop this at:  src/features/profile/components/ProfilePage.tsx
 *
 * Requires:
 *   - useProfile hook  (../hooks/useProfile)
 *   - profile types    (../types/profile.types)
 *   - shadcn/ui: Badge, Button, Skeleton, Separator
 *   - lucide-react
 */

import { useState, useRef } from "react";
import {
  Pencil,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Cake,
  User2,
  Briefcase,
  Building2,
  UserCheck,
  BadgeCheck,
  Clock,
  ChevronRight,
  Camera,
  X,
  Save,
  Loader2,
  TriangleAlert,
  RefreshCw,
  Home,
  Layers,
  SlidersHorizontal,
  Users,
  Volume2,
  Zap,
  Star,
  Settings2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { useProfile } from "../hooks/useProfile";
import type {
  EditProfileForm,
  EditPreferencesForm,
  ProfileData,
  SeatPreferences,
} from "../types/profile.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const ROLE_BADGE: Record<string, string> = {
  TENANT_ADMIN: "bg-rose-50 text-rose-600 ring-rose-200",
  MANAGER:      "bg-violet-50 text-violet-600 ring-violet-200",
  EMPLOYEE:     "bg-blue-50 text-blue-600 ring-blue-200",
  TALENT:       "bg-teal-50 text-teal-600 ring-teal-200",
  RECEPTIONIST: "bg-amber-50 text-amber-600 ring-amber-200",
  FACILITIES:   "bg-orange-50 text-orange-600 ring-orange-200",
};

function RolePill({ role }: { role: string }) {
  const style = ROLE_BADGE[role] ?? "bg-gray-50 text-gray-600 ring-gray-200";
  const label = role.charAt(0) + role.slice(1).toLowerCase().replace("_", " ");
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 ${style}`}
    >
      {label}
    </span>
  );
}

// ─── Section card wrapper ──────────────────────────────────────────────────────

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
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

// ─── Skill tag ────────────────────────────────────────────────────────────────

function SkillTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11.5px] font-medium ring-1 ring-indigo-100">
      {label}
    </span>
  );
}

// ─── Edit Profile Dialog ──────────────────────────────────────────────────────

function EditProfileDialog({
  open,
  profile,
  onClose,
  onSave,
  isSaving,
}: {
  open: boolean;
  profile: ProfileData;
  onClose: () => void;
  onSave: (form: EditProfileForm) => Promise<void>;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<EditProfileForm>({
    displayName:   profile.displayName,
    phone:         profile.phone === "—" ? "" : profile.phone,
    personalEmail: profile.personalEmail === "—" ? "" : profile.personalEmail,
    bio:           profile.bio,
    skills:        profile.skills,
  });
  const [skillInput, setSkillInput] = useState("");
  const [error, setError] = useState("");

  const handleSkillAdd = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm((f) => ({ ...f, skills: [...f.skills, s] }));
    }
    setSkillInput("");
  };

  const handleSubmit = async () => {
    setError("");
    try {
      await onSave(form);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Display Name</Label>
            <Input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              className="h-9 text-[13px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="h-9 text-[13px]"
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Personal Email</Label>
            <Input
              value={form.personalEmail}
              onChange={(e) => setForm((f) => ({ ...f, personalEmail: e.target.value }))}
              className="h-9 text-[13px]"
              placeholder="you@personal.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Bio</Label>
            <Textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className="text-[13px] resize-none"
              rows={3}
              placeholder="Tell us about yourself…"
            />
          </div>
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
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-[12px]"
                onClick={handleSkillAdd}
              >
                Add
              </Button>
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-medium ring-1 ring-indigo-100"
                  >
                    {s}
                    <button
                      onClick={() =>
                        setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }))
                      }
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
              <TriangleAlert className="w-3.5 h-3.5" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
         
            <Button variant="outline" size="sm" className="text-[12.5px]" disabled={isSaving}>
              Cancel
            </Button>
   
          <Button
            size="sm"
            className="text-[12.5px] bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Preferences Dialog ──────────────────────────────────────────────────

function EditPreferencesDialog({
  open,
  preferences,
  onClose,
  onSave,
  isSaving,
}: {
  open: boolean;
  preferences: SeatPreferences;
  onClose: () => void;
  onSave: (form: EditPreferencesForm) => Promise<void>;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<EditPreferencesForm>({
    preferredOffice:    preferences.preferredOffice === "—" ? "" : preferences.preferredOffice,
    preferredFloor:     preferences.preferredFloor === "—" ? "" : preferences.preferredFloor,
    seatType:           preferences.seatType === "—" ? "" : preferences.seatType,
    nearTeammates:      preferences.nearTeammates.join(", "),
    awayFrom:           preferences.awayFrom.join(", "),
    noisePreference:    preferences.noisePreference === "—" ? "" : preferences.noisePreference,
    preferredAmenities: preferences.preferredAmenities.join(", "),
    otherPreferences:   preferences.otherPreferences.join(", "),
  });
  const [error, setError] = useState("");

  const field = (key: keyof EditPreferencesForm, label: string, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label className="text-[12px]">{label}</Label>
      <Input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="h-9 text-[13px]"
        placeholder={placeholder}
      />
    </div>
  );

  const handleSubmit = async () => {
    setError("");
    try {
      await onSave(form);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Edit Seat Preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1 max-h-[60vh] overflow-y-auto pr-1">
          {field("preferredOffice", "Preferred Office", "e.g. Bangalore Office")}
          {field("preferredFloor", "Preferred Floor", "e.g. 3rd Floor")}
          {field("seatType", "Seat Type", "e.g. Open Desk, Cabin")}
          {field("nearTeammates", "Near Teammates", "Comma-separated names")}
          {field("awayFrom", "Away From", "e.g. High Traffic Areas, Pantry")}
          {field("noisePreference", "Noise Preference", "e.g. Quiet, Moderate")}
          {field("preferredAmenities", "Preferred Amenities", "e.g. Near Power Outlet, Near Window")}
          {field("otherPreferences", "Other Preferences", "e.g. Natural Light, Ergonomic Chair")}
          {error && (
            <p className="text-[12px] text-red-500 flex items-center gap-1.5">
              <TriangleAlert className="w-3.5 h-3.5" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
         
            <Button variant="outline" size="sm" className="text-[12.5px]" disabled={isSaving}>
              Cancel
            </Button>
        
          <Button
            size="sm"
            className="text-[12.5px] bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save changes
              </>
            )}
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
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <Skeleton className="h-4 w-36 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Preferences row ──────────────────────────────────────────────────────────

function PrefRow({
  icon: Icon,
  label,
  value,
  color = "bg-gray-50",
  iconColor = "text-gray-400",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
  iconColor?: string;
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const {
    data,
    isLoading,
    isFatal,
    fatalError,
    errors,
    isSavingProfile,
    isSavingPreferences,
    isUploadingAvatar,
    refetch,
    handleUpdateProfile,
    handleUpdatePreferences,
    handleUploadAvatar,
  } = useProfile();

  const [editProfileOpen, setEditProfileOpen]       = useState(false);
  const [editPrefsOpen,   setEditPrefsOpen]         = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Fatal error ─────────────────────────────────────────────────────────────
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
          <p className="text-[12px] text-gray-400">
            {fatalError?.code}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-[12.5px] gap-1.5"
          onClick={refetch}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading || !data) return <ProfileSkeleton />;

  const { profile, preferences } = data;
  const initials = getInitials(profile.displayName);

  const prefErr = errors.find((e) => e.section === "preferences");

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
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

      {/* Hidden avatar file input */}
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

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* ── Page header ────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">My Profile</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            View and manage your personal information.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left column (2/3 width) ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* ── Identity card ─────────────────────────────────────────────── */}
            <Card className="p-5">
              <div className="flex items-start gap-5">

                {/* Avatar */}
                <div className="relative shrink-0">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                      className="w-[88px] h-[88px] rounded-full object-cover ring-2 ring-gray-100"
                    />
                  ) : (
                    <div className="w-[88px] h-[88px] rounded-full bg-indigo-100 flex items-center justify-center text-[24px] font-bold text-indigo-700 ring-2 ring-gray-100">
                      {initials}
                    </div>
                  )}
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-gray-500" />
                    )}
                  </button>
                </div>

                {/* Identity info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1">
                    <h2 className="text-[18px] font-bold text-gray-900 leading-tight">
                      {profile.displayName}
                    </h2>
                    <RolePill role={profile.role} />
                  </div>
                  <p className="text-[12.5px] text-gray-400 mb-3">
                    {profile.jobTitle}
                    {profile.department !== "—" && (
                      <> &nbsp;·&nbsp; {profile.department}</>
                    )}
                  </p>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[12.5px] text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {profile.email}
                    </div>
                    {profile.phone !== "—" && (
                      <div className="flex items-center gap-2 text-[12.5px] text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {profile.phone}
                      </div>
                    )}
                    {profile.workLocation !== "—" && (
                      <div className="flex items-center gap-2 text-[12.5px] text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {profile.workLocation}
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 text-[12.5px] h-8"
                  onClick={() => setEditProfileOpen(true)}
                >
                  <Pencil className="w-3 h-3" />
                  Edit Profile
                </Button>
              </div>
            </Card>

            {/* ── Personal Information ───────────────────────────────────────── */}
            <Card>
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <h3 className="text-[13.5px] font-semibold text-gray-800">
                  Personal Information
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-[12px] text-gray-500 hover:text-gray-800"
                  onClick={() => setEditProfileOpen(true)}
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </Button>
              </div>
              <Separator />
              <div className="px-5 py-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <InfoRow icon={BadgeCheck}  label="Employee ID"        value={profile.employeeId} />
                <InfoRow icon={UserCheck}   label="Reporting Manager"  value={profile.reportingManager} />
                <InfoRow icon={Calendar}    label="Date of Joining"    value={profile.dateOfJoining} />
                <InfoRow icon={MapPin}      label="Work Location"      value={profile.workLocation} />
                <InfoRow icon={Cake}        label="Date of Birth"      value={profile.dateOfBirth} />
                <InfoRow icon={Building2}   label="Department"         value={profile.department} />
                <InfoRow icon={User2}       label="Gender"             value={profile.gender} />
                <InfoRow icon={Briefcase}   label="Designation"        value={profile.jobTitle} />
                <InfoRow icon={Phone}       label="Mobile Number"      value={profile.phone} />
                <InfoRow icon={Clock}       label="Employment Type"    value={profile.employmentType} />
                <InfoRow icon={Mail}        label="Personal Email"     value={profile.personalEmail} />
              </div>
            </Card>

            {/* ── Seat Preferences ──────────────────────────────────────────── */}
            <Card>
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <h3 className="text-[13.5px] font-semibold text-gray-800">Seat Preferences</h3>
                {prefErr ? (
                  <span className="text-[11px] text-amber-500 flex items-center gap-1">
                    <TriangleAlert className="w-3 h-3" />
                    {prefErr.message}
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-[12px] text-gray-500 hover:text-gray-800"
                    onClick={() => setEditPrefsOpen(true)}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit Preferences
                  </Button>
                )}
              </div>
              <Separator />
              <div className="px-5 py-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <PrefRow
                  icon={Home}
                  label="Preferred Office"
                  value={preferences.preferredOffice}
                  color="bg-blue-50"
                  iconColor="text-blue-400"
                />
                <PrefRow
                  icon={SlidersHorizontal}
                  label="Away From"
                  value={preferences.awayFrom.join(", ") || "—"}
                  color="bg-red-50"
                  iconColor="text-red-400"
                />
                <PrefRow
                  icon={Layers}
                  label="Preferred Floor"
                  value={preferences.preferredFloor}
                  color="bg-indigo-50"
                  iconColor="text-indigo-400"
                />
                <PrefRow
                  icon={Volume2}
                  label="Noise Preference"
                  value={preferences.noisePreference}
                  color="bg-teal-50"
                  iconColor="text-teal-400"
                />
                <PrefRow
                  icon={Settings2}
                  label="Seat Type"
                  value={preferences.seatType}
                  color="bg-violet-50"
                  iconColor="text-violet-400"
                />
                <PrefRow
                  icon={Zap}
                  label="Preferred Amenities"
                  value={preferences.preferredAmenities.join(", ") || "—"}
                  color="bg-amber-50"
                  iconColor="text-amber-400"
                />
                <PrefRow
                  icon={Users}
                  label="Near Teammates"
                  value={preferences.nearTeammates.join(", ") || "—"}
                  color="bg-emerald-50"
                  iconColor="text-emerald-400"
                />
                <PrefRow
                  icon={Star}
                  label="Other Preferences"
                  value={preferences.otherPreferences.join(", ") || "—"}
                  color="bg-orange-50"
                  iconColor="text-orange-400"
                />
              </div>
            </Card>

          </div>

          {/* ── Right column (1/3 width) ─────────────────────────────────────── */}
          <div className="space-y-5">

            {/* ── About Me ──────────────────────────────────────────────────── */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13.5px] font-semibold text-gray-800">About Me</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-[12px] text-gray-500 hover:text-gray-800"
                  onClick={() => setEditProfileOpen(true)}
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </Button>
              </div>
              <p className="text-[12.5px] text-gray-500 leading-relaxed mb-4">
                {profile.bio || "No bio added yet."}
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

            {/* ── Work Details ──────────────────────────────────────────────── */}
            <Card className="p-5">
              <h3 className="text-[13.5px] font-semibold text-gray-800 mb-4">Work Details</h3>
              <div className="space-y-3">
                {[
                  { label: "Employee ID",    value: profile.employeeId },
                  { label: "Department",     value: profile.department },
                  { label: "Designation",    value: profile.jobTitle },
                  { label: "Work Location",  value: profile.workLocation },
                  { label: "Manager",        value: profile.reportingManager },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <span className="text-[12px] text-gray-400 shrink-0">{label}</span>
                    <span className="text-[12.5px] text-gray-700 font-medium text-right truncate">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        </div>
      </div>
    </>
  );
}