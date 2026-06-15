"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Avatar,
  EmployeeSearch,
  FieldLabel,
  IconChevronDown,
  IconChevronRight,
  IconSearch,
  inputStyle,
} from "./BookForSomeone";
import {
  GUEST_TYPES,
  MOCK_EMPLOYEES,
  PURPOSE_OF_VISIT,
  getGuestName,
  searchGuests,
} from "../services/bookingService";
import {
  Guest,
  GuestType,
  PurposeOfVisit,
  SeatRequired,
  VisitDetails,
} from "../types/booking";

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
      <Avatar name={getGuestName(guest)} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{getGuestName(guest)}</span>
        <span style={{ fontSize: "0.75rem", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {guest.email}
        </span>
        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
          {guest.company ? `${guest.company} · ` : ""}{guest.guestType}
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
  company: "",
  jobTitle: "",
  guestType: GUEST_TYPES[0] as GuestType,
  notes: "",
};

interface GuestSelectStepProps {
  guests: Guest[];
  selectedGuest: Guest | null;
  view: "list" | "create";
  onViewChange: (view: "list" | "create") => void;
  onSelect: (guest: Guest) => void;
  onCreate: (data: Omit<Guest, "id">) => void;
}

export function GuestSelectStep({ guests, selectedGuest, view, onViewChange, onSelect, onCreate }: GuestSelectStepProps) {
  const [query, setQuery] = useState("");
  const results = searchGuests(query, guests);

  if (view === "create") {
    return (
      <CreateGuestForm
        onCancel={() => onViewChange("list")}
        onSave={(data) => {
          onCreate(data);
          onViewChange("list");
        }}
      />
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Visitor / Guest Details</h2>
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 4, marginBottom: "1.25rem" }}>
        Select a recent guest or create a new one.
      </p>

      <div style={{ position: "relative", marginBottom: "0.875rem" }}>
        <span style={{ position: "absolute", left: 11, top: 13, color: "#9ca3af", display: "flex", pointerEvents: "none" }}>
          <IconSearch />
        </span>
        <input
          type="text"
          placeholder="Search guests by name, email or company"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...inputStyle(), paddingLeft: 34 }}
          onFocus={(e) => Object.assign(e.currentTarget.style, { borderColor: "#4f46e5", boxShadow: "0 0 0 3px rgba(79,70,229,0.1)" })}
          onBlur={(e) => Object.assign(e.currentTarget.style, { borderColor: "#e5e7eb", boxShadow: "none" })}
        />
      </div>

      <button
        type="button"
        onClick={() => onViewChange("create")}
        style={{
          width: "100%",
          padding: "0.625rem 1rem",
          marginBottom: "0.875rem",
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

      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Recent Guests</p>
      <div style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        {results.map((guest, i) => (
          <div key={guest.id} style={{ borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}>
            <GuestRow guest={guest} selected={selectedGuest?.id === guest.id} onClick={() => onSelect(guest)} />
          </div>
        ))}
        {results.length === 0 && (
          <p style={{ padding: "1rem", fontSize: "0.8125rem", color: "#9ca3af", textAlign: "center" }}>No guests found.</p>
        )}
      </div>
    </div>
  );
}

// ─── CreateGuestForm ──────────────────────────────────────────────────────────

interface CreateGuestFormProps {
  onCancel: () => void;
  onSave: (data: Omit<Guest, "id">) => void;
}

function CreateGuestForm({ onCancel, onSave }: CreateGuestFormProps) {
  const [form, setForm] = useState(EMPTY_GUEST_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.firstName.trim()) nextErrors.firstName = "First name is required";
    if (!form.lastName.trim()) nextErrors.lastName = "Last name is required";
    if (!form.email.trim()) nextErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email address";
    if (!form.guestType) nextErrors.guestType = "Guest type is required";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSave({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      company: form.company.trim() || undefined,
      jobTitle: form.jobTitle.trim() || undefined,
      guestType: form.guestType as GuestType,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <div>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>New Guest</h2>
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 4, marginBottom: "1.25rem" }}>
        Add the visitor&apos;s details. They&apos;ll be saved for future visits.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div>
          <FieldLabel htmlFor="g-firstName" required>First Name</FieldLabel>
          <input id="g-firstName" type="text" style={inputStyle()} placeholder="First name" value={form.firstName} onChange={update("firstName")} />
          {errors.firstName && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.firstName}</p>}
        </div>
        <div>
          <FieldLabel htmlFor="g-lastName" required>Last Name</FieldLabel>
          <input id="g-lastName" type="text" style={inputStyle()} placeholder="Last name" value={form.lastName} onChange={update("lastName")} />
          {errors.lastName && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.lastName}</p>}
        </div>
        <div>
          <FieldLabel htmlFor="g-email" required>Email Address</FieldLabel>
          <input id="g-email" type="email" style={inputStyle()} placeholder="email@example.com" value={form.email} onChange={update("email")} />
          {errors.email && <p style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: 4 }}>{errors.email}</p>}
        </div>
        <div>
          <FieldLabel htmlFor="g-phone">Phone Number <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</span></FieldLabel>
          <input id="g-phone" type="tel" style={inputStyle()} placeholder="+1 555 000 0000" value={form.phone} onChange={update("phone")} />
        </div>
        <div>
          <FieldLabel htmlFor="g-company">Organization / Company <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</span></FieldLabel>
          <input id="g-company" type="text" style={inputStyle()} placeholder="Company name" value={form.company} onChange={update("company")} />
        </div>
        <div>
          <FieldLabel htmlFor="g-jobTitle">Job Title <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</span></FieldLabel>
          <input id="g-jobTitle" type="text" style={inputStyle()} placeholder="Job title" value={form.jobTitle} onChange={update("jobTitle")} />
        </div>
        <div>
          <FieldLabel htmlFor="g-guestType" required>Guest Type</FieldLabel>
          <div style={{ position: "relative" }}>
            <select id="g-guestType" style={{ ...inputStyle(), paddingRight: 32, appearance: "none", cursor: "pointer" }} value={form.guestType} onChange={update("guestType")}>
              {GUEST_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9ca3af", display: "flex" }}>
              <IconChevronDown />
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <FieldLabel htmlFor="g-notes">Notes <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</span></FieldLabel>
        <textarea
          id="g-notes"
          rows={3}
          placeholder="Add any notes about the guest…"
          value={form.notes}
          onChange={update("notes")}
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

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ height: 40, padding: "0 1.25rem", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: "0.875rem", fontWeight: 600, color: "#111827", cursor: "pointer", fontFamily: "inherit" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          style={{ height: 40, padding: "0 1.25rem", borderRadius: 8, border: "1.5px solid #4f46e5", background: "#4f46e5", fontSize: "0.875rem", fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "inherit" }}
        >
          Save Guest
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
}

