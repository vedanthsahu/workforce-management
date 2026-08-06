"use client";

import { useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  Avatar,
  EmployeeSearch,
  FieldLabel,
  IconChevronDown,
  IconChevronRight,
  IconClose,
  IconEdit,
  IconSearch,
  inputStyle,
} from "./BookForSomeone";
import { GUEST_TYPES, PURPOSE_OF_VISIT } from "../constants/booking.constants";
import { useGuestSearch } from "../hooks/useBooking";
import { createGuestSchema } from "../schemas/guest.schema";
import {
  Building,
  CreateGuestInput,
  Floor,
  Guest,
  GuestType,
  PurposeOfVisit,
  SeatRequired,
  Site,
  VisitDetails,
} from "../types/booking";
import { updateGuest } from "../services/booking.service";

// ─── StepProgressBar ────────────────────────────────────────────────────────

interface StepProgressBarProps {
  steps: string[];
  currentStep: number;
}

export function StepProgressBar({ steps, currentStep }: StepProgressBarProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "1.75rem" }}>
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < currentStep;
        const active = stepNum === currentStep;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 64 }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  background: done ? "#4f46e5" : active ? "#eef2ff" : "#f3f4f6",
                  color: done ? "#fff" : active ? "#4f46e5" : "#9ca3af",
                  border: active ? "1.5px solid #4f46e5" : "none",
                }}
              >
                {done ? "✓" : stepNum}
              </span>
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: active ? 600 : 500,
                  color: active ? "#111827" : "#9ca3af",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: stepNum < currentStep ? "#4f46e5" : "#e5e7eb",
                  margin: "0 0.5rem",
                  marginBottom: 18,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── GuestRow ───────────────────────────────────────────────────────────────

function GuestRow({ guest, onClick, selected }: { guest: Guest; onClick?: () => void; selected?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        width: "100%",
        background: selected ? "#eef2ff" : "none",
        border: "none",
        textAlign: "left",
        cursor: "pointer",
        transition: "background 0.12s",
        borderRadius: 8,
      }}
      onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = selected ? "#eef2ff" : "none"; }}
    >
      <Avatar name={guest.fullName} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{guest.fullName}</span>
        <span style={{ fontSize: "0.75rem", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {guest.email}
        </span>
      </span>
      {selected ? (
        <span style={{ color: "#4f46e5", fontWeight: 700, display: "flex" }}>✓</span>
      ) : (
        <span style={{ color: "#9ca3af", display: "flex" }}><IconChevronRight /></span>
      )}
    </button>
  );
}

// ─── GuestSelectStep ──────────────────────────────────────────────────────────

const EMPTY_GUEST_DRAFT = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  organization: "",
};

interface GuestSelectStepProps {
  selectedGuest: Guest | null;
  view: "list" | "create" | "edit";
  onViewChange: (view: "list" | "create" | "edit") => void;
  onSelect: (guest: Guest | null) => void;
  onCreate: (data: CreateGuestInput) => Promise<Guest>;
}

