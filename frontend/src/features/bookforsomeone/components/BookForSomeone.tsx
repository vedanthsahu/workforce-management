// "use client";

// import { useEmployeeSearch } from "../hooks/useBooking";
// import { getInitials } from "../utils/booking.utils";
// import { BookingType, Employee } from "../types/booking";
// import { usePermissions } from "@/features/dashboard/hooks/usePermissions";


// // ─── Icons ────────────────────────────────────────────────────────────────────

// export function IconUser() {
//   return (
//     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
//       <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
//     </svg>
//   );
// }

// export function IconBadge() {
//   return (
//     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
//       <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
//       <circle cx="12" cy="15" r="1.5" fill="currentColor" />
//     </svg>
//   );
// }

// export function IconSearch() {
//   return (
//     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
//       <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
//     </svg>
//   );
// }

// export function IconChevronRight() {
//   return (
//     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
//   );
// }

// export function IconChevronDown() {
//   return (
//     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
//   );
// }

// export function IconClose() {
//   return (
//     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
//     </svg>
//   );
// }

// export function IconArrowRight() {
//   return (
//     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
//   );
// }

// export function IconInfo() {
//   return (
//     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
//       <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
//     </svg>
//   );
// }

// export function IconEdit() {
//   return (
//     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//       <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
//   );
// }

// // ─── Avatar ───────────────────────────────────────────────────────────────────

// interface AvatarProps {
//   name: string;
//   size?: "sm" | "md";
// }

// export function Avatar({ name, size = "sm" }: AvatarProps) {
//   const dim = size === "md" ? 44 : 36;
//   return (
//     <span
//       style={{
//         width: dim,
//         height: dim,
//         borderRadius: "50%",
//         background: "#eef2ff",
//         color: "#4f46e5",
//         fontSize: size === "md" ? "0.875rem" : "0.75rem",
//         fontWeight: 700,
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         flexShrink: 0,
//       }}
//       aria-hidden="true"
//     >
//       {getInitials(name)}
//     </span>
//   );
// }

// // ─── StatusBadge ──────────────────────────────────────────────────────────────

// export function StatusBadge({ status }: { status: string }) {
//   const isActive = status.toUpperCase() === "ACTIVE";
//   return (
//     <span
//       style={{
//         fontSize: "0.6875rem",
//         fontWeight: 600,
//         padding: "2px 8px",
//         borderRadius: 20,
//         background: isActive ? "#dcfce7" : "#f3f4f6",
//         color: isActive ? "#16a34a" : "#6b7280",
//         textTransform: "capitalize",
//       }}
//     >
//       {status.toLowerCase()}
//     </span>
//   );
// }

// // ─── EmployeeRow ──────────────────────────────────────────────────────────────

// interface EmployeeRowProps {
//   employee: Employee;
//   onClick?: () => void;
//   showChevron?: boolean;
// }

// export function EmployeeRow({ employee, onClick, showChevron = true }: EmployeeRowProps) {
//   return (
//     <button
//       type="button"
//       onClick={onClick}
//       style={{
//         display: "flex",
//         alignItems: "center",
//         gap: "0.75rem",
//         padding: "0.75rem 1rem",
//         width: "100%",
//         background: "none",
//         border: "none",
//         textAlign: "left",
//         cursor: onClick ? "pointer" : "default",
//         transition: "background 0.12s",
//         borderRadius: 8,
//       }}
//       onMouseEnter={(e) => { if (onClick) (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
//       onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
//     >
//       <Avatar name={employee.name} />
//       <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
//         <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
//           <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{employee.name}</span>
//           <StatusBadge status={employee.status} />
//         </span>
//         <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
//           {[employee.employeeId, employee.department].filter(Boolean).join(" · ") || employee.role}
//         </span>
//         <span style={{ fontSize: "0.75rem", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
//           {employee.email}
//         </span>
//       </span>
//       {showChevron && <span style={{ color: "#9ca3af", display: "flex" }}><IconChevronRight /></span>}
//     </button>
//   );
// }