export function VisitDetailsStep({ guest, visitDetails, onChange }: VisitDetailsStepProps) {
  return (
    <div>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Visit Details</h2>
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 4, marginBottom: "1.25rem" }}>
        Tell us about this visit.
      </p>

      {guest && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10, marginBottom: "1rem" }}>
          <Avatar name={getGuestName(guest)} />
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{getGuestName(guest)}</span>
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
              {GUEST_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
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
              {PURPOSE_OF_VISIT.map((p) => <option key={p} value={p}>{p}</option>)}
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
        {!visitDetails.hostEmployee && (
          <div style={{ marginTop: "0.5rem", border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => onChange({ hostEmployee: MOCK_EMPLOYEES[1] })}
              style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
            >
              <Avatar name={MOCK_EMPLOYEES[1].name} />
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{MOCK_EMPLOYEES[1].name}</span>
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <FieldLabel htmlFor="visitDate" required>Visit Date</FieldLabel>
          <input id="visitDate" type="date" style={inputStyle()} value={visitDetails.visitDate} onChange={(e) => onChange({ visitDate: e.target.value })} />
        </div>
        <div>
          <FieldLabel htmlFor="endDate">End Date <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</span></FieldLabel>
          <input id="endDate" type="date" style={inputStyle()} value={visitDetails.endDate} onChange={(e) => onChange({ endDate: e.target.value })} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <FieldLabel htmlFor="startTime">Start Time <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</span></FieldLabel>
          <input id="startTime" type="time" style={inputStyle()} value={visitDetails.startTime} onChange={(e) => onChange({ startTime: e.target.value })} />
        </div>
        <div>
          <FieldLabel htmlFor="endTime">End Time <span style={{ color: "#9ca3af", fontWeight: 400 }}>(Optional)</span></FieldLabel>
          <input id="endTime" type="time" style={inputStyle()} value={visitDetails.endTime} onChange={(e) => onChange({ endTime: e.target.value })} />
        </div>
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
  const options: { key: "yes" | "no"; label: string; sub: string }[] = [
    { key: "yes", label: "Yes, book a seat", sub: "Continue to seat selection for this visit." },
    { key: "no", label: "No, invite only", sub: "Send an invite without reserving a workspace." },
  ];

  return (
    <div>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Does this guest need a seat?</h2>
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 4, marginBottom: "1.25rem" }}>
        Choose whether to reserve a workspace for this visitor.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {options.map(({ key, label, sub }) => {
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
                gap: 4,
                padding: "1rem",
                border: `1.5px solid ${active ? "#4f46e5" : "#e5e7eb"}`,
                borderRadius: 10,
                background: active ? "#eef2ff" : "#fff",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{label}</span>
              <span style={{ fontSize: "0.75rem", color: "#6b7280", lineHeight: 1.4 }}>{sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── ConfirmInviteStep ────────────────────────────────────────────────────────

interface ConfirmInviteStepProps {
  guest: Guest | null;
  visitDetails: VisitDetails;
}

export function ConfirmInviteStep({ guest, visitDetails }: ConfirmInviteStepProps) {
  const rows: [string, string][] = [
    ["Guest", guest ? getGuestName(guest) : "—"],
    ["Email", guest?.email ?? "—"],
    ["Guest Type", visitDetails.guestType],
    ["Purpose of Visit", visitDetails.purposeOfVisit],
    ["Host Employee", visitDetails.hostEmployee?.name ?? "—"],
    ["Visit Date", visitDetails.visitDate || "—"],
    ["End Date", visitDetails.endDate || "—"],
    ["Time", [visitDetails.startTime, visitDetails.endTime].filter(Boolean).join(" – ") || "—"],
    ["Requires Seat", "No"],
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

export function SuccessStep({ onBookAnother }: { onBookAnother: () => void }) {
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
      <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
        <button
          type="button"
          onClick={onBookAnother}
          style={{ height: 40, padding: "0 1.25rem", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: "0.875rem", fontWeight: 600, color: "#111827", cursor: "pointer", fontFamily: "inherit" }}
        >
          Book Another
        </button>
        <Link
          href="/mybookings"
          style={{ height: 40, padding: "0 1.25rem", borderRadius: 8, border: "1.5px solid #4f46e5", background: "#4f46e5", fontSize: "0.875rem", fontWeight: 600, color: "#fff", display: "inline-flex", alignItems: "center", textDecoration: "none", fontFamily: "inherit" }}
        >
          Go to My Bookings
        </Link>
      </div>
    </div>
  );
}