export function GuestSelectStep({ selectedGuest, view, onViewChange, onSelect, onCreate }: GuestSelectStepProps) {
  const { query, setQuery, results, isLoading } = useGuestSearch();

  const handleClear = () => { onSelect(null); setQuery(""); };

  if (view === "create") {
    return (
      <CreateGuestForm
        onCancel={() => onViewChange("list")}
        onSave={async (data) => {
          const guest = await onCreate(data);
          onSelect(guest);
          onViewChange("list");
        }}
      />
    );
  }

  if (view === "edit" && selectedGuest) {
    return (
      <EditGuestForm
        guest={selectedGuest}
        onCancel={() => onViewChange("list")}
        onSave={(updated) => {
          onSelect(updated);
          onViewChange("list");
        }}
      />
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Visitor / Guest Details</h2>
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 4, marginBottom: "1.25rem" }}>
        Select an existing guest or create a new one.
      </p>

      <div style={{ marginBottom: "0.875rem" }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#111827", display: "block", marginBottom: 6 }}>
          Search Guest <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{ position: "absolute", left: 11, color: "#9ca3af", display: "flex", pointerEvents: "none" }}>
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Search by name, email or phone number"
            value={selectedGuest ? selectedGuest.fullName : query}
            readOnly={!!selectedGuest}
            onChange={(e) => { if (!selectedGuest) setQuery(e.target.value); }}
            style={{
              ...inputStyle(),
              paddingLeft: 34,
              paddingRight: selectedGuest ? 34 : 12,
              cursor: selectedGuest ? "default" : "text",
            }}
            onFocusCapture={(e) => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.1)"; }}
            onBlurCapture={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
          />
          {selectedGuest && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear selected guest"
              style={{
                position: "absolute",
                right: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "none",
                border: "none",
                color: "#9ca3af",
                cursor: "pointer",
              }}
            >
              <IconClose />
            </button>
          )}
        </div>
      </div>

      {!selectedGuest && query.trim() && (
        <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, maxHeight: 260, overflowY: "auto", marginBottom: "0.875rem" }}>
          {isLoading && (
            <p style={{ padding: "1rem", fontSize: "0.8125rem", color: "#9ca3af", textAlign: "center" }}>Searching…</p>
          )}
          {!isLoading && results.map((guest, i) => (
            <div key={guest.id} style={{ borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}>
              <GuestRow
                guest={guest}
                selected={false}
                onClick={() => { onSelect(guest); setQuery(""); }}
              />
            </div>
          ))}
          {!isLoading && results.length === 0 && (
            <p style={{ padding: "1rem", fontSize: "0.8125rem", color: "#9ca3af", textAlign: "center" }}>No guests found.</p>
          )}
        </div>
      )}

      {selectedGuest && (
        <div style={{ marginTop: "0.75rem" }}>
          <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#111827", marginBottom: "0.625rem" }}>
            Selected Guest
          </p>
          <div style={{
            display: "flex",
            gap: "1rem",
            padding: "1rem",
            background: "#f9fafb",
            border: "1.5px solid #e5e7eb",
            borderRadius: 10,
          }}>
            <Avatar name={selectedGuest.fullName} size="md" />
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: "2rem", rowGap: "0.375rem", flex: 1 }}>
              {([
                ["Name", selectedGuest.fullName],
                ["Email", selectedGuest.email],
                ["Phone", selectedGuest.phone || "—"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} style={{ display: "contents" }}>
                  <dt style={{ fontSize: "0.8125rem", color: "#6b7280" }}>{label}</dt>
                  <dd style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#111827" }}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.625rem" }}>
            <button
              type="button"
              onClick={() => onViewChange("edit")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "#4f46e5",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px 0",
              }}
            >
              <IconEdit /> Edit Guest
            </button>
          </div>
        </div>
      )}

      {!selectedGuest && (
        <button
          type="button"
          onClick={() => onViewChange("create")}
          style={{
            width: "100%",
            padding: "0.625rem 1rem",
            marginTop: query.trim() ? 0 : "0.25rem",
            border: "1.5px dashed #c7d2fe",
            borderRadius: 10,
            background: "#eef2ff",
            color: "#4f46e5",
            fontSize: "0.8125rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          + Create New Guest
        </button>
      )}
    </div>
  );
}

// ─── CreateGuestForm ──────────────────────────────────────────────────────────

interface CreateGuestFormProps {
  onCancel: () => void;
  onSave: (data: CreateGuestInput) => Promise<void>;
}