// // ─── EmployeeSearch ───────────────────────────────────────────────────────────

// interface EmployeeSearchProps {
//   placeholder: string;
//   selectedEmployee: Employee | null;
//   onSelect: (emp: Employee) => void;
//   onClear: () => void;
// }

// export function EmployeeSearch({ placeholder, selectedEmployee, onSelect, onClear }: EmployeeSearchProps) {
//   const { query, results, isOpen, isLoading, containerRef, handleQueryChange, handleSelect, openDropdown } =
//     useEmployeeSearch(onSelect);

//   return (
//     <div ref={containerRef} style={{ position: "relative" }}>
//       {/* Input */}
//       <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
//         <span style={{ position: "absolute", left: 11, color: "#9ca3af", display: "flex", pointerEvents: "none" }}>
//           <IconSearch />
//         </span>
//         <input
//           type="text"
//           placeholder={placeholder}
//           value={selectedEmployee ? selectedEmployee.name : query}
//           onChange={(e) => { if (!selectedEmployee) handleQueryChange(e.target.value); }}
//           onFocus={() => { if (!selectedEmployee) openDropdown(); }}
//           readOnly={!!selectedEmployee}
//           style={{
//             width: "100%",
//             height: 40,
//             paddingLeft: 34,
//             paddingRight: selectedEmployee ? 34 : 12,
//             border: "1.5px solid #e5e7eb",
//             borderRadius: 8,
//             fontSize: "0.875rem",
//             color: "#111827",
//             outline: "none",
//             background: "#fff",
//             fontFamily: "inherit",
//             cursor: selectedEmployee ? "default" : "text",
//           }}
//           onFocusCapture={(e) => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.1)"; }}
//           onBlurCapture={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
//           aria-label={placeholder}
//           aria-expanded={isOpen}
//           aria-autocomplete="list"
//         />
//         {selectedEmployee && (
//           <button
//             type="button"
//             onClick={onClear}
//             aria-label="Clear selection"
//             style={{
//               position: "absolute",
//               right: 10,
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               width: 20,
//               height: 20,
//               borderRadius: "50%",
//               background: "none",
//               border: "none",
//               color: "#9ca3af",
//               cursor: "pointer",
//             }}
//           >
//             <IconClose />
//           </button>
//         )}
//       </div>

//       {/* Loading / empty state */}
//       {isOpen && !selectedEmployee && query.trim() && (isLoading || results.length === 0) && (
//         <div
//           style={{
//             position: "absolute",
//             top: "calc(100% + 4px)",
//             left: 0,
//             right: 0,
//             background: "#fff",
//             border: "1.5px solid #e5e7eb",
//             borderRadius: 10,
//             boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
//             zIndex: 20,
//             padding: "0.75rem 1rem",
//             fontSize: "0.8125rem",
//             color: "#9ca3af",
//             textAlign: "center",
//           }}
//         >
//           {isLoading ? "Searching…" : "No employees found."}
//         </div>
//       )}

//       {/* Dropdown */}
//       {isOpen && !selectedEmployee && !isLoading && results.length > 0 && (
//         <ul
//           role="listbox"
//           style={{
//             position: "absolute",
//             top: "calc(100% + 4px)",
//             left: 0,
//             right: 0,
//             background: "#fff",
//             border: "1.5px solid #e5e7eb",
//             borderRadius: 10,
//             boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
//             listStyle: "none",
//             zIndex: 20,
//             maxHeight: 260,
//             overflowY: "auto",
//             padding: 0,
//             margin: 0,
//           }}
//         >
//           {results.map((emp, i) => (
//             <li
//               key={emp.id}
//               role="option"
//               style={{ borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}
//             >
//               <EmployeeRow employee={emp} onClick={() => handleSelect(emp)} />
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }

// // ─── BookingTypeSelector ──────────────────────────────────────────────────────

// interface BookingTypeSelectorProps {
//   selected: BookingType;
//   onChange: (type: BookingType) => void;
// }

// export function BookingTypeSelector({ selected, onChange }: BookingTypeSelectorProps) {
//   const { can } = usePermissions();

//   const options = [
//     { type: "internal" as BookingType, label: "Internal Employee", sub: "Book a seat for an employee in your organization", Icon: IconUser },
//     { type: "visitor" as BookingType, label: "Visitor / Guest", sub: "Book a seat for a visitor or guest", Icon: IconBadge },
//   ].filter(({ type }) =>
//     type === "internal" ? can("booking:book_for_employee") : can("booking:book_for_guest")
//   );

//   return (
//     <div>
//       <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#111827", marginBottom: "0.875rem" }}>
//         Who are you booking for?
//       </p>
//       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
//         {options.map(({ type, label, sub, Icon }) => {
//           const active = selected === type;
//           return (
//             <button
//               key={type}
//               type="button"
//               onClick={() => onChange(type)}
//               aria-pressed={active}
//               style={{
//                 display: "flex",
//                 alignItems: "flex-start",
//                 gap: "0.75rem",
//                 padding: "1rem",
//                 border: `1.5px solid ${active ? "#4f46e5" : "#e5e7eb"}`,
//                 borderRadius: 10,
//                 background: active ? "#eef2ff" : "#fff",
//                 textAlign: "left",
//                 cursor: "pointer",
//                 transition: "border-color 0.15s, background 0.15s",
//                 width: "100%",
//               }}
//             >
//               <span style={{ color: active ? "#4f46e5" : "#9ca3af", marginTop: 1, flexShrink: 0 }}>
//                 <Icon />
//               </span>
//               <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
//                 <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{label}</span>
//                 <span style={{ fontSize: "0.75rem", color: "#6b7280", lineHeight: 1.4 }}>{sub}</span>
//               </span>
//               <span style={{ flexShrink: 0, marginTop: 2 }}>
//                 <span style={{
//                   display: "block",
//                   width: 16,
//                   height: 16,
//                   borderRadius: "50%",
//                   border: `2px solid ${active ? "#4f46e5" : "#d1d5db"}`,
//                   background: active ? "radial-gradient(circle, #4f46e5 45%, transparent 46%)" : "transparent",
//                 }} />
//               </span>
//             </button>
//           );
//         })}
//       </div>
//     </div>
//   );
// }

// // ─── InternalEmployeeForm ─────────────────────────────────────────────────────

// interface InternalEmployeeFormProps {
//   selectedEmployee: Employee | null;
//   onSelect: (emp: Employee) => void;
//   onClear: () => void;
// }

// export function InternalEmployeeForm({ selectedEmployee, onSelect, onClear }: InternalEmployeeFormProps) {
//   return (
//     <div>
//       <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Employee Details</h2>
//       <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 4, marginBottom: "1.25rem" }}>
//         Search and select the employee for whom you want to book a seat.
//       </p>

//       {/* Search */}
//       <div style={{ marginBottom: "0.875rem" }}>
//         <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#111827", display: "block", marginBottom: 6 }}>
//           Search Employee <span style={{ color: "#dc2626" }}>*</span>
//         </label>
//         <EmployeeSearch
//           placeholder="Search by name, email or employee ID"
//           selectedEmployee={selectedEmployee}
//           onSelect={onSelect}
//           onClear={onClear}
//         />
//       </div>

//       {/* Empty state (no selection yet) */}
//       {!selectedEmployee && (
//         <p style={{ fontSize: "0.8125rem", color: "#9ca3af", textAlign: "center", padding: "1.5rem 0" }}>
//           Search above to find an employee.
//         </p>
//       )}