function CreateGuestForm({ onCancel, onSave }: CreateGuestFormProps) {
  const [form, setForm] = useState(EMPTY_GUEST_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validateField = (field: string, value: string) => {
    const partial = { ...form, [field]: value };
    const result = createGuestSchema.safeParse(partial);
    if (result.success) {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    } else {
      const issue = result.error.issues.find((i) => String(i.path[0]) === field);
      if (issue) {
        setErrors((prev) => ({ ...prev, [field]: issue.message }));
      } else {
        setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
      }
    }
  };

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (!touched[field]) setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, value);
  };

  const handleBlur = (field: keyof typeof form) => () => {
    if (touched[field]) validateField(field, form[field]);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const newDigits = raw.replace(/\D/g, "");
    const maxDigits = newDigits.startsWith("91") ? 12 : 10;

    if (newDigits.length > maxDigits) return;

    setForm((prev) => ({ ...prev, phone: raw }));
    if (!touched.phone) setTouched((prev) => ({ ...prev, phone: true }));
    validateField("phone", raw);
  };

  const handleSave = async () => {
    setTouched({ firstName: true, lastName: true, email: true, phone: true, organization: true });
    const result = createGuestSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setApiError(null);
    setIsSaving(true);
    try {
      const v = result.data;
      await onSave({
        fullName: `${v.firstName} ${v.lastName}`.trim(),
        email: v.email,
        phone: v.phone || undefined,
        organization: v.organization || undefined,
      });
    } catch (err) {
      const serverMsg = axios.isAxiosError(err)
        ? err.response?.data?.error?.message || err.response?.data?.message || err.response?.data?.detail
        : null;
      setApiError(serverMsg ?? "Failed to save guest. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {apiError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-[12.5px] flex items-start gap-3">
          <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9-3a1 1 0 00-2 0v3a1 1 0 002 0V5zm-.25 5.75a.75.75 0 10-1.5 0 .75.75 0 001.5 0z" /></svg>
          <span className="flex-1">{apiError}</span>
          <button onClick={() => setApiError(null)} className="text-red-400 hover:text-red-600 shrink-0">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l12 12M13 1L1 13" /></svg>
          </button>
        </div>
      )}
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>New Guest</h2>
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 4, marginBottom: "1.25rem" }}>
        Add the visitor&apos;s details. They&apos;ll be saved for future visits.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* First Name */}
        <div>
          <FieldLabel htmlFor="g-firstName" required>First Name</FieldLabel>
          <input
            id="g-firstName"
            type="text"
            style={inputStyle()}
            placeholder="First name"
            value={form.firstName}
            onChange={handleChange("firstName")}
            onBlur={handleBlur("firstName")}
          />
          {errors.firstName && (
            <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.firstName}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <FieldLabel htmlFor="g-lastName" required>Last Name</FieldLabel>
          <input
            id="g-lastName"
            type="text"
            style={inputStyle()}
            placeholder="Last name"
            value={form.lastName}
            onChange={handleChange("lastName")}
            onBlur={handleBlur("lastName")}
          />
          {errors.lastName && (
            <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.lastName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <FieldLabel htmlFor="g-email" required>Email Address</FieldLabel>
          <input
            id="g-email"
            type="email"
            style={inputStyle()}
            placeholder="email@example.com"
            value={form.email}
            onChange={handleChange("email")}
            onBlur={handleBlur("email")}
          />
          {errors.email && (
            <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.email}</p>
          )}
        </div>

        {/* Phone — blocks input beyond 10 digits */}
        <div>
          <FieldLabel htmlFor="g-phone" required>Phone Number</FieldLabel>
          <input
            id="g-phone"
            type="tel"
            style={inputStyle()}
            placeholder="+91 550000000"
            value={form.phone}
            onChange={handlePhoneChange}
            onBlur={handleBlur("phone")}
          />
          {errors.phone && (
            <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.phone}</p>
          )}
        </div>

        {/* Organization — with inline error */}
        <div>
          <FieldLabel htmlFor="g-organization">
            Organization / Company{" "}
            <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</span>
          </FieldLabel>
          <input
            id="g-organization"
            type="text"
            style={inputStyle()}
            placeholder="Company name"
            value={form.organization}
            onChange={handleChange("organization")}
            onBlur={handleBlur("organization")}
          />
          {errors.organization && (
            <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.organization}</p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          style={{
            height: 40,
            padding: "0 1.25rem",
            borderRadius: 8,
            border: "1.5px solid #e5e7eb",
            background: "#fff",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#111827",
            cursor: isSaving ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            height: 40,
            padding: "0 1.25rem",
            borderRadius: 8,
            border: "1.5px solid #4f46e5",
            background: isSaving ? "#a5b4fc" : "#4f46e5",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#fff",
            cursor: isSaving ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {isSaving ? "Saving…" : "Save Guest"}
        </button>
      </div>
    </div>
  );
}

// ─── VisitDetailsStep ─────────────────────────────────────────────────────────

interface VisitDetailsStepProps {
  guest: Guest | null;
  visitDetails: VisitDetails;
  onChange: (updates: Partial<VisitDetails>) => void;
  sites: Site[];
  buildings: Building[];
  floors: Floor[];
  isLoadingBuildings: boolean;
  isLoadingFloors: boolean;
  readOnlyLocation?: boolean;
}

// ── Time slot dropdown ───────────────────────────────────────────────────────

function generateTimeSlots(): { label: string; value: string }[] {
  const slots: { label: string; value: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      const value = `${hh}:${mm}`;
      const period = h < 12 ? "AM" : "PM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${h12}:${mm} ${period}`;
      slots.push({ label, value });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function TimeSlotSelect({
  id,
  value,
  onChange,
  placeholder = "Select time",
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        id={id}
        style={{ ...inputStyle(), paddingRight: 32, appearance: "none", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {TIME_SLOTS.map((slot) => (
          <option key={slot.value} value={slot.value}>{slot.label}</option>
        ))}
      </select>
      <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af", display: "flex" }}>
        <IconChevronDown />
      </span>
    </div>
  );
}

function LockedTooltip({ children, locked, message }: { children: React.ReactNode; locked: boolean; message: string }) {
  return (
    <div className={locked ? "relative group" : ""}>
      {children}
      {locked && (
        <div
          className="absolute bottom-full left-0 mb-2 hidden group-hover:flex items-start gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11.5px] font-medium leading-relaxed px-3.5 py-2.5 rounded-xl shadow-md pointer-events-none z-50 w-[300px]"
        >
          <svg className="w-4 h-4 shrink-0 mt-px text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{message}</span>
          <div className="absolute top-full left-6 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-indigo-200" />
        </div>
      )}
    </div>
  );
}

export function VisitDetailsStep({ guest, visitDetails, onChange, sites, buildings, floors, isLoadingBuildings, isLoadingFloors, readOnlyLocation = false }: VisitDetailsStepProps) {
  const lockedMessage = "This field cannot be changed because a seat booking is linked to this visit. To change location or dates, use 'Edit Booking' instead.";
  return (
    <div>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Visit Details</h2>
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 4, marginBottom: "1.25rem" }}>
        Tell us about this visit.
      </p>

      {guest && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10, marginBottom: "1rem" }}>
          <Avatar name={guest.fullName} />
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{guest.fullName}</span>
            <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{guest.email}</span>
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <FieldLabel htmlFor="visitGuestType" required>Guest Type</FieldLabel>
          <div style={{ position: "relative" }}>
            <select
              id="visitGuestType"
              style={{ ...inputStyle(), paddingRight: 32, appearance: "none", cursor: "pointer" }}
              value={visitDetails.guestType}
              onChange={(e) => onChange({ guestType: e.target.value as GuestType })}
            >
              {GUEST_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af", display: "flex" }}>
              <IconChevronDown />
            </span>
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="purpose">Purpose of Visit</FieldLabel>
          <div style={{ position: "relative" }}>
            <select
              id="purpose"
              style={{ ...inputStyle(), paddingRight: 32, appearance: "none", cursor: "pointer" }}
              value={visitDetails.purposeOfVisit}
              onChange={(e) => onChange({ purposeOfVisit: e.target.value as PurposeOfVisit })}
            >
              {PURPOSE_OF_VISIT.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af", display: "flex" }}>
              <IconChevronDown />
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <FieldLabel required>Host Employee</FieldLabel>
        <EmployeeSearch
          placeholder="Search host employee"
          selectedEmployee={visitDetails.hostEmployee}
          onSelect={(emp) => onChange({ hostEmployee: emp })}
          onClear={() => onChange({ hostEmployee: null })}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <LockedTooltip locked={readOnlyLocation} message={lockedMessage}>
          <FieldLabel htmlFor="visitSite" required>Office</FieldLabel>
          <div style={{ position: "relative" }}>
            <select
              id="visitSite"
              style={{ ...inputStyle(), paddingRight: 32, appearance: "none", cursor: readOnlyLocation ? "not-allowed" : "pointer", opacity: readOnlyLocation ? 0.6 : 1 }}
              value={visitDetails.siteId}
              onChange={(e) => onChange({ siteId: e.target.value, buildingId: "", floorId: "" })}
              disabled={readOnlyLocation}
            >
              <option value="" disabled hidden>Select a Office</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af", display: "flex" }}>
              <IconChevronDown />
            </span>
          </div>
        </LockedTooltip>
        <LockedTooltip locked={readOnlyLocation} message={lockedMessage}>
          <FieldLabel htmlFor="visitBuilding" required>Building</FieldLabel>
          <div style={{ position: "relative" }}>
            <select
              id="visitBuilding"
              style={{ ...inputStyle(), paddingRight: 32, appearance: "none", cursor: readOnlyLocation || !visitDetails.siteId ? "not-allowed" : "pointer", opacity: readOnlyLocation ? 0.6 : 1 }}
              value={visitDetails.buildingId}
              onChange={(e) => onChange({ buildingId: e.target.value, floorId: "" })}
              disabled={readOnlyLocation || !visitDetails.siteId}
            >
              <option value="" disabled hidden>
                {!visitDetails.siteId ? "Select a office first" : isLoadingBuildings ? "Loading…" : "Select a building"}
              </option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af", display: "flex" }}>
              <IconChevronDown />
            </span>
          </div>
        </LockedTooltip>
        <LockedTooltip locked={readOnlyLocation} message={lockedMessage}>
          <FieldLabel htmlFor="visitFloor" required>Floor</FieldLabel>
          <div style={{ position: "relative" }}>
            <select
              id="visitFloor"
              style={{ ...inputStyle(), paddingRight: 32, appearance: "none", cursor: readOnlyLocation || !visitDetails.buildingId ? "not-allowed" : "pointer", opacity: readOnlyLocation ? 0.6 : 1 }}
              value={visitDetails.floorId}
              onChange={(e) => onChange({ floorId: e.target.value })}
              disabled={readOnlyLocation || !visitDetails.buildingId}
            >
              <option value="" disabled hidden>
                {!visitDetails.buildingId ? "Select a building first" : isLoadingFloors ? "Loading…" : "Select a floor"}
              </option>
              {floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af", display: "flex" }}>
              <IconChevronDown />
            </span>
          </div>
        </LockedTooltip>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <LockedTooltip locked={readOnlyLocation} message={lockedMessage}>
          <FieldLabel htmlFor="visitDate" required>Visit Date</FieldLabel>
          <input
            id="visitDate"
            type="date"
            style={{ ...inputStyle(), cursor: readOnlyLocation ? "not-allowed" : undefined, opacity: readOnlyLocation ? 0.6 : 1 }}
            value={visitDetails.visitDate}
            min={new Date().toISOString().split("T")[0]}
            disabled={readOnlyLocation}
            onKeyDown={(e) => e.preventDefault()}
            onChange={(e) => {
              const val = e.target.value;
              const updates: Partial<VisitDetails> = { visitDate: val };
              if (!visitDetails.endDate || visitDetails.endDate < val) updates.endDate = val;
              onChange(updates);
            }}
          />
        </LockedTooltip>
        <LockedTooltip locked={readOnlyLocation} message={lockedMessage}>
          <FieldLabel htmlFor="endDate" required>End Date</FieldLabel>
          <input
            id="endDate"
            type="date"
            style={{ ...inputStyle(), cursor: readOnlyLocation ? "not-allowed" : undefined, opacity: readOnlyLocation ? 0.6 : 1 }}
            value={visitDetails.endDate}
            min={visitDetails.visitDate || new Date().toISOString().split("T")[0]}
            disabled={readOnlyLocation}
            onKeyDown={(e) => e.preventDefault()}
            onChange={(e) => onChange({ endDate: e.target.value })}
          />
        </LockedTooltip>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <LockedTooltip locked={readOnlyLocation} message={lockedMessage}>
          <FieldLabel htmlFor="startTime">Start Time <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</span></FieldLabel>
          <TimeSlotSelect id="startTime" value={visitDetails.startTime} onChange={(val) => onChange({ startTime: val })} placeholder="Select start time" disabled={readOnlyLocation} />
        </LockedTooltip>
        <LockedTooltip locked={readOnlyLocation} message={lockedMessage}>
          <FieldLabel htmlFor="endTime">End Time <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</span></FieldLabel>
          <TimeSlotSelect id="endTime" value={visitDetails.endTime} onChange={(val) => onChange({ endTime: val })} placeholder="Select end time" disabled={readOnlyLocation} />
        </LockedTooltip>
      </div>

      <div>
        <FieldLabel htmlFor="visitNotes">Additional Notes <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</span></FieldLabel>
        <textarea
          id="visitNotes"
          rows={3}
          maxLength={300}
          placeholder="Add any notes about the visit…"
          value={visitDetails.additionalNotes}
          onChange={(e) => onChange({ additionalNotes: e.target.value })}
          style={{
            width: "100%",
            padding: "0.625rem 0.75rem",
            border: "1.5px solid #e5e7eb",
            borderRadius: 8,
            fontSize: "0.875rem",
            color: "#111827",
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
            lineHeight: 1.5,
          }}
        />
      </div>
    </div>
  );
}

// ─── SeatRequiredStep ─────────────────────────────────────────────────────────

interface SeatRequiredStepProps {
  value: SeatRequired;
  onChange: (value: SeatRequired) => void;
}

export function SeatRequiredStep({ value, onChange }: SeatRequiredStepProps) {
  const options: { key: "yes" | "no"; label: string; sub: string; bullets: string[] }[] = [
    {
      key: "yes",
      label: "Yes, book a seat",
      sub: "Reserve a workspace for this guest.",
      bullets: ["Guest will have a dedicated seat", "Seat will be held for the selected time", "Ideal for longer or in-office visits"],
    },
    {
      key: "no",
      label: "No, invite only",
      sub: "Send an invite without reserving a seat.",
      bullets: ["Guest does not need a seat", "Perfect for short or host-only visits", "Quick invite and arrival"],
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" /><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4z" /><path d="M5 18v2" /><path d="M19 18v2" /></svg>
      </div>
      <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#111827", marginBottom: 4 }}>Does this guest need a seat?</h2>
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginBottom: "1.75rem" }}>
        Choose the option that best fits this visitor&apos;s visit.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", width: "100%" }}>
        {options.map(({ key, label, sub, bullets }) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-pressed={active}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "1.5rem 1.25rem",
                border: `1.5px solid ${active ? "#4f46e5" : "#e5e7eb"}`,
                borderRadius: 12,
                background: active ? "#fafaff" : "#fff",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "border-color 0.15s, background 0.15s",
                textAlign: "left",
                gap: 0,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, marginBottom: 14,
                background: key === "yes" ? "#eef2ff" : "#f0fdf4",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {key === "yes" ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" /><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4z" /><path d="M5 18v2" /><path d="M19 18v2" /></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                )}
              </div>

              <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#111827", marginBottom: 4 }}>{label}</span>
              <span style={{ fontSize: "0.75rem", color: "#6b7280", lineHeight: 1.5, marginBottom: 14 }}>{sub}</span>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                {bullets.map((b) => (
                  <li key={b} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.75rem", color: "#374151" }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}><circle cx="8" cy="8" r="8" fill={active ? "#eef2ff" : "#f3f4f6"} /><path d="M5 8l2 2 4-4" stroke={active ? "#4f46e5" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {b}
                  </li>
                ))}
              </ul>

              <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #f3f4f6", paddingTop: 14, marginTop: "auto" }}>
                <span style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: `2px solid ${active ? "#4f46e5" : "#d1d5db"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: active ? "#4f46e5" : "#fff", flexShrink: 0,
                }}>
                  {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                </span>
                <span style={{ fontSize: "0.8125rem", fontWeight: 500, color: active ? "#4f46e5" : "#6b7280" }}>Select this option</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── EditGuestForm ────────────────────────────────────────────────────────────

interface EditGuestFormProps {
  guest: Guest;
  onCancel: () => void;
  onSave: (updated: Guest) => void;
}

function EditGuestForm({ guest, onCancel, onSave }: EditGuestFormProps) {
  const spaceIdx = guest.fullName.indexOf(" ");
  const [form, setForm] = useState({
    firstName:    spaceIdx >= 0 ? guest.fullName.slice(0, spaceIdx) : guest.fullName,
    lastName:     spaceIdx >= 0 ? guest.fullName.slice(spaceIdx + 1) : "",
    email:        guest.email ?? "",
    phone:        guest.phone ?? "",
    organization: guest.organization ?? "",
  });
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [touched,  setTouched]  = useState<Record<string, boolean>>({});
  const [saving,   setSaving]   = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) validateField(field, value);
  };

  const handleBlur = (field: string) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, form[field as keyof typeof form]);
  };

  const validateField = (field: string, value: string) => {
    const partial = { ...form, [field]: value };
    const result = createGuestSchema.safeParse(partial);
    if (result.success) {
      setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    } else {
      const issue = result.error.issues.find((i) => String(i.path[0]) === field);
      if (issue) setErrors((prev) => ({ ...prev, [field]: issue.message }));
      else       setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const handleSave = async () => {
    setTouched({ firstName: true, lastName: true, email: true, phone: true, organization: true });
    const result = createGuestSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    const v = result.data;
    setSaving(true);
    setApiError(null);
    try {
      const updated = await updateGuest(guest.id, {
        fullName:     `${v.firstName} ${v.lastName}`.trim(),
        email:        v.email,
        phone:        v.phone || undefined,
        organization: v.organization || undefined,
      });
      onSave(updated);
    } catch (err) {
      const serverMsg = axios.isAxiosError(err)
        ? err.response?.data?.error?.message || err.response?.data?.message || err.response?.data?.detail
        : null;
      setApiError(serverMsg ?? "Failed to update guest. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {apiError && (
        <div style={{ marginBottom: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "0.75rem 1rem", color: "#dc2626", fontSize: "0.78125rem", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ flex: 1 }}>{apiError}</span>
          <button type="button" onClick={() => setApiError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 0, lineHeight: 1 }}>✕</button>
        </div>
      )}
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Edit Guest</h2>
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 4, marginBottom: "1.25rem" }}>
        Update the visitor&apos;s details.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* First Name */}
        <div>
          <FieldLabel htmlFor="eg-firstName" required>First Name</FieldLabel>
          <input id="eg-firstName" type="text" style={inputStyle()} placeholder="First name"
            value={form.firstName} onChange={handleChange("firstName")} onBlur={handleBlur("firstName")} />
          {errors.firstName && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.firstName}</p>}
        </div>

        {/* Last Name */}
        <div>
          <FieldLabel htmlFor="eg-lastName" required>Last Name</FieldLabel>
          <input id="eg-lastName" type="text" style={inputStyle()} placeholder="Last name"
            value={form.lastName} onChange={handleChange("lastName")} onBlur={handleBlur("lastName")} />
          {errors.lastName && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.lastName}</p>}
        </div>

        {/* Email */}
        <div>
          <FieldLabel htmlFor="eg-email" required>Email Address</FieldLabel>
          <input id="eg-email" type="email" style={inputStyle()} placeholder="email@example.com"
            value={form.email} onChange={handleChange("email")} onBlur={handleBlur("email")} />
          {errors.email && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <FieldLabel htmlFor="eg-phone">Phone Number</FieldLabel>
          <input id="eg-phone" type="tel" style={inputStyle()} placeholder="Phone number"
            value={form.phone} onChange={handleChange("phone")} onBlur={handleBlur("phone")} />
          {errors.phone && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.phone}</p>}
        </div>
      </div>

      {/* Organization */}
      <div style={{ marginTop: "1rem" }}>
        <FieldLabel htmlFor="eg-org">Organization / Company <span style={{ fontWeight: 400, color: "#9ca3af" }}>(Optional)</span></FieldLabel>
        <input id="eg-org" type="text" style={inputStyle()} placeholder="Company name"
          value={form.organization} onChange={handleChange("organization")} onBlur={handleBlur("organization")} />
        {errors.organization && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.organization}</p>}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
        <button type="button" onClick={onCancel} disabled={saving}
          style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem", fontWeight: 500, color: "#374151", background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontFamily: "inherit" }}>
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem", fontWeight: 600, color: "#fff", background: "#4f46e5", border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {saving && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ─── ConfirmInviteStep ────────────────────────────────────────────────────────

interface ConfirmInviteStepProps {
  guest: Guest | null;
  visitDetails: VisitDetails;
  sites: Site[];
  buildings: Building[];
  seatLabel?: string | null;
  floorName?: string | null;
}

export function ConfirmInviteStep({ guest, visitDetails, sites, buildings, seatLabel, floorName }: ConfirmInviteStepProps) {
  const guestTypeLabel = GUEST_TYPES.find((g) => g.value === visitDetails.guestType)?.label ?? visitDetails.guestType;
  const purposeLabel = PURPOSE_OF_VISIT.find((p) => p.value === visitDetails.purposeOfVisit)?.label ?? visitDetails.purposeOfVisit;
  const siteName = sites.find((s) => s.id === visitDetails.siteId)?.name ?? "—";
  const buildingName = buildings.find((b) => b.id === visitDetails.buildingId)?.name ?? "—";
  const hasSeat = !!seatLabel;

  const rows: [string, string][] = [
    ["Guest", guest ? guest.fullName : "—"],
    ["Email", guest?.email ?? "—"],
    ["Guest Type", guestTypeLabel],
    ["Purpose of Visit", purposeLabel],
    ["Host Employee", visitDetails.hostEmployee?.name ?? "—"],
    ["Site", siteName],
    ["Building", buildingName],
    ["Visit Date", visitDetails.visitDate || "—"],
    ["End Date", visitDetails.endDate || "—"],
    ["Time", [visitDetails.startTime, visitDetails.endTime].filter(Boolean).join(" – ") || "—"],
    ["Requires Seat", hasSeat ? "Yes" : "No"],
    ...(hasSeat ? ([
      ["Floor", floorName || "—"],
      ["Seat", seatLabel || "—"],
    ] as [string, string][]) : []),
    ["Notes", visitDetails.additionalNotes || "—"],
  ];

  return (
    <div>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Confirm Invitation</h2>
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 4, marginBottom: "1.25rem" }}>
        Review the details below before sending the invite.
      </p>
      <dl style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        {rows.map(([label, value], i) => (
          <div
            key={label}
            style={{
              display: "grid",
              gridTemplateColumns: "10rem 1fr",
              padding: "0.625rem 1rem",
              background: i % 2 === 0 ? "#f9fafb" : "#fff",
            }}
          >
            <dt style={{ fontSize: "0.8125rem", color: "#6b7280" }}>{label}</dt>
            <dd style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#111827" }}>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ─── SuccessStep ──────────────────────────────────────────────────────────────

export function SuccessStep({
  onBookAnother,
  isAdminFlow,
}: {
  onBookAnother: () => void;
  isAdminFlow?: boolean;
}) {
  return (
    <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#dcfce7",
          color: "#16a34a",
          fontSize: "1.75rem",
          fontWeight: 700,
          marginBottom: "1rem",
        }}
      >
        ✓
      </span>
      <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#111827", marginBottom: 6 }}>Invite Sent!</h2>
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", maxWidth: 360, margin: "0 auto 1.5rem" }}>
        The guest and host employee will receive an email with the visit details. No workspace has been reserved.
      </p>
      {isAdminFlow ? (
        <Link
          href="/admin/bookings"
          style={{
            height: 40,
            padding: "0 1.25rem",
            borderRadius: 8,
            border: "1.5px solid #4f46e5",
            background: "#4f46e5",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            textDecoration: "none",
            fontFamily: "inherit",
          }}
        >
          ← Back to Bookings
        </Link>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={onBookAnother}
            style={{
              height: 40,
              padding: "0 1.25rem",
              borderRadius: 8,
              border: "1.5px solid #e5e7eb",
              background: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#111827",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Book Another
          </button>
          <Link
            href="/mybookings?tab=bookedForSomeone"
            style={{
              height: 40,
              padding: "0 1.25rem",
              borderRadius: 8,
              border: "1.5px solid #4f46e5",
              background: "#4f46e5",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
              fontFamily: "inherit",
            }}
          >
            Go to My Bookings
          </Link>
        </div>
      )}
    </div>
  );
}