//       {/* Selected employee detail card */}
//       {selectedEmployee && (
//         <div style={{ marginTop: "0.75rem" }}>
//           <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#111827", marginBottom: "0.625rem" }}>
//             Selected Employee
//           </p>
//           <div style={{
//             display: "flex",
//             gap: "1rem",
//             padding: "1rem",
//             background: "#f9fafb",
//             border: "1.5px solid #e5e7eb",
//             borderRadius: 10,
//           }}>
//             <Avatar name={selectedEmployee.name} size="md" />
//             <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: "2rem", rowGap: "0.375rem", flex: 1 }}>
//               {[
//                 ["Name", selectedEmployee.name],
//                 ["Employee ID", selectedEmployee.employeeId ?? "—"],
//                 ["Department", selectedEmployee.department ?? "—"],
//                 // ["Email", selectedEmployee.email],
//                 // ["Role", selectedEmployee.role],
//               ].map(([label, value]) => (
//                 <div key={label} style={{ display: "contents" }}>
//                   <dt style={{ fontSize: "0.8125rem", color: "#6b7280" }}>{label}</dt>
//                   <dd style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#111827" }}>{value}</dd>
//                 </div>
//               ))}
//             </dl>
//           </div>
//           <button
//             type="button"
//             onClick={onClear}
//             style={{
//               display: "inline-flex",
//               alignItems: "center",
//               gap: 6,
//               marginTop: "0.625rem",
//               fontSize: "0.8125rem",
//               fontWeight: 500,
//               color: "#4f46e5",
//               background: "none",
//               border: "none",
//               cursor: "pointer",
//               padding: "2px 0",
//             }}
//           >
//             <IconEdit /> Change Employee
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Shared field helpers ───────────────────────────────────────────────────

// export function inputStyle(focused?: boolean): React.CSSProperties {
//   return {
//     width: "100%",
//     height: 40,
//     padding: "0 0.75rem",
//     border: `1.5px solid ${focused ? "#4f46e5" : "#e5e7eb"}`,
//     borderRadius: 8,
//     fontSize: "0.875rem",
//     color: "#111827",
//     outline: "none",
//     background: "#fff",
//     fontFamily: "inherit",
//     boxShadow: focused ? "0 0 0 3px rgba(79,70,229,0.1)" : "none",
//   };
// }

// export function FieldLabel({ children, htmlFor, required }: { children: React.ReactNode; htmlFor?: string; required?: boolean }) {
//   return (
//     <label htmlFor={htmlFor} style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#111827", display: "block", marginBottom: 6 }}>
//       {children} {required && <span style={{ color: "#dc2626" }}>*</span>}
//     </label>
//   );
// }

// // ─── FormFooter ───────────────────────────────────────────────────────────────

// interface FormFooterProps {
//   onCancel: () => void;
//   onSubmit: () => void;
//   onBack?: () => void;
//   submitLabel?: string;
//   submitDisabled?: boolean;
//   infoText?: string;
// }

// export function FormFooter({ onCancel, onSubmit, onBack, submitLabel = "Book a Seat", submitDisabled, infoText }: FormFooterProps) {
//   return (
//     <div style={{ marginTop: "2rem" }}>
//       {/* Info banner */}
//       {infoText && (
//         <div style={{
//           display: "flex",
//           gap: "0.625rem",
//           padding: "0.875rem 1rem",
//           background: "#eff6ff",
//           border: "1px solid #bfdbfe",
//           borderRadius: 8,
//           marginBottom: "1rem",
//           alignItems: "flex-start",
//         }}>
//           <span style={{ color: "#3b82f6", flexShrink: 0, marginTop: 1, display: "flex" }}><IconInfo /></span>
//           <p style={{ fontSize: "0.8125rem", color: "#1e40af", lineHeight: 1.5 }}>
//             {infoText}
//           </p>
//         </div>
//       )}

//       {/* Actions */}
//       <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
//         {onBack ? (
//           <button
//             type="button"
//             onClick={onBack}
//             style={{
//               height: 40,
//               padding: "0 1.25rem",
//               borderRadius: 8,
//               border: "1.5px solid #e5e7eb",
//               background: "#fff",
//               fontSize: "0.875rem",
//               fontWeight: 600,
//               color: "#111827",
//               cursor: "pointer",
//               fontFamily: "inherit",
//             }}
//           >
//             Back
//           </button>
//         ) : <span />}

//         <div style={{ display: "flex", gap: "0.75rem" }}>
//           {/* <button
//             type="button"
//             onClick={onCancel}
//             style={{
//               height: 40,
//               padding: "0 1.25rem",
//               borderRadius: 8,
//               border: "1.5px solid #e5e7eb",
//               background: "#fff",
//               fontSize: "0.875rem",
//               fontWeight: 600,
//               color: "#111827",
//               cursor: "pointer",
//               fontFamily: "inherit",
//             }}
//           >
//             Cancel
//           </button> */}
//           <button
//             type="button"
//             onClick={onSubmit}
//             disabled={submitDisabled}
//             style={{
//               height: 40,
//               padding: "0 1.25rem",
//               borderRadius: 8,
//               border: "1.5px solid #4f46e5",
//               background: submitDisabled ? "#a5b4fc" : "#4f46e5",
//               fontSize: "0.875rem",
//               fontWeight: 600,
//               color: "#fff",
//               cursor: submitDisabled ? "not-allowed" : "pointer",
//               display: "inline-flex",
//               alignItems: "center",
//               gap: "0.5rem",
//               fontFamily: "inherit",
//             }}
//           >
//             {submitLabel} <IconArrowRight />
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }


"use client";

import { useEmployeeSearch } from "../hooks/useBooking";
import { getInitials } from "../utils/booking.utils";
import { BookingType, Employee } from "../types/booking";
import { usePermissions } from "@/features/dashboard/hooks/usePermissions";


// ─── Icons ────────────────────────────────────────────────────────────────────

export function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconBadge() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconClose() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconArrowRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconInfo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  name: string;
  size?: "sm" | "md";
}

export function Avatar({ name, size = "sm" }: AvatarProps) {
  const dim = size === "md" ? 44 : 36;
  return (
    <span
      style={{
        width: dim,
        height: dim,
        borderRadius: "50%",
        background: "#eef2ff",
        color: "#4f46e5",
        fontSize: size === "md" ? "0.875rem" : "0.75rem",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const isActive = status.toUpperCase() === "ACTIVE";
  return (
    <span
      style={{
        fontSize: "0.6875rem",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 20,
        background: isActive ? "#dcfce7" : "#f3f4f6",
        color: isActive ? "#16a34a" : "#6b7280",
        textTransform: "capitalize",
      }}
    >
      {status.toLowerCase()}
    </span>
  );
}

// ─── EmployeeRow ──────────────────────────────────────────────────────────────

interface EmployeeRowProps {
  employee: Employee;
  onClick?: () => void;
  showChevron?: boolean;
}

export function EmployeeRow({ employee, onClick, showChevron = true }: EmployeeRowProps) {
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
        background: "none",
        border: "none",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.12s",
        borderRadius: 8,
      }}
      onMouseEnter={(e) => { if (onClick) (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
    >
      <Avatar name={employee.name} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{employee.name}</span>
          <StatusBadge status={employee.status} />
        </span>
        <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
          {[employee.employeeId, employee.department].filter(Boolean).join(" · ") || employee.role}
        </span>
        <span style={{ fontSize: "0.75rem", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {employee.email}
        </span>
      </span>
      {showChevron && <span style={{ color: "#9ca3af", display: "flex" }}><IconChevronRight /></span>}
    </button>
  );
}

// ─── EmployeeSearch ───────────────────────────────────────────────────────────

interface EmployeeSearchProps {
  placeholder: string;
  selectedEmployee: Employee | null;
  onSelect: (emp: Employee) => void;
  onClear: () => void;
  excludeId?: string; // 👈 added
}

export function EmployeeSearch({ placeholder, selectedEmployee, onSelect, onClear, excludeId }: EmployeeSearchProps) {
  const { query, results, isOpen, isLoading, containerRef, handleQueryChange, handleSelect, openDropdown } =
    useEmployeeSearch(onSelect, excludeId); // 👈 passed

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Input */}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <span style={{ position: "absolute", left: 11, color: "#9ca3af", display: "flex", pointerEvents: "none" }}>
          <IconSearch />
        </span>
        <input
          type="text"
          placeholder={placeholder}
          value={selectedEmployee ? selectedEmployee.name : query}
          onChange={(e) => { if (!selectedEmployee) handleQueryChange(e.target.value); }}
          onFocus={() => { if (!selectedEmployee) openDropdown(); }}
          readOnly={!!selectedEmployee}
          style={{
            width: "100%",
            height: 40,
            paddingLeft: 34,
            paddingRight: selectedEmployee ? 34 : 12,
            border: "1.5px solid #e5e7eb",
            borderRadius: 8,
            fontSize: "0.875rem",
            color: "#111827",
            outline: "none",
            background: "#fff",
            fontFamily: "inherit",
            cursor: selectedEmployee ? "default" : "text",
          }}
          onFocusCapture={(e) => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.1)"; }}
          onBlurCapture={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
          aria-label={placeholder}
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />
        {selectedEmployee && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
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

      {/* Loading / empty state */}
      {isOpen && !selectedEmployee && query.trim() && (isLoading || results.length === 0) && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            zIndex: 20,
            padding: "0.75rem 1rem",
            fontSize: "0.8125rem",
            color: "#9ca3af",
            textAlign: "center",
          }}
        >
          {isLoading ? "Searching…" : "No employees found."}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && !selectedEmployee && !isLoading && results.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1.5px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            listStyle: "none",
            zIndex: 20,
            maxHeight: 260,
            overflowY: "auto",
            padding: 0,
            margin: 0,
          }}
        >
          {results.map((emp, i) => (
            <li
              key={emp.id}
              role="option"
              style={{ borderTop: i > 0 ? "1px solid #f3f4f6" : "none" }}
            >
              <EmployeeRow employee={emp} onClick={() => handleSelect(emp)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── BookingTypeSelector ──────────────────────────────────────────────────────

interface BookingTypeSelectorProps {
  selected: BookingType;
  onChange: (type: BookingType) => void;
}

export function BookingTypeSelector({ selected, onChange }: BookingTypeSelectorProps) {
  const { can } = usePermissions();

  const options = [
    { type: "internal" as BookingType, label: "Internal Employee", sub: "Book a seat for an employee in your organization", Icon: IconUser },
    { type: "visitor" as BookingType, label: "Visitor / Guest", sub: "Book a seat for a visitor or guest", Icon: IconBadge },
  ].filter(({ type }) =>
    type === "internal" ? can("booking:book_for_employee") : can("booking:book_for_guest")
  );

  return (
    <div>
      <p style={{ fontSize: "0.9375rem", fontWeight: 600, color: "#111827", marginBottom: "0.875rem" }}>
        Who are you booking for?
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {options.map(({ type, label, sub, Icon }) => {
          const active = selected === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              aria-pressed={active}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "1rem",
                border: `1.5px solid ${active ? "#4f46e5" : "#e5e7eb"}`,
                borderRadius: 10,
                background: active ? "#eef2ff" : "#fff",
                textAlign: "left",
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
                width: "100%",
              }}
            >
              <span style={{ color: active ? "#4f46e5" : "#9ca3af", marginTop: 1, flexShrink: 0 }}>
                <Icon />
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111827" }}>{label}</span>
                <span style={{ fontSize: "0.75rem", color: "#6b7280", lineHeight: 1.4 }}>{sub}</span>
              </span>
              <span style={{ flexShrink: 0, marginTop: 2 }}>
                <span style={{
                  display: "block",
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: `2px solid ${active ? "#4f46e5" : "#d1d5db"}`,
                  background: active ? "radial-gradient(circle, #4f46e5 45%, transparent 46%)" : "transparent",
                }} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── InternalEmployeeForm ─────────────────────────────────────────────────────

interface InternalEmployeeFormProps {
  selectedEmployee: Employee | null;
  onSelect: (emp: Employee) => void;
  onClear: () => void;
  excludeId?: string; // 👈 added
}

export function InternalEmployeeForm({ selectedEmployee, onSelect, onClear, excludeId }: InternalEmployeeFormProps) {
  return (
    <div>
      <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>Employee Details</h2>
      <p style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: 4, marginBottom: "1.25rem" }}>
        Search and select the employee for whom you want to book a seat.
      </p>

      {/* Search */}
      <div style={{ marginBottom: "0.875rem" }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#111827", display: "block", marginBottom: 6 }}>
          Search Employee <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <EmployeeSearch
          placeholder="Search by name, email or employee ID"
          selectedEmployee={selectedEmployee}
          onSelect={onSelect}
          onClear={onClear}
          excludeId={excludeId} // 👈 passed down
        />
      </div>

      {/* Empty state (no selection yet) */}
      {!selectedEmployee && (
        <p style={{ fontSize: "0.8125rem", color: "#9ca3af", textAlign: "center", padding: "1.5rem 0" }}>
          Search above to find an employee.
        </p>
      )}

      {/* Selected employee detail card */}
      {selectedEmployee && (
        <div style={{ marginTop: "0.75rem" }}>
          <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#111827", marginBottom: "0.625rem" }}>
            Selected Employee
          </p>
          <div style={{
            display: "flex",
            gap: "1rem",
            padding: "1rem",
            background: "#f9fafb",
            border: "1.5px solid #e5e7eb",
            borderRadius: 10,
          }}>
            <Avatar name={selectedEmployee.name} size="md" />
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: "2rem", rowGap: "0.375rem", flex: 1 }}>
              {[
                ["Name", selectedEmployee.name],
                ["Employee ID", selectedEmployee.employeeId ?? "—"],
                ["Department", selectedEmployee.department ?? "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "contents" }}>
                  <dt style={{ fontSize: "0.8125rem", color: "#6b7280" }}>{label}</dt>
                  <dd style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#111827" }}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <button
            type="button"
            onClick={onClear}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: "0.625rem",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "#4f46e5",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 0",
            }}
          >
            <IconEdit /> Change Employee
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Shared field helpers ───────────────────────────────────────────────────

export function inputStyle(focused?: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 40,
    padding: "0 0.75rem",
    border: `1.5px solid ${focused ? "#4f46e5" : "#e5e7eb"}`,
    borderRadius: 8,
    fontSize: "0.875rem",
    color: "#111827",
    outline: "none",
    background: "#fff",
    fontFamily: "inherit",
    boxShadow: focused ? "0 0 0 3px rgba(79,70,229,0.1)" : "none",
  };
}

export function FieldLabel({ children, htmlFor, required }: { children: React.ReactNode; htmlFor?: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#111827", display: "block", marginBottom: 6 }}>
      {children} {required && <span style={{ color: "#dc2626" }}>*</span>}
    </label>
  );
}

// ─── FormFooter ───────────────────────────────────────────────────────────────

interface FormFooterProps {
  onCancel: () => void;
  onSubmit: () => void;
  onBack?: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  infoText?: string;
}

export function FormFooter({ onCancel, onSubmit, onBack, submitLabel = "Book a Seat", submitDisabled, infoText }: FormFooterProps) {
  return (
    <div style={{ marginTop: "2rem" }}>
      {/* Info banner */}
      {infoText && (
        <div style={{
          display: "flex",
          gap: "0.625rem",
          padding: "0.875rem 1rem",
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 8,
          marginBottom: "1rem",
          alignItems: "flex-start",
        }}>
          <span style={{ color: "#3b82f6", flexShrink: 0, marginTop: 1, display: "flex" }}><IconInfo /></span>
          <p style={{ fontSize: "0.8125rem", color: "#1e40af", lineHeight: 1.5 }}>
            {infoText}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
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
            Back
          </button>
        ) : <span />}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled}
            style={{
              height: 40,
              padding: "0 1.25rem",
              borderRadius: 8,
              border: "1.5px solid #4f46e5",
              background: submitDisabled ? "#a5b4fc" : "#4f46e5",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#fff",
              cursor: submitDisabled ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "inherit",
            }}
          >
            {submitLabel} <IconArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}