// // // // // // // // "use client";

// // // // // // // // import React, { useState } from "react";
// // // // // // // // import { Booking, BookingTab } from "../types/bookings.types";
// // // // // // // // import { useBookings } from "../hooks/useBookings";
// // // // // // // // import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// // // // // // // // import { useAuthContext } from "@/features/auth/context/AuthContext";
// // // // // // // // import { SidebarProvider } from "@/components/ui/sidebar";
// // // // // // // // import { cn } from "@/lib/utils";
// // // // // // // // import { cancelBooking, modifyBooking, type ModifyBookingPayload } from "../services/bookings.service";

// // // // // // // // // shadcn components
// // // // // // // // import {
// // // // // // // //   AlertDialog,
// // // // // // // //   AlertDialogAction,
// // // // // // // //   AlertDialogCancel,
// // // // // // // //   AlertDialogContent,
// // // // // // // //   AlertDialogDescription,
// // // // // // // //   AlertDialogFooter,
// // // // // // // //   AlertDialogHeader,
// // // // // // // //   AlertDialogTitle,
// // // // // // // // } from "@/components/ui/alert-dialog";
// // // // // // // // import {
// // // // // // // //   Dialog,
// // // // // // // //   DialogContent,
// // // // // // // //   DialogDescription,
// // // // // // // //   DialogFooter,
// // // // // // // //   DialogHeader,
// // // // // // // //   DialogTitle,
// // // // // // // // } from "@/components/ui/dialog";
// // // // // // // // import { Button } from "@/components/ui/button";
// // // // // // // // import { Input } from "@/components/ui/input";
// // // // // // // // import { Label } from "@/components/ui/label";
// // // // // // // // import { Textarea } from "@/components/ui/textarea";

// // // // // // // // // ── Helpers ───────────────────────────────────────────────────────────────────

// // // // // // // // function formatDate(iso: string): string {
// // // // // // // //   const d = new Date(iso + "T00:00:00");
// // // // // // // //   return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
// // // // // // // // }

// // // // // // // // function isUpcoming(isoDate: string): boolean {
// // // // // // // //   const today = new Date();
// // // // // // // //   today.setHours(0, 0, 0, 0);
// // // // // // // //   return new Date(isoDate + "T00:00:00") >= today;
// // // // // // // // }

// // // // // // // // /** Sort bookings: ascending by date (tomorrow first → further future), then past descending */
// // // // // // // // function sortByDate(bookings: Booking[], ascending = true): Booking[] {
// // // // // // // //   return [...bookings].sort((a, b) => {
// // // // // // // //     const da = new Date(a.date + "T00:00:00").getTime();
// // // // // // // //     const db = new Date(b.date + "T00:00:00").getTime();
// // // // // // // //     return ascending ? da - db : db - da;
// // // // // // // //   });
// // // // // // // // }

// // // // // // // // // ── Tag chip ──────────────────────────────────────────────────────────────────

// // // // // // // // interface TagProps { label: string; variant: string; }

// // // // // // // // const TAG_STYLES: Record<string, string> = {
// // // // // // // //   confirmed: "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]",
// // // // // // // //   manager:   "bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]",
// // // // // // // //   zone:      "bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]",
// // // // // // // //   sprint:    "bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]",
// // // // // // // //   recurring: "bg-[#E8EAF6] text-[#283593] border border-[#9FA8DA]",
// // // // // // // // };

// // // // // // // // const BookingTagChip: React.FC<TagProps> = ({ label, variant }) => (
// // // // // // // //   <span className={cn(
// // // // // // // //     "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
// // // // // // // //     TAG_STYLES[variant] ?? TAG_STYLES.zone
// // // // // // // //   )}>
// // // // // // // //     {label}
// // // // // // // //   </span>
// // // // // // // // );

// // // // // // // // // ── Cancel Dialog ─────────────────────────────────────────────────────────────

// // // // // // // // interface CancelDialogProps {
// // // // // // // //   open: boolean;
// // // // // // // //   booking: Booking | null;
// // // // // // // //   onConfirm: (reason: string) => Promise<void>;
// // // // // // // //   onClose: () => void;
// // // // // // // // }

// // // // // // // // const CancelDialog: React.FC<CancelDialogProps> = ({ open, booking, onConfirm, onClose }) => {
// // // // // // // //   const [reason, setReason] = useState("");
// // // // // // // //   const [loading, setLoading] = useState(false);

// // // // // // // //   const handleConfirm = async () => {
// // // // // // // //     setLoading(true);
// // // // // // // //     try {
// // // // // // // //       await onConfirm(reason);
// // // // // // // //       setReason("");
// // // // // // // //     } finally {
// // // // // // // //       setLoading(false);
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   const handleOpenChange = (val: boolean) => {
// // // // // // // //     if (!val) { setReason(""); onClose(); }
// // // // // // // //   };

// // // // // // // //   return (
// // // // // // // //     <AlertDialog open={open} onOpenChange={handleOpenChange}>
// // // // // // // //       <AlertDialogContent className="max-w-md">
// // // // // // // //         <AlertDialogHeader>
// // // // // // // //           <AlertDialogTitle className="text-[#1A1A2E]">Cancel Booking</AlertDialogTitle>
// // // // // // // //           <AlertDialogDescription className="text-gray-500 text-[13px]">
// // // // // // // //             {booking && (
// // // // // // // //               <span>
// // // // // // // //                 Are you sure you want to cancel your booking at{" "}
// // // // // // // //                 <strong className="text-gray-700">
// // // // // // // //                   {booking.location} · {booking.floor} · Seat {booking.seat}
// // // // // // // //                 </strong>{" "}
// // // // // // // //                 on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
// // // // // // // //                 This action cannot be undone.
// // // // // // // //               </span>
// // // // // // // //             )}
// // // // // // // //           </AlertDialogDescription>
// // // // // // // //         </AlertDialogHeader>

// // // // // // // //         <div className="py-2">
// // // // // // // //           <Label htmlFor="cancel-reason" className="text-[12.5px] font-medium text-gray-600 mb-1.5 block">
// // // // // // // //             Reason for cancellation <span className="text-gray-400 font-normal">(optional)</span>
// // // // // // // //           </Label>
// // // // // // // //           <Textarea
// // // // // // // //             id="cancel-reason"
// // // // // // // //             placeholder="e.g. Working from home, schedule change…"
// // // // // // // //             value={reason}
// // // // // // // //             onChange={(e) => setReason(e.target.value)}
// // // // // // // //             className="text-[13px] resize-none h-20"
// // // // // // // //           />
// // // // // // // //         </div>

// // // // // // // //         <AlertDialogFooter>
// // // // // // // //           <AlertDialogCancel
// // // // // // // //             onClick={() => { setReason(""); onClose(); }}
// // // // // // // //             className="text-[12.5px]"
// // // // // // // //           >
// // // // // // // //             Keep Booking
// // // // // // // //           </AlertDialogCancel>
// // // // // // // //           <AlertDialogAction
// // // // // // // //             onClick={handleConfirm}
// // // // // // // //             disabled={loading}
// // // // // // // //             className="bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50"
// // // // // // // //           >
// // // // // // // //             {loading ? "Cancelling…" : "Yes, Cancel"}
// // // // // // // //           </AlertDialogAction>
// // // // // // // //         </AlertDialogFooter>
// // // // // // // //       </AlertDialogContent>
// // // // // // // //     </AlertDialog>
// // // // // // // //   );
// // // // // // // // };

// // // // // // // // // ── Modify Dialog ─────────────────────────────────────────────────────────────

// // // // // // // // interface ModifyForm {
// // // // // // // //   booking_date: string;
// // // // // // // //   site_id: string;
// // // // // // // //   building_id: string;
// // // // // // // //   floor_id: string;
// // // // // // // //   seat_id: string;
// // // // // // // // }

// // // // // // // // interface ModifyDialogProps {
// // // // // // // //   open: boolean;
// // // // // // // //   booking: Booking | null;
// // // // // // // //   onConfirm: (form: ModifyForm) => Promise<void>;
// // // // // // // //   onClose: () => void;
// // // // // // // // }

// // // // // // // // const ModifyDialog: React.FC<ModifyDialogProps> = ({ open, booking, onConfirm, onClose }) => {
// // // // // // // //   const [form, setForm] = useState<ModifyForm>({
// // // // // // // //     booking_date: booking?.date ?? "",
// // // // // // // //     site_id: "",
// // // // // // // //     building_id: "",
// // // // // // // //     floor_id: "",
// // // // // // // //     seat_id: "",
// // // // // // // //   });
// // // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // // //   const [error, setError] = useState<string | null>(null);

// // // // // // // //   // Reset when booking changes
// // // // // // // //   React.useEffect(() => {
// // // // // // // //     if (booking) {
// // // // // // // //       setForm({
// // // // // // // //         booking_date: booking.date,
// // // // // // // //         site_id: "",
// // // // // // // //         building_id: "",
// // // // // // // //         floor_id: "",
// // // // // // // //         seat_id: "",
// // // // // // // //       });
// // // // // // // //       setError(null);
// // // // // // // //     }
// // // // // // // //   }, [booking]);

// // // // // // // //   const handleChange = (field: keyof ModifyForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
// // // // // // // //     setForm((prev) => ({ ...prev, [field]: e.target.value }));
// // // // // // // //     setError(null);
// // // // // // // //   };

// // // // // // // //   const handleSubmit = async () => {
// // // // // // // //     const { booking_date, site_id, building_id, floor_id, seat_id } = form;
// // // // // // // //     if (!booking_date || !site_id || !building_id || !floor_id || !seat_id) {
// // // // // // // //       setError("Please fill in all fields.");
// // // // // // // //       return;
// // // // // // // //     }
// // // // // // // //     setLoading(true);
// // // // // // // //     try {
// // // // // // // //       await onConfirm(form);
// // // // // // // //       onClose();
// // // // // // // //     } catch (err: any) {
// // // // // // // //       setError(err?.response?.data?.detail?.message ?? "Failed to modify booking. Please try again.");
// // // // // // // //     } finally {
// // // // // // // //       setLoading(false);
// // // // // // // //     }
// // // // // // // //   };

// // // // // // // //   return (
// // // // // // // //     <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
// // // // // // // //       <DialogContent className="max-w-md">
// // // // // // // //         <DialogHeader>
// // // // // // // //           <DialogTitle className="text-[#1A1A2E]">Modify Booking</DialogTitle>
// // // // // // // //           <DialogDescription className="text-[13px] text-gray-500">
// // // // // // // //             {booking && (
// // // // // // // //               <>
// // // // // // // //                 Currently:{" "}
// // // // // // // //                 <strong className="text-gray-700">
// // // // // // // //                   {booking.location} · {booking.floor} · Seat {booking.seat}
// // // // // // // //                 </strong>{" "}
// // // // // // // //                 on <strong className="text-gray-700">{formatDate(booking.date)}</strong>.
// // // // // // // //                 Update any field below.
// // // // // // // //               </>
// // // // // // // //             )}
// // // // // // // //           </DialogDescription>
// // // // // // // //         </DialogHeader>

// // // // // // // //         <div className="grid gap-4 py-2">
// // // // // // // //           {/* Date */}
// // // // // // // //           <div className="grid gap-1.5">
// // // // // // // //             <Label htmlFor="mod-date" className="text-[12.5px] font-medium text-gray-700">
// // // // // // // //               New Date <span className="text-red-400">*</span>
// // // // // // // //             </Label>
// // // // // // // //             <Input
// // // // // // // //               id="mod-date"
// // // // // // // //               type="date"
// // // // // // // //               value={form.booking_date}
// // // // // // // //               onChange={handleChange("booking_date")}
// // // // // // // //               className="text-[13px]"
// // // // // // // //               min={new Date().toISOString().split("T")[0]}
// // // // // // // //             />
// // // // // // // //           </div>

// // // // // // // //           {/* IDs row */}
// // // // // // // //           <div className="grid grid-cols-2 gap-3">
// // // // // // // //             <div className="grid gap-1.5">
// // // // // // // //               <Label htmlFor="mod-site" className="text-[12.5px] font-medium text-gray-700">
// // // // // // // //                 Site ID <span className="text-red-400">*</span>
// // // // // // // //               </Label>
// // // // // // // //               <Input
// // // // // // // //                 id="mod-site"
// // // // // // // //                 type="number"
// // // // // // // //                 placeholder="e.g. 1"
// // // // // // // //                 value={form.site_id}
// // // // // // // //                 onChange={handleChange("site_id")}
// // // // // // // //                 className="text-[13px]"
// // // // // // // //                 min={1}
// // // // // // // //               />
// // // // // // // //             </div>
// // // // // // // //             <div className="grid gap-1.5">
// // // // // // // //               <Label htmlFor="mod-building" className="text-[12.5px] font-medium text-gray-700">
// // // // // // // //                 Building ID <span className="text-red-400">*</span>
// // // // // // // //               </Label>
// // // // // // // //               <Input
// // // // // // // //                 id="mod-building"
// // // // // // // //                 type="number"
// // // // // // // //                 placeholder="e.g. 2"
// // // // // // // //                 value={form.building_id}
// // // // // // // //                 onChange={handleChange("building_id")}
// // // // // // // //                 className="text-[13px]"
// // // // // // // //                 min={1}
// // // // // // // //               />
// // // // // // // //             </div>
// // // // // // // //           </div>

// // // // // // // //           <div className="grid grid-cols-2 gap-3">
// // // // // // // //             <div className="grid gap-1.5">
// // // // // // // //               <Label htmlFor="mod-floor" className="text-[12.5px] font-medium text-gray-700">
// // // // // // // //                 Floor ID <span className="text-red-400">*</span>
// // // // // // // //               </Label>
// // // // // // // //               <Input
// // // // // // // //                 id="mod-floor"
// // // // // // // //                 type="number"
// // // // // // // //                 placeholder="e.g. 3"
// // // // // // // //                 value={form.floor_id}
// // // // // // // //                 onChange={handleChange("floor_id")}
// // // // // // // //                 className="text-[13px]"
// // // // // // // //                 min={1}
// // // // // // // //               />
// // // // // // // //             </div>
// // // // // // // //             <div className="grid gap-1.5">
// // // // // // // //               <Label htmlFor="mod-seat" className="text-[12.5px] font-medium text-gray-700">
// // // // // // // //                 Seat ID <span className="text-red-400">*</span>
// // // // // // // //               </Label>
// // // // // // // //               <Input
// // // // // // // //                 id="mod-seat"
// // // // // // // //                 type="number"
// // // // // // // //                 placeholder="e.g. 42"
// // // // // // // //                 value={form.seat_id}
// // // // // // // //                 onChange={handleChange("seat_id")}
// // // // // // // //                 className="text-[13px]"
// // // // // // // //                 min={1}
// // // // // // // //               />
// // // // // // // //             </div>
// // // // // // // //           </div>

// // // // // // // //           {error && (
// // // // // // // //             <p className="text-red-500 text-[12px] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
// // // // // // // //               {error}
// // // // // // // //             </p>
// // // // // // // //           )}
// // // // // // // //         </div>

// // // // // // // //         <DialogFooter className="gap-2">
// // // // // // // //           <Button
// // // // // // // //             variant="outline"
// // // // // // // //             onClick={onClose}
// // // // // // // //             disabled={loading}
// // // // // // // //             className="text-[12.5px]"
// // // // // // // //           >
// // // // // // // //             Cancel
// // // // // // // //           </Button>
// // // // // // // //           <Button
// // // // // // // //             onClick={handleSubmit}
// // // // // // // //             disabled={loading}
// // // // // // // //             className="bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px]"
// // // // // // // //           >
// // // // // // // //             {loading ? "Saving…" : "Save Changes"}
// // // // // // // //           </Button>
// // // // // // // //         </DialogFooter>
// // // // // // // //       </DialogContent>
// // // // // // // //     </Dialog>
// // // // // // // //   );
// // // // // // // // };

// // // // // // // // // ── Booking card ──────────────────────────────────────────────────────────────

// // // // // // // // interface BookingCardProps {
// // // // // // // //   booking: Booking;
// // // // // // // //   onCancelClick: (booking: Booking) => void;
// // // // // // // //   onModifyClick: (booking: Booking) => void;
// // // // // // // //   showActions?: boolean;
// // // // // // // // }

// // // // // // // // const BookingCard: React.FC<BookingCardProps> = ({
// // // // // // // //   booking,
// // // // // // // //   onCancelClick,
// // // // // // // //   onModifyClick,
// // // // // // // //   showActions = true,
// // // // // // // // }) => {
// // // // // // // //   const isCancelled = booking.status === "cancelled";

// // // // // // // //   return (
// // // // // // // //     <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col hover:shadow-sm transition-shadow duration-200">
// // // // // // // //       <div className="flex items-stretch">
// // // // // // // //         {/* Left accent bar */}
// // // // // // // //         <div className={cn(
// // // // // // // //           "w-[3px] shrink-0",
// // // // // // // //           isCancelled             ? "bg-gray-200"  :
// // // // // // // //           booking.status === "pending" ? "bg-amber-400" : "bg-indigo-500"
// // // // // // // //         )} />

// // // // // // // //         <div className="flex-1 px-5 py-4">
// // // // // // // //           {/* Row 1: title + booked-on */}
// // // // // // // //           <div className="flex justify-between items-start gap-4">
// // // // // // // //             <div>
// // // // // // // //               <p className="text-[13.5px] font-semibold text-[#1A1A2E]">
// // // // // // // //                 {booking.location} · {booking.floor} · Seat {booking.seat}
// // // // // // // //               </p>
// // // // // // // //               <p className="text-[12px] text-gray-500 mt-0.5">
// // // // // // // //                 {formatDate(booking.date)}
// // // // // // // //                 {" · "}
// // // // // // // //                 {booking.isFullDay
// // // // // // // //                   ? "Full day"
// // // // // // // //                   : `${booking.startTime} – ${booking.endTime}`}
// // // // // // // //                 {booking.isFullDay && (
// // // // // // // //                   <span className="ml-2 text-[11px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
// // // // // // // //                     Full day
// // // // // // // //                   </span>
// // // // // // // //                 )}
// // // // // // // //               </p>
// // // // // // // //             </div>
// // // // // // // //             <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5">
// // // // // // // //               Booked {booking.bookedOn}
// // // // // // // //             </span>
// // // // // // // //           </div>

// // // // // // // //           {/* Row 2: tags */}
// // // // // // // //           <div className="flex gap-1.5 flex-wrap mt-2.5">
// // // // // // // //             {booking.tags.map((tag, i) => (
// // // // // // // //               <BookingTagChip key={i} label={tag.label} variant={tag.variant} />
// // // // // // // //             ))}
// // // // // // // //             {booking.isRecurring && booking.recurringPattern && (
// // // // // // // //               <BookingTagChip label={booking.recurringPattern} variant="recurring" />
// // // // // // // //             )}
// // // // // // // //           </div>
// // // // // // // //         </div>
// // // // // // // //       </div>

// // // // // // // //       {/* Action footer */}
// // // // // // // //       {showActions && !isCancelled && (
// // // // // // // //         <div className="flex justify-end gap-2 px-5 py-2.5 border-t border-gray-100 bg-[#F7F8FC]">
// // // // // // // //           <Button
// // // // // // // //             variant="outline"
// // // // // // // //             size="sm"
// // // // // // // //             className="h-7 px-4 text-[12.5px] text-gray-600"
// // // // // // // //             onClick={() => onModifyClick(booking)}
// // // // // // // //           >
// // // // // // // //             Modify
// // // // // // // //           </Button>
// // // // // // // //           <Button
// // // // // // // //             variant="outline"
// // // // // // // //             size="sm"
// // // // // // // //             className="h-7 px-4 text-[12.5px] border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 hover:border-red-300"
// // // // // // // //             onClick={() => onCancelClick(booking)}
// // // // // // // //           >
// // // // // // // //             Cancel
// // // // // // // //           </Button>
// // // // // // // //         </div>
// // // // // // // //       )}

// // // // // // // //       {showActions && isCancelled && (
// // // // // // // //         <div className="flex justify-end px-5 py-2.5 border-t border-gray-100">
// // // // // // // //           <Button variant="outline" size="sm" className="h-7 px-4 text-[12.5px] text-gray-600">
// // // // // // // //             View details
// // // // // // // //           </Button>
// // // // // // // //         </div>
// // // // // // // //       )}
// // // // // // // //     </div>
// // // // // // // //   );
// // // // // // // // };

// // // // // // // // // ── Stat card ─────────────────────────────────────────────────────────────────

// // // // // // // // interface StatCardProps {
// // // // // // // //   label: string;
// // // // // // // //   value: number | string;
// // // // // // // //   subLabel?: string;
// // // // // // // //   icon: React.ReactNode;
// // // // // // // //   accentClass: string;
// // // // // // // // }

// // // // // // // // const StatCard: React.FC<StatCardProps> = ({ label, value, subLabel, icon, accentClass }) => (
// // // // // // // //   <div className={cn(
// // // // // // // //     "flex-1 bg-white border border-[#EBEBF5] rounded-xl p-4 flex flex-col gap-1 min-w-[160px]",
// // // // // // // //     "border-l-[3px]", accentClass
// // // // // // // //   )}>
// // // // // // // //     <div className="flex justify-between items-center mb-1">
// // // // // // // //       <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
// // // // // // // //         {label}
// // // // // // // //       </span>
// // // // // // // //       <span className="text-gray-400">{icon}</span>
// // // // // // // //     </div>
// // // // // // // //     <div className="text-[26px] font-bold text-[#1A1A2E] leading-none">{value}</div>
// // // // // // // //     {subLabel && (
// // // // // // // //       <div className="text-[11.5px] text-gray-400 mt-1">{subLabel}</div>
// // // // // // // //     )}
// // // // // // // //   </div>
// // // // // // // // );

// // // // // // // // // ── Tabs ──────────────────────────────────────────────────────────────────────

// // // // // // // // const TABS: { id: BookingTab; label: string }[] = [
// // // // // // // //   { id: "upcoming",  label: "Upcoming"  },
// // // // // // // //   { id: "past",      label: "Past"      },
// // // // // // // //   // { id: "recurring", label: "Recurring" },
// // // // // // // //   { id: "cancelled", label: "Cancelled" },
// // // // // // // // ];

// // // // // // // // // ── Icons ─────────────────────────────────────────────────────────────────────

// // // // // // // // const CalIcon = () => (
// // // // // // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// // // // // // // //     <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
// // // // // // // //   </svg>
// // // // // // // // );
// // // // // // // // const CheckIcon = () => (
// // // // // // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
// // // // // // // //     <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
// // // // // // // //   </svg>
// // // // // // // // );
// // // // // // // // const UsersIcon = () => (
// // // // // // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// // // // // // // //     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
// // // // // // // //     <circle cx="9" cy="7" r="4" />
// // // // // // // //     <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
// // // // // // // //     <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
// // // // // // // //   </svg>
// // // // // // // // );
// // // // // // // // const RefreshIcon = () => (
// // // // // // // //   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
// // // // // // // //     <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
// // // // // // // //       strokeLinecap="round" strokeLinejoin="round" />
// // // // // // // //   </svg>
// // // // // // // // );

// // // // // // // // // ── Page ──────────────────────────────────────────────────────────────────────

// // // // // // // // const MyBookingsPage: React.FC = () => {
// // // // // // // //   const {
// // // // // // // //     displayedBookings,
// // // // // // // //     summary,
// // // // // // // //     activeTab,
// // // // // // // //     isLoading,
// // // // // // // //     error,
// // // // // // // //     setActiveTab,
// // // // // // // //     handleCancelBooking,
// // // // // // // //     refreshBookings,
// // // // // // // //   } = useBookings();
// // // // // // // //   const { user } = useAuthContext();

// // // // // // // //   // ── Dialog state ──────────────────────────────────────────────────────────
// // // // // // // //   const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
// // // // // // // //   const [modifyTarget, setModifyTarget] = useState<Booking | null>(null);

// // // // // // // //   // ── Sorted + split bookings ────────────────────────────────────────────────
// // // // // // // //   // Upcoming tab: sort ascending (nearest first); past section: descending (most recent first)
// // // // // // // //   const upcomingCards = sortByDate(
// // // // // // // //     displayedBookings.filter((b) => b.status !== "cancelled" && isUpcoming(b.date)),
// // // // // // // //     true  // ascending — tomorrow first
// // // // // // // //   );
// // // // // // // //   const pastCards = sortByDate(
// // // // // // // //     displayedBookings.filter((b) => b.status !== "cancelled" && !isUpcoming(b.date)),
// // // // // // // //     false // descending — most recent first
// // // // // // // //   );

// // // // // // // //   // Other tabs — sort descending
// // // // // // // //   const sortedDisplayed = sortByDate(displayedBookings, activeTab !== "past");

// // // // // // // //   // ── Handlers ──────────────────────────────────────────────────────────────

// // // // // // // //   // const handleConfirmCancel = async (reason: string) => {
// // // // // // // //   //   if (!cancelTarget) return;
// // // // // // // //   //   await cancelBooking(cancelTarget.id, reason);
// // // // // // // //   //   // Also notify the hook so local state updates
// // // // // // // //   //   await handleCancelBooking(cancelTarget.id);
// // // // // // // //   //   setCancelTarget(null);
// // // // // // // //   // };

// // // // // // // //   const handleConfirmCancel = async (reason: string) => {
// // // // // // // //   if (!cancelTarget) return;
// // // // // // // //   // cancelBooking (API) + optimistic local update in one shot
// // // // // // // //   await cancelBooking(cancelTarget.id, reason);
// // // // // // // //   await handleCancelBooking(cancelTarget.id);
// // // // // // // //   setCancelTarget(null);
// // // // // // // // };

// // // // // // // //   const handleConfirmModify = async (form: {
// // // // // // // //     booking_date: string;
// // // // // // // //     site_id: string;
// // // // // // // //     building_id: string;
// // // // // // // //     floor_id: string;
// // // // // // // //     seat_id: string;
// // // // // // // //   }) => {
// // // // // // // //     if (!modifyTarget) return;
// // // // // // // //     const payload: ModifyBookingPayload = {
// // // // // // // //       booking_date: form.booking_date,
// // // // // // // //       site_id:      Number(form.site_id),
// // // // // // // //       building_id:  Number(form.building_id),
// // // // // // // //       floor_id:     Number(form.floor_id),
// // // // // // // //       seat_id:      Number(form.seat_id),
// // // // // // // //     };
// // // // // // // //     await modifyBooking(modifyTarget.id, payload);
// // // // // // // //     setModifyTarget(null);
// // // // // // // //     // Refresh list after modify
// // // // // // // //     refreshBookings?.();
// // // // // // // //   };

// // // // // // // //   // ── Render ─────────────────────────────────────────────────────────────────

// // // // // // // //   return (
// // // // // // // //     <SidebarProvider>
// // // // // // // //       <div className="flex h-screen bg-[#F7F8FC] font-sans overflow-hidden w-full">
// // // // // // // //         <AppSidebar user={user} />

// // // // // // // //         <main className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">

// // // // // // // //           {/* ── Header ── */}
// // // // // // // //           <div className="flex justify-between items-center">
// // // // // // // //             <div>
// // // // // // // //               <h1 className="text-[20px] font-bold text-[#1A1A2E] leading-tight">My Bookings</h1>
// // // // // // // //               <p className="text-[12.5px] text-gray-400 mt-0.5">
// // // // // // // //                 Your upcoming and past seat reservations
// // // // // // // //               </p>
// // // // // // // //             </div>
// // // // // // // //             <div className="flex gap-2.5 items-center">
// // // // // // // //               <Button variant="outline" size="sm" className="h-8 text-[12.5px] text-gray-600">
// // // // // // // //                 Export CSV
// // // // // // // //               </Button>
// // // // // // // //               <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold gap-1.5">
// // // // // // // //                 <span className="text-base leading-none">+</span>
// // // // // // // //                 New booking
// // // // // // // //               </Button>
// // // // // // // //               <Button
// // // // // // // //                 variant="outline"
// // // // // // // //                 size="icon"
// // // // // // // //                 className="h-8 w-8 text-gray-400"
// // // // // // // //                 onClick={() => refreshBookings?.()}
// // // // // // // //               >
// // // // // // // //                 <RefreshIcon />
// // // // // // // //               </Button>
// // // // // // // //             </div>
// // // // // // // //           </div>

// // // // // // // //           {/* ── Stat cards ── */}
// // // // // // // //           <div className="flex gap-4">
// // // // // // // //             <StatCard
// // // // // // // //               label="Upcoming"
// // // // // // // //               value={summary.upcomingCount}
// // // // // // // //               subLabel={summary.nextBookingDate ?? undefined}
// // // // // // // //               icon={<CalIcon />}
// // // // // // // //               accentClass="border-l-indigo-400"
// // // // // // // //             />
// // // // // // // //             <StatCard
// // // // // // // //               label="Completed this month"
// // // // // // // //               value={summary.completedThisMonth}
// // // // // // // //               subLabel={`${summary.daysInOffice} days in office`}
// // // // // // // //               icon={<CheckIcon />}
// // // // // // // //               accentClass="border-l-emerald-400"
// // // // // // // //             />
// // // // // // // //             <StatCard
// // // // // // // //               label="Team in office today"
// // // // // // // //               value={summary.teamInOffice ?? 0}
// // // // // // // //               subLabel={
// // // // // // // //                 (summary.teamInOffice ?? 0) === 1
// // // // // // // //                   ? "1 teammate present"
// // // // // // // //                   : `${summary.teamInOffice ?? 0} teammates present`
// // // // // // // //               }
// // // // // // // //               icon={<UsersIcon />}
// // // // // // // //               accentClass="border-l-violet-400"
// // // // // // // //             />
// // // // // // // //           </div>

// // // // // // // //           {/* ── Tabs ── */}
// // // // // // // //           <div className="flex border-b border-[#EBEBF5]">
// // // // // // // //             {TABS.map((tab) => (
// // // // // // // //               <button
// // // // // // // //                 key={tab.id}
// // // // // // // //                 onClick={() => setActiveTab(tab.id)}
// // // // // // // //                 className={cn(
// // // // // // // //                   "px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150",
// // // // // // // //                   activeTab === tab.id
// // // // // // // //                     ? "border-indigo-600 text-indigo-600 font-semibold"
// // // // // // // //                     : "border-transparent text-gray-500 hover:text-gray-700"
// // // // // // // //                 )}
// // // // // // // //               >
// // // // // // // //                 {tab.label}
// // // // // // // //               </button>
// // // // // // // //             ))}
// // // // // // // //           </div>

// // // // // // // //           {/* ── Content ── */}
// // // // // // // //           <div className="flex flex-col gap-3">

// // // // // // // //             {isLoading && (
// // // // // // // //               <div className="text-center py-12 text-gray-400 text-[13.5px]">
// // // // // // // //                 Loading bookings…
// // // // // // // //               </div>
// // // // // // // //             )}

// // // // // // // //             {error && (
// // // // // // // //               <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-500 text-[13px]">
// // // // // // // //                 {error}
// // // // // // // //               </div>
// // // // // // // //             )}

// // // // // // // //             {!isLoading && !error && displayedBookings.length === 0 && (
// // // // // // // //               <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// // // // // // // //                 No {activeTab} bookings found.
// // // // // // // //               </div>
// // // // // // // //             )}

// // // // // // // //             {/* ── Upcoming tab ── */}
// // // // // // // //             {!isLoading && !error && activeTab === "upcoming" && (
// // // // // // // //               <>
// // // // // // // //                 {upcomingCards.length > 0 ? (
// // // // // // // //                   upcomingCards.map((booking) => (
// // // // // // // //                     <BookingCard
// // // // // // // //                       key={booking.id}
// // // // // // // //                       booking={booking}
// // // // // // // //                       onCancelClick={setCancelTarget}
// // // // // // // //                       onModifyClick={setModifyTarget}
// // // // // // // //                       showActions
// // // // // // // //                     />
// // // // // // // //                   ))
// // // // // // // //                 ) : (
// // // // // // // //                   <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// // // // // // // //                     No upcoming bookings.
// // // // // // // //                   </div>
// // // // // // // //                 )}

// // // // // // // //                 {pastCards.length > 0 && (
// // // // // // // //                   <>
// // // // // // // //                     <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-2">
// // // // // // // //                       Past Bookings
// // // // // // // //                     </p>
// // // // // // // //                     {pastCards.map((booking) => (
// // // // // // // //                       <BookingCard
// // // // // // // //                         key={booking.id}
// // // // // // // //                         booking={booking}
// // // // // // // //                         onCancelClick={setCancelTarget}
// // // // // // // //                         onModifyClick={setModifyTarget}
// // // // // // // //                         showActions={false}
// // // // // // // //                       />
// // // // // // // //                     ))}
// // // // // // // //                   </>
// // // // // // // //                 )}
// // // // // // // //               </>
// // // // // // // //             )}

// // // // // // // //             {/* ── All other tabs: flat sorted list ── */}
// // // // // // // //             {!isLoading && !error && activeTab !== "upcoming" &&
// // // // // // // //               sortedDisplayed.map((booking) => (
// // // // // // // //                 <BookingCard
// // // // // // // //                   key={booking.id}
// // // // // // // //                   booking={booking}
// // // // // // // //                   onCancelClick={setCancelTarget}
// // // // // // // //                   onModifyClick={setModifyTarget}
// // // // // // // //                   showActions={activeTab !== "past"}
// // // // // // // //                 />
// // // // // // // //               ))
// // // // // // // //             }
// // // // // // // //           </div>
// // // // // // // //         </main>
// // // // // // // //       </div>

// // // // // // // //       {/* ── Dialogs (outside main scroll area) ── */}
// // // // // // // //       <CancelDialog
// // // // // // // //         open={cancelTarget !== null}
// // // // // // // //         booking={cancelTarget}
// // // // // // // //         onConfirm={handleConfirmCancel}
// // // // // // // //         onClose={() => setCancelTarget(null)}
// // // // // // // //       />

// // // // // // // //       <ModifyDialog
// // // // // // // //         open={modifyTarget !== null}
// // // // // // // //         booking={modifyTarget}
// // // // // // // //         onConfirm={handleConfirmModify}
// // // // // // // //         onClose={() => setModifyTarget(null)}
// // // // // // // //       />
// // // // // // // //     </SidebarProvider>
// // // // // // // //   );
// // // // // // // // };

// // // // // // // // export default MyBookingsPage;

// // // // // // // "use client";

// // // // // // // import React, { useState } from "react";
// // // // // // // import { Booking, BookingTab } from "../types/bookings.types";
// // // // // // // import { useBookings } from "../hooks/useBookings";
// // // // // // // import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// // // // // // // import { useAuthContext } from "@/features/auth/context/AuthContext";
// // // // // // // import { SidebarProvider } from "@/components/ui/sidebar";
// // // // // // // import { cn } from "@/lib/utils";
// // // // // // // import {
// // // // // // //   cancelBooking,
// // // // // // //   modifyBooking,
// // // // // // //   type ModifyBookingPayload,
// // // // // // // } from "../services/bookings.service";

// // // // // // // import {
// // // // // // //   AlertDialog,
// // // // // // //   AlertDialogAction,
// // // // // // //   AlertDialogCancel,
// // // // // // //   AlertDialogContent,
// // // // // // //   AlertDialogDescription,
// // // // // // //   AlertDialogFooter,
// // // // // // //   AlertDialogHeader,
// // // // // // //   AlertDialogTitle,
// // // // // // // } from "@/components/ui/alert-dialog";
// // // // // // // import {
// // // // // // //   Dialog,
// // // // // // //   DialogContent,
// // // // // // //   DialogDescription,
// // // // // // //   DialogFooter,
// // // // // // //   DialogHeader,
// // // // // // //   DialogTitle,
// // // // // // // } from "@/components/ui/dialog";
// // // // // // // import { Button }   from "@/components/ui/button";
// // // // // // // import { Input }    from "@/components/ui/input";
// // // // // // // import { Label }    from "@/components/ui/label";
// // // // // // // import { Textarea } from "@/components/ui/textarea";

// // // // // // // // ── Helpers ───────────────────────────────────────────────────────────────────

// // // // // // // function formatDate(iso: string): string {
// // // // // // //   const d = new Date(iso + "T00:00:00");
// // // // // // //   return d.toLocaleDateString("en-US", {
// // // // // // //     weekday: "short",
// // // // // // //     month:   "short",
// // // // // // //     day:     "numeric",
// // // // // // //   });
// // // // // // // }

// // // // // // // function isUpcoming(isoDate: string): boolean {
// // // // // // //   const today = new Date();
// // // // // // //   today.setHours(0, 0, 0, 0);
// // // // // // //   return new Date(isoDate + "T00:00:00") >= today;
// // // // // // // }

// // // // // // // function sortByDate(bookings: Booking[], ascending = true): Booking[] {
// // // // // // //   return [...bookings].sort((a, b) => {
// // // // // // //     const da = new Date(a.date + "T00:00:00").getTime();
// // // // // // //     const db = new Date(b.date + "T00:00:00").getTime();
// // // // // // //     return ascending ? da - db : db - da;
// // // // // // //   });
// // // // // // // }

// // // // // // // // ── Tag chip ──────────────────────────────────────────────────────────────────

// // // // // // // interface TagProps { label: string; variant: string; }

// // // // // // // const TAG_STYLES: Record<string, string> = {
// // // // // // //   confirmed: "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]",
// // // // // // //   manager:   "bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]",
// // // // // // //   zone:      "bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]",
// // // // // // //   sprint:    "bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]",
// // // // // // //   recurring: "bg-[#E8EAF6] text-[#283593] border border-[#9FA8DA]",
// // // // // // // };

// // // // // // // const BookingTagChip: React.FC<TagProps> = ({ label, variant }) => (
// // // // // // //   <span className={cn(
// // // // // // //     "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
// // // // // // //     TAG_STYLES[variant] ?? TAG_STYLES.zone,
// // // // // // //   )}>
// // // // // // //     {label}
// // // // // // //   </span>
// // // // // // // );

// // // // // // // // ── Cancel Dialog ─────────────────────────────────────────────────────────────

// // // // // // // interface CancelDialogProps {
// // // // // // //   open:      boolean;
// // // // // // //   booking:   Booking | null;
// // // // // // //   onConfirm: (reason: string) => Promise<void>;
// // // // // // //   onClose:   () => void;
// // // // // // // }

// // // // // // // const CancelDialog: React.FC<CancelDialogProps> = ({
// // // // // // //   open, booking, onConfirm, onClose,
// // // // // // // }) => {
// // // // // // //   const [reason,  setReason]  = useState("");
// // // // // // //   const [loading, setLoading] = useState(false);

// // // // // // //   const handleConfirm = async () => {
// // // // // // //     setLoading(true);
// // // // // // //     try {
// // // // // // //       await onConfirm(reason);
// // // // // // //       setReason("");
// // // // // // //     } finally {
// // // // // // //       setLoading(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   const handleOpenChange = (val: boolean) => {
// // // // // // //     if (!val) { setReason(""); onClose(); }
// // // // // // //   };

// // // // // // //   return (
// // // // // // //     <AlertDialog open={open} onOpenChange={handleOpenChange}>
// // // // // // //       <AlertDialogContent className="max-w-md">
// // // // // // //         <AlertDialogHeader>
// // // // // // //           <AlertDialogTitle className="text-[#1A1A2E]">Cancel Booking</AlertDialogTitle>
// // // // // // //           <AlertDialogDescription className="text-gray-500 text-[13px]">
// // // // // // //             {booking && (
// // // // // // //               <span>
// // // // // // //                 Are you sure you want to cancel your booking at{" "}
// // // // // // //                 <strong className="text-gray-700">
// // // // // // //                   {booking.location} · {booking.floor} · Seat {booking.seat}
// // // // // // //                 </strong>{" "}
// // // // // // //                 on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
// // // // // // //                 This action cannot be undone.
// // // // // // //               </span>
// // // // // // //             )}
// // // // // // //           </AlertDialogDescription>
// // // // // // //         </AlertDialogHeader>

// // // // // // //         <div className="py-2">
// // // // // // //           <Label
// // // // // // //             htmlFor="cancel-reason"
// // // // // // //             className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
// // // // // // //           >
// // // // // // //             Reason for cancellation{" "}
// // // // // // //             <span className="text-gray-400 font-normal">(optional)</span>
// // // // // // //           </Label>
// // // // // // //           <Textarea
// // // // // // //             id="cancel-reason"
// // // // // // //             placeholder="e.g. Working from home, schedule change…"
// // // // // // //             value={reason}
// // // // // // //             onChange={(e) => setReason(e.target.value)}
// // // // // // //             className="text-[13px] resize-none h-20"
// // // // // // //           />
// // // // // // //         </div>

// // // // // // //         <AlertDialogFooter>
// // // // // // //           <AlertDialogCancel
// // // // // // //             onClick={() => { setReason(""); onClose(); }}
// // // // // // //             className="text-[12.5px]"
// // // // // // //           >
// // // // // // //             Keep Booking
// // // // // // //           </AlertDialogCancel>
// // // // // // //           <AlertDialogAction
// // // // // // //             onClick={handleConfirm}
// // // // // // //             disabled={loading}
// // // // // // //             className="bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50"
// // // // // // //           >
// // // // // // //             {loading ? "Cancelling…" : "Yes, Cancel"}
// // // // // // //           </AlertDialogAction>
// // // // // // //         </AlertDialogFooter>
// // // // // // //       </AlertDialogContent>
// // // // // // //     </AlertDialog>
// // // // // // //   );
// // // // // // // };

// // // // // // // // ── Modify Dialog ─────────────────────────────────────────────────────────────

// // // // // // // interface ModifyForm {
// // // // // // //   booking_date: string;
// // // // // // //   site_id:      string;
// // // // // // //   building_id:  string;
// // // // // // //   floor_id:     string;
// // // // // // //   seat_id:      string;
// // // // // // // }

// // // // // // // interface ModifyDialogProps {
// // // // // // //   open:      boolean;
// // // // // // //   booking:   Booking | null;
// // // // // // //   onConfirm: (form: ModifyForm) => Promise<void>;
// // // // // // //   onClose:   () => void;
// // // // // // // }

// // // // // // // const ModifyDialog: React.FC<ModifyDialogProps> = ({
// // // // // // //   open, booking, onConfirm, onClose,
// // // // // // // }) => {
// // // // // // //   const [form, setForm] = useState<ModifyForm>({
// // // // // // //     booking_date: booking?.date ?? "",
// // // // // // //     site_id:      "",
// // // // // // //     building_id:  "",
// // // // // // //     floor_id:     "",
// // // // // // //     seat_id:      "",
// // // // // // //   });
// // // // // // //   const [loading, setLoading] = useState(false);
// // // // // // //   const [error,   setError]   = useState<string | null>(null);

// // // // // // //   React.useEffect(() => {
// // // // // // //     if (booking) {
// // // // // // //       setForm({
// // // // // // //         booking_date: booking.date,
// // // // // // //         site_id:      "",
// // // // // // //         building_id:  "",
// // // // // // //         floor_id:     "",
// // // // // // //         seat_id:      "",
// // // // // // //       });
// // // // // // //       setError(null);
// // // // // // //     }
// // // // // // //   }, [booking]);

// // // // // // //   const handleChange =
// // // // // // //     (field: keyof ModifyForm) =>
// // // // // // //     (e: React.ChangeEvent<HTMLInputElement>) => {
// // // // // // //       setForm((prev) => ({ ...prev, [field]: e.target.value }));
// // // // // // //       setError(null);
// // // // // // //     };

// // // // // // //   const handleSubmit = async () => {
// // // // // // //     const { booking_date, site_id, building_id, floor_id, seat_id } = form;
// // // // // // //     if (!booking_date || !site_id || !building_id || !floor_id || !seat_id) {
// // // // // // //       setError("Please fill in all fields.");
// // // // // // //       return;
// // // // // // //     }
// // // // // // //     setLoading(true);
// // // // // // //     try {
// // // // // // //       await onConfirm(form);
// // // // // // //       onClose();
// // // // // // //     } catch (err: any) {
// // // // // // //       setError(
// // // // // // //         err?.response?.data?.detail?.message ??
// // // // // // //         "Failed to modify booking. Please try again.",
// // // // // // //       );
// // // // // // //     } finally {
// // // // // // //       setLoading(false);
// // // // // // //     }
// // // // // // //   };

// // // // // // //   return (
// // // // // // //     <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
// // // // // // //       <DialogContent className="max-w-md">
// // // // // // //         <DialogHeader>
// // // // // // //           <DialogTitle className="text-[#1A1A2E]">Modify Booking</DialogTitle>
// // // // // // //           <DialogDescription className="text-[13px] text-gray-500">
// // // // // // //             {booking && (
// // // // // // //               <>
// // // // // // //                 Currently:{" "}
// // // // // // //                 <strong className="text-gray-700">
// // // // // // //                   {booking.location} · {booking.floor} · Seat {booking.seat}
// // // // // // //                 </strong>{" "}
// // // // // // //                 on{" "}
// // // // // // //                 <strong className="text-gray-700">{formatDate(booking.date)}</strong>.
// // // // // // //                 Update any field below.
// // // // // // //               </>
// // // // // // //             )}
// // // // // // //           </DialogDescription>
// // // // // // //         </DialogHeader>

// // // // // // //         <div className="grid gap-4 py-2">
// // // // // // //           {/* Date */}
// // // // // // //           <div className="grid gap-1.5">
// // // // // // //             <Label htmlFor="mod-date" className="text-[12.5px] font-medium text-gray-700">
// // // // // // //               New Date <span className="text-red-400">*</span>
// // // // // // //             </Label>
// // // // // // //             <Input
// // // // // // //               id="mod-date"
// // // // // // //               type="date"
// // // // // // //               value={form.booking_date}
// // // // // // //               onChange={handleChange("booking_date")}
// // // // // // //               className="text-[13px]"
// // // // // // //               min={new Date().toISOString().split("T")[0]}
// // // // // // //             />
// // // // // // //           </div>

// // // // // // //           {/* IDs row 1 */}
// // // // // // //           <div className="grid grid-cols-2 gap-3">
// // // // // // //             <div className="grid gap-1.5">
// // // // // // //               <Label htmlFor="mod-site" className="text-[12.5px] font-medium text-gray-700">
// // // // // // //                 Site ID <span className="text-red-400">*</span>
// // // // // // //               </Label>
// // // // // // //               <Input
// // // // // // //                 id="mod-site"
// // // // // // //                 type="number"
// // // // // // //                 placeholder="e.g. 1"
// // // // // // //                 value={form.site_id}
// // // // // // //                 onChange={handleChange("site_id")}
// // // // // // //                 className="text-[13px]"
// // // // // // //                 min={1}
// // // // // // //               />
// // // // // // //             </div>
// // // // // // //             <div className="grid gap-1.5">
// // // // // // //               <Label htmlFor="mod-building" className="text-[12.5px] font-medium text-gray-700">
// // // // // // //                 Building ID <span className="text-red-400">*</span>
// // // // // // //               </Label>
// // // // // // //               <Input
// // // // // // //                 id="mod-building"
// // // // // // //                 type="number"
// // // // // // //                 placeholder="e.g. 2"
// // // // // // //                 value={form.building_id}
// // // // // // //                 onChange={handleChange("building_id")}
// // // // // // //                 className="text-[13px]"
// // // // // // //                 min={1}
// // // // // // //               />
// // // // // // //             </div>
// // // // // // //           </div>

// // // // // // //           {/* IDs row 2 */}
// // // // // // //           <div className="grid grid-cols-2 gap-3">
// // // // // // //             <div className="grid gap-1.5">
// // // // // // //               <Label htmlFor="mod-floor" className="text-[12.5px] font-medium text-gray-700">
// // // // // // //                 Floor ID <span className="text-red-400">*</span>
// // // // // // //               </Label>
// // // // // // //               <Input
// // // // // // //                 id="mod-floor"
// // // // // // //                 type="number"
// // // // // // //                 placeholder="e.g. 3"
// // // // // // //                 value={form.floor_id}
// // // // // // //                 onChange={handleChange("floor_id")}
// // // // // // //                 className="text-[13px]"
// // // // // // //                 min={1}
// // // // // // //               />
// // // // // // //             </div>
// // // // // // //             <div className="grid gap-1.5">
// // // // // // //               <Label htmlFor="mod-seat" className="text-[12.5px] font-medium text-gray-700">
// // // // // // //                 Seat ID <span className="text-red-400">*</span>
// // // // // // //               </Label>
// // // // // // //               <Input
// // // // // // //                 id="mod-seat"
// // // // // // //                 type="number"
// // // // // // //                 placeholder="e.g. 42"
// // // // // // //                 value={form.seat_id}
// // // // // // //                 onChange={handleChange("seat_id")}
// // // // // // //                 className="text-[13px]"
// // // // // // //                 min={1}
// // // // // // //               />
// // // // // // //             </div>
// // // // // // //           </div>

// // // // // // //           {error && (
// // // // // // //             <p className="text-red-500 text-[12px] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
// // // // // // //               {error}
// // // // // // //             </p>
// // // // // // //           )}
// // // // // // //         </div>

// // // // // // //         <DialogFooter className="gap-2">
// // // // // // //           <Button
// // // // // // //             variant="outline"
// // // // // // //             onClick={onClose}
// // // // // // //             disabled={loading}
// // // // // // //             className="text-[12.5px]"
// // // // // // //           >
// // // // // // //             Cancel
// // // // // // //           </Button>
// // // // // // //           <Button
// // // // // // //             onClick={handleSubmit}
// // // // // // //             disabled={loading}
// // // // // // //             className="bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px]"
// // // // // // //           >
// // // // // // //             {loading ? "Saving…" : "Save Changes"}
// // // // // // //           </Button>
// // // // // // //         </DialogFooter>
// // // // // // //       </DialogContent>
// // // // // // //     </Dialog>
// // // // // // //   );
// // // // // // // };

// // // // // // // // ── Booking card ──────────────────────────────────────────────────────────────

// // // // // // // interface BookingCardProps {
// // // // // // //   booking:       Booking;
// // // // // // //   onCancelClick: (booking: Booking) => void;
// // // // // // //   onModifyClick: (booking: Booking) => void;
// // // // // // //   showActions?:  boolean;
// // // // // // // }

// // // // // // // const BookingCard: React.FC<BookingCardProps> = ({
// // // // // // //   booking,
// // // // // // //   onCancelClick,
// // // // // // //   onModifyClick,
// // // // // // //   showActions = true,
// // // // // // // }) => {
// // // // // // //   const isCancelled = booking.status === "cancelled";

// // // // // // //   return (
// // // // // // //     <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col hover:shadow-sm transition-shadow duration-200">
// // // // // // //       <div className="flex items-stretch">
// // // // // // //         {/* Left accent bar */}
// // // // // // //         <div className={cn(
// // // // // // //           "w-[3px] shrink-0",
// // // // // // //           isCancelled
// // // // // // //             ? "bg-gray-200"
// // // // // // //             : booking.status === "pending"
// // // // // // //               ? "bg-amber-400"
// // // // // // //               : "bg-indigo-500",
// // // // // // //         )} />

// // // // // // //         <div className="flex-1 px-5 py-4">
// // // // // // //           {/* Row 1: title + booked-on */}
// // // // // // //           <div className="flex justify-between items-start gap-4">
// // // // // // //             <div>
// // // // // // //               <p className="text-[13.5px] font-semibold text-[#1A1A2E]">
// // // // // // //                 {booking.location} · {booking.floor} · Seat {booking.seat}
// // // // // // //               </p>
// // // // // // //               <p className="text-[12px] text-gray-500 mt-0.5">
// // // // // // //                 {formatDate(booking.date)}
// // // // // // //                 {" · "}
// // // // // // //                 {booking.isFullDay
// // // // // // //                   ? "Full day"
// // // // // // //                   : `${booking.startTime} – ${booking.endTime}`}
// // // // // // //                 {booking.isFullDay && (
// // // // // // //                   <span className="ml-2 text-[11px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
// // // // // // //                     Full day
// // // // // // //                   </span>
// // // // // // //                 )}
// // // // // // //               </p>
// // // // // // //             </div>
// // // // // // //             <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5">
// // // // // // //               Booked {booking.bookedOn}
// // // // // // //             </span>
// // // // // // //           </div>

// // // // // // //           {/* Row 2: tags */}
// // // // // // //           <div className="flex gap-1.5 flex-wrap mt-2.5">
// // // // // // //             {booking.tags.map((tag, i) => (
// // // // // // //               <BookingTagChip key={i} label={tag.label} variant={tag.variant} />
// // // // // // //             ))}
// // // // // // //             {booking.isRecurring && booking.recurringPattern && (
// // // // // // //               <BookingTagChip label={booking.recurringPattern} variant="recurring" />
// // // // // // //             )}
// // // // // // //           </div>
// // // // // // //         </div>
// // // // // // //       </div>

// // // // // // //       {/* Action footer */}
// // // // // // //       {showActions && !isCancelled && (
// // // // // // //         <div className="flex justify-end gap-2 px-5 py-2.5 border-t border-gray-100 bg-[#F7F8FC]">
// // // // // // //           <Button
// // // // // // //             variant="outline"
// // // // // // //             size="sm"
// // // // // // //             className="h-7 px-4 text-[12.5px] text-gray-600"
// // // // // // //             onClick={() => onModifyClick(booking)}
// // // // // // //           >
// // // // // // //             Modify
// // // // // // //           </Button>
// // // // // // //           <Button
// // // // // // //             variant="outline"
// // // // // // //             size="sm"
// // // // // // //             className="h-7 px-4 text-[12.5px] border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 hover:border-red-300"
// // // // // // //             onClick={() => onCancelClick(booking)}
// // // // // // //           >
// // // // // // //             Cancel
// // // // // // //           </Button>
// // // // // // //         </div>
// // // // // // //       )}

// // // // // // //       {showActions && isCancelled && (
// // // // // // //         <div className="flex justify-end px-5 py-2.5 border-t border-gray-100">
// // // // // // //           <Button variant="outline" size="sm" className="h-7 px-4 text-[12.5px] text-gray-600">
// // // // // // //             View details
// // // // // // //           </Button>
// // // // // // //         </div>
// // // // // // //       )}
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // };

// // // // // // // // ── Stat card ─────────────────────────────────────────────────────────────────

// // // // // // // interface StatCardProps {
// // // // // // //   label:       string;
// // // // // // //   value:       number | string;
// // // // // // //   subLabel?:   string;
// // // // // // //   icon:        React.ReactNode;
// // // // // // //   accentClass: string;
// // // // // // // }

// // // // // // // const StatCard: React.FC<StatCardProps> = ({
// // // // // // //   label, value, subLabel, icon, accentClass,
// // // // // // // }) => (
// // // // // // //   <div className={cn(
// // // // // // //     "flex-1 bg-white border border-[#EBEBF5] rounded-xl p-4 flex flex-col gap-1 min-w-[160px]",
// // // // // // //     "border-l-[3px]", accentClass,
// // // // // // //   )}>
// // // // // // //     <div className="flex justify-between items-center mb-1">
// // // // // // //       <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
// // // // // // //         {label}
// // // // // // //       </span>
// // // // // // //       <span className="text-gray-400">{icon}</span>
// // // // // // //     </div>
// // // // // // //     <div className="text-[26px] font-bold text-[#1A1A2E] leading-none">{value}</div>
// // // // // // //     {subLabel && (
// // // // // // //       <div className="text-[11.5px] text-gray-400 mt-1">{subLabel}</div>
// // // // // // //     )}
// // // // // // //   </div>
// // // // // // // );

// // // // // // // // ── Tabs ──────────────────────────────────────────────────────────────────────

// // // // // // // const TABS: { id: BookingTab; label: string }[] = [
// // // // // // //   { id: "upcoming",  label: "Upcoming"  },
// // // // // // //   { id: "past",      label: "Past"      },
// // // // // // //   //{ id: "recurring", label: "Recurring" },
// // // // // // //   { id: "cancelled", label: "Cancelled" },
// // // // // // // ];

// // // // // // // // ── Icons ─────────────────────────────────────────────────────────────────────

// // // // // // // const CalIcon = () => (
// // // // // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// // // // // // //     <rect x="3" y="4" width="18" height="18" rx="2" />
// // // // // // //     <path d="M16 2v4M8 2v4M3 10h18" />
// // // // // // //   </svg>
// // // // // // // );
// // // // // // // const CheckIcon = () => (
// // // // // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
// // // // // // //     <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
// // // // // // //   </svg>
// // // // // // // );
// // // // // // // const UsersIcon = () => (
// // // // // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// // // // // // //     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
// // // // // // //     <circle cx="9" cy="7" r="4" />
// // // // // // //     <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
// // // // // // //     <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
// // // // // // //   </svg>
// // // // // // // );
// // // // // // // const RefreshIcon = () => (
// // // // // // //   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
// // // // // // //     <path
// // // // // // //       d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
// // // // // // //       strokeLinecap="round"
// // // // // // //       strokeLinejoin="round"
// // // // // // //     />
// // // // // // //   </svg>
// // // // // // // );

// // // // // // // // ── Page ──────────────────────────────────────────────────────────────────────

// // // // // // // const MyBookingsPage: React.FC = () => {
// // // // // // //   const {
// // // // // // //     displayedBookings,
// // // // // // //     summary,
// // // // // // //     activeTab,
// // // // // // //     isLoading,
// // // // // // //     error,
// // // // // // //     setActiveTab,
// // // // // // //     handleCancelBooking,
// // // // // // //     refreshBookings,
// // // // // // //   } = useBookings();

// // // // // // //   const { user } = useAuthContext();

// // // // // // //   const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
// // // // // // //   const [modifyTarget, setModifyTarget] = useState<Booking | null>(null);

// // // // // // //   // Upcoming tab: split into future (ascending) + past section (descending)
// // // // // // //   const upcomingCards = sortByDate(
// // // // // // //     displayedBookings.filter((b) => b.status !== "cancelled" && isUpcoming(b.date)),
// // // // // // //     true,
// // // // // // //   );
// // // // // // //   const pastCards = sortByDate(
// // // // // // //     displayedBookings.filter((b) => b.status !== "cancelled" && !isUpcoming(b.date)),
// // // // // // //     false,
// // // // // // //   );

// // // // // // //   // All other tabs — descending for past, ascending otherwise
// // // // // // //   const sortedDisplayed = sortByDate(displayedBookings, activeTab !== "past");

// // // // // // //   // ── Handlers ──────────────────────────────────────────────────────────────

// // // // // // //   const handleConfirmCancel = async (reason: string) => {
// // // // // // //     if (!cancelTarget) return;
// // // // // // //     // 1. Call the API
// // // // // // //     await cancelBooking(cancelTarget.id, reason);
// // // // // // //     // 2. Update local state (hook; no second API call)
// // // // // // //     await handleCancelBooking(cancelTarget.id);
// // // // // // //     setCancelTarget(null);
// // // // // // //   };

// // // // // // //   const handleConfirmModify = async (form: ModifyForm) => {
// // // // // // //     if (!modifyTarget) return;
// // // // // // //     const payload: ModifyBookingPayload = {
// // // // // // //       booking_date: form.booking_date,
// // // // // // //       site_id:      Number(form.site_id),
// // // // // // //       building_id:  Number(form.building_id),
// // // // // // //       floor_id:     Number(form.floor_id),
// // // // // // //       seat_id:      Number(form.seat_id),
// // // // // // //     };
// // // // // // //     await modifyBooking(modifyTarget.id, payload);
// // // // // // //     setModifyTarget(null);
// // // // // // //     refreshBookings();
// // // // // // //   };

// // // // // // //   // ── Render ────────────────────────────────────────────────────────────────

// // // // // // //   return (
// // // // // // //     <SidebarProvider>
// // // // // // //       <div className="flex h-screen bg-[#F7F8FC] font-sans overflow-hidden w-full">
// // // // // // //         <AppSidebar user={user} />

// // // // // // //         <main className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">

// // // // // // //           {/* Header */}
// // // // // // //           <div className="flex justify-between items-center">
// // // // // // //             <div>
// // // // // // //               <h1 className="text-[20px] font-bold text-[#1A1A2E] leading-tight">
// // // // // // //                 My Bookings
// // // // // // //               </h1>
// // // // // // //               <p className="text-[12.5px] text-gray-400 mt-0.5">
// // // // // // //                 Your upcoming and past seat reservations
// // // // // // //               </p>
// // // // // // //             </div>
// // // // // // //             <div className="flex gap-2.5 items-center">
// // // // // // //               <Button variant="outline" size="sm" className="h-8 text-[12.5px] text-gray-600">
// // // // // // //                 Export CSV
// // // // // // //               </Button>
// // // // // // //               <Button
// // // // // // //                 size="sm"
// // // // // // //                 className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold gap-1.5"
// // // // // // //               >
// // // // // // //                 <span className="text-base leading-none">+</span>
// // // // // // //                 New booking
// // // // // // //               </Button>
// // // // // // //               <Button
// // // // // // //                 variant="outline"
// // // // // // //                 size="icon"
// // // // // // //                 className="h-8 w-8 text-gray-400"
// // // // // // //                 onClick={refreshBookings}
// // // // // // //               >
// // // // // // //                 <RefreshIcon />
// // // // // // //               </Button>
// // // // // // //             </div>
// // // // // // //           </div>

// // // // // // //           {/* Stat cards */}
// // // // // // //           <div className="flex gap-4">
// // // // // // //             <StatCard
// // // // // // //               label="Upcoming"
// // // // // // //               value={summary.upcomingCount}
// // // // // // //               subLabel={summary.nextBookingDate ?? undefined}
// // // // // // //               icon={<CalIcon />}
// // // // // // //               accentClass="border-l-indigo-400"
// // // // // // //             />
// // // // // // //             <StatCard
// // // // // // //               label="Completed this month"
// // // // // // //               value={summary.completedThisMonth}
// // // // // // //               subLabel={`${summary.daysInOffice} days in office`}
// // // // // // //               icon={<CheckIcon />}
// // // // // // //               accentClass="border-l-emerald-400"
// // // // // // //             />
// // // // // // //             <StatCard
// // // // // // //               label="Team in office today"
// // // // // // //               value={summary.teamInOffice ?? 0}
// // // // // // //               subLabel={
// // // // // // //                 (summary.teamInOffice ?? 0) === 1
// // // // // // //                   ? "1 teammate present"
// // // // // // //                   : `${summary.teamInOffice ?? 0} teammates present`
// // // // // // //               }
// // // // // // //               icon={<UsersIcon />}
// // // // // // //               accentClass="border-l-violet-400"
// // // // // // //             />
// // // // // // //           </div>

// // // // // // //           {/* Tabs */}
// // // // // // //           <div className="flex border-b border-[#EBEBF5]">
// // // // // // //             {TABS.map((tab) => (
// // // // // // //               <button
// // // // // // //                 key={tab.id}
// // // // // // //                 onClick={() => setActiveTab(tab.id)}
// // // // // // //                 className={cn(
// // // // // // //                   "px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150",
// // // // // // //                   activeTab === tab.id
// // // // // // //                     ? "border-indigo-600 text-indigo-600 font-semibold"
// // // // // // //                     : "border-transparent text-gray-500 hover:text-gray-700",
// // // // // // //                 )}
// // // // // // //               >
// // // // // // //                 {tab.label}
// // // // // // //               </button>
// // // // // // //             ))}
// // // // // // //           </div>

// // // // // // //           {/* Content */}
// // // // // // //           <div className="flex flex-col gap-3">

// // // // // // //             {isLoading && (
// // // // // // //               <div className="text-center py-12 text-gray-400 text-[13.5px]">
// // // // // // //                 Loading bookings…
// // // // // // //               </div>
// // // // // // //             )}

// // // // // // //             {error && (
// // // // // // //               <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-500 text-[13px]">
// // // // // // //                 {error}
// // // // // // //               </div>
// // // // // // //             )}

// // // // // // //             {!isLoading && !error && displayedBookings.length === 0 && (
// // // // // // //               <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// // // // // // //                 No {activeTab} bookings found.
// // // // // // //               </div>
// // // // // // //             )}

// // // // // // //             {/* Upcoming tab */}
// // // // // // //             {!isLoading && !error && activeTab === "upcoming" && (
// // // // // // //               <>
// // // // // // //                 {upcomingCards.length > 0 ? (
// // // // // // //                   upcomingCards.map((booking) => (
// // // // // // //                     <BookingCard
// // // // // // //                       key={booking.id}
// // // // // // //                       booking={booking}
// // // // // // //                       onCancelClick={setCancelTarget}
// // // // // // //                       onModifyClick={setModifyTarget}
// // // // // // //                       showActions
// // // // // // //                     />
// // // // // // //                   ))
// // // // // // //                 ) : (
// // // // // // //                   <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// // // // // // //                     No upcoming bookings.
// // // // // // //                   </div>
// // // // // // //                 )}

// // // // // // //                 {pastCards.length > 0 && (
// // // // // // //                   <>
// // // // // // //                     <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-2">
// // // // // // //                       Past Bookings
// // // // // // //                     </p>
// // // // // // //                     {pastCards.map((booking) => (
// // // // // // //                       <BookingCard
// // // // // // //                         key={booking.id}
// // // // // // //                         booking={booking}
// // // // // // //                         onCancelClick={setCancelTarget}
// // // // // // //                         onModifyClick={setModifyTarget}
// // // // // // //                         showActions={false}
// // // // // // //                       />
// // // // // // //                     ))}
// // // // // // //                   </>
// // // // // // //                 )}
// // // // // // //               </>
// // // // // // //             )}

// // // // // // //             {/* All other tabs */}
// // // // // // //             {!isLoading && !error && activeTab !== "upcoming" &&
// // // // // // //               sortedDisplayed.map((booking) => (
// // // // // // //                 <BookingCard
// // // // // // //                   key={booking.id}
// // // // // // //                   booking={booking}
// // // // // // //                   onCancelClick={setCancelTarget}
// // // // // // //                   onModifyClick={setModifyTarget}
// // // // // // //                   showActions={activeTab !== "past"}
// // // // // // //                 />
// // // // // // //               ))
// // // // // // //             }
// // // // // // //           </div>
// // // // // // //         </main>
// // // // // // //       </div>

// // // // // // //       {/* Dialogs */}
// // // // // // //       <CancelDialog
// // // // // // //         open={cancelTarget !== null}
// // // // // // //         booking={cancelTarget}
// // // // // // //         onConfirm={handleConfirmCancel}
// // // // // // //         onClose={() => setCancelTarget(null)}
// // // // // // //       />
// // // // // // //       <ModifyDialog
// // // // // // //         open={modifyTarget !== null}
// // // // // // //         booking={modifyTarget}
// // // // // // //         onConfirm={handleConfirmModify}
// // // // // // //         onClose={() => setModifyTarget(null)}
// // // // // // //       />
// // // // // // //     </SidebarProvider>
// // // // // // //   );
// // // // // // // };

// // // // // // // export default MyBookingsPage;

// // // // // // "use client";

// // // // // // import React, { useState } from "react";
// // // // // // import { Booking, BookingTab } from "../types/bookings.types";
// // // // // // import { useBookings } from "../hooks/useBookings";
// // // // // // import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// // // // // // import { useAuthContext } from "@/features/auth/context/AuthContext";
// // // // // // import { SidebarProvider } from "@/components/ui/sidebar";
// // // // // // import { cn } from "@/lib/utils";
// // // // // // import {
// // // // // //   cancelBooking,
// // // // // //   modifyBooking,
// // // // // //   type ModifyBookingPayload,
// // // // // // } from "../services/bookings.service";



// // // // // // import {
// // // // // //   AlertDialog,
// // // // // //   AlertDialogAction,
// // // // // //   AlertDialogCancel,
// // // // // //   AlertDialogContent,
// // // // // //   AlertDialogDescription,
// // // // // //   AlertDialogFooter,
// // // // // //   AlertDialogHeader,
// // // // // //   AlertDialogTitle,
// // // // // // } from "@/components/ui/alert-dialog";
// // // // // // import {
// // // // // //   Dialog,
// // // // // //   DialogContent,
// // // // // //   DialogDescription,
// // // // // //   DialogFooter,
// // // // // //   DialogHeader,
// // // // // //   DialogTitle,
// // // // // // } from "@/components/ui/dialog";
// // // // // // import {
// // // // // //   Select,
// // // // // //   SelectContent,
// // // // // //   SelectItem,
// // // // // //   SelectTrigger,
// // // // // //   SelectValue,
// // // // // // } from "@/components/ui/select";
// // // // // // import { Button }   from "@/components/ui/button";
// // // // // // import { Input }    from "@/components/ui/input";
// // // // // // import { Label }    from "@/components/ui/label";
// // // // // // import { Textarea } from "@/components/ui/textarea";
// // // // // // import { fetchBuildings, fetchFloors, fetchSeatsWithAvailability, fetchSites } from "@/features/book/services/Bookingform.service";
// // // // // // import { Building, Floor, Seat, Site } from "@/features/book/types/Bookingform.types";

// // // // // // // ── Helpers ───────────────────────────────────────────────────────────────────

// // // // // // function formatDate(iso: string): string {
// // // // // //   const d = new Date(iso + "T00:00:00");
// // // // // //   return d.toLocaleDateString("en-US", {
// // // // // //     weekday: "short",
// // // // // //     month:   "short",
// // // // // //     day:     "numeric",
// // // // // //   });
// // // // // // }

// // // // // // function isUpcoming(isoDate: string): boolean {
// // // // // //   const today = new Date();
// // // // // //   today.setHours(0, 0, 0, 0);
// // // // // //   return new Date(isoDate + "T00:00:00") >= today;
// // // // // // }

// // // // // // function sortByDate(bookings: Booking[], ascending = true): Booking[] {
// // // // // //   return [...bookings].sort((a, b) => {
// // // // // //     const da = new Date(a.date + "T00:00:00").getTime();
// // // // // //     const db = new Date(b.date + "T00:00:00").getTime();
// // // // // //     return ascending ? da - db : db - da;
// // // // // //   });
// // // // // // }

// // // // // // // ── Tag chip ──────────────────────────────────────────────────────────────────

// // // // // // interface TagProps { label: string; variant: string; }

// // // // // // const TAG_STYLES: Record<string, string> = {
// // // // // //   confirmed: "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]",
// // // // // //   manager:   "bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]",
// // // // // //   zone:      "bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]",
// // // // // //   sprint:    "bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]",
// // // // // //   recurring: "bg-[#E8EAF6] text-[#283593] border border-[#9FA8DA]",
// // // // // // };

// // // // // // const BookingTagChip: React.FC<TagProps> = ({ label, variant }) => (
// // // // // //   <span className={cn(
// // // // // //     "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
// // // // // //     TAG_STYLES[variant] ?? TAG_STYLES.zone,
// // // // // //   )}>
// // // // // //     {label}
// // // // // //   </span>
// // // // // // );

// // // // // // // ── Cancel Dialog ─────────────────────────────────────────────────────────────

// // // // // // interface CancelDialogProps {
// // // // // //   open:      boolean;
// // // // // //   booking:   Booking | null;
// // // // // //   onConfirm: (reason: string) => Promise<void>;
// // // // // //   onClose:   () => void;
// // // // // // }

// // // // // // const CancelDialog: React.FC<CancelDialogProps> = ({
// // // // // //   open, booking, onConfirm, onClose,
// // // // // // }) => {
// // // // // //   const [reason,  setReason]  = useState("");
// // // // // //   const [loading, setLoading] = useState(false);

// // // // // //   const handleConfirm = async () => {
// // // // // //     setLoading(true);
// // // // // //     try {
// // // // // //       await onConfirm(reason);
// // // // // //       setReason("");
// // // // // //     } finally {
// // // // // //       setLoading(false);
// // // // // //     }
// // // // // //   };

// // // // // //   const handleOpenChange = (val: boolean) => {
// // // // // //     if (!val) { setReason(""); onClose(); }
// // // // // //   };

// // // // // //   return (
// // // // // //     <AlertDialog open={open} onOpenChange={handleOpenChange}>
// // // // // //       <AlertDialogContent className="max-w-md">
// // // // // //         <AlertDialogHeader>
// // // // // //           <AlertDialogTitle className="text-[#1A1A2E]">Cancel Booking</AlertDialogTitle>
// // // // // //           <AlertDialogDescription className="text-gray-500 text-[13px]">
// // // // // //             {booking && (
// // // // // //               <span>
// // // // // //                 Are you sure you want to cancel your booking at{" "}
// // // // // //                 <strong className="text-gray-700">
// // // // // //                   {booking.location} · {booking.floor} · Seat {booking.seat}
// // // // // //                 </strong>{" "}
// // // // // //                 on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
// // // // // //                 This action cannot be undone.
// // // // // //               </span>
// // // // // //             )}
// // // // // //           </AlertDialogDescription>
// // // // // //         </AlertDialogHeader>

// // // // // //         <div className="py-2">
// // // // // //           <Label
// // // // // //             htmlFor="cancel-reason"
// // // // // //             className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
// // // // // //           >
// // // // // //             Reason for cancellation{" "}
// // // // // //             <span className="text-gray-400 font-normal">(optional)</span>
// // // // // //           </Label>
// // // // // //           <Textarea
// // // // // //             id="cancel-reason"
// // // // // //             placeholder="e.g. Working from home, schedule change…"
// // // // // //             value={reason}
// // // // // //             onChange={(e) => setReason(e.target.value)}
// // // // // //             className="text-[13px] resize-none h-20"
// // // // // //           />
// // // // // //         </div>

// // // // // //         <AlertDialogFooter>
// // // // // //           <AlertDialogCancel
// // // // // //             onClick={() => { setReason(""); onClose(); }}
// // // // // //             className="text-[12.5px]"
// // // // // //           >
// // // // // //             Keep Booking
// // // // // //           </AlertDialogCancel>
// // // // // //           <AlertDialogAction
// // // // // //             onClick={handleConfirm}
// // // // // //             disabled={loading}
// // // // // //             className="bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50"
// // // // // //           >
// // // // // //             {loading ? "Cancelling…" : "Yes, Cancel"}
// // // // // //           </AlertDialogAction>
// // // // // //         </AlertDialogFooter>
// // // // // //       </AlertDialogContent>
// // // // // //     </AlertDialog>
// // // // // //   );
// // // // // // };

// // // // // // // ── Modify Dialog ─────────────────────────────────────────────────────────────

// // // // // // interface ModifyForm {
// // // // // //   booking_date: string;
// // // // // //   site_id:      string;
// // // // // //   building_id:  string;
// // // // // //   floor_id:     string;
// // // // // //   seat_id:      string;
// // // // // // }

// // // // // // interface ModifyDialogProps {
// // // // // //   open:      boolean;
// // // // // //   booking:   Booking | null;
// // // // // //   onConfirm: (form: ModifyForm) => Promise<void>;
// // // // // //   onClose:   () => void;
// // // // // // }

// // // // // // const ModifyDialog: React.FC<ModifyDialogProps> = ({
// // // // // //   open, booking, onConfirm, onClose,
// // // // // // }) => {
// // // // // //   const [form, setForm] = useState<ModifyForm>({
// // // // // //     booking_date: "",
// // // // // //     site_id:      "",
// // // // // //     building_id:  "",
// // // // // //     floor_id:     "",
// // // // // //     seat_id:      "",
// // // // // //   });

// // // // // //   const [sites,     setSites]     = useState<Site[]>([]);
// // // // // //   const [buildings, setBuildings] = useState<Building[]>([]);
// // // // // //   const [floors,    setFloors]    = useState<Floor[]>([]);
// // // // // //   const [seats,     setSeats]     = useState<Seat[]>([]);

// // // // // //   const [loadingSites,     setLoadingSites]     = useState(false);
// // // // // //   const [loadingBuildings, setLoadingBuildings] = useState(false);
// // // // // //   const [loadingFloors,    setLoadingFloors]    = useState(false);
// // // // // //   const [loadingSeats,     setLoadingSeats]     = useState(false);
// // // // // //   const [submitting,       setSubmitting]       = useState(false);
// // // // // //   const [error,            setError]            = useState<string | null>(null);

// // // // // //   // Reset + load sites when dialog opens
// // // // // //   React.useEffect(() => {
// // // // // //     if (!open || !booking) return;

// // // // // //     setForm({
// // // // // //       booking_date: booking.date,
// // // // // //       site_id:      "",
// // // // // //       building_id:  "",
// // // // // //       floor_id:     "",
// // // // // //       seat_id:      "",
// // // // // //     });
// // // // // //     setBuildings([]);
// // // // // //     setFloors([]);
// // // // // //     setSeats([]);
// // // // // //     setError(null);

// // // // // //     setLoadingSites(true);
// // // // // //     fetchSites()
// // // // // //       .then(setSites)
// // // // // //       .catch(() => setError("Failed to load sites."))
// // // // // //       .finally(() => setLoadingSites(false));
// // // // // //   }, [open, booking]);

// // // // // //   // Cascade: site → buildings
// // // // // //   React.useEffect(() => {
// // // // // //     if (!form.site_id) {
// // // // // //       setBuildings([]);
// // // // // //       setFloors([]);
// // // // // //       setSeats([]);
// // // // // //       return;
// // // // // //     }
// // // // // //     setForm((p) => ({ ...p, building_id: "", floor_id: "", seat_id: "" }));
// // // // // //     setFloors([]);
// // // // // //     setSeats([]);
// // // // // //     setLoadingBuildings(true);
// // // // // //     fetchBuildings(form.site_id)
// // // // // //       .then(setBuildings)
// // // // // //       .catch(() => setError("Failed to load buildings."))
// // // // // //       .finally(() => setLoadingBuildings(false));
// // // // // //   }, [form.site_id]);

// // // // // //   // Cascade: building → floors
// // // // // //   React.useEffect(() => {
// // // // // //     if (!form.building_id) {
// // // // // //       setFloors([]);
// // // // // //       setSeats([]);
// // // // // //       return;
// // // // // //     }
// // // // // //     setForm((p) => ({ ...p, floor_id: "", seat_id: "" }));
// // // // // //     setSeats([]);
// // // // // //     setLoadingFloors(true);
// // // // // //     fetchFloors(form.building_id)
// // // // // //       .then(setFloors)
// // // // // //       .catch(() => setError("Failed to load floors."))
// // // // // //       .finally(() => setLoadingFloors(false));
// // // // // //   }, [form.building_id]);

// // // // // //   // Cascade: floor + date → seats
// // // // // //   React.useEffect(() => {
// // // // // //     if (!form.floor_id || !form.booking_date) {
// // // // // //       setSeats([]);
// // // // // //       return;
// // // // // //     }
// // // // // //     setForm((p) => ({ ...p, seat_id: "" }));
// // // // // //     setLoadingSeats(true);
// // // // // //     fetchSeatsWithAvailability({
// // // // // //       floorId:  form.floor_id,
// // // // // //       fromDate: form.booking_date,
// // // // // //       toDate: form.booking_date
// // // // // //     })
// // // // // //       .then((fetched) => {
// // // // // //         // Only show available seats in the modify dialog
// // // // // //         setSeats(fetched.filter((s) => s.status === "available" || s.status === "yours"));
// // // // // //       })
// // // // // //       .catch(() => setError("Failed to load seats."))
// // // // // //       .finally(() => setLoadingSeats(false));
// // // // // //   }, [form.floor_id, form.booking_date]);

// // // // // //   const set = (field: keyof ModifyForm) => (val: string) => {
// // // // // //     setError(null);
// // // // // //     setForm((p) => ({ ...p, [field]: val }));
// // // // // //   };

// // // // // //   const handleSubmit = async () => {
// // // // // //     const { booking_date, site_id, building_id, floor_id, seat_id } = form;
// // // // // //     if (!booking_date || !site_id || !building_id || !floor_id || !seat_id) {
// // // // // //       setError("Please complete all fields.");
// // // // // //       return;
// // // // // //     }
// // // // // //     setSubmitting(true);
// // // // // //     try {
// // // // // //       await onConfirm(form);
// // // // // //       onClose();
// // // // // //     } catch (err: any) {
// // // // // //       setError(
// // // // // //         err?.response?.data?.detail?.message ??
// // // // // //         "Failed to modify booking. Please try again.",
// // // // // //       );
// // // // // //     } finally {
// // // // // //       setSubmitting(false);
// // // // // //     }
// // // // // //   };

// // // // // //   return (
// // // // // //     <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
// // // // // //       <DialogContent className="max-w-md">
// // // // // //         <DialogHeader>
// // // // // //           <DialogTitle className="text-[#1A1A2E]">Modify Booking</DialogTitle>
// // // // // //           <DialogDescription className="text-[13px] text-gray-500">
// // // // // //             {booking && (
// // // // // //               <>
// // // // // //                 Currently:{" "}
// // // // // //                 <strong className="text-gray-700">
// // // // // //                   {booking.location} · {booking.floor} · Seat {booking.seat}
// // // // // //                 </strong>{" "}
// // // // // //                 on{" "}
// // // // // //                 <strong className="text-gray-700">{formatDate(booking.date)}</strong>.
// // // // // //                 Update any field below.
// // // // // //               </>
// // // // // //             )}
// // // // // //           </DialogDescription>
// // // // // //         </DialogHeader>

// // // // // //         <div className="grid gap-4 py-2">

// // // // // //           {/* Date */}
// // // // // //           <div className="grid gap-1.5">
// // // // // //             <Label htmlFor="mod-date" className="text-[12.5px] font-medium text-gray-700">
// // // // // //               New Date <span className="text-red-400">*</span>
// // // // // //             </Label>
// // // // // //             <Input
// // // // // //               id="mod-date"
// // // // // //               type="date"
// // // // // //               value={form.booking_date}
// // // // // //               onChange={(e) => set("booking_date")(e.target.value)}
// // // // // //               className="text-[13px]"
// // // // // //               min={new Date().toISOString().split("T")[0]}
// // // // // //             />
// // // // // //           </div>

// // // // // //           {/* Site */}
// // // // // //           <div className="grid gap-1.5">
// // // // // //             <Label className="text-[12.5px] font-medium text-gray-700">
// // // // // //               Site <span className="text-red-400">*</span>
// // // // // //             </Label>
// // // // // //             <Select
// // // // // //               value={form.site_id}
// // // // // //               onValueChange={set("site_id")}
// // // // // //               disabled={loadingSites || sites.length === 0}
// // // // // //             >
// // // // // //               <SelectTrigger className="text-[13px]">
// // // // // //                 <SelectValue
// // // // // //                   placeholder={loadingSites ? "Loading sites…" : "Select a site"}
// // // // // //                 />
// // // // // //               </SelectTrigger>
// // // // // //               <SelectContent>
// // // // // //                 {sites.map((s) => (
// // // // // //                   <SelectItem key={s.id} value={String(s.id)} className="text-[13px]">
// // // // // //                     {s.name}{s.city ? ` — ${s.city}` : ""}
// // // // // //                   </SelectItem>
// // // // // //                 ))}
// // // // // //               </SelectContent>
// // // // // //             </Select>
// // // // // //           </div>

// // // // // //           {/* Building */}
// // // // // //           <div className="grid gap-1.5">
// // // // // //             <Label className="text-[12.5px] font-medium text-gray-700">
// // // // // //               Building <span className="text-red-400">*</span>
// // // // // //             </Label>
// // // // // //             <Select
// // // // // //               value={form.building_id}
// // // // // //               onValueChange={set("building_id")}
// // // // // //               disabled={!form.site_id || loadingBuildings}
// // // // // //             >
// // // // // //               <SelectTrigger className="text-[13px]">
// // // // // //                 <SelectValue
// // // // // //                   placeholder={
// // // // // //                     !form.site_id    ? "Select a site first"  :
// // // // // //                     loadingBuildings ? "Loading buildings…"   :
// // // // // //                                        "Select a building"
// // // // // //                   }
// // // // // //                 />
// // // // // //               </SelectTrigger>
// // // // // //               <SelectContent>
// // // // // //                 {buildings.map((b) => (
// // // // // //                   <SelectItem key={b.id} value={String(b.id)} className="text-[13px]">
// // // // // //                     {b.name}
// // // // // //                   </SelectItem>
// // // // // //                 ))}
// // // // // //               </SelectContent>
// // // // // //             </Select>
// // // // // //           </div>

// // // // // //           {/* Floor */}
// // // // // //           <div className="grid gap-1.5">
// // // // // //             <Label className="text-[12.5px] font-medium text-gray-700">
// // // // // //               Floor <span className="text-red-400">*</span>
// // // // // //             </Label>
// // // // // //             <Select
// // // // // //               value={form.floor_id}
// // // // // //               onValueChange={set("floor_id")}
// // // // // //               disabled={!form.building_id || loadingFloors}
// // // // // //             >
// // // // // //               <SelectTrigger className="text-[13px]">
// // // // // //                 <SelectValue
// // // // // //                   placeholder={
// // // // // //                     !form.building_id ? "Select a building first" :
// // // // // //                     loadingFloors     ? "Loading floors…"         :
// // // // // //                                         "Select a floor"
// // // // // //                   }
// // // // // //                 />
// // // // // //               </SelectTrigger>
// // // // // //               <SelectContent>
// // // // // //                 {floors.map((f) => (
// // // // // //                   <SelectItem key={f.id} value={String(f.id)} className="text-[13px]">
// // // // // //                     {f.name}
// // // // // //                   </SelectItem>
// // // // // //                 ))}
// // // // // //               </SelectContent>
// // // // // //             </Select>
// // // // // //           </div>

// // // // // //           {/* Seat */}
// // // // // //           <div className="grid gap-1.5">
// // // // // //             <Label className="text-[12.5px] font-medium text-gray-700">
// // // // // //               Seat <span className="text-red-400">*</span>
// // // // // //             </Label>
// // // // // //             <Select
// // // // // //               value={form.seat_id}
// // // // // //               onValueChange={set("seat_id")}
// // // // // //               disabled={!form.floor_id || !form.booking_date || loadingSeats}
// // // // // //             >
// // // // // //               <SelectTrigger className="text-[13px]">
// // // // // //                 <SelectValue
// // // // // //                   placeholder={
// // // // // //                     !form.floor_id || !form.booking_date
// // // // // //                       ? "Select a floor & date first"
// // // // // //                       : loadingSeats
// // // // // //                         ? "Loading seats…"
// // // // // //                         : seats.length === 0
// // // // // //                           ? "No available seats"
// // // // // //                           : "Select a seat"
// // // // // //                   }
// // // // // //                 />
// // // // // //               </SelectTrigger>
// // // // // //               <SelectContent>
// // // // // //                 {seats.map((s) => (
// // // // // //                   <SelectItem key={s.id} value={String(s.id)} className="text-[13px]">
// // // // // //                     {s.label}
// // // // // //                     {s.amenities?.length > 0 && (
// // // // // //                       <span className="text-gray-400 ml-1.5 text-[11px]">
// // // // // //                         · {s.amenities.slice(0, 2).join(", ")}
// // // // // //                       </span>
// // // // // //                     )}
// // // // // //                   </SelectItem>
// // // // // //                 ))}
// // // // // //               </SelectContent>
// // // // // //             </Select>
// // // // // //           </div>

// // // // // //           {error && (
// // // // // //             <p className="text-red-500 text-[12px] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
// // // // // //               {error}
// // // // // //             </p>
// // // // // //           )}
// // // // // //         </div>

// // // // // //         <DialogFooter className="gap-2">
// // // // // //           <Button
// // // // // //             variant="outline"
// // // // // //             onClick={onClose}
// // // // // //             disabled={submitting}
// // // // // //             className="text-[12.5px]"
// // // // // //           >
// // // // // //             Cancel
// // // // // //           </Button>
// // // // // //           <Button
// // // // // //             onClick={handleSubmit}
// // // // // //             disabled={submitting}
// // // // // //             className="bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px]"
// // // // // //           >
// // // // // //             {submitting ? "Saving…" : "Save Changes"}
// // // // // //           </Button>
// // // // // //         </DialogFooter>
// // // // // //       </DialogContent>
// // // // // //     </Dialog>
// // // // // //   );
// // // // // // };

// // // // // // // ── Booking card ──────────────────────────────────────────────────────────────

// // // // // // interface BookingCardProps {
// // // // // //   booking:       Booking;
// // // // // //   onCancelClick: (booking: Booking) => void;
// // // // // //   onModifyClick: (booking: Booking) => void;
// // // // // //   showActions?:  boolean;
// // // // // // }

// // // // // // const BookingCard: React.FC<BookingCardProps> = ({
// // // // // //   booking,
// // // // // //   onCancelClick,
// // // // // //   onModifyClick,
// // // // // //   showActions = true,
// // // // // // }) => {
// // // // // //   const isCancelled = booking.status === "cancelled";

// // // // // //   return (
// // // // // //     <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col hover:shadow-sm transition-shadow duration-200">
// // // // // //       <div className="flex items-stretch">
// // // // // //         {/* Left accent bar */}
// // // // // //         <div className={cn(
// // // // // //           "w-[3px] shrink-0",
// // // // // //           isCancelled
// // // // // //             ? "bg-gray-200"
// // // // // //             : booking.status === "pending"
// // // // // //               ? "bg-amber-400"
// // // // // //               : "bg-indigo-500",
// // // // // //         )} />

// // // // // //         <div className="flex-1 px-5 py-4">
// // // // // //           {/* Row 1: title + booked-on */}
// // // // // //           <div className="flex justify-between items-start gap-4">
// // // // // //             <div>
// // // // // //               <p className="text-[13.5px] font-semibold text-[#1A1A2E]">
// // // // // //                 {booking.location} · {booking.floor} · Seat {booking.seat}
// // // // // //               </p>
// // // // // //               <p className="text-[12px] text-gray-500 mt-0.5">
// // // // // //                 {formatDate(booking.date)}
// // // // // //                 {" · "}
// // // // // //                 {booking.isFullDay
// // // // // //                   ? "Full day"
// // // // // //                   : `${booking.startTime} – ${booking.endTime}`}
// // // // // //                 {booking.isFullDay && (
// // // // // //                   <span className="ml-2 text-[11px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
// // // // // //                     Full day
// // // // // //                   </span>
// // // // // //                 )}
// // // // // //               </p>
// // // // // //             </div>
// // // // // //             <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5">
// // // // // //               Booked {booking.bookedOn}
// // // // // //             </span>
// // // // // //           </div>

// // // // // //           {/* Row 2: tags */}
// // // // // //           <div className="flex gap-1.5 flex-wrap mt-2.5">
// // // // // //             {booking.tags.map((tag, i) => (
// // // // // //               <BookingTagChip key={i} label={tag.label} variant={tag.variant} />
// // // // // //             ))}
// // // // // //             {booking.isRecurring && booking.recurringPattern && (
// // // // // //               <BookingTagChip label={booking.recurringPattern} variant="recurring" />
// // // // // //             )}
// // // // // //           </div>
// // // // // //         </div>
// // // // // //       </div>

// // // // // //       {/* Action footer */}
// // // // // //       {showActions && !isCancelled && (
// // // // // //         <div className="flex justify-end gap-2 px-5 py-2.5 border-t border-gray-100 bg-[#F7F8FC]">
// // // // // //           <Button
// // // // // //             variant="outline"
// // // // // //             size="sm"
// // // // // //             className="h-7 px-4 text-[12.5px] text-gray-600"
// // // // // //             onClick={() => onModifyClick(booking)}
// // // // // //           >
// // // // // //             Modify
// // // // // //           </Button>
// // // // // //           <Button
// // // // // //             variant="outline"
// // // // // //             size="sm"
// // // // // //             className="h-7 px-4 text-[12.5px] border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 hover:border-red-300"
// // // // // //             onClick={() => onCancelClick(booking)}
// // // // // //           >
// // // // // //             Cancel
// // // // // //           </Button>
// // // // // //         </div>
// // // // // //       )}

// // // // // //       {showActions && isCancelled && (
// // // // // //         <div className="flex justify-end px-5 py-2.5 border-t border-gray-100">
// // // // // //           <Button variant="outline" size="sm" className="h-7 px-4 text-[12.5px] text-gray-600">
// // // // // //             View details
// // // // // //           </Button>
// // // // // //         </div>
// // // // // //       )}
// // // // // //     </div>
// // // // // //   );
// // // // // // };

// // // // // // // ── Stat card ─────────────────────────────────────────────────────────────────

// // // // // // interface StatCardProps {
// // // // // //   label:       string;
// // // // // //   value:       number | string;
// // // // // //   subLabel?:   string;
// // // // // //   icon:        React.ReactNode;
// // // // // //   accentClass: string;
// // // // // // }

// // // // // // const StatCard: React.FC<StatCardProps> = ({
// // // // // //   label, value, subLabel, icon, accentClass,
// // // // // // }) => (
// // // // // //   <div className={cn(
// // // // // //     "flex-1 bg-white border border-[#EBEBF5] rounded-xl p-4 flex flex-col gap-1 min-w-[160px]",
// // // // // //     "border-l-[3px]", accentClass,
// // // // // //   )}>
// // // // // //     <div className="flex justify-between items-center mb-1">
// // // // // //       <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
// // // // // //         {label}
// // // // // //       </span>
// // // // // //       <span className="text-gray-400">{icon}</span>
// // // // // //     </div>
// // // // // //     <div className="text-[26px] font-bold text-[#1A1A2E] leading-none">{value}</div>
// // // // // //     {subLabel && (
// // // // // //       <div className="text-[11.5px] text-gray-400 mt-1">{subLabel}</div>
// // // // // //     )}
// // // // // //   </div>
// // // // // // );

// // // // // // // ── Tabs ──────────────────────────────────────────────────────────────────────

// // // // // // const TABS: { id: BookingTab; label: string }[] = [
// // // // // //   { id: "upcoming",  label: "Upcoming"  },
// // // // // //   { id: "past",      label: "Past"      },
// // // // // //   { id: "cancelled", label: "Cancelled" },
// // // // // // ];

// // // // // // // ── Icons ─────────────────────────────────────────────────────────────────────

// // // // // // const CalIcon = () => (
// // // // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// // // // // //     <rect x="3" y="4" width="18" height="18" rx="2" />
// // // // // //     <path d="M16 2v4M8 2v4M3 10h18" />
// // // // // //   </svg>
// // // // // // );
// // // // // // const CheckIcon = () => (
// // // // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
// // // // // //     <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
// // // // // //   </svg>
// // // // // // );
// // // // // // const UsersIcon = () => (
// // // // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// // // // // //     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
// // // // // //     <circle cx="9" cy="7" r="4" />
// // // // // //     <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
// // // // // //     <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
// // // // // //   </svg>
// // // // // // );
// // // // // // const RefreshIcon = () => (
// // // // // //   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
// // // // // //     <path
// // // // // //       d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
// // // // // //       strokeLinecap="round"
// // // // // //       strokeLinejoin="round"
// // // // // //     />
// // // // // //   </svg>
// // // // // // );

// // // // // // // ── Page ──────────────────────────────────────────────────────────────────────

// // // // // // const MyBookingsPage: React.FC = () => {
// // // // // //   const {
// // // // // //     displayedBookings,
// // // // // //     summary,
// // // // // //     activeTab,
// // // // // //     isLoading,
// // // // // //     error,
// // // // // //     setActiveTab,
// // // // // //     handleCancelBooking,
// // // // // //     refreshBookings,
// // // // // //   } = useBookings();

// // // // // //   const { user } = useAuthContext();

// // // // // //   const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
// // // // // //   const [modifyTarget, setModifyTarget] = useState<Booking | null>(null);

// // // // // //   // Upcoming tab: split into future (ascending) + past section (descending)
// // // // // //   const upcomingCards = sortByDate(
// // // // // //     displayedBookings.filter((b) => b.status !== "cancelled" && isUpcoming(b.date)),
// // // // // //     true,
// // // // // //   );
// // // // // //   const pastCards = sortByDate(
// // // // // //     displayedBookings.filter((b) => b.status !== "cancelled" && !isUpcoming(b.date)),
// // // // // //     false,
// // // // // //   );

// // // // // //   // All other tabs — descending for past, ascending otherwise
// // // // // //   const sortedDisplayed = sortByDate(displayedBookings, activeTab !== "past");

// // // // // //   // ── Handlers ──────────────────────────────────────────────────────────────

// // // // // //   const handleConfirmCancel = async (reason: string) => {
// // // // // //     if (!cancelTarget) return;
// // // // // //     await cancelBooking(cancelTarget.id, reason);
// // // // // //     await handleCancelBooking(cancelTarget.id);
// // // // // //     setCancelTarget(null);
// // // // // //   };

// // // // // //   const handleConfirmModify = async (form: ModifyForm) => {
// // // // // //     if (!modifyTarget) return;
// // // // // //     const payload: ModifyBookingPayload = {
// // // // // //       booking_date: form.booking_date,
// // // // // //       site_id:      Number(form.site_id),
// // // // // //       building_id:  Number(form.building_id),
// // // // // //       floor_id:     Number(form.floor_id),
// // // // // //       seat_id:      Number(form.seat_id),
// // // // // //     };
// // // // // //     await modifyBooking(modifyTarget.id, payload);
// // // // // //     setModifyTarget(null);
// // // // // //     refreshBookings();
// // // // // //   };

// // // // // //   // ── Render ────────────────────────────────────────────────────────────────

// // // // // //   return (
// // // // // //     <SidebarProvider>
// // // // // //       <div className="flex h-screen bg-[#F7F8FC] font-sans overflow-hidden w-full">
// // // // // //         <AppSidebar user={user} />

// // // // // //         <main className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">

// // // // // //           {/* Header */}
// // // // // //           <div className="flex justify-between items-center">
// // // // // //             <div>
// // // // // //               <h1 className="text-[20px] font-bold text-[#1A1A2E] leading-tight">
// // // // // //                 My Bookings
// // // // // //               </h1>
// // // // // //               <p className="text-[12.5px] text-gray-400 mt-0.5">
// // // // // //                 Your upcoming and past seat reservations
// // // // // //               </p>
// // // // // //             </div>
// // // // // //             <div className="flex gap-2.5 items-center">
// // // // // //               <Button variant="outline" size="sm" className="h-8 text-[12.5px] text-gray-600">
// // // // // //                 Export CSV
// // // // // //               </Button>
// // // // // //               <Button
// // // // // //                 size="sm"
// // // // // //                 className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold gap-1.5"
// // // // // //               >
// // // // // //                 <span className="text-base leading-none">+</span>
// // // // // //                 New booking
// // // // // //               </Button>
// // // // // //               <Button
// // // // // //                 variant="outline"
// // // // // //                 size="icon"
// // // // // //                 className="h-8 w-8 text-gray-400"
// // // // // //                 onClick={refreshBookings}
// // // // // //               >
// // // // // //                 <RefreshIcon />
// // // // // //               </Button>
// // // // // //             </div>
// // // // // //           </div>

// // // // // //           {/* Stat cards */}
// // // // // //           <div className="flex gap-4">
// // // // // //             <StatCard
// // // // // //               label="Upcoming"
// // // // // //               value={summary.upcomingCount}
// // // // // //               subLabel={summary.nextBookingDate ?? undefined}
// // // // // //               icon={<CalIcon />}
// // // // // //               accentClass="border-l-indigo-400"
// // // // // //             />
// // // // // //             <StatCard
// // // // // //               label="Completed this month"
// // // // // //               value={summary.completedThisMonth}
// // // // // //               subLabel={`${summary.daysInOffice} days in office`}
// // // // // //               icon={<CheckIcon />}
// // // // // //               accentClass="border-l-emerald-400"
// // // // // //             />
// // // // // //             <StatCard
// // // // // //               label="Team in office today"
// // // // // //               value={summary.teamInOffice ?? 0}
// // // // // //               subLabel={
// // // // // //                 (summary.teamInOffice ?? 0) === 1
// // // // // //                   ? "1 teammate present"
// // // // // //                   : `${summary.teamInOffice ?? 0} teammates present`
// // // // // //               }
// // // // // //               icon={<UsersIcon />}
// // // // // //               accentClass="border-l-violet-400"
// // // // // //             />
// // // // // //           </div>

// // // // // //           {/* Tabs */}
// // // // // //           <div className="flex border-b border-[#EBEBF5]">
// // // // // //             {TABS.map((tab) => (
// // // // // //               <button
// // // // // //                 key={tab.id}
// // // // // //                 onClick={() => setActiveTab(tab.id)}
// // // // // //                 className={cn(
// // // // // //                   "px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150",
// // // // // //                   activeTab === tab.id
// // // // // //                     ? "border-indigo-600 text-indigo-600 font-semibold"
// // // // // //                     : "border-transparent text-gray-500 hover:text-gray-700",
// // // // // //                 )}
// // // // // //               >
// // // // // //                 {tab.label}
// // // // // //               </button>
// // // // // //             ))}
// // // // // //           </div>

// // // // // //           {/* Content */}
// // // // // //           <div className="flex flex-col gap-3">

// // // // // //             {isLoading && (
// // // // // //               <div className="text-center py-12 text-gray-400 text-[13.5px]">
// // // // // //                 Loading bookings…
// // // // // //               </div>
// // // // // //             )}

// // // // // //             {error && (
// // // // // //               <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-500 text-[13px]">
// // // // // //                 {error}
// // // // // //               </div>
// // // // // //             )}

// // // // // //             {!isLoading && !error && displayedBookings.length === 0 && (
// // // // // //               <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// // // // // //                 No {activeTab} bookings found.
// // // // // //               </div>
// // // // // //             )}

// // // // // //             {/* Upcoming tab */}
// // // // // //             {!isLoading && !error && activeTab === "upcoming" && (
// // // // // //               <>
// // // // // //                 {upcomingCards.length > 0 ? (
// // // // // //                   upcomingCards.map((booking) => (
// // // // // //                     <BookingCard
// // // // // //                       key={booking.id}
// // // // // //                       booking={booking}
// // // // // //                       onCancelClick={setCancelTarget}
// // // // // //                       onModifyClick={setModifyTarget}
// // // // // //                       showActions
// // // // // //                     />
// // // // // //                   ))
// // // // // //                 ) : (
// // // // // //                   <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// // // // // //                     No upcoming bookings.
// // // // // //                   </div>
// // // // // //                 )}

// // // // // //                 {pastCards.length > 0 && (
// // // // // //                   <>
// // // // // //                     <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-2">
// // // // // //                       Past Bookings
// // // // // //                     </p>
// // // // // //                     {pastCards.map((booking) => (
// // // // // //                       <BookingCard
// // // // // //                         key={booking.id}
// // // // // //                         booking={booking}
// // // // // //                         onCancelClick={setCancelTarget}
// // // // // //                         onModifyClick={setModifyTarget}
// // // // // //                         showActions={false}
// // // // // //                       />
// // // // // //                     ))}
// // // // // //                   </>
// // // // // //                 )}
// // // // // //               </>
// // // // // //             )}

// // // // // //             {/* All other tabs */}
// // // // // //             {!isLoading && !error && activeTab !== "upcoming" &&
// // // // // //               sortedDisplayed.map((booking) => (
// // // // // //                 <BookingCard
// // // // // //                   key={booking.id}
// // // // // //                   booking={booking}
// // // // // //                   onCancelClick={setCancelTarget}
// // // // // //                   onModifyClick={setModifyTarget}
// // // // // //                   showActions={activeTab !== "past"}
// // // // // //                 />
// // // // // //               ))
// // // // // //             }
// // // // // //           </div>
// // // // // //         </main>
// // // // // //       </div>

// // // // // //       {/* Dialogs */}
// // // // // //       <CancelDialog
// // // // // //         open={cancelTarget !== null}
// // // // // //         booking={cancelTarget}
// // // // // //         onConfirm={handleConfirmCancel}
// // // // // //         onClose={() => setCancelTarget(null)}
// // // // // //       />
// // // // // //       <ModifyDialog
// // // // // //         open={modifyTarget !== null}
// // // // // //         booking={modifyTarget}
// // // // // //         onConfirm={handleConfirmModify}
// // // // // //         onClose={() => setModifyTarget(null)}
// // // // // //       />
// // // // // //     </SidebarProvider>
// // // // // //   );
// // // // // // };

// // // // // // export default MyBookingsPage;

// // // // // "use client";

// // // // // import React, { useState } from "react";
// // // // // import { Booking, BookingTab } from "../types/bookings.types";
// // // // // import { useBookings } from "../hooks/useBookings";
// // // // // import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// // // // // import { useAuthContext } from "@/features/auth/context/AuthContext";
// // // // // import { SidebarProvider } from "@/components/ui/sidebar";
// // // // // import { cn } from "@/lib/utils";
// // // // // import {
// // // // //   cancelBooking,
// // // // //   modifyBooking,
// // // // //   type ModifyBookingPayload,
// // // // // } from "../services/bookings.service";


// // // // // import {
// // // // //   AlertDialog,
// // // // //   AlertDialogAction,
// // // // //   AlertDialogCancel,
// // // // //   AlertDialogContent,
// // // // //   AlertDialogDescription,
// // // // //   AlertDialogFooter,
// // // // //   AlertDialogHeader,
// // // // //   AlertDialogTitle,
// // // // // } from "@/components/ui/alert-dialog";
// // // // // import {
// // // // //   Dialog,
// // // // //   DialogContent,
// // // // //   DialogDescription,
// // // // //   DialogFooter,
// // // // //   DialogHeader,
// // // // //   DialogTitle,
// // // // // } from "@/components/ui/dialog";
// // // // // import {
// // // // //   Select,
// // // // //   SelectContent,
// // // // //   SelectItem,
// // // // //   SelectTrigger,
// // // // //   SelectValue,
// // // // // } from "@/components/ui/select";
// // // // // import { Button }   from "@/components/ui/button";
// // // // // import { Input }    from "@/components/ui/input";
// // // // // import { Label }    from "@/components/ui/label";
// // // // // import { Textarea } from "@/components/ui/textarea";
// // // // // import { Building, Floor, Seat, Site } from "@/features/book/types/Bookingform.types";
// // // // // import { fetchBuildings, fetchFloors, fetchSeatsWithAvailability, fetchSites } from "@/features/book/services/Bookingform.service";

// // // // // // ── Helpers ───────────────────────────────────────────────────────────────────

// // // // // function formatDate(iso: string): string {
// // // // //   const d = new Date(iso + "T00:00:00");
// // // // //   return d.toLocaleDateString("en-US", {
// // // // //     weekday: "short",
// // // // //     month:   "short",
// // // // //     day:     "numeric",
// // // // //   });
// // // // // }

// // // // // function isUpcoming(isoDate: string): boolean {
// // // // //   const today = new Date();
// // // // //   today.setHours(0, 0, 0, 0);
// // // // //   return new Date(isoDate + "T00:00:00") >= today;
// // // // // }

// // // // // function sortByDate(bookings: Booking[], ascending = true): Booking[] {
// // // // //   return [...bookings].sort((a, b) => {
// // // // //     const da = new Date(a.date + "T00:00:00").getTime();
// // // // //     const db = new Date(b.date + "T00:00:00").getTime();
// // // // //     return ascending ? da - db : db - da;
// // // // //   });
// // // // // }

// // // // // // ── Tag chip ──────────────────────────────────────────────────────────────────

// // // // // interface TagProps { label: string; variant: string; }

// // // // // const TAG_STYLES: Record<string, string> = {
// // // // //   confirmed: "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]",
// // // // //   manager:   "bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]",
// // // // //   zone:      "bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]",
// // // // //   sprint:    "bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]",
// // // // //   recurring: "bg-[#E8EAF6] text-[#283593] border border-[#9FA8DA]",
// // // // // };

// // // // // const BookingTagChip: React.FC<TagProps> = ({ label, variant }) => (
// // // // //   <span className={cn(
// // // // //     "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
// // // // //     TAG_STYLES[variant] ?? TAG_STYLES.zone,
// // // // //   )}>
// // // // //     {label}
// // // // //   </span>
// // // // // );

// // // // // // ── Cancel Dialog ─────────────────────────────────────────────────────────────

// // // // // interface CancelDialogProps {
// // // // //   open:      boolean;
// // // // //   booking:   Booking | null;
// // // // //   onConfirm: (reason: string) => Promise<void>;
// // // // //   onClose:   () => void;
// // // // // }

// // // // // const CancelDialog: React.FC<CancelDialogProps> = ({
// // // // //   open, booking, onConfirm, onClose,
// // // // // }) => {
// // // // //   const [reason,  setReason]  = useState("");
// // // // //   const [loading, setLoading] = useState(false);

// // // // //   const handleConfirm = async () => {
// // // // //     setLoading(true);
// // // // //     try {
// // // // //       await onConfirm(reason);
// // // // //       setReason("");
// // // // //     } finally {
// // // // //       setLoading(false);
// // // // //     }
// // // // //   };

// // // // //   const handleOpenChange = (val: boolean) => {
// // // // //     if (!val) { setReason(""); onClose(); }
// // // // //   };

// // // // //   return (
// // // // //     <AlertDialog open={open} onOpenChange={handleOpenChange}>
// // // // //       <AlertDialogContent className="max-w-md">
// // // // //         <AlertDialogHeader>
// // // // //           <AlertDialogTitle className="text-[#1A1A2E]">Cancel Booking</AlertDialogTitle>
// // // // //           <AlertDialogDescription className="text-gray-500 text-[13px]">
// // // // //             {booking && (
// // // // //               <span>
// // // // //                 Are you sure you want to cancel your booking at{" "}
// // // // //                 <strong className="text-gray-700">
// // // // //                   {booking.location} · {booking.floor} · Seat {booking.seat}
// // // // //                 </strong>{" "}
// // // // //                 on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
// // // // //                 This action cannot be undone.
// // // // //               </span>
// // // // //             )}
// // // // //           </AlertDialogDescription>
// // // // //         </AlertDialogHeader>

// // // // //         <div className="py-2">
// // // // //           <Label
// // // // //             htmlFor="cancel-reason"
// // // // //             className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
// // // // //           >
// // // // //             Reason for cancellation{" "}
// // // // //             <span className="text-gray-400 font-normal">(optional)</span>
// // // // //           </Label>
// // // // //           <Textarea
// // // // //             id="cancel-reason"
// // // // //             placeholder="e.g. Working from home, schedule change…"
// // // // //             value={reason}
// // // // //             onChange={(e) => setReason(e.target.value)}
// // // // //             className="text-[13px] resize-none h-20"
// // // // //           />
// // // // //         </div>

// // // // //         <AlertDialogFooter>
// // // // //           <AlertDialogCancel
// // // // //             onClick={() => { setReason(""); onClose(); }}
// // // // //             className="text-[12.5px]"
// // // // //           >
// // // // //             Keep Booking
// // // // //           </AlertDialogCancel>
// // // // //           <AlertDialogAction
// // // // //             onClick={handleConfirm}
// // // // //             disabled={loading}
// // // // //             className="bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50"
// // // // //           >
// // // // //             {loading ? "Cancelling…" : "Yes, Cancel"}
// // // // //           </AlertDialogAction>
// // // // //         </AlertDialogFooter>
// // // // //       </AlertDialogContent>
// // // // //     </AlertDialog>
// // // // //   );
// // // // // };

// // // // // // ── Modify Dialog ─────────────────────────────────────────────────────────────

// // // // // interface ModifyForm {
// // // // //   booking_date: string;
// // // // //   site_id:      string;
// // // // //   building_id:  string;
// // // // //   floor_id:     string;
// // // // //   seat_id:      string;
// // // // // }

// // // // // interface ModifyDialogProps {
// // // // //   open:      boolean;
// // // // //   booking:   Booking | null;
// // // // //   onConfirm: (form: ModifyForm) => Promise<void>;
// // // // //   onClose:   () => void;
// // // // // }

// // // // // const ModifyDialog: React.FC<ModifyDialogProps> = ({
// // // // //   open, booking, onConfirm, onClose,
// // // // // }) => {
// // // // //   const [form, setForm] = useState<ModifyForm>({
// // // // //     booking_date: "",
// // // // //     site_id:      "",
// // // // //     building_id:  "",
// // // // //     floor_id:     "",
// // // // //     seat_id:      "",
// // // // //   });

// // // // //   const [sites,     setSites]     = useState<Site[]>([]);
// // // // //   const [buildings, setBuildings] = useState<Building[]>([]);
// // // // //   const [floors,    setFloors]    = useState<Floor[]>([]);
// // // // //   const [seats,     setSeats]     = useState<Seat[]>([]);

// // // // //   const [loadingSites,     setLoadingSites]     = useState(false);
// // // // //   const [loadingBuildings, setLoadingBuildings] = useState(false);
// // // // //   const [loadingFloors,    setLoadingFloors]    = useState(false);
// // // // //   const [loadingSeats,     setLoadingSeats]     = useState(false);
// // // // //   const [submitting,       setSubmitting]       = useState(false);
// // // // //   const [error,            setError]            = useState<string | null>(null);

// // // // //   // Reset + load sites when dialog opens
// // // // //   React.useEffect(() => {
// // // // //     if (!open || !booking) return;

// // // // //     setForm({
// // // // //       booking_date: booking.date,
// // // // //       site_id:      "",
// // // // //       building_id:  "",
// // // // //       floor_id:     "",
// // // // //       seat_id:      "",
// // // // //     });
// // // // //     setBuildings([]);
// // // // //     setFloors([]);
// // // // //     setSeats([]);
// // // // //     setError(null);

// // // // //     setLoadingSites(true);
// // // // //     fetchSites()
// // // // //       .then(setSites)
// // // // //       .catch(() => setError("Failed to load sites."))
// // // // //       .finally(() => setLoadingSites(false));
// // // // //   }, [open, booking]);

// // // // //   // Cascade: site → buildings
// // // // //   React.useEffect(() => {
// // // // //     if (!form.site_id) {
// // // // //       setBuildings([]);
// // // // //       setFloors([]);
// // // // //       setSeats([]);
// // // // //       return;
// // // // //     }
// // // // //     setForm((p) => ({ ...p, building_id: "", floor_id: "", seat_id: "" }));
// // // // //     setFloors([]);
// // // // //     setSeats([]);
// // // // //     setLoadingBuildings(true);
// // // // //     fetchBuildings(form.site_id)
// // // // //       .then(setBuildings)
// // // // //       .catch(() => setError("Failed to load buildings."))
// // // // //       .finally(() => setLoadingBuildings(false));
// // // // //   }, [form.site_id]);

// // // // //   // Cascade: building → floors
// // // // //   React.useEffect(() => {
// // // // //     if (!form.building_id) {
// // // // //       setFloors([]);
// // // // //       setSeats([]);
// // // // //       return;
// // // // //     }
// // // // //     setForm((p) => ({ ...p, floor_id: "", seat_id: "" }));
// // // // //     setSeats([]);
// // // // //     setLoadingFloors(true);
// // // // //     fetchFloors(form.building_id)
// // // // //       .then(setFloors)
// // // // //       .catch(() => setError("Failed to load floors."))
// // // // //       .finally(() => setLoadingFloors(false));
// // // // //   }, [form.building_id]);

// // // // //   // Cascade: floor + date → seats
// // // // //   React.useEffect(() => {
// // // // //     if (!form.floor_id || !form.booking_date) {
// // // // //       setSeats([]);
// // // // //       return;
// // // // //     }
// // // // //     setForm((p) => ({ ...p, seat_id: "" }));
// // // // //     setLoadingSeats(true);
// // // // //     fetchSeatsWithAvailability({
// // // // //       floorId:  form.floor_id,
// // // // //       fromDate: form.booking_date,
// // // // //       toDate:   form.booking_date,
// // // // //     })
// // // // //       .then((fetched) => {
// // // // //         // Only show available seats in the modify dialog
// // // // //         setSeats(fetched.filter((s) => s.status === "available" || s.status === "yours"));
// // // // //       })
// // // // //       .catch(() => setError("Failed to load seats."))
// // // // //       .finally(() => setLoadingSeats(false));
// // // // //   }, [form.floor_id, form.booking_date]);

// // // // //   // shadcn Select onValueChange gives plain string — no null
// // // // //   const set = (field: keyof ModifyForm) => (val: string) => {
// // // // //     setError(null);
// // // // //     setForm((p) => ({ ...p, [field]: val }));
// // // // //   };

// // // // //   const handleSubmit = async () => {
// // // // //     const { booking_date, site_id, building_id, floor_id, seat_id } = form;
// // // // //     if (!booking_date || !site_id || !building_id || !floor_id || !seat_id) {
// // // // //       setError("Please complete all fields.");
// // // // //       return;
// // // // //     }
// // // // //     setSubmitting(true);
// // // // //     try {
// // // // //       await onConfirm(form);
// // // // //       onClose();
// // // // //     } catch (err: any) {
// // // // //       setError(
// // // // //         err?.response?.data?.detail?.message ??
// // // // //         "Failed to modify booking. Please try again.",
// // // // //       );
// // // // //     } finally {
// // // // //       setSubmitting(false);
// // // // //     }
// // // // //   };

// // // // //   return (
// // // // //     <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
// // // // //       <DialogContent className="max-w-md">
// // // // //         <DialogHeader>
// // // // //           <DialogTitle className="text-[#1A1A2E]">Modify Booking</DialogTitle>
// // // // //           <DialogDescription className="text-[13px] text-gray-500">
// // // // //             {booking && (
// // // // //               <>
// // // // //                 Currently:{" "}
// // // // //                 <strong className="text-gray-700">
// // // // //                   {booking.location} · {booking.floor} · Seat {booking.seat}
// // // // //                 </strong>{" "}
// // // // //                 on{" "}
// // // // //                 <strong className="text-gray-700">{formatDate(booking.date)}</strong>.
// // // // //                 Update any field below.
// // // // //               </>
// // // // //             )}
// // // // //           </DialogDescription>
// // // // //         </DialogHeader>

// // // // //         <div className="grid gap-4 py-2">

// // // // //           {/* Date */}
// // // // //           <div className="grid gap-1.5">
// // // // //             <Label htmlFor="mod-date" className="text-[12.5px] font-medium text-gray-700">
// // // // //               New Date <span className="text-red-400">*</span>
// // // // //             </Label>
// // // // //             <Input
// // // // //               id="mod-date"
// // // // //               type="date"
// // // // //               value={form.booking_date}
// // // // //               onChange={(e) => set("booking_date")(e.target.value)}
// // // // //               className="text-[13px]"
// // // // //               min={new Date().toISOString().split("T")[0]}
// // // // //             />
// // // // //           </div>

// // // // //           {/* Site */}
// // // // //           <div className="grid gap-1.5">
// // // // //             <Label className="text-[12.5px] font-medium text-gray-700">
// // // // //               Site <span className="text-red-400">*</span>
// // // // //             </Label>
// // // // //             <Select
// // // // //               value={form.site_id}
// // // // //               onValueChange={set("site_id")}
// // // // //               disabled={loadingSites || sites.length === 0}
// // // // //             >
// // // // //               <SelectTrigger className="text-[13px]">
// // // // //                 <SelectValue
// // // // //                   placeholder={loadingSites ? "Loading sites…" : "Select a site"}
// // // // //                 />
// // // // //               </SelectTrigger>
// // // // //               <SelectContent>
// // // // //                 {sites.map((s) => (
// // // // //                   <SelectItem key={s.id} value={String(s.id)} className="text-[13px]">
// // // // //                     {s.name}{s.city ? ` — ${s.city}` : ""}
// // // // //                   </SelectItem>
// // // // //                 ))}
// // // // //               </SelectContent>
// // // // //             </Select>
// // // // //           </div>

// // // // //           {/* Building */}
// // // // //           <div className="grid gap-1.5">
// // // // //             <Label className="text-[12.5px] font-medium text-gray-700">
// // // // //               Building <span className="text-red-400">*</span>
// // // // //             </Label>
// // // // //             <Select
// // // // //               value={form.building_id}
// // // // //               onValueChange={set("building_id")}
// // // // //               disabled={!form.site_id || loadingBuildings}
// // // // //             >
// // // // //               <SelectTrigger className="text-[13px]">
// // // // //                 <SelectValue
// // // // //                   placeholder={
// // // // //                     !form.site_id    ? "Select a site first"  :
// // // // //                     loadingBuildings ? "Loading buildings…"   :
// // // // //                                        "Select a building"
// // // // //                   }
// // // // //                 />
// // // // //               </SelectTrigger>
// // // // //               <SelectContent>
// // // // //                 {buildings.map((b) => (
// // // // //                   <SelectItem key={b.id} value={String(b.id)} className="text-[13px]">
// // // // //                     {b.name}
// // // // //                   </SelectItem>
// // // // //                 ))}
// // // // //               </SelectContent>
// // // // //             </Select>
// // // // //           </div>

// // // // //           {/* Floor */}
// // // // //           <div className="grid gap-1.5">
// // // // //             <Label className="text-[12.5px] font-medium text-gray-700">
// // // // //               Floor <span className="text-red-400">*</span>
// // // // //             </Label>
// // // // //             <Select
// // // // //               value={form.floor_id}
// // // // //               onValueChange={set("floor_id")}
// // // // //               disabled={!form.building_id || loadingFloors}
// // // // //             >
// // // // //               <SelectTrigger className="text-[13px]">
// // // // //                 <SelectValue
// // // // //                   placeholder={
// // // // //                     !form.building_id ? "Select a building first" :
// // // // //                     loadingFloors     ? "Loading floors…"         :
// // // // //                                         "Select a floor"
// // // // //                   }
// // // // //                 />
// // // // //               </SelectTrigger>
// // // // //               <SelectContent>
// // // // //                 {floors.map((f) => (
// // // // //                   <SelectItem key={f.id} value={String(f.id)} className="text-[13px]">
// // // // //                     {f.name}
// // // // //                   </SelectItem>
// // // // //                 ))}
// // // // //               </SelectContent>
// // // // //             </Select>
// // // // //           </div>

// // // // //           {/* Seat */}
// // // // //           <div className="grid gap-1.5">
// // // // //             <Label className="text-[12.5px] font-medium text-gray-700">
// // // // //               Seat <span className="text-red-400">*</span>
// // // // //             </Label>
// // // // //             <Select
// // // // //               value={form.seat_id}
// // // // //               onValueChange={set("seat_id")}
// // // // //               disabled={!form.floor_id || !form.booking_date || loadingSeats}
// // // // //             >
// // // // //               <SelectTrigger className="text-[13px]">
// // // // //                 <SelectValue
// // // // //                   placeholder={
// // // // //                     !form.floor_id || !form.booking_date
// // // // //                       ? "Select a floor & date first"
// // // // //                       : loadingSeats
// // // // //                         ? "Loading seats…"
// // // // //                         : seats.length === 0
// // // // //                           ? "No available seats"
// // // // //                           : "Select a seat"
// // // // //                   }
// // // // //                 />
// // // // //               </SelectTrigger>
// // // // //               <SelectContent>
// // // // //                 {seats.map((s) => (
// // // // //                   <SelectItem key={s.id} value={String(s.id)} className="text-[13px]">
// // // // //                     {s.label}
// // // // //                     {s.amenities?.length > 0 && (
// // // // //                       <span className="text-gray-400 ml-1.5 text-[11px]">
// // // // //                         · {s.amenities.slice(0, 2).join(", ")}
// // // // //                       </span>
// // // // //                     )}
// // // // //                   </SelectItem>
// // // // //                 ))}
// // // // //               </SelectContent>
// // // // //             </Select>
// // // // //           </div>

// // // // //           {error && (
// // // // //             <p className="text-red-500 text-[12px] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
// // // // //               {error}
// // // // //             </p>
// // // // //           )}
// // // // //         </div>

// // // // //         <DialogFooter className="gap-2">
// // // // //           <Button
// // // // //             variant="outline"
// // // // //             onClick={onClose}
// // // // //             disabled={submitting}
// // // // //             className="text-[12.5px]"
// // // // //           >
// // // // //             Cancel
// // // // //           </Button>
// // // // //           <Button
// // // // //             onClick={handleSubmit}
// // // // //             disabled={submitting}
// // // // //             className="bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px]"
// // // // //           >
// // // // //             {submitting ? "Saving…" : "Save Changes"}
// // // // //           </Button>
// // // // //         </DialogFooter>
// // // // //       </DialogContent>
// // // // //     </Dialog>
// // // // //   );
// // // // // };

// // // // // // ── Booking card ──────────────────────────────────────────────────────────────

// // // // // interface BookingCardProps {
// // // // //   booking:       Booking;
// // // // //   onCancelClick: (booking: Booking) => void;
// // // // //   onModifyClick: (booking: Booking) => void;
// // // // //   showActions?:  boolean;
// // // // // }

// // // // // const BookingCard: React.FC<BookingCardProps> = ({
// // // // //   booking,
// // // // //   onCancelClick,
// // // // //   onModifyClick,
// // // // //   showActions = true,
// // // // // }) => {
// // // // //   const isCancelled = booking.status === "cancelled";

// // // // //   return (
// // // // //     <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col hover:shadow-sm transition-shadow duration-200">
// // // // //       <div className="flex items-stretch">
// // // // //         {/* Left accent bar */}
// // // // //         <div className={cn(
// // // // //           "w-[3px] shrink-0",
// // // // //           isCancelled
// // // // //             ? "bg-gray-200"
// // // // //             : booking.status === "pending"
// // // // //               ? "bg-amber-400"
// // // // //               : "bg-indigo-500",
// // // // //         )} />

// // // // //         <div className="flex-1 px-5 py-4">
// // // // //           {/* Row 1: title + booked-on */}
// // // // //           <div className="flex justify-between items-start gap-4">
// // // // //             <div>
// // // // //               <p className="text-[13.5px] font-semibold text-[#1A1A2E]">
// // // // //                 {booking.location} · {booking.floor} · Seat {booking.seat}
// // // // //               </p>
// // // // //               <p className="text-[12px] text-gray-500 mt-0.5">
// // // // //                 {formatDate(booking.date)}
// // // // //                 {" · "}
// // // // //                 {booking.isFullDay
// // // // //                   ? "Full day"
// // // // //                   : `${booking.startTime} – ${booking.endTime}`}
// // // // //                 {booking.isFullDay && (
// // // // //                   <span className="ml-2 text-[11px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
// // // // //                     Full day
// // // // //                   </span>
// // // // //                 )}
// // // // //               </p>
// // // // //             </div>
// // // // //             <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5">
// // // // //               Booked {booking.bookedOn}
// // // // //             </span>
// // // // //           </div>

// // // // //           {/* Row 2: tags */}
// // // // //           <div className="flex gap-1.5 flex-wrap mt-2.5">
// // // // //             {booking.tags.map((tag, i) => (
// // // // //               <BookingTagChip key={i} label={tag.label} variant={tag.variant} />
// // // // //             ))}
// // // // //             {booking.isRecurring && booking.recurringPattern && (
// // // // //               <BookingTagChip label={booking.recurringPattern} variant="recurring" />
// // // // //             )}
// // // // //           </div>
// // // // //         </div>
// // // // //       </div>

// // // // //       {/* Action footer */}
// // // // //       {showActions && !isCancelled && (
// // // // //         <div className="flex justify-end gap-2 px-5 py-2.5 border-t border-gray-100 bg-[#F7F8FC]">
// // // // //           <Button
// // // // //             variant="outline"
// // // // //             size="sm"
// // // // //             className="h-7 px-4 text-[12.5px] text-gray-600"
// // // // //             onClick={() => onModifyClick(booking)}
// // // // //           >
// // // // //             Modify
// // // // //           </Button>
// // // // //           <Button
// // // // //             variant="outline"
// // // // //             size="sm"
// // // // //             className="h-7 px-4 text-[12.5px] border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 hover:border-red-300"
// // // // //             onClick={() => onCancelClick(booking)}
// // // // //           >
// // // // //             Cancel
// // // // //           </Button>
// // // // //         </div>
// // // // //       )}

// // // // //       {showActions && isCancelled && (
// // // // //         <div className="flex justify-end px-5 py-2.5 border-t border-gray-100">
// // // // //           <Button variant="outline" size="sm" className="h-7 px-4 text-[12.5px] text-gray-600">
// // // // //             View details
// // // // //           </Button>
// // // // //         </div>
// // // // //       )}
// // // // //     </div>
// // // // //   );
// // // // // };

// // // // // // ── Stat card ─────────────────────────────────────────────────────────────────

// // // // // interface StatCardProps {
// // // // //   label:       string;
// // // // //   value:       number | string;
// // // // //   subLabel?:   string;
// // // // //   icon:        React.ReactNode;
// // // // //   accentClass: string;
// // // // // }

// // // // // const StatCard: React.FC<StatCardProps> = ({
// // // // //   label, value, subLabel, icon, accentClass,
// // // // // }) => (
// // // // //   <div className={cn(
// // // // //     "flex-1 bg-white border border-[#EBEBF5] rounded-xl p-4 flex flex-col gap-1 min-w-[160px]",
// // // // //     "border-l-[3px]", accentClass,
// // // // //   )}>
// // // // //     <div className="flex justify-between items-center mb-1">
// // // // //       <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
// // // // //         {label}
// // // // //       </span>
// // // // //       <span className="text-gray-400">{icon}</span>
// // // // //     </div>
// // // // //     <div className="text-[26px] font-bold text-[#1A1A2E] leading-none">{value}</div>
// // // // //     {subLabel && (
// // // // //       <div className="text-[11.5px] text-gray-400 mt-1">{subLabel}</div>
// // // // //     )}
// // // // //   </div>
// // // // // );

// // // // // // ── Tabs ──────────────────────────────────────────────────────────────────────

// // // // // const TABS: { id: BookingTab; label: string }[] = [
// // // // //   { id: "upcoming",  label: "Upcoming"  },
// // // // //   { id: "past",      label: "Past"      },
// // // // //   { id: "cancelled", label: "Cancelled" },
// // // // // ];

// // // // // // ── Icons ─────────────────────────────────────────────────────────────────────

// // // // // const CalIcon = () => (
// // // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// // // // //     <rect x="3" y="4" width="18" height="18" rx="2" />
// // // // //     <path d="M16 2v4M8 2v4M3 10h18" />
// // // // //   </svg>
// // // // // );
// // // // // const CheckIcon = () => (
// // // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
// // // // //     <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
// // // // //   </svg>
// // // // // );
// // // // // const UsersIcon = () => (
// // // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// // // // //     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
// // // // //     <circle cx="9" cy="7" r="4" />
// // // // //     <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
// // // // //     <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
// // // // //   </svg>
// // // // // );
// // // // // const RefreshIcon = () => (
// // // // //   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
// // // // //     <path
// // // // //       d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
// // // // //       strokeLinecap="round"
// // // // //       strokeLinejoin="round"
// // // // //     />
// // // // //   </svg>
// // // // // );

// // // // // // ── Page ──────────────────────────────────────────────────────────────────────

// // // // // const MyBookingsPage: React.FC = () => {
// // // // //   const {
// // // // //     displayedBookings,
// // // // //     summary,
// // // // //     activeTab,
// // // // //     isLoading,
// // // // //     error,
// // // // //     setActiveTab,
// // // // //     handleCancelBooking,
// // // // //     refreshBookings,
// // // // //   } = useBookings();

// // // // //   const { user } = useAuthContext();

// // // // //   const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
// // // // //   const [modifyTarget, setModifyTarget] = useState<Booking | null>(null);

// // // // //   // Upcoming tab: split into future (ascending) + past section (descending)
// // // // //   const upcomingCards = sortByDate(
// // // // //     displayedBookings.filter((b) => b.status !== "cancelled" && isUpcoming(b.date)),
// // // // //     true,
// // // // //   );
// // // // //   const pastCards = sortByDate(
// // // // //     displayedBookings.filter((b) => b.status !== "cancelled" && !isUpcoming(b.date)),
// // // // //     false,
// // // // //   );

// // // // //   // All other tabs — descending for past, ascending otherwise
// // // // //   const sortedDisplayed = sortByDate(displayedBookings, activeTab !== "past");

// // // // //   // ── Handlers ──────────────────────────────────────────────────────────────

// // // // //   const handleConfirmCancel = async (reason: string) => {
// // // // //     if (!cancelTarget) return;
// // // // //     await cancelBooking(cancelTarget.id, reason);
// // // // //     await handleCancelBooking(cancelTarget.id);
// // // // //     setCancelTarget(null);
// // // // //   };

// // // // //   const handleConfirmModify = async (form: ModifyForm) => {
// // // // //     if (!modifyTarget) return;
// // // // //     const payload: ModifyBookingPayload = {
// // // // //       booking_date: form.booking_date,
// // // // //       site_id:      Number(form.site_id),
// // // // //       building_id:  Number(form.building_id),
// // // // //       floor_id:     Number(form.floor_id),
// // // // //       seat_id:      Number(form.seat_id),
// // // // //     };
// // // // //     await modifyBooking(modifyTarget.id, payload);
// // // // //     setModifyTarget(null);
// // // // //     refreshBookings();
// // // // //   };

// // // // //   // ── Render ────────────────────────────────────────────────────────────────

// // // // //   return (
// // // // //     <SidebarProvider>
// // // // //       <div className="flex h-screen bg-[#F7F8FC] font-sans overflow-hidden w-full">
// // // // //         <AppSidebar user={user} />

// // // // //         <main className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">

// // // // //           {/* Header */}
// // // // //           <div className="flex justify-between items-center">
// // // // //             <div>
// // // // //               <h1 className="text-[20px] font-bold text-[#1A1A2E] leading-tight">
// // // // //                 My Bookings
// // // // //               </h1>
// // // // //               <p className="text-[12.5px] text-gray-400 mt-0.5">
// // // // //                 Your upcoming and past seat reservations
// // // // //               </p>
// // // // //             </div>
// // // // //             <div className="flex gap-2.5 items-center">
// // // // //               <Button variant="outline" size="sm" className="h-8 text-[12.5px] text-gray-600">
// // // // //                 Export CSV
// // // // //               </Button>
// // // // //               <Button
// // // // //                 size="sm"
// // // // //                 className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold gap-1.5"
// // // // //               >
// // // // //                 <span className="text-base leading-none">+</span>
// // // // //                 New booking
// // // // //               </Button>
// // // // //               <Button
// // // // //                 variant="outline"
// // // // //                 size="icon"
// // // // //                 className="h-8 w-8 text-gray-400"
// // // // //                 onClick={refreshBookings}
// // // // //               >
// // // // //                 <RefreshIcon />
// // // // //               </Button>
// // // // //             </div>
// // // // //           </div>

// // // // //           {/* Stat cards */}
// // // // //           <div className="flex gap-4">
// // // // //             <StatCard
// // // // //               label="Upcoming"
// // // // //               value={summary.upcomingCount}
// // // // //               subLabel={summary.nextBookingDate ?? undefined}
// // // // //               icon={<CalIcon />}
// // // // //               accentClass="border-l-indigo-400"
// // // // //             />
// // // // //             <StatCard
// // // // //               label="Completed this month"
// // // // //               value={summary.completedThisMonth}
// // // // //               subLabel={`${summary.daysInOffice} days in office`}
// // // // //               icon={<CheckIcon />}
// // // // //               accentClass="border-l-emerald-400"
// // // // //             />
// // // // //             <StatCard
// // // // //               label="Team in office today"
// // // // //               value={summary.teamInOffice ?? 0}
// // // // //               subLabel={
// // // // //                 (summary.teamInOffice ?? 0) === 1
// // // // //                   ? "1 teammate present"
// // // // //                   : `${summary.teamInOffice ?? 0} teammates present`
// // // // //               }
// // // // //               icon={<UsersIcon />}
// // // // //               accentClass="border-l-violet-400"
// // // // //             />
// // // // //           </div>

// // // // //           {/* Tabs */}
// // // // //           <div className="flex border-b border-[#EBEBF5]">
// // // // //             {TABS.map((tab) => (
// // // // //               <button
// // // // //                 key={tab.id}
// // // // //                 onClick={() => setActiveTab(tab.id)}
// // // // //                 className={cn(
// // // // //                   "px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150",
// // // // //                   activeTab === tab.id
// // // // //                     ? "border-indigo-600 text-indigo-600 font-semibold"
// // // // //                     : "border-transparent text-gray-500 hover:text-gray-700",
// // // // //                 )}
// // // // //               >
// // // // //                 {tab.label}
// // // // //               </button>
// // // // //             ))}
// // // // //           </div>

// // // // //           {/* Content */}
// // // // //           <div className="flex flex-col gap-3">

// // // // //             {isLoading && (
// // // // //               <div className="text-center py-12 text-gray-400 text-[13.5px]">
// // // // //                 Loading bookings…
// // // // //               </div>
// // // // //             )}

// // // // //             {error && (
// // // // //               <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-500 text-[13px]">
// // // // //                 {error}
// // // // //               </div>
// // // // //             )}

// // // // //             {!isLoading && !error && displayedBookings.length === 0 && (
// // // // //               <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// // // // //                 No {activeTab} bookings found.
// // // // //               </div>
// // // // //             )}

// // // // //             {/* Upcoming tab */}
// // // // //             {!isLoading && !error && activeTab === "upcoming" && (
// // // // //               <>
// // // // //                 {upcomingCards.length > 0 ? (
// // // // //                   upcomingCards.map((booking) => (
// // // // //                     <BookingCard
// // // // //                       key={booking.id}
// // // // //                       booking={booking}
// // // // //                       onCancelClick={setCancelTarget}
// // // // //                       onModifyClick={setModifyTarget}
// // // // //                       showActions
// // // // //                     />
// // // // //                   ))
// // // // //                 ) : (
// // // // //                   <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// // // // //                     No upcoming bookings.
// // // // //                   </div>
// // // // //                 )}

// // // // //                 {pastCards.length > 0 && (
// // // // //                   <>
// // // // //                     <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-2">
// // // // //                       Past Bookings
// // // // //                     </p>
// // // // //                     {pastCards.map((booking) => (
// // // // //                       <BookingCard
// // // // //                         key={booking.id}
// // // // //                         booking={booking}
// // // // //                         onCancelClick={setCancelTarget}
// // // // //                         onModifyClick={setModifyTarget}
// // // // //                         showActions={false}
// // // // //                       />
// // // // //                     ))}
// // // // //                   </>
// // // // //                 )}
// // // // //               </>
// // // // //             )}

// // // // //             {/* All other tabs */}
// // // // //             {!isLoading && !error && activeTab !== "upcoming" &&
// // // // //               sortedDisplayed.map((booking) => (
// // // // //                 <BookingCard
// // // // //                   key={booking.id}
// // // // //                   booking={booking}
// // // // //                   onCancelClick={setCancelTarget}
// // // // //                   onModifyClick={setModifyTarget}
// // // // //                   showActions={activeTab !== "past"}
// // // // //                 />
// // // // //               ))
// // // // //             }
// // // // //           </div>
// // // // //         </main>
// // // // //       </div>

// // // // //       {/* Dialogs */}
// // // // //       <CancelDialog
// // // // //         open={cancelTarget !== null}
// // // // //         booking={cancelTarget}
// // // // //         onConfirm={handleConfirmCancel}
// // // // //         onClose={() => setCancelTarget(null)}
// // // // //       />
// // // // //       <ModifyDialog
// // // // //         open={modifyTarget !== null}
// // // // //         booking={modifyTarget}
// // // // //         onConfirm={handleConfirmModify}
// // // // //         onClose={() => setModifyTarget(null)}
// // // // //       />
// // // // //     </SidebarProvider>
// // // // //   );
// // // // // };

// // // // // export default MyBookingsPage;


// // // // "use client";

// // // // import React, { useState } from "react";
// // // // import { Booking, BookingTab } from "../types/bookings.types";
// // // // import { useBookings } from "../hooks/useBookings";
// // // // import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// // // // import { useAuthContext } from "@/features/auth/context/AuthContext";
// // // // import { SidebarProvider } from "@/components/ui/sidebar";
// // // // import { cn } from "@/lib/utils";
// // // // import {
// // // //   cancelBooking,
// // // //   modifyBooking,
// // // //   type ModifyBookingPayload,
// // // // } from "../services/bookings.service";
// // // // // import {
// // // // //   fetchSites,
// // // // //   fetchBuildings,
// // // // //   fetchFloors,
// // // // //   fetchSeatsWithAvailability,
// // // // // } from "../services/bookingform.service";
// // // // // import type { Site, Building, Floor, Seat } from "../types/Bookingform.types";

// // // // import { Building, Floor, Seat, Site } from "@/features/book/types/Bookingform.types";
// // // // import { fetchBuildings, fetchFloors, fetchSeatsWithAvailability, fetchSites } from "@/features/book/services/Bookingform.service";


// // // // import {
// // // //   AlertDialog,
// // // //   AlertDialogAction,
// // // //   AlertDialogCancel,
// // // //   AlertDialogContent,
// // // //   AlertDialogDescription,
// // // //   AlertDialogFooter,
// // // //   AlertDialogHeader,
// // // //   AlertDialogTitle,
// // // // } from "@/components/ui/alert-dialog";
// // // // import {
// // // //   Dialog,
// // // //   DialogContent,
// // // //   DialogDescription,
// // // //   DialogFooter,
// // // //   DialogHeader,
// // // //   DialogTitle,
// // // // } from "@/components/ui/dialog";
// // // // import {
// // // //   Select,
// // // //   SelectContent,
// // // //   SelectItem,
// // // //   SelectTrigger,
// // // //   SelectValue,
// // // // } from "@/components/ui/select";
// // // // import { Button }   from "@/components/ui/button";
// // // // import { Input }    from "@/components/ui/input";
// // // // import { Label }    from "@/components/ui/label";
// // // // import { Textarea } from "@/components/ui/textarea";

// // // // // ── Helpers ───────────────────────────────────────────────────────────────────

// // // // function formatDate(iso: string): string {
// // // //   const d = new Date(iso + "T00:00:00");
// // // //   return d.toLocaleDateString("en-US", {
// // // //     weekday: "short",
// // // //     month:   "short",
// // // //     day:     "numeric",
// // // //   });
// // // // }

// // // // function isUpcoming(isoDate: string): boolean {
// // // //   const today = new Date();
// // // //   today.setHours(0, 0, 0, 0);
// // // //   return new Date(isoDate + "T00:00:00") >= today;
// // // // }

// // // // function sortByDate(bookings: Booking[], ascending = true): Booking[] {
// // // //   return [...bookings].sort((a, b) => {
// // // //     const da = new Date(a.date + "T00:00:00").getTime();
// // // //     const db = new Date(b.date + "T00:00:00").getTime();
// // // //     return ascending ? da - db : db - da;
// // // //   });
// // // // }

// // // // // ── Tag chip ──────────────────────────────────────────────────────────────────

// // // // interface TagProps { label: string; variant: string; }

// // // // const TAG_STYLES: Record<string, string> = {
// // // //   confirmed: "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]",
// // // //   manager:   "bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]",
// // // //   zone:      "bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]",
// // // //   sprint:    "bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]",
// // // //   recurring: "bg-[#E8EAF6] text-[#283593] border border-[#9FA8DA]",
// // // // };

// // // // const BookingTagChip: React.FC<TagProps> = ({ label, variant }) => (
// // // //   <span className={cn(
// // // //     "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
// // // //     TAG_STYLES[variant] ?? TAG_STYLES.zone,
// // // //   )}>
// // // //     {label}
// // // //   </span>
// // // // );

// // // // // ── Cancel Dialog ─────────────────────────────────────────────────────────────

// // // // interface CancelDialogProps {
// // // //   open:      boolean;
// // // //   booking:   Booking | null;
// // // //   onConfirm: (reason: string) => Promise<void>;
// // // //   onClose:   () => void;
// // // // }

// // // // const CancelDialog: React.FC<CancelDialogProps> = ({
// // // //   open, booking, onConfirm, onClose,
// // // // }) => {
// // // //   const [reason,  setReason]  = useState("");
// // // //   const [loading, setLoading] = useState(false);

// // // //   const handleConfirm = async () => {
// // // //     setLoading(true);
// // // //     try {
// // // //       await onConfirm(reason);
// // // //       setReason("");
// // // //     } finally {
// // // //       setLoading(false);
// // // //     }
// // // //   };

// // // //   const handleOpenChange = (val: boolean) => {
// // // //     if (!val) { setReason(""); onClose(); }
// // // //   };

// // // //   return (
// // // //     <AlertDialog open={open} onOpenChange={handleOpenChange}>
// // // //       <AlertDialogContent className="max-w-md">
// // // //         <AlertDialogHeader>
// // // //           <AlertDialogTitle className="text-[#1A1A2E]">Cancel Booking</AlertDialogTitle>
// // // //           <AlertDialogDescription className="text-gray-500 text-[13px]">
// // // //             {booking && (
// // // //               <span>
// // // //                 Are you sure you want to cancel your booking at{" "}
// // // //                 <strong className="text-gray-700">
// // // //                   {booking.location} · {booking.floor} · Seat {booking.seat}
// // // //                 </strong>{" "}
// // // //                 on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
// // // //                 This action cannot be undone.
// // // //               </span>
// // // //             )}
// // // //           </AlertDialogDescription>
// // // //         </AlertDialogHeader>

// // // //         <div className="py-2">
// // // //           <Label
// // // //             htmlFor="cancel-reason"
// // // //             className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
// // // //           >
// // // //             Reason for cancellation{" "}
// // // //             <span className="text-gray-400 font-normal">(optional)</span>
// // // //           </Label>
// // // //           <Textarea
// // // //             id="cancel-reason"
// // // //             placeholder="e.g. Working from home, schedule change…"
// // // //             value={reason}
// // // //             onChange={(e) => setReason(e.target.value)}
// // // //             className="text-[13px] resize-none h-20"
// // // //           />
// // // //         </div>

// // // //         <AlertDialogFooter>
// // // //           <AlertDialogCancel
// // // //             onClick={() => { setReason(""); onClose(); }}
// // // //             className="text-[12.5px]"
// // // //           >
// // // //             Keep Booking
// // // //           </AlertDialogCancel>
// // // //           <AlertDialogAction
// // // //             onClick={handleConfirm}
// // // //             disabled={loading}
// // // //             className="bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50"
// // // //           >
// // // //             {loading ? "Cancelling…" : "Yes, Cancel"}
// // // //           </AlertDialogAction>
// // // //         </AlertDialogFooter>
// // // //       </AlertDialogContent>
// // // //     </AlertDialog>
// // // //   );
// // // // };

// // // // // ── Modify Dialog ─────────────────────────────────────────────────────────────

// // // // interface ModifyForm {
// // // //   booking_date: string;
// // // //   site_id:      string;
// // // //   building_id:  string;
// // // //   floor_id:     string;
// // // //   seat_id:      string;
// // // // }

// // // // interface ModifyDialogProps {
// // // //   open:      boolean;
// // // //   booking:   Booking | null;
// // // //   onConfirm: (form: ModifyForm) => Promise<void>;
// // // //   onClose:   () => void;
// // // // }

// // // // const ModifyDialog: React.FC<ModifyDialogProps> = ({
// // // //   open, booking, onConfirm, onClose,
// // // // }) => {
// // // //   const [form, setForm] = useState<ModifyForm>({
// // // //     booking_date: "",
// // // //     site_id:      "",
// // // //     building_id:  "",
// // // //     floor_id:     "",
// // // //     seat_id:      "",
// // // //   });

// // // //   const [sites,     setSites]     = useState<Site[]>([]);
// // // //   const [buildings, setBuildings] = useState<Building[]>([]);
// // // //   const [floors,    setFloors]    = useState<Floor[]>([]);
// // // //   const [seats,     setSeats]     = useState<Seat[]>([]);

// // // //   const [loadingSites,     setLoadingSites]     = useState(false);
// // // //   const [loadingBuildings, setLoadingBuildings] = useState(false);
// // // //   const [loadingFloors,    setLoadingFloors]    = useState(false);
// // // //   const [loadingSeats,     setLoadingSeats]     = useState(false);
// // // //   const [submitting,       setSubmitting]       = useState(false);
// // // //   const [error,            setError]            = useState<string | null>(null);

// // // //   // Reset + load sites when dialog opens
// // // //   React.useEffect(() => {
// // // //     if (!open || !booking) return;

// // // //     setForm({
// // // //       booking_date: booking.date,
// // // //       site_id:      "",
// // // //       building_id:  "",
// // // //       floor_id:     "",
// // // //       seat_id:      "",
// // // //     });
// // // //     setBuildings([]);
// // // //     setFloors([]);
// // // //     setSeats([]);
// // // //     setError(null);

// // // //     setLoadingSites(true);
// // // //     fetchSites()
// // // //       .then(setSites)
// // // //       .catch(() => setError("Failed to load sites."))
// // // //       .finally(() => setLoadingSites(false));
// // // //   }, [open, booking]);

// // // //   // Cascade: site → buildings
// // // //   React.useEffect(() => {
// // // //     if (!form.site_id) {
// // // //       setBuildings([]);
// // // //       setFloors([]);
// // // //       setSeats([]);
// // // //       return;
// // // //     }
// // // //     setForm((p) => ({ ...p, building_id: "", floor_id: "", seat_id: "" }));
// // // //     setFloors([]);
// // // //     setSeats([]);
// // // //     setLoadingBuildings(true);
// // // //     fetchBuildings(form.site_id)
// // // //       .then(setBuildings)
// // // //       .catch(() => setError("Failed to load buildings."))
// // // //       .finally(() => setLoadingBuildings(false));
// // // //   }, [form.site_id]);

// // // //   // Cascade: building → floors
// // // //   React.useEffect(() => {
// // // //     if (!form.building_id) {
// // // //       setFloors([]);
// // // //       setSeats([]);
// // // //       return;
// // // //     }
// // // //     setForm((p) => ({ ...p, floor_id: "", seat_id: "" }));
// // // //     setSeats([]);
// // // //     setLoadingFloors(true);
// // // //     fetchFloors(form.building_id)
// // // //       .then(setFloors)
// // // //       .catch(() => setError("Failed to load floors."))
// // // //       .finally(() => setLoadingFloors(false));
// // // //   }, [form.building_id]);

// // // //   // Cascade: floor + date → seats
// // // //   React.useEffect(() => {
// // // //     if (!form.floor_id || !form.booking_date) {
// // // //       setSeats([]);
// // // //       return;
// // // //     }
// // // //     setForm((p) => ({ ...p, seat_id: "" }));
// // // //     setLoadingSeats(true);
// // // //     fetchSeatsWithAvailability({
// // // //       floorId:  form.floor_id,
// // // //       fromDate: form.booking_date,
// // // //       toDate:   form.booking_date,
// // // //     })
// // // //       .then((fetched) => {
// // // //         // Only show available seats in the modify dialog
// // // //         setSeats(fetched.filter((s) => s.status === "available" || s.status === "yours"));
// // // //       })
// // // //       .catch(() => setError("Failed to load seats."))
// // // //       .finally(() => setLoadingSeats(false));
// // // //   }, [form.floor_id, form.booking_date]);

// // // //   const set = (field: keyof ModifyForm) => (val: string | null) => {
// // // //     setError(null);
// // // //     setForm((p) => ({ ...p, [field]: val ?? "" }));
// // // //   };

// // // //   const handleSubmit = async () => {
// // // //     const { booking_date, site_id, building_id, floor_id, seat_id } = form;
// // // //     if (!booking_date || !site_id || !building_id || !floor_id || !seat_id) {
// // // //       setError("Please complete all fields.");
// // // //       return;
// // // //     }
// // // //     setSubmitting(true);
// // // //     try {
// // // //       await onConfirm(form);
// // // //       onClose();
// // // //     } catch (err: any) {
// // // //       setError(
// // // //         err?.response?.data?.detail?.message ??
// // // //         "Failed to modify booking. Please try again.",
// // // //       );
// // // //     } finally {
// // // //       setSubmitting(false);
// // // //     }
// // // //   };

// // // //   return (
// // // //     <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
// // // //       <DialogContent className="max-w-md">
// // // //         <DialogHeader>
// // // //           <DialogTitle className="text-[#1A1A2E]">Modify Booking</DialogTitle>
// // // //           <DialogDescription className="text-[13px] text-gray-500">
// // // //             {booking && (
// // // //               <>
// // // //                 Currently:{" "}
// // // //                 <strong className="text-gray-700">
// // // //                   {booking.location} · {booking.floor} · Seat {booking.seat}
// // // //                 </strong>{" "}
// // // //                 on{" "}
// // // //                 <strong className="text-gray-700">{formatDate(booking.date)}</strong>.
// // // //                 Update any field below.
// // // //               </>
// // // //             )}
// // // //           </DialogDescription>
// // // //         </DialogHeader>

// // // //         <div className="grid gap-4 py-2">

// // // //           {/* Date */}
// // // //           <div className="grid gap-1.5">
// // // //             <Label htmlFor="mod-date" className="text-[12.5px] font-medium text-gray-700">
// // // //               New Date <span className="text-red-400">*</span>
// // // //             </Label>
// // // //             <Input
// // // //               id="mod-date"
// // // //               type="date"
// // // //               value={form.booking_date}
// // // //               onChange={(e) => set("booking_date")(e.target.value)}
// // // //               className="text-[13px]"
// // // //               min={new Date().toISOString().split("T")[0]}
// // // //             />
// // // //           </div>

// // // //           {/* Site */}
// // // //           <div className="grid gap-1.5">
// // // //             <Label className="text-[12.5px] font-medium text-gray-700">
// // // //               Site <span className="text-red-400">*</span>
// // // //             </Label>
// // // //             <Select
// // // //               value={form.site_id}
// // // //               onValueChange={(v) => set("site_id")(v)}
// // // //               disabled={loadingSites || sites.length === 0}
// // // //             >
// // // //               <SelectTrigger className="text-[13px]">
// // // //                 <SelectValue
// // // //                   placeholder={loadingSites ? "Loading sites…" : "Select a site"}
// // // //                 />
// // // //               </SelectTrigger>
// // // //               <SelectContent>
// // // //                 {sites.map((s) => (
// // // //                   <SelectItem key={s.id} value={String(s.id)} className="text-[13px]">
// // // //                     {s.name}{s.city ? ` — ${s.city}` : ""}
// // // //                   </SelectItem>
// // // //                 ))}
// // // //               </SelectContent>
// // // //             </Select>
// // // //           </div>

// // // //           {/* Building */}
// // // //           <div className="grid gap-1.5">
// // // //             <Label className="text-[12.5px] font-medium text-gray-700">
// // // //               Building <span className="text-red-400">*</span>
// // // //             </Label>
// // // //             <Select
// // // //               value={form.building_id}
// // // //               onValueChange={(v) => set("building_id")(v)}
// // // //               disabled={!form.site_id || loadingBuildings}
// // // //             >
// // // //               <SelectTrigger className="text-[13px]">
// // // //                 <SelectValue
// // // //                   placeholder={
// // // //                     !form.site_id    ? "Select a site first"  :
// // // //                     loadingBuildings ? "Loading buildings…"   :
// // // //                                        "Select a building"
// // // //                   }
// // // //                 />
// // // //               </SelectTrigger>
// // // //               <SelectContent>
// // // //                 {buildings.map((b) => (
// // // //                   <SelectItem key={b.id} value={String(b.id)} className="text-[13px]">
// // // //                     {b.name}
// // // //                   </SelectItem>
// // // //                 ))}
// // // //               </SelectContent>
// // // //             </Select>
// // // //           </div>

// // // //           {/* Floor */}
// // // //           <div className="grid gap-1.5">
// // // //             <Label className="text-[12.5px] font-medium text-gray-700">
// // // //               Floor <span className="text-red-400">*</span>
// // // //             </Label>
// // // //             <Select
// // // //               value={form.floor_id}
// // // //               onValueChange={(v) => set("floor_id")(v)}
// // // //               disabled={!form.building_id || loadingFloors}
// // // //             >
// // // //               <SelectTrigger className="text-[13px]">
// // // //                 <SelectValue
// // // //                   placeholder={
// // // //                     !form.building_id ? "Select a building first" :
// // // //                     loadingFloors     ? "Loading floors…"         :
// // // //                                         "Select a floor"
// // // //                   }
// // // //                 />
// // // //               </SelectTrigger>
// // // //               <SelectContent>
// // // //                 {floors.map((f) => (
// // // //                   <SelectItem key={f.id} value={String(f.id)} className="text-[13px]">
// // // //                     {f.name}
// // // //                   </SelectItem>
// // // //                 ))}
// // // //               </SelectContent>
// // // //             </Select>
// // // //           </div>

// // // //           {/* Seat */}
// // // //           <div className="grid gap-1.5">
// // // //             <Label className="text-[12.5px] font-medium text-gray-700">
// // // //               Seat <span className="text-red-400">*</span>
// // // //             </Label>
// // // //             <Select
// // // //               value={form.seat_id}
// // // //               onValueChange={(v) => set("seat_id")(v)}
// // // //               disabled={!form.floor_id || !form.booking_date || loadingSeats}
// // // //             >
// // // //               <SelectTrigger className="text-[13px]">
// // // //                 <SelectValue
// // // //                   placeholder={
// // // //                     !form.floor_id || !form.booking_date
// // // //                       ? "Select a floor & date first"
// // // //                       : loadingSeats
// // // //                         ? "Loading seats…"
// // // //                         : seats.length === 0
// // // //                           ? "No available seats"
// // // //                           : "Select a seat"
// // // //                   }
// // // //                 />
// // // //               </SelectTrigger>
// // // //               <SelectContent>
// // // //                 {seats.map((s) => (
// // // //                   <SelectItem key={s.id} value={String(s.id)} className="text-[13px]">
// // // //                     {s.label}
// // // //                     {s.amenities?.length > 0 && (
// // // //                       <span className="text-gray-400 ml-1.5 text-[11px]">
// // // //                         · {s.amenities.slice(0, 2).join(", ")}
// // // //                       </span>
// // // //                     )}
// // // //                   </SelectItem>
// // // //                 ))}
// // // //               </SelectContent>
// // // //             </Select>
// // // //           </div>

// // // //           {error && (
// // // //             <p className="text-red-500 text-[12px] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
// // // //               {error}
// // // //             </p>
// // // //           )}
// // // //         </div>

// // // //         <DialogFooter className="gap-2">
// // // //           <Button
// // // //             variant="outline"
// // // //             onClick={onClose}
// // // //             disabled={submitting}
// // // //             className="text-[12.5px]"
// // // //           >
// // // //             Cancel
// // // //           </Button>
// // // //           <Button
// // // //             onClick={handleSubmit}
// // // //             disabled={submitting}
// // // //             className="bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px]"
// // // //           >
// // // //             {submitting ? "Saving…" : "Save Changes"}
// // // //           </Button>
// // // //         </DialogFooter>
// // // //       </DialogContent>
// // // //     </Dialog>
// // // //   );
// // // // };

// // // // // ── Booking card ──────────────────────────────────────────────────────────────

// // // // interface BookingCardProps {
// // // //   booking:       Booking;
// // // //   onCancelClick: (booking: Booking) => void;
// // // //   onModifyClick: (booking: Booking) => void;
// // // //   showActions?:  boolean;
// // // // }

// // // // const BookingCard: React.FC<BookingCardProps> = ({
// // // //   booking,
// // // //   onCancelClick,
// // // //   onModifyClick,
// // // //   showActions = true,
// // // // }) => {
// // // //   const isCancelled = booking.status === "cancelled";

// // // //   return (
// // // //     <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col hover:shadow-sm transition-shadow duration-200">
// // // //       <div className="flex items-stretch">
// // // //         {/* Left accent bar */}
// // // //         <div className={cn(
// // // //           "w-[3px] shrink-0",
// // // //           isCancelled
// // // //             ? "bg-gray-200"
// // // //             : booking.status === "pending"
// // // //               ? "bg-amber-400"
// // // //               : "bg-indigo-500",
// // // //         )} />

// // // //         <div className="flex-1 px-5 py-4">
// // // //           {/* Row 1: title + booked-on */}
// // // //           <div className="flex justify-between items-start gap-4">
// // // //             <div>
// // // //               <p className="text-[13.5px] font-semibold text-[#1A1A2E]">
// // // //                 {booking.location} · {booking.floor} · Seat {booking.seat}
// // // //               </p>
// // // //               <p className="text-[12px] text-gray-500 mt-0.5">
// // // //                 {formatDate(booking.date)}
// // // //                 {" · "}
// // // //                 {booking.isFullDay
// // // //                   ? "Full day"
// // // //                   : `${booking.startTime} – ${booking.endTime}`}
// // // //                 {booking.isFullDay && (
// // // //                   <span className="ml-2 text-[11px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
// // // //                     Full day
// // // //                   </span>
// // // //                 )}
// // // //               </p>
// // // //             </div>
// // // //             <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5">
// // // //               Booked {booking.bookedOn}
// // // //             </span>
// // // //           </div>

// // // //           {/* Row 2: tags */}
// // // //           <div className="flex gap-1.5 flex-wrap mt-2.5">
// // // //             {booking.tags.map((tag, i) => (
// // // //               <BookingTagChip key={i} label={tag.label} variant={tag.variant} />
// // // //             ))}
// // // //             {booking.isRecurring && booking.recurringPattern && (
// // // //               <BookingTagChip label={booking.recurringPattern} variant="recurring" />
// // // //             )}
// // // //           </div>
// // // //         </div>
// // // //       </div>

// // // //       {/* Action footer */}
// // // //       {showActions && !isCancelled && (
// // // //         <div className="flex justify-end gap-2 px-5 py-2.5 border-t border-gray-100 bg-[#F7F8FC]">
// // // //           <Button
// // // //             variant="outline"
// // // //             size="sm"
// // // //             className="h-7 px-4 text-[12.5px] text-gray-600"
// // // //             onClick={() => onModifyClick(booking)}
// // // //           >
// // // //             Modify
// // // //           </Button>
// // // //           <Button
// // // //             variant="outline"
// // // //             size="sm"
// // // //             className="h-7 px-4 text-[12.5px] border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 hover:border-red-300"
// // // //             onClick={() => onCancelClick(booking)}
// // // //           >
// // // //             Cancel
// // // //           </Button>
// // // //         </div>
// // // //       )}

// // // //       {showActions && isCancelled && (
// // // //         <div className="flex justify-end px-5 py-2.5 border-t border-gray-100">
// // // //           <Button variant="outline" size="sm" className="h-7 px-4 text-[12.5px] text-gray-600">
// // // //             View details
// // // //           </Button>
// // // //         </div>
// // // //       )}
// // // //     </div>
// // // //   );
// // // // };

// // // // // ── Stat card ─────────────────────────────────────────────────────────────────

// // // // interface StatCardProps {
// // // //   label:       string;
// // // //   value:       number | string;
// // // //   subLabel?:   string;
// // // //   icon:        React.ReactNode;
// // // //   accentClass: string;
// // // // }

// // // // const StatCard: React.FC<StatCardProps> = ({
// // // //   label, value, subLabel, icon, accentClass,
// // // // }) => (
// // // //   <div className={cn(
// // // //     "flex-1 bg-white border border-[#EBEBF5] rounded-xl p-4 flex flex-col gap-1 min-w-[160px]",
// // // //     "border-l-[3px]", accentClass,
// // // //   )}>
// // // //     <div className="flex justify-between items-center mb-1">
// // // //       <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
// // // //         {label}
// // // //       </span>
// // // //       <span className="text-gray-400">{icon}</span>
// // // //     </div>
// // // //     <div className="text-[26px] font-bold text-[#1A1A2E] leading-none">{value}</div>
// // // //     {subLabel && (
// // // //       <div className="text-[11.5px] text-gray-400 mt-1">{subLabel}</div>
// // // //     )}
// // // //   </div>
// // // // );

// // // // // ── Tabs ──────────────────────────────────────────────────────────────────────

// // // // const TABS: { id: BookingTab; label: string }[] = [
// // // //   { id: "upcoming",  label: "Upcoming"  },
// // // //   { id: "past",      label: "Past"      },
// // // //   { id: "cancelled", label: "Cancelled" },
// // // // ];

// // // // // ── Icons ─────────────────────────────────────────────────────────────────────

// // // // const CalIcon = () => (
// // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// // // //     <rect x="3" y="4" width="18" height="18" rx="2" />
// // // //     <path d="M16 2v4M8 2v4M3 10h18" />
// // // //   </svg>
// // // // );
// // // // const CheckIcon = () => (
// // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
// // // //     <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
// // // //   </svg>
// // // // );
// // // // const UsersIcon = () => (
// // // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// // // //     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
// // // //     <circle cx="9" cy="7" r="4" />
// // // //     <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
// // // //     <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
// // // //   </svg>
// // // // );
// // // // const RefreshIcon = () => (
// // // //   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
// // // //     <path
// // // //       d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
// // // //       strokeLinecap="round"
// // // //       strokeLinejoin="round"
// // // //     />
// // // //   </svg>
// // // // );

// // // // // ── Page ──────────────────────────────────────────────────────────────────────

// // // // const MyBookingsPage: React.FC = () => {
// // // //   const {
// // // //     displayedBookings,
// // // //     summary,
// // // //     activeTab,
// // // //     isLoading,
// // // //     error,
// // // //     setActiveTab,
// // // //     handleCancelBooking,
// // // //     refreshBookings,
// // // //   } = useBookings();

// // // //   const { user } = useAuthContext();

// // // //   const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
// // // //   const [modifyTarget, setModifyTarget] = useState<Booking | null>(null);

// // // //   // Upcoming tab: split into future (ascending) + past section (descending)
// // // //   const upcomingCards = sortByDate(
// // // //     displayedBookings.filter((b) => b.status !== "cancelled" && isUpcoming(b.date)),
// // // //     true,
// // // //   );
// // // //   const pastCards = sortByDate(
// // // //     displayedBookings.filter((b) => b.status !== "cancelled" && !isUpcoming(b.date)),
// // // //     false,
// // // //   );

// // // //   // All other tabs — descending for past, ascending otherwise
// // // //   const sortedDisplayed = sortByDate(displayedBookings, activeTab !== "past");

// // // //   // ── Handlers ──────────────────────────────────────────────────────────────

// // // //   const handleConfirmCancel = async (reason: string) => {
// // // //     if (!cancelTarget) return;
// // // //     await cancelBooking(cancelTarget.id, reason);
// // // //     await handleCancelBooking(cancelTarget.id);
// // // //     setCancelTarget(null);
// // // //   };

// // // //   const handleConfirmModify = async (form: ModifyForm) => {
// // // //     if (!modifyTarget) return;
// // // //     const payload: ModifyBookingPayload = {
// // // //       booking_date: form.booking_date,
// // // //       site_id:      Number(form.site_id),
// // // //       building_id:  Number(form.building_id),
// // // //       floor_id:     Number(form.floor_id),
// // // //       seat_id:      Number(form.seat_id),
// // // //     };
// // // //     await modifyBooking(modifyTarget.id, payload);
// // // //     setModifyTarget(null);
// // // //     refreshBookings();
// // // //   };

// // // //   // ── Render ────────────────────────────────────────────────────────────────

// // // //   return (
// // // //     <SidebarProvider>
// // // //       <div className="flex h-screen bg-[#F7F8FC] font-sans overflow-hidden w-full">
// // // //         <AppSidebar user={user} />

// // // //         <main className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">

// // // //           {/* Header */}
// // // //           <div className="flex justify-between items-center">
// // // //             <div>
// // // //               <h1 className="text-[20px] font-bold text-[#1A1A2E] leading-tight">
// // // //                 My Bookings
// // // //               </h1>
// // // //               <p className="text-[12.5px] text-gray-400 mt-0.5">
// // // //                 Your upcoming and past seat reservations
// // // //               </p>
// // // //             </div>
// // // //             <div className="flex gap-2.5 items-center">
// // // //               <Button variant="outline" size="sm" className="h-8 text-[12.5px] text-gray-600">
// // // //                 Export CSV
// // // //               </Button>
// // // //               <Button
// // // //                 size="sm"
// // // //                 className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold gap-1.5"
// // // //               >
// // // //                 <span className="text-base leading-none">+</span>
// // // //                 New booking
// // // //               </Button>
// // // //               <Button
// // // //                 variant="outline"
// // // //                 size="icon"
// // // //                 className="h-8 w-8 text-gray-400"
// // // //                 onClick={refreshBookings}
// // // //               >
// // // //                 <RefreshIcon />
// // // //               </Button>
// // // //             </div>
// // // //           </div>

// // // //           {/* Stat cards */}
// // // //           <div className="flex gap-4">
// // // //             <StatCard
// // // //               label="Upcoming"
// // // //               value={summary.upcomingCount}
// // // //               subLabel={summary.nextBookingDate ?? undefined}
// // // //               icon={<CalIcon />}
// // // //               accentClass="border-l-indigo-400"
// // // //             />
// // // //             <StatCard
// // // //               label="Completed this month"
// // // //               value={summary.completedThisMonth}
// // // //               subLabel={`${summary.daysInOffice} days in office`}
// // // //               icon={<CheckIcon />}
// // // //               accentClass="border-l-emerald-400"
// // // //             />
// // // //             <StatCard
// // // //               label="Team in office today"
// // // //               value={summary.teamInOffice ?? 0}
// // // //               subLabel={
// // // //                 (summary.teamInOffice ?? 0) === 1
// // // //                   ? "1 teammate present"
// // // //                   : `${summary.teamInOffice ?? 0} teammates present`
// // // //               }
// // // //               icon={<UsersIcon />}
// // // //               accentClass="border-l-violet-400"
// // // //             />
// // // //           </div>

// // // //           {/* Tabs */}
// // // //           <div className="flex border-b border-[#EBEBF5]">
// // // //             {TABS.map((tab) => (
// // // //               <button
// // // //                 key={tab.id}
// // // //                 onClick={() => setActiveTab(tab.id)}
// // // //                 className={cn(
// // // //                   "px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150",
// // // //                   activeTab === tab.id
// // // //                     ? "border-indigo-600 text-indigo-600 font-semibold"
// // // //                     : "border-transparent text-gray-500 hover:text-gray-700",
// // // //                 )}
// // // //               >
// // // //                 {tab.label}
// // // //               </button>
// // // //             ))}
// // // //           </div>

// // // //           {/* Content */}
// // // //           <div className="flex flex-col gap-3">

// // // //             {isLoading && (
// // // //               <div className="text-center py-12 text-gray-400 text-[13.5px]">
// // // //                 Loading bookings…
// // // //               </div>
// // // //             )}

// // // //             {error && (
// // // //               <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-500 text-[13px]">
// // // //                 {error}
// // // //               </div>
// // // //             )}

// // // //             {!isLoading && !error && displayedBookings.length === 0 && (
// // // //               <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// // // //                 No {activeTab} bookings found.
// // // //               </div>
// // // //             )}

// // // //             {/* Upcoming tab */}
// // // //             {!isLoading && !error && activeTab === "upcoming" && (
// // // //               <>
// // // //                 {upcomingCards.length > 0 ? (
// // // //                   upcomingCards.map((booking) => (
// // // //                     <BookingCard
// // // //                       key={booking.id}
// // // //                       booking={booking}
// // // //                       onCancelClick={setCancelTarget}
// // // //                       onModifyClick={setModifyTarget}
// // // //                       showActions
// // // //                     />
// // // //                   ))
// // // //                 ) : (
// // // //                   <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// // // //                     No upcoming bookings.
// // // //                   </div>
// // // //                 )}

// // // //                 {pastCards.length > 0 && (
// // // //                   <>
// // // //                     <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-2">
// // // //                       Past Bookings
// // // //                     </p>
// // // //                     {pastCards.map((booking) => (
// // // //                       <BookingCard
// // // //                         key={booking.id}
// // // //                         booking={booking}
// // // //                         onCancelClick={setCancelTarget}
// // // //                         onModifyClick={setModifyTarget}
// // // //                         showActions={false}
// // // //                       />
// // // //                     ))}
// // // //                   </>
// // // //                 )}
// // // //               </>
// // // //             )}

// // // //             {/* All other tabs */}
// // // //             {!isLoading && !error && activeTab !== "upcoming" &&
// // // //               sortedDisplayed.map((booking) => (
// // // //                 <BookingCard
// // // //                   key={booking.id}
// // // //                   booking={booking}
// // // //                   onCancelClick={setCancelTarget}
// // // //                   onModifyClick={setModifyTarget}
// // // //                   showActions={activeTab !== "past"}
// // // //                 />
// // // //               ))
// // // //             }
// // // //           </div>
// // // //         </main>
// // // //       </div>

// // // //       {/* Dialogs */}
// // // //       <CancelDialog
// // // //         open={cancelTarget !== null}
// // // //         booking={cancelTarget}
// // // //         onConfirm={handleConfirmCancel}
// // // //         onClose={() => setCancelTarget(null)}
// // // //       />
// // // //       <ModifyDialog
// // // //         open={modifyTarget !== null}
// // // //         booking={modifyTarget}
// // // //         onConfirm={handleConfirmModify}
// // // //         onClose={() => setModifyTarget(null)}
// // // //       />
// // // //     </SidebarProvider>
// // // //   );
// // // // };

// // // // export default MyBookingsPage;

// // // "use client";

// // // import React, { useState } from "react";
// // // import { useRouter } from "next/navigation";
// // // import { Booking, BookingTab } from "../types/bookings.types";
// // // import { useBookings } from "../hooks/useBookings";
// // // import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// // // import { useAuthContext } from "@/features/auth/context/AuthContext";
// // // import { SidebarProvider } from "@/components/ui/sidebar";
// // // import { cn } from "@/lib/utils";
// // // import {
// // //   cancelBooking,
// // // } from "../services/bookings.service";
// // // import {
// // //   AlertDialog,
// // //   AlertDialogAction,
// // //   AlertDialogCancel,
// // //   AlertDialogContent,
// // //   AlertDialogDescription,
// // //   AlertDialogFooter,
// // //   AlertDialogHeader,
// // //   AlertDialogTitle,
// // // } from "@/components/ui/alert-dialog";
// // // import { Button }   from "@/components/ui/button";
// // // import { Label }    from "@/components/ui/label";
// // // import { Textarea } from "@/components/ui/textarea";

// // // // ── Helpers ───────────────────────────────────────────────────────────────────

// // // function formatDate(iso: string): string {
// // //   const d = new Date(iso + "T00:00:00");
// // //   return d.toLocaleDateString("en-US", {
// // //     weekday: "short",
// // //     month:   "short",
// // //     day:     "numeric",
// // //   });
// // // }

// // // function isUpcoming(isoDate: string): boolean {
// // //   const today = new Date();
// // //   today.setHours(0, 0, 0, 0);
// // //   return new Date(isoDate + "T00:00:00") >= today;
// // // }

// // // function sortByDate(bookings: Booking[], ascending = true): Booking[] {
// // //   return [...bookings].sort((a, b) => {
// // //     const da = new Date(a.date + "T00:00:00").getTime();
// // //     const db = new Date(b.date + "T00:00:00").getTime();
// // //     return ascending ? da - db : db - da;
// // //   });
// // // }

// // // // ── Tag chip ──────────────────────────────────────────────────────────────────

// // // interface TagProps { label: string; variant: string; }

// // // const TAG_STYLES: Record<string, string> = {
// // //   confirmed: "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]",
// // //   manager:   "bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]",
// // //   zone:      "bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]",
// // //   sprint:    "bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]",
// // //   recurring: "bg-[#E8EAF6] text-[#283593] border border-[#9FA8DA]",
// // // };

// // // const BookingTagChip: React.FC<TagProps> = ({ label, variant }) => (
// // //   <span className={cn(
// // //     "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
// // //     TAG_STYLES[variant] ?? TAG_STYLES.zone,
// // //   )}>
// // //     {label}
// // //   </span>
// // // );

// // // // ── Cancel Dialog ─────────────────────────────────────────────────────────────

// // // interface CancelDialogProps {
// // //   open:      boolean;
// // //   booking:   Booking | null;
// // //   onConfirm: (reason: string) => Promise<void>;
// // //   onClose:   () => void;
// // // }

// // // const CancelDialog: React.FC<CancelDialogProps> = ({
// // //   open, booking, onConfirm, onClose,
// // // }) => {
// // //   const [reason,  setReason]  = useState("");
// // //   const [loading, setLoading] = useState(false);

// // //   const handleConfirm = async () => {
// // //     setLoading(true);
// // //     try {
// // //       await onConfirm(reason);
// // //       setReason("");
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   const handleOpenChange = (val: boolean) => {
// // //     if (!val) { setReason(""); onClose(); }
// // //   };

// // //   return (
// // //     <AlertDialog open={open} onOpenChange={handleOpenChange}>
// // //       <AlertDialogContent className="max-w-md">
// // //         <AlertDialogHeader>
// // //           <AlertDialogTitle className="text-[#1A1A2E]">Cancel Booking</AlertDialogTitle>
// // //           <AlertDialogDescription className="text-gray-500 text-[13px]">
// // //             {booking && (
// // //               <span>
// // //                 Are you sure you want to cancel your booking at{" "}
// // //                 <strong className="text-gray-700">
// // //                   {booking.location} · {booking.floor} · Seat {booking.seat}
// // //                 </strong>{" "}
// // //                 on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
// // //                 This action cannot be undone.
// // //               </span>
// // //             )}
// // //           </AlertDialogDescription>
// // //         </AlertDialogHeader>

// // //         <div className="py-2">
// // //           <Label
// // //             htmlFor="cancel-reason"
// // //             className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
// // //           >
// // //             Reason for cancellation{" "}
// // //             <span className="text-gray-400 font-normal">(optional)</span>
// // //           </Label>
// // //           <Textarea
// // //             id="cancel-reason"
// // //             placeholder="e.g. Working from home, schedule change…"
// // //             value={reason}
// // //             onChange={(e) => setReason(e.target.value)}
// // //             className="text-[13px] resize-none h-20"
// // //           />
// // //         </div>

// // //         <AlertDialogFooter>
// // //           <AlertDialogCancel
// // //             onClick={() => { setReason(""); onClose(); }}
// // //             className="text-[12.5px]"
// // //           >
// // //             Keep Booking
// // //           </AlertDialogCancel>
// // //           <AlertDialogAction
// // //             onClick={handleConfirm}
// // //             disabled={loading}
// // //             className="bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50"
// // //           >
// // //             {loading ? "Cancelling…" : "Yes, Cancel"}
// // //           </AlertDialogAction>
// // //         </AlertDialogFooter>
// // //       </AlertDialogContent>
// // //     </AlertDialog>
// // //   );
// // // };

// // // // ── Booking card ──────────────────────────────────────────────────────────────

// // // interface BookingCardProps {
// // //   booking:       Booking;
// // //   onCancelClick: (booking: Booking) => void;
// // //   onModifyClick: (booking: Booking) => void;
// // //   showActions?:  boolean;
// // // }

// // // const BookingCard: React.FC<BookingCardProps> = ({
// // //   booking,
// // //   onCancelClick,
// // //   onModifyClick,
// // //   showActions = true,
// // // }) => {
// // //   const isCancelled = booking.status === "cancelled";

// // //   return (
// // //     <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col hover:shadow-sm transition-shadow duration-200">
// // //       <div className="flex items-stretch">
// // //         {/* Left accent bar */}
// // //         <div className={cn(
// // //           "w-[3px] shrink-0",
// // //           isCancelled
// // //             ? "bg-gray-200"
// // //             : booking.status === "pending"
// // //               ? "bg-amber-400"
// // //               : "bg-indigo-500",
// // //         )} />

// // //         <div className="flex-1 px-5 py-4">
// // //           {/* Row 1: title + booked-on */}
// // //           <div className="flex justify-between items-start gap-4">
// // //             <div>
// // //               <p className="text-[13.5px] font-semibold text-[#1A1A2E]">
// // //                 {booking.location} · {booking.floor} · Seat {booking.seat}
// // //               </p>
// // //               <p className="text-[12px] text-gray-500 mt-0.5">
// // //                 {formatDate(booking.date)}
// // //                 {" · "}
// // //                 {booking.isFullDay
// // //                   ? "Full day"
// // //                   : `${booking.startTime} – ${booking.endTime}`}
// // //                 {booking.isFullDay && (
// // //                   <span className="ml-2 text-[11px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
// // //                     Full day
// // //                   </span>
// // //                 )}
// // //               </p>
// // //             </div>
// // //             <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5">
// // //               Booked {booking.bookedOn}
// // //             </span>
// // //           </div>

// // //           {/* Row 2: tags */}
// // //           <div className="flex gap-1.5 flex-wrap mt-2.5">
// // //             {booking.tags.map((tag, i) => (
// // //               <BookingTagChip key={i} label={tag.label} variant={tag.variant} />
// // //             ))}
// // //             {booking.isRecurring && booking.recurringPattern && (
// // //               <BookingTagChip label={booking.recurringPattern} variant="recurring" />
// // //             )}
// // //           </div>
// // //         </div>
// // //       </div>

// // //       {/* Action footer */}
// // //       {showActions && !isCancelled && (
// // //         <div className="flex justify-end gap-2 px-5 py-2.5 border-t border-gray-100 bg-[#F7F8FC]">
// // //           <Button
// // //             variant="outline"
// // //             size="sm"
// // //             className="h-7 px-4 text-[12.5px] text-gray-600"
// // //             onClick={() => onModifyClick(booking)}
// // //           >
// // //             Modify
// // //           </Button>
// // //           <Button
// // //             variant="outline"
// // //             size="sm"
// // //             className="h-7 px-4 text-[12.5px] border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 hover:border-red-300"
// // //             onClick={() => onCancelClick(booking)}
// // //           >
// // //             Cancel
// // //           </Button>
// // //         </div>
// // //       )}

// // //       {showActions && isCancelled && (
// // //         <div className="flex justify-end px-5 py-2.5 border-t border-gray-100">
// // //           <Button variant="outline" size="sm" className="h-7 px-4 text-[12.5px] text-gray-600">
// // //             View details
// // //           </Button>
// // //         </div>
// // //       )}
// // //     </div>
// // //   );
// // // };

// // // // ── Stat card ─────────────────────────────────────────────────────────────────

// // // interface StatCardProps {
// // //   label:       string;
// // //   value:       number | string;
// // //   subLabel?:   string;
// // //   icon:        React.ReactNode;
// // //   accentClass: string;
// // // }

// // // const StatCard: React.FC<StatCardProps> = ({
// // //   label, value, subLabel, icon, accentClass,
// // // }) => (
// // //   <div className={cn(
// // //     "flex-1 bg-white border border-[#EBEBF5] rounded-xl p-4 flex flex-col gap-1 min-w-[160px]",
// // //     "border-l-[3px]", accentClass,
// // //   )}>
// // //     <div className="flex justify-between items-center mb-1">
// // //       <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
// // //         {label}
// // //       </span>
// // //       <span className="text-gray-400">{icon}</span>
// // //     </div>
// // //     <div className="text-[26px] font-bold text-[#1A1A2E] leading-none">{value}</div>
// // //     {subLabel && (
// // //       <div className="text-[11.5px] text-gray-400 mt-1">{subLabel}</div>
// // //     )}
// // //   </div>
// // // );

// // // // ── Tabs ──────────────────────────────────────────────────────────────────────

// // // const TABS: { id: BookingTab; label: string }[] = [
// // //   { id: "upcoming",  label: "Upcoming"  },
// // //   { id: "past",      label: "Past"      },
// // //   { id: "cancelled", label: "Cancelled" },
// // // ];

// // // // ── Icons ─────────────────────────────────────────────────────────────────────

// // // const CalIcon = () => (
// // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// // //     <rect x="3" y="4" width="18" height="18" rx="2" />
// // //     <path d="M16 2v4M8 2v4M3 10h18" />
// // //   </svg>
// // // );
// // // const CheckIcon = () => (
// // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
// // //     <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
// // //   </svg>
// // // );
// // // const UsersIcon = () => (
// // //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// // //     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
// // //     <circle cx="9" cy="7" r="4" />
// // //     <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
// // //     <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
// // //   </svg>
// // // );
// // // const RefreshIcon = () => (
// // //   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
// // //     <path
// // //       d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
// // //       strokeLinecap="round"
// // //       strokeLinejoin="round"
// // //     />
// // //   </svg>
// // // );

// // // // ── Page ──────────────────────────────────────────────────────────────────────

// // // const MyBookingsPage: React.FC = () => {
// // //   const {
// // //     displayedBookings,
// // //     summary,
// // //     activeTab,
// // //     isLoading,
// // //     error,
// // //     setActiveTab,
// // //     handleCancelBooking,
// // //     refreshBookings,
// // //   } = useBookings();

// // //   const { user } = useAuthContext();

// // //   const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
// // //   const router = useRouter();

// // //   // Upcoming tab: split into future (ascending) + past section (descending)
// // //   const upcomingCards = sortByDate(
// // //     displayedBookings.filter((b) => b.status !== "cancelled" && isUpcoming(b.date)),
// // //     true,
// // //   );
// // //   const pastCards = sortByDate(
// // //     displayedBookings.filter((b) => b.status !== "cancelled" && !isUpcoming(b.date)),
// // //     false,
// // //   );

// // //   // All other tabs — descending for past, ascending otherwise
// // //   const sortedDisplayed = sortByDate(displayedBookings, activeTab !== "past");

// // //   // ── Handlers ──────────────────────────────────────────────────────────────

// // //   const handleConfirmCancel = async (reason: string) => {
// // //     if (!cancelTarget) return;
// // //     await cancelBooking(cancelTarget.id, reason);
// // //     await handleCancelBooking(cancelTarget.id);
// // //     setCancelTarget(null);
// // //   };

// // //   const handleModify = (booking: Booking) => {
// // //     router.push(`/dashboard/book-a-seat?modifyBookingId=${booking.id}&date=${booking.date}`);
// // //   };

// // //   // ── Render ────────────────────────────────────────────────────────────────

// // //   return (
// // //     <SidebarProvider>
// // //       <div className="flex h-screen bg-[#F7F8FC] font-sans overflow-hidden w-full">
// // //         <AppSidebar user={user} />

// // //         <main className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">

// // //           {/* Header */}
// // //           <div className="flex justify-between items-center">
// // //             <div>
// // //               <h1 className="text-[20px] font-bold text-[#1A1A2E] leading-tight">
// // //                 My Bookings
// // //               </h1>
// // //               <p className="text-[12.5px] text-gray-400 mt-0.5">
// // //                 Your upcoming and past seat reservations
// // //               </p>
// // //             </div>
// // //             <div className="flex gap-2.5 items-center">
// // //               <Button variant="outline" size="sm" className="h-8 text-[12.5px] text-gray-600">
// // //                 Export CSV
// // //               </Button>
// // //               <Button
// // //                 size="sm"
// // //                 className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold gap-1.5"
// // //               >
// // //                 <span className="text-base leading-none">+</span>
// // //                 New booking
// // //               </Button>
// // //               <Button
// // //                 variant="outline"
// // //                 size="icon"
// // //                 className="h-8 w-8 text-gray-400"
// // //                 onClick={refreshBookings}
// // //               >
// // //                 <RefreshIcon />
// // //               </Button>
// // //             </div>
// // //           </div>

// // //           {/* Stat cards */}
// // //           <div className="flex gap-4">
// // //             <StatCard
// // //               label="Upcoming"
// // //               value={summary.upcomingCount}
// // //               subLabel={summary.nextBookingDate ?? undefined}
// // //               icon={<CalIcon />}
// // //               accentClass="border-l-indigo-400"
// // //             />
// // //             <StatCard
// // //               label="Completed this month"
// // //               value={summary.completedThisMonth}
// // //               subLabel={`${summary.daysInOffice} days in office`}
// // //               icon={<CheckIcon />}
// // //               accentClass="border-l-emerald-400"
// // //             />
// // //             <StatCard
// // //               label="Team in office today"
// // //               value={summary.teamInOffice ?? 0}
// // //               subLabel={
// // //                 (summary.teamInOffice ?? 0) === 1
// // //                   ? "1 teammate present"
// // //                   : `${summary.teamInOffice ?? 0} teammates present`
// // //               }
// // //               icon={<UsersIcon />}
// // //               accentClass="border-l-violet-400"
// // //             />
// // //           </div>

// // //           {/* Tabs */}
// // //           <div className="flex border-b border-[#EBEBF5]">
// // //             {TABS.map((tab) => (
// // //               <button
// // //                 key={tab.id}
// // //                 onClick={() => setActiveTab(tab.id)}
// // //                 className={cn(
// // //                   "px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150",
// // //                   activeTab === tab.id
// // //                     ? "border-indigo-600 text-indigo-600 font-semibold"
// // //                     : "border-transparent text-gray-500 hover:text-gray-700",
// // //                 )}
// // //               >
// // //                 {tab.label}
// // //               </button>
// // //             ))}
// // //           </div>

// // //           {/* Content */}
// // //           <div className="flex flex-col gap-3">

// // //             {isLoading && (
// // //               <div className="text-center py-12 text-gray-400 text-[13.5px]">
// // //                 Loading bookings…
// // //               </div>
// // //             )}

// // //             {error && (
// // //               <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-500 text-[13px]">
// // //                 {error}
// // //               </div>
// // //             )}

// // //             {!isLoading && !error && displayedBookings.length === 0 && (
// // //               <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// // //                 No {activeTab} bookings found.
// // //               </div>
// // //             )}

// // //             {/* Upcoming tab */}
// // //             {!isLoading && !error && activeTab === "upcoming" && (
// // //               <>
// // //                 {upcomingCards.length > 0 ? (
// // //                   upcomingCards.map((booking) => (
// // //                     <BookingCard
// // //                       key={booking.id}
// // //                       booking={booking}
// // //                       onCancelClick={setCancelTarget}
// // //                       onModifyClick={handleModify}
// // //                       showActions
// // //                     />
// // //                   ))
// // //                 ) : (
// // //                   <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// // //                     No upcoming bookings.
// // //                   </div>
// // //                 )}

// // //                 {pastCards.length > 0 && (
// // //                   <>
// // //                     <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-2">
// // //                       Past Bookings
// // //                     </p>
// // //                     {pastCards.map((booking) => (
// // //                       <BookingCard
// // //                         key={booking.id}
// // //                         booking={booking}
// // //                         onCancelClick={setCancelTarget}
// // //                         onModifyClick={handleModify}
// // //                         showActions={false}
// // //                       />
// // //                     ))}
// // //                   </>
// // //                 )}
// // //               </>
// // //             )}

// // //             {/* All other tabs */}
// // //             {!isLoading && !error && activeTab !== "upcoming" &&
// // //               sortedDisplayed.map((booking) => (
// // //                 <BookingCard
// // //                   key={booking.id}
// // //                   booking={booking}
// // //                   onCancelClick={setCancelTarget}
// // //                   onModifyClick={handleModify}
// // //                   showActions={activeTab !== "past"}
// // //                 />
// // //               ))
// // //             }
// // //           </div>
// // //         </main>
// // //       </div>

// // //       {/* Dialogs */}
// // //       <CancelDialog
// // //         open={cancelTarget !== null}
// // //         booking={cancelTarget}
// // //         onConfirm={handleConfirmCancel}
// // //         onClose={() => setCancelTarget(null)}
// // //       />
// // //     </SidebarProvider>
// // //   );
// // // };

// // // export default MyBookingsPage;

// // "use client";

// // import React, { useState } from "react";
// // import { useRouter } from "next/navigation";
// // import { Booking, BookingTab } from "../types/bookings.types";
// // import { useBookings } from "../hooks/useBookings";
// // import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// // import { useAuthContext } from "@/features/auth/context/AuthContext";
// // import { SidebarProvider } from "@/components/ui/sidebar";
// // import { cn } from "@/lib/utils";
// // import {
// //   cancelBooking,
// // } from "../services/bookings.service";
// // import {
// //   AlertDialog,
// //   AlertDialogAction,
// //   AlertDialogCancel,
// //   AlertDialogContent,
// //   AlertDialogDescription,
// //   AlertDialogFooter,
// //   AlertDialogHeader,
// //   AlertDialogTitle,
// // } from "@/components/ui/alert-dialog";
// // import { Button }   from "@/components/ui/button";
// // import { Label }    from "@/components/ui/label";
// // import { Textarea } from "@/components/ui/textarea";

// // // ── Helpers ───────────────────────────────────────────────────────────────────

// // function formatDate(iso: string): string {
// //   const d = new Date(iso + "T00:00:00");
// //   return d.toLocaleDateString("en-US", {
// //     weekday: "short",
// //     month:   "short",
// //     day:     "numeric",
// //   });
// // }

// // function isUpcoming(isoDate: string): boolean {
// //   const today = new Date();
// //   today.setHours(0, 0, 0, 0);
// //   return new Date(isoDate + "T00:00:00") >= today;
// // }

// // function sortByDate(bookings: Booking[], ascending = true): Booking[] {
// //   return [...bookings].sort((a, b) => {
// //     const da = new Date(a.date + "T00:00:00").getTime();
// //     const db = new Date(b.date + "T00:00:00").getTime();
// //     return ascending ? da - db : db - da;
// //   });
// // }

// // // ── Tag chip ──────────────────────────────────────────────────────────────────

// // interface TagProps { label: string; variant: string; }

// // const TAG_STYLES: Record<string, string> = {
// //   confirmed: "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]",
// //   manager:   "bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]",
// //   zone:      "bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]",
// //   sprint:    "bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]",
// //   recurring: "bg-[#E8EAF6] text-[#283593] border border-[#9FA8DA]",
// // };

// // const BookingTagChip: React.FC<TagProps> = ({ label, variant }) => (
// //   <span className={cn(
// //     "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
// //     TAG_STYLES[variant] ?? TAG_STYLES.zone,
// //   )}>
// //     {label}
// //   </span>
// // );

// // // ── Cancel Dialog ─────────────────────────────────────────────────────────────

// // interface CancelDialogProps {
// //   open:      boolean;
// //   booking:   Booking | null;
// //   onConfirm: (reason: string) => Promise<void>;
// //   onClose:   () => void;
// // }

// // const CancelDialog: React.FC<CancelDialogProps> = ({
// //   open, booking, onConfirm, onClose,
// // }) => {
// //   const [reason,  setReason]  = useState("");
// //   const [loading, setLoading] = useState(false);

// //   const handleConfirm = async () => {
// //     setLoading(true);
// //     try {
// //       await onConfirm(reason);
// //       setReason("");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const handleOpenChange = (val: boolean) => {
// //     if (!val) { setReason(""); onClose(); }
// //   };

// //   return (
// //     <AlertDialog open={open} onOpenChange={handleOpenChange}>
// //       <AlertDialogContent className="max-w-md">
// //         <AlertDialogHeader>
// //           <AlertDialogTitle className="text-[#1A1A2E]">Cancel Booking</AlertDialogTitle>
// //           <AlertDialogDescription className="text-gray-500 text-[13px]">
// //             {booking && (
// //               <span>
// //                 Are you sure you want to cancel your booking at{" "}
// //                 <strong className="text-gray-700">
// //                   {booking.location} · {booking.floor} · Seat {booking.seat}
// //                 </strong>{" "}
// //                 on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
// //                 This action cannot be undone.
// //               </span>
// //             )}
// //           </AlertDialogDescription>
// //         </AlertDialogHeader>

// //         <div className="py-2">
// //           <Label
// //             htmlFor="cancel-reason"
// //             className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
// //           >
// //             Reason for cancellation{" "}
// //             <span className="text-gray-400 font-normal">(optional)</span>
// //           </Label>
// //           <Textarea
// //             id="cancel-reason"
// //             placeholder="e.g. Working from home, schedule change…"
// //             value={reason}
// //             onChange={(e) => setReason(e.target.value)}
// //             className="text-[13px] resize-none h-20"
// //           />
// //         </div>

// //         <AlertDialogFooter>
// //           <AlertDialogCancel
// //             onClick={() => { setReason(""); onClose(); }}
// //             className="text-[12.5px]"
// //           >
// //             Keep Booking
// //           </AlertDialogCancel>
// //           <AlertDialogAction
// //             onClick={handleConfirm}
// //             disabled={loading}
// //             className="bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50"
// //           >
// //             {loading ? "Cancelling…" : "Yes, Cancel"}
// //           </AlertDialogAction>
// //         </AlertDialogFooter>
// //       </AlertDialogContent>
// //     </AlertDialog>
// //   );
// // };

// // // ── Booking card ──────────────────────────────────────────────────────────────

// // interface BookingCardProps {
// //   booking:       Booking;
// //   onCancelClick: (booking: Booking) => void;
// //   onModifyClick: (booking: Booking) => void;
// //   showActions?:  boolean;
// // }

// // const BookingCard: React.FC<BookingCardProps> = ({
// //   booking,
// //   onCancelClick,
// //   onModifyClick,
// //   showActions = true,
// // }) => {
// //   const isCancelled = booking.status === "cancelled";

// //   return (
// //     <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col hover:shadow-sm transition-shadow duration-200">
// //       <div className="flex items-stretch">
// //         {/* Left accent bar */}
// //         <div className={cn(
// //           "w-[3px] shrink-0",
// //           isCancelled
// //             ? "bg-gray-200"
// //             : booking.status === "pending"
// //               ? "bg-amber-400"
// //               : "bg-indigo-500",
// //         )} />

// //         <div className="flex-1 px-5 py-4">
// //           {/* Row 1: title + booked-on */}
// //           <div className="flex justify-between items-start gap-4">
// //             <div>
// //               <p className="text-[13.5px] font-semibold text-[#1A1A2E]">
// //                 {booking.location} · {booking.floor} · Seat {booking.seat}
// //               </p>
// //               <p className="text-[12px] text-gray-500 mt-0.5">
// //                 {formatDate(booking.date)}
// //                 {" · "}
// //                 {booking.isFullDay
// //                   ? "Full day"
// //                   : `${booking.startTime} – ${booking.endTime}`}
// //                 {booking.isFullDay && (
// //                   <span className="ml-2 text-[11px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
// //                     Full day
// //                   </span>
// //                 )}
// //               </p>
// //             </div>
// //             <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5">
// //               Booked {booking.bookedOn}
// //             </span>
// //           </div>

// //           {/* Row 2: tags */}
// //           <div className="flex gap-1.5 flex-wrap mt-2.5">
// //             {booking.tags.map((tag, i) => (
// //               <BookingTagChip key={i} label={tag.label} variant={tag.variant} />
// //             ))}
// //             {booking.isRecurring && booking.recurringPattern && (
// //               <BookingTagChip label={booking.recurringPattern} variant="recurring" />
// //             )}
// //           </div>
// //         </div>
// //       </div>

// //       {/* Action footer */}
// //       {showActions && !isCancelled && (
// //         <div className="flex justify-end gap-2 px-5 py-2.5 border-t border-gray-100 bg-[#F7F8FC]">
// //           <Button
// //             variant="outline"
// //             size="sm"
// //             className="h-7 px-4 text-[12.5px] text-gray-600"
// //             onClick={() => onModifyClick(booking)}
// //           >
// //             Modify
// //           </Button>
// //           <Button
// //             variant="outline"
// //             size="sm"
// //             className="h-7 px-4 text-[12.5px] border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 hover:border-red-300"
// //             onClick={() => onCancelClick(booking)}
// //           >
// //             Cancel
// //           </Button>
// //         </div>
// //       )}

// //       {showActions && isCancelled && (
// //         <div className="flex justify-end px-5 py-2.5 border-t border-gray-100">
// //           <Button variant="outline" size="sm" className="h-7 px-4 text-[12.5px] text-gray-600">
// //             View details
// //           </Button>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // // ── Stat card ─────────────────────────────────────────────────────────────────

// // interface StatCardProps {
// //   label:       string;
// //   value:       number | string;
// //   subLabel?:   string;
// //   icon:        React.ReactNode;
// //   accentClass: string;
// // }

// // const StatCard: React.FC<StatCardProps> = ({
// //   label, value, subLabel, icon, accentClass,
// // }) => (
// //   <div className={cn(
// //     "flex-1 bg-white border border-[#EBEBF5] rounded-xl p-4 flex flex-col gap-1 min-w-[160px]",
// //     "border-l-[3px]", accentClass,
// //   )}>
// //     <div className="flex justify-between items-center mb-1">
// //       <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
// //         {label}
// //       </span>
// //       <span className="text-gray-400">{icon}</span>
// //     </div>
// //     <div className="text-[26px] font-bold text-[#1A1A2E] leading-none">{value}</div>
// //     {subLabel && (
// //       <div className="text-[11.5px] text-gray-400 mt-1">{subLabel}</div>
// //     )}
// //   </div>
// // );

// // // ── Tabs ──────────────────────────────────────────────────────────────────────

// // const TABS: { id: BookingTab; label: string }[] = [
// //   { id: "upcoming",  label: "Upcoming"  },
// //   { id: "past",      label: "Past"      },
// //   { id: "cancelled", label: "Cancelled" },
// // ];

// // // ── Icons ─────────────────────────────────────────────────────────────────────

// // const CalIcon = () => (
// //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// //     <rect x="3" y="4" width="18" height="18" rx="2" />
// //     <path d="M16 2v4M8 2v4M3 10h18" />
// //   </svg>
// // );
// // const CheckIcon = () => (
// //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
// //     <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
// //   </svg>
// // );
// // const UsersIcon = () => (
// //   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
// //     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
// //     <circle cx="9" cy="7" r="4" />
// //     <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
// //     <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
// //   </svg>
// // );
// // const RefreshIcon = () => (
// //   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
// //     <path
// //       d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
// //       strokeLinecap="round"
// //       strokeLinejoin="round"
// //     />
// //   </svg>
// // );

// // // ── Page ──────────────────────────────────────────────────────────────────────

// // const MyBookingsPage: React.FC = () => {
// //   const {
// //     displayedBookings,
// //     summary,
// //     activeTab,
// //     isLoading,
// //     error,
// //     setActiveTab,
// //     handleCancelBooking,
// //     refreshBookings,
// //   } = useBookings();

// //   const { user } = useAuthContext();

// //   const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
// //   const router = useRouter();

// //   // Upcoming tab: split into future (ascending) + past section (descending)
// //   const upcomingCards = sortByDate(
// //     displayedBookings.filter((b) => b.status !== "cancelled" && isUpcoming(b.date)),
// //     true,
// //   );
// //   const pastCards = sortByDate(
// //     displayedBookings.filter((b) => b.status !== "cancelled" && !isUpcoming(b.date)),
// //     false,
// //   );

// //   // All other tabs — descending for past, ascending otherwise
// //   const sortedDisplayed = sortByDate(displayedBookings, activeTab !== "past");

// //   // ── Handlers ──────────────────────────────────────────────────────────────

// //   const handleConfirmCancel = async (reason: string) => {
// //     if (!cancelTarget) return;
// //     await cancelBooking(cancelTarget.id, reason);
// //     await handleCancelBooking(cancelTarget.id);
// //     setCancelTarget(null);
// //   };

// //   // const handleModify = (booking: Booking) => {
// //   //   router.push(`/book?modifyBookingId=${booking.id}&date=${booking.date}`);
// //   // };

// // //   const handleModify = (booking: Booking) => {
// // //   const params = new URLSearchParams({
// // //     modifyBookingId: booking.id,
// // //     date:            booking.date,          // single-date (current behaviour)
// // //     fromDate:        booking.date,          // ← for future multi-date range
// // //     toDate:          booking.date,          // ← same day until range is selected
// // //     location:        booking.location,      // prefills site/building selector
// // //     floor:           booking.floor,         // prefills floor selector
// // //     seat:            booking.seat,          // prefills seat (nice to have)
// // //   });

// // //   router.push(`/book?${params.toString()}`);
// // // };

// // const handleModify = (booking: Booking) => {
// //   const params = new URLSearchParams({
// //     modifyBookingId: booking.id,
// //     fromDate:        booking.date,
// //     toDate:          booking.date,
// //     locationName:    booking.location,   // renamed for clarity — it's a name, not an ID
// //     floorName:       booking.floor,
// //     seatLabel:       booking.seat,       // seat label e.g. "A-12"
// //   });
// //   router.push(`/book?${params.toString()}`);
// // };

// //   // ── Render ────────────────────────────────────────────────────────────────

// //   return (
// //     <SidebarProvider>
// //       <div className="flex h-screen bg-[#F7F8FC] font-sans overflow-hidden w-full">
// //         <AppSidebar user={user} />

// //         <main className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">

// //           {/* Header */}
// //           <div className="flex justify-between items-center">
// //             <div>
// //               <h1 className="text-[20px] font-bold text-[#1A1A2E] leading-tight">
// //                 My Bookings
// //               </h1>
// //               <p className="text-[12.5px] text-gray-400 mt-0.5">
// //                 Your upcoming and past seat reservations
// //               </p>
// //             </div>
// //             <div className="flex gap-2.5 items-center">
// //               <Button variant="outline" size="sm" className="h-8 text-[12.5px] text-gray-600">
// //                 Export CSV
// //               </Button>
// //               <Button
// //                 size="sm"
// //                 className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold gap-1.5"
// //               >
// //                 <span className="text-base leading-none">+</span>
// //                 New booking
// //               </Button>
// //               <Button
// //                 variant="outline"
// //                 size="icon"
// //                 className="h-8 w-8 text-gray-400"
// //                 onClick={refreshBookings}
// //               >
// //                 <RefreshIcon />
// //               </Button>
// //             </div>
// //           </div>

// //           {/* Stat cards */}
// //           <div className="flex gap-4">
// //             <StatCard
// //               label="Upcoming"
// //               value={summary.upcomingCount}
// //               subLabel={summary.nextBookingDate ?? undefined}
// //               icon={<CalIcon />}
// //               accentClass="border-l-indigo-400"
// //             />
// //             <StatCard
// //               label="Completed this month"
// //               value={summary.completedThisMonth}
// //               subLabel={`${summary.daysInOffice} days in office`}
// //               icon={<CheckIcon />}
// //               accentClass="border-l-emerald-400"
// //             />
// //             <StatCard
// //               label="Team in office today"
// //               value={summary.teamInOffice ?? 0}
// //               subLabel={
// //                 (summary.teamInOffice ?? 0) === 1
// //                   ? "1 teammate present"
// //                   : `${summary.teamInOffice ?? 0} teammates present`
// //               }
// //               icon={<UsersIcon />}
// //               accentClass="border-l-violet-400"
// //             />
// //           </div>

// //           {/* Tabs */}
// //           <div className="flex border-b border-[#EBEBF5]">
// //             {TABS.map((tab) => (
// //               <button
// //                 key={tab.id}
// //                 onClick={() => setActiveTab(tab.id)}
// //                 className={cn(
// //                   "px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150",
// //                   activeTab === tab.id
// //                     ? "border-indigo-600 text-indigo-600 font-semibold"
// //                     : "border-transparent text-gray-500 hover:text-gray-700",
// //                 )}
// //               >
// //                 {tab.label}
// //               </button>
// //             ))}
// //           </div>

// //           {/* Content */}
// //           <div className="flex flex-col gap-3">

// //             {isLoading && (
// //               <div className="text-center py-12 text-gray-400 text-[13.5px]">
// //                 Loading bookings…
// //               </div>
// //             )}

// //             {error && (
// //               <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-500 text-[13px]">
// //                 {error}
// //               </div>
// //             )}

// //             {!isLoading && !error && displayedBookings.length === 0 && (
// //               <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// //                 No {activeTab} bookings found.
// //               </div>
// //             )}

// //             {/* Upcoming tab */}
// //             {!isLoading && !error && activeTab === "upcoming" && (
// //               <>
// //                 {upcomingCards.length > 0 ? (
// //                   upcomingCards.map((booking) => (
// //                     <BookingCard
// //                       key={booking.id}
// //                       booking={booking}
// //                       onCancelClick={setCancelTarget}
// //                       onModifyClick={handleModify}
// //                       showActions
// //                     />
// //                   ))
// //                 ) : (
// //                   <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
// //                     No upcoming bookings.
// //                   </div>
// //                 )}

// //                 {pastCards.length > 0 && (
// //                   <>
// //                     <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-2">
// //                       Past Bookings
// //                     </p>
// //                     {pastCards.map((booking) => (
// //                       <BookingCard
// //                         key={booking.id}
// //                         booking={booking}
// //                         onCancelClick={setCancelTarget}
// //                         onModifyClick={handleModify}
// //                         showActions={false}
// //                       />
// //                     ))}
// //                   </>
// //                 )}
// //               </>
// //             )}

// //             {/* All other tabs */}
// //             {!isLoading && !error && activeTab !== "upcoming" &&
// //               sortedDisplayed.map((booking) => (
// //                 <BookingCard
// //                   key={booking.id}
// //                   booking={booking}
// //                   onCancelClick={setCancelTarget}
// //                   onModifyClick={handleModify}
// //                   showActions={activeTab !== "past"}
// //                 />
// //               ))
// //             }
// //           </div>
// //         </main>
// //       </div>

// //       {/* Dialogs */}
// //       <CancelDialog
// //         open={cancelTarget !== null}
// //         booking={cancelTarget}
// //         onConfirm={handleConfirmCancel}
// //         onClose={() => setCancelTarget(null)}
// //       />
// //     </SidebarProvider>
// //   );
// // };

// // export default MyBookingsPage;

// "use client";

// import React, { useState } from "react";
// import { useRouter } from "next/navigation";
// import { Booking, BookingTab } from "../types/bookings.types";
// import { useBookings } from "../hooks/useBookings";
// import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// import { useAuthContext } from "@/features/auth/context/AuthContext";
// import { SidebarProvider } from "@/components/ui/sidebar";
// import { cn } from "@/lib/utils";
// import {
//   cancelBooking,
// } from "../services/bookings.service";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import { Button }   from "@/components/ui/button";
// import { Label }    from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";

// // ── Helpers ───────────────────────────────────────────────────────────────────

// function formatDate(iso: string): string {
//   const d = new Date(iso + "T00:00:00");
//   return d.toLocaleDateString("en-US", {
//     weekday: "short",
//     month:   "short",
//     day:     "numeric",
//   });
// }

// function isUpcoming(isoDate: string): boolean {
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
//   return new Date(isoDate + "T00:00:00") >= today;
// }

// function sortByDate(bookings: Booking[], ascending = true): Booking[] {
//   return [...bookings].sort((a, b) => {
//     const da = new Date(a.date + "T00:00:00").getTime();
//     const db = new Date(b.date + "T00:00:00").getTime();
//     return ascending ? da - db : db - da;
//   });
// }

// // ── Tag chip ──────────────────────────────────────────────────────────────────

// interface TagProps { label: string; variant: string; }

// const TAG_STYLES: Record<string, string> = {
//   confirmed: "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]",
//   manager:   "bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]",
//   zone:      "bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]",
//   sprint:    "bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]",
//   recurring: "bg-[#E8EAF6] text-[#283593] border border-[#9FA8DA]",
// };

// const BookingTagChip: React.FC<TagProps> = ({ label, variant }) => (
//   <span className={cn(
//     "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
//     TAG_STYLES[variant] ?? TAG_STYLES.zone,
//   )}>
//     {label}
//   </span>
// );

// // ── Cancel Dialog ─────────────────────────────────────────────────────────────

// interface CancelDialogProps {
//   open:      boolean;
//   booking:   Booking | null;
//   onConfirm: (reason: string) => Promise<void>;
//   onClose:   () => void;
// }

// const CancelDialog: React.FC<CancelDialogProps> = ({
//   open, booking, onConfirm, onClose,
// }) => {
//   const [reason,  setReason]  = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleConfirm = async () => {
//     setLoading(true);
//     try {
//       await onConfirm(reason);
//       setReason("");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleOpenChange = (val: boolean) => {
//     if (!val) { setReason(""); onClose(); }
//   };

//   return (
//     <AlertDialog open={open} onOpenChange={handleOpenChange}>
//       <AlertDialogContent className="max-w-md">
//         <AlertDialogHeader>
//           <AlertDialogTitle className="text-[#1A1A2E]">Cancel Booking</AlertDialogTitle>
//           <AlertDialogDescription className="text-gray-500 text-[13px]">
//             {booking && (
//               <span>
//                 Are you sure you want to cancel your booking at{" "}
//                 <strong className="text-gray-700">
//                   {booking.location} · {booking.floor} · Seat {booking.seat}
//                 </strong>{" "}
//                 on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
//                 This action cannot be undone.
//               </span>
//             )}
//           </AlertDialogDescription>
//         </AlertDialogHeader>

//         <div className="py-2">
//           <Label
//             htmlFor="cancel-reason"
//             className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
//           >
//             Reason for cancellation{" "}
//             <span className="text-gray-400 font-normal">(optional)</span>
//           </Label>
//           <Textarea
//             id="cancel-reason"
//             placeholder="e.g. Working from home, schedule change…"
//             value={reason}
//             onChange={(e) => setReason(e.target.value)}
//             className="text-[13px] resize-none h-20"
//           />
//         </div>

//         <AlertDialogFooter>
//           <AlertDialogCancel
//             onClick={() => { setReason(""); onClose(); }}
//             className="text-[12.5px]"
//           >
//             Keep Booking
//           </AlertDialogCancel>
//           <AlertDialogAction
//             onClick={handleConfirm}
//             disabled={loading}
//             className="bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50"
//           >
//             {loading ? "Cancelling…" : "Yes, Cancel"}
//           </AlertDialogAction>
//         </AlertDialogFooter>
//       </AlertDialogContent>
//     </AlertDialog>
//   );
// };

// // ── Booking card ──────────────────────────────────────────────────────────────

// interface BookingCardProps {
//   booking:       Booking;
//   onCancelClick: (booking: Booking) => void;
//   onModifyClick: (booking: Booking) => void;
//   showActions?:  boolean;
// }

// const BookingCard: React.FC<BookingCardProps> = ({
//   booking,
//   onCancelClick,
//   onModifyClick,
//   showActions = true,
// }) => {
//   const isCancelled = booking.status === "cancelled";

//   return (
//     <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col hover:shadow-sm transition-shadow duration-200">
//       <div className="flex items-stretch">
//         {/* Left accent bar */}
//         <div className={cn(
//           "w-[3px] shrink-0",
//           isCancelled
//             ? "bg-gray-200"
//             : booking.status === "pending"
//               ? "bg-amber-400"
//               : "bg-indigo-500",
//         )} />

//         <div className="flex-1 px-5 py-4">
//           {/* Row 1: title + booked-on */}
//           <div className="flex justify-between items-start gap-4">
//             <div>
//               <p className="text-[13.5px] font-semibold text-[#1A1A2E]">
//                 {booking.location} · {booking.floor} · Seat {booking.seat}
//               </p>
//               <p className="text-[12px] text-gray-500 mt-0.5">
//                 {formatDate(booking.date)}
//                 {" · "}
//                 {booking.isFullDay
//                   ? "Full day"
//                   : `${booking.startTime} – ${booking.endTime}`}
//                 {booking.isFullDay && (
//                   <span className="ml-2 text-[11px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
//                     Full day
//                   </span>
//                 )}
//               </p>
//             </div>
//             <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5">
//               Booked {booking.bookedOn}
//             </span>
//           </div>

//           {/* Row 2: tags */}
//           <div className="flex gap-1.5 flex-wrap mt-2.5">
//             {booking.tags.map((tag, i) => (
//               <BookingTagChip key={i} label={tag.label} variant={tag.variant} />
//             ))}
//             {booking.isRecurring && booking.recurringPattern && (
//               <BookingTagChip label={booking.recurringPattern} variant="recurring" />
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Action footer */}
//       {showActions && !isCancelled && (
//         <div className="flex justify-end gap-2 px-5 py-2.5 border-t border-gray-100 bg-[#F7F8FC]">
//           <Button
//             variant="outline"
//             size="sm"
//             className="h-7 px-4 text-[12.5px] text-gray-600"
//             onClick={() => onModifyClick(booking)}
//           >
//             Modify
//           </Button>
//           <Button
//             variant="outline"
//             size="sm"
//             className="h-7 px-4 text-[12.5px] border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 hover:border-red-300"
//             onClick={() => onCancelClick(booking)}
//           >
//             Cancel
//           </Button>
//         </div>
//       )}

//       {showActions && isCancelled && (
//         <div className="flex justify-end px-5 py-2.5 border-t border-gray-100">
//           <Button variant="outline" size="sm" className="h-7 px-4 text-[12.5px] text-gray-600">
//             View details
//           </Button>
//         </div>
//       )}
//     </div>
//   );
// };

// // ── Stat card ─────────────────────────────────────────────────────────────────

// interface StatCardProps {
//   label:       string;
//   value:       number | string;
//   subLabel?:   string;
//   icon:        React.ReactNode;
//   accentClass: string;
// }

// const StatCard: React.FC<StatCardProps> = ({
//   label, value, subLabel, icon, accentClass,
// }) => (
//   <div className={cn(
//     "flex-1 bg-white border border-[#EBEBF5] rounded-xl p-4 flex flex-col gap-1 min-w-[160px]",
//     "border-l-[3px]", accentClass,
//   )}>
//     <div className="flex justify-between items-center mb-1">
//       <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
//         {label}
//       </span>
//       <span className="text-gray-400">{icon}</span>
//     </div>
//     <div className="text-[26px] font-bold text-[#1A1A2E] leading-none">{value}</div>
//     {subLabel && (
//       <div className="text-[11.5px] text-gray-400 mt-1">{subLabel}</div>
//     )}
//   </div>
// );

// // ── Tabs ──────────────────────────────────────────────────────────────────────

// const TABS: { id: BookingTab; label: string }[] = [
//   { id: "upcoming",  label: "Upcoming"  },
//   { id: "past",      label: "Past"      },
//   { id: "cancelled", label: "Cancelled" },
// ];

// // ── Icons ─────────────────────────────────────────────────────────────────────

// const CalIcon = () => (
//   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
//     <rect x="3" y="4" width="18" height="18" rx="2" />
//     <path d="M16 2v4M8 2v4M3 10h18" />
//   </svg>
// );
// const CheckIcon = () => (
//   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
//     <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
//   </svg>
// );
// const UsersIcon = () => (
//   <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
//     <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
//     <circle cx="9" cy="7" r="4" />
//     <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
//     <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
//   </svg>
// );
// const RefreshIcon = () => (
//   <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
//     <path
//       d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     />
//   </svg>
// );

// // ── Page ──────────────────────────────────────────────────────────────────────

// const MyBookingsPage: React.FC = () => {
//   const {
//     displayedBookings,
//     summary,
//     activeTab,
//     isLoading,
//     error,
//     setActiveTab,
//     handleCancelBooking,
//     refreshBookings,
//   } = useBookings();

//   const { user } = useAuthContext();

//   const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
//   const router = useRouter();

//   // Upcoming tab: split into future (ascending) + past section (descending)
//   const upcomingCards = sortByDate(
//     displayedBookings.filter((b) => b.status !== "cancelled" && isUpcoming(b.date)),
//     true,
//   );
//   const pastCards = sortByDate(
//     displayedBookings.filter((b) => b.status !== "cancelled" && !isUpcoming(b.date)),
//     false,
//   );

//   // All other tabs — descending for past, ascending otherwise
//   const sortedDisplayed = sortByDate(displayedBookings, activeTab !== "past");

//   // ── Handlers ──────────────────────────────────────────────────────────────

//   const handleConfirmCancel = async (reason: string) => {
//     if (!cancelTarget) return;
//     await cancelBooking(cancelTarget.id, reason);
//     await handleCancelBooking(cancelTarget.id);
//     setCancelTarget(null);
//   };

//   const handleModify = (booking: Booking) => {
//     const params = new URLSearchParams({
//       modifyBookingId: booking.id,
//       fromDate:        booking.date,
//       toDate:          booking.date,
//       locationName:    booking.location,   // site name — resolved to siteId in hook
//       buildingName:    booking.building,   // building name — resolved to buildingId in hook
//       floorName:       booking.floor,      // floor name — resolved to floorId in hook
//       seatLabel:       booking.seat,       // seat label e.g. "A-12" — resolved to selectedSeatId in hook
//     });
//     router.push(`/book?${params.toString()}`);
//   };

//   // ── Render ────────────────────────────────────────────────────────────────

//   return (
//     <SidebarProvider>
//       <div className="flex h-screen bg-[#F7F8FC] font-sans overflow-hidden w-full">
//         <AppSidebar user={user} />

//         <main className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">

//           {/* Header */}
//           <div className="flex justify-between items-center">
//             <div>
//               <h1 className="text-[20px] font-bold text-[#1A1A2E] leading-tight">
//                 My Bookings
//               </h1>
//               <p className="text-[12.5px] text-gray-400 mt-0.5">
//                 Your upcoming and past seat reservations
//               </p>
//             </div>
//             <div className="flex gap-2.5 items-center">
//               <Button variant="outline" size="sm" className="h-8 text-[12.5px] text-gray-600">
//                 Export CSV
//               </Button>
//               <Button
//                 size="sm"
//                 className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold gap-1.5"
//               >
//                 <span className="text-base leading-none">+</span>
//                 New booking
//               </Button>
//               <Button
//                 variant="outline"
//                 size="icon"
//                 className="h-8 w-8 text-gray-400"
//                 onClick={refreshBookings}
//               >
//                 <RefreshIcon />
//               </Button>
//             </div>
//           </div>

//           {/* Stat cards */}
//           <div className="flex gap-4">
//             <StatCard
//               label="Upcoming"
//               value={summary.upcomingCount}
//               subLabel={summary.nextBookingDate ?? undefined}
//               icon={<CalIcon />}
//               accentClass="border-l-indigo-400"
//             />
//             <StatCard
//               label="Completed this month"
//               value={summary.completedThisMonth}
//               subLabel={`${summary.daysInOffice} days in office`}
//               icon={<CheckIcon />}
//               accentClass="border-l-emerald-400"
//             />
//             <StatCard
//               label="Team in office today"
//               value={summary.teamInOffice ?? 0}
//               subLabel={
//                 (summary.teamInOffice ?? 0) === 1
//                   ? "1 teammate present"
//                   : `${summary.teamInOffice ?? 0} teammates present`
//               }
//               icon={<UsersIcon />}
//               accentClass="border-l-violet-400"
//             />
//           </div>

//           {/* Tabs */}
//           <div className="flex border-b border-[#EBEBF5]">
//             {TABS.map((tab) => (
//               <button
//                 key={tab.id}
//                 onClick={() => setActiveTab(tab.id)}
//                 className={cn(
//                   "px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150",
//                   activeTab === tab.id
//                     ? "border-indigo-600 text-indigo-600 font-semibold"
//                     : "border-transparent text-gray-500 hover:text-gray-700",
//                 )}
//               >
//                 {tab.label}
//               </button>
//             ))}
//           </div>

//           {/* Content */}
//           <div className="flex flex-col gap-3">

//             {isLoading && (
//               <div className="text-center py-12 text-gray-400 text-[13.5px]">
//                 Loading bookings…
//               </div>
//             )}

//             {error && (
//               <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-500 text-[13px]">
//                 {error}
//               </div>
//             )}

//             {!isLoading && !error && displayedBookings.length === 0 && (
//               <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
//                 No {activeTab} bookings found.
//               </div>
//             )}

//             {/* Upcoming tab */}
//             {!isLoading && !error && activeTab === "upcoming" && (
//               <>
//                 {upcomingCards.length > 0 ? (
//                   upcomingCards.map((booking) => (
//                     <BookingCard
//                       key={booking.id}
//                       booking={booking}
//                       onCancelClick={setCancelTarget}
//                       onModifyClick={handleModify}
//                       showActions
//                     />
//                   ))
//                 ) : (
//                   <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
//                     No upcoming bookings.
//                   </div>
//                 )}

//                 {pastCards.length > 0 && (
//                   <>
//                     <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-2">
//                       Past Bookings
//                     </p>
//                     {pastCards.map((booking) => (
//                       <BookingCard
//                         key={booking.id}
//                         booking={booking}
//                         onCancelClick={setCancelTarget}
//                         onModifyClick={handleModify}
//                         showActions={false}
//                       />
//                     ))}
//                   </>
//                 )}
//               </>
//             )}

//             {/* All other tabs */}
//             {!isLoading && !error && activeTab !== "upcoming" &&
//               sortedDisplayed.map((booking) => (
//                 <BookingCard
//                   key={booking.id}
//                   booking={booking}
//                   onCancelClick={setCancelTarget}
//                   onModifyClick={handleModify}
//                   showActions={activeTab !== "past"}
//                 />
//               ))
//             }
//           </div>
//         </main>
//       </div>

//       {/* Dialogs */}
//       <CancelDialog
//         open={cancelTarget !== null}
//         booking={cancelTarget}
//         onConfirm={handleConfirmCancel}
//         onClose={() => setCancelTarget(null)}
//       />
//     </SidebarProvider>
//   );
// };

// export default MyBookingsPage;

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Booking, BookingTab } from "../types/bookings.types";
import { useBookings } from "../hooks/useBookings";
import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
import { useAuthContext } from "@/features/auth/context/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  cancelBooking,
  fetchSeatAmenities,
} from "../services/bookings.service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button }   from "@/components/ui/button";
import { Label }    from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
  });
}

function isUpcoming(isoDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(isoDate + "T00:00:00") >= today;
}

function sortByDate(bookings: Booking[], ascending = true): Booking[] {
  return [...bookings].sort((a, b) => {
    const da = new Date(a.date + "T00:00:00").getTime();
    const db = new Date(b.date + "T00:00:00").getTime();
    return ascending ? da - db : db - da;
  });
}

// ── Tag chip ──────────────────────────────────────────────────────────────────

interface TagProps { label: string; variant: string; }

const TAG_STYLES: Record<string, string> = {
  confirmed: "bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]",
  manager:   "bg-[#E3F2FD] text-[#1565C0] border border-[#90CAF9]",
  zone:      "bg-[#F3E5F5] text-[#6A1B9A] border border-[#CE93D8]",
  sprint:    "bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]",
  recurring: "bg-[#E8EAF6] text-[#283593] border border-[#9FA8DA]",
};

const BookingTagChip: React.FC<TagProps> = ({ label, variant }) => (
  <span className={cn(
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap",
    TAG_STYLES[variant] ?? TAG_STYLES.zone,
  )}>
    {label}
  </span>
);

// ── Cancel Dialog ─────────────────────────────────────────────────────────────

interface CancelDialogProps {
  open:      boolean;
  booking:   Booking | null;
  onConfirm: (reason: string) => Promise<void>;
  onClose:   () => void;
}

const CancelDialog: React.FC<CancelDialogProps> = ({
  open, booking, onConfirm, onClose,
}) => {
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(reason);
      setReason("");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) { setReason(""); onClose(); }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#1A1A2E]">Cancel Booking</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 text-[13px]">
            {booking && (
              <span>
                Are you sure you want to cancel your booking at{" "}
                <strong className="text-gray-700">
                  {booking.location} · {booking.floor} · Seat {booking.seat}
                </strong>{" "}
                on <strong className="text-gray-700">{formatDate(booking.date)}</strong>?
                This action cannot be undone.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <Label
            htmlFor="cancel-reason"
            className="text-[12.5px] font-medium text-gray-600 mb-1.5 block"
          >
            Reason for cancellation{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </Label>
          <Textarea
            id="cancel-reason"
            placeholder="e.g. Working from home, schedule change…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-[13px] resize-none h-20"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => { setReason(""); onClose(); }}
            className="text-[12.5px]"
          >
            Keep Booking
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 text-white text-[12.5px] disabled:opacity-50"
          >
            {loading ? "Cancelling…" : "Yes, Cancel"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// ── Booking card ──────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking:       Booking;
  onCancelClick: (booking: Booking) => void;
  onModifyClick: (booking: Booking) => void;
  showActions?:  boolean;
}

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onCancelClick,
  onModifyClick,
  showActions = true,
}) => {
  const isCancelled = booking.status === "cancelled";

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col hover:shadow-sm transition-shadow duration-200">
      <div className="flex items-stretch">
        {/* Left accent bar */}
        <div className={cn(
          "w-[3px] shrink-0",
          isCancelled
            ? "bg-gray-200"
            : booking.status === "pending"
              ? "bg-amber-400"
              : "bg-indigo-500",
        )} />

        <div className="flex-1 px-5 py-4">
          {/* Row 1: title + booked-on */}
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-[13.5px] font-semibold text-[#1A1A2E]">
                {booking.location} · {booking.floor} · Seat {booking.seat}
              </p>
              <p className="text-[12px] text-gray-500 mt-0.5">
                {formatDate(booking.date)}
                {" · "}
                {booking.isFullDay
                  ? "Full day"
                  : `${booking.startTime} – ${booking.endTime}`}
                {booking.isFullDay && (
                  <span className="ml-2 text-[11px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                    Full day
                  </span>
                )}
              </p>
            </div>
            <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5">
              Booked {booking.bookedOn}
            </span>
          </div>

          {/* Row 2: tags */}
          <div className="flex gap-1.5 flex-wrap mt-2.5">
            {booking.tags.map((tag, i) => (
              <BookingTagChip key={i} label={tag.label} variant={tag.variant} />
            ))}
            {booking.isRecurring && booking.recurringPattern && (
              <BookingTagChip label={booking.recurringPattern} variant="recurring" />
            )}
          </div>
        </div>
      </div>

      {/* Action footer */}
      {showActions && !isCancelled && (
        <div className="flex justify-end gap-2 px-5 py-2.5 border-t border-gray-100 bg-[#F7F8FC]">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-4 text-[12.5px] text-gray-600"
            onClick={() => onModifyClick(booking)}
          >
            Modify
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-4 text-[12.5px] border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 hover:border-red-300"
            onClick={() => onCancelClick(booking)}
          >
            Cancel
          </Button>
        </div>
      )}

      {showActions && isCancelled && (
        <div className="flex justify-end px-5 py-2.5 border-t border-gray-100">
          <Button variant="outline" size="sm" className="h-7 px-4 text-[12.5px] text-gray-600">
            View details
          </Button>
        </div>
      )}
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:       string;
  value:       number | string;
  subLabel?:   string;
  icon:        React.ReactNode;
  accentClass: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label, value, subLabel, icon, accentClass,
}) => (
  <div className={cn(
    "flex-1 bg-white border border-[#EBEBF5] rounded-xl p-4 flex flex-col gap-1 min-w-[160px]",
    "border-l-[3px]", accentClass,
  )}>
    <div className="flex justify-between items-center mb-1">
      <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
        {label}
      </span>
      <span className="text-gray-400">{icon}</span>
    </div>
    <div className="text-[26px] font-bold text-[#1A1A2E] leading-none">{value}</div>
    {subLabel && (
      <div className="text-[11.5px] text-gray-400 mt-1">{subLabel}</div>
    )}
  </div>
);

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS: { id: BookingTab; label: string }[] = [
  { id: "upcoming",  label: "Upcoming"  },
  { id: "past",      label: "Past"      },
  { id: "cancelled", label: "Cancelled" },
];

// ── Icons ─────────────────────────────────────────────────────────────────────

const CalIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const UsersIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const RefreshIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const MyBookingsPage: React.FC = () => {
  const {
    displayedBookings,
    summary,
    activeTab,
    isLoading,
    error,
    setActiveTab,
    handleCancelBooking,
    refreshBookings,
  } = useBookings();

  const { user } = useAuthContext();

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const router = useRouter();

  // Upcoming tab: split into future (ascending) + past section (descending)
  const upcomingCards = sortByDate(
    displayedBookings.filter((b) => b.status !== "cancelled" && isUpcoming(b.date)),
    true,
  );
  const pastCards = sortByDate(
    displayedBookings.filter((b) => b.status !== "cancelled" && !isUpcoming(b.date)),
    false,
  );

  // All other tabs — descending for past, ascending otherwise
  const sortedDisplayed = sortByDate(displayedBookings, activeTab !== "past");

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelTarget) return;
    await cancelBooking(cancelTarget.id, reason);
    await handleCancelBooking(cancelTarget.id);
    setCancelTarget(null);
  };

  // const handleModify = (booking: Booking) => {
  //   // Extract preference keys from the booking's tags so they can be
  //   // prefilled on the Book a Seat page. Tags whose variant matches a
  //   // known preference variant are passed; others are ignored by the hook.
  //   // If you store actual preference keys in booking.tags, map them here.
  //   // For now we pass an empty string so the hook falls back to sessionStorage.
  //   //
  //   // If your Booking type carries preference keys (e.g. booking.preferences),
  //   // change the line below to: booking.preferences?.join(",") ?? ""
  //   const preferencesParam = ""; // or booking.preferences?.join(",") if available

  //   const params = new URLSearchParams({
  //     modifyBookingId: booking.id,
  //     fromDate:        booking.date,
  //     // toDate = fromDate for single-day modify bookings
  //     toDate:          booking.date,
  //     locationName:    booking.location,
  //     buildingName:    booking.building,
  //     floorName:       booking.floor,
  //     seatLabel:       booking.seat,
  //   });

  //   // Only append preferences param when there's something to pass,
  //   // so the hook knows to use it (non-empty string = URL-provided preferences).
  //   if (preferencesParam) {
  //     params.set("preferences", preferencesParam);
  //   } else {
  //     // Clear sessionStorage so stale preferences from a previous booking
  //     // session don't bleed into this modify flow.
  //     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
  //   }

  //   router.push(`/book?${params.toString()}`);
  // };

//   const handleModify = (booking: Booking) => {
//   // Build preference keys from the booking's stored preferences array.
//   // Falls back to empty string if the API didn't return preference data,
//   // in which case sessionStorage is cleared so stale prefs don't bleed in.
//   const preferencesParam = (booking.preferences ?? []).join(",");

//   const params = new URLSearchParams({
//     modifyBookingId: booking.id,
//     fromDate:        booking.fromDate,  // ← was booking.date (same for single-day, correct for multi-day)
//     toDate:          booking.toDate,    // ← was booking.date
//     locationName:    booking.location,
//     buildingName:    booking.building,
//     floorName:       booking.floor,
//     seatLabel:       booking.seat,
//   });

//   if (preferencesParam) {
//     params.set("preferences", preferencesParam);
//   } else {
//     // No preferences to restore — clear sessionStorage so stale data
//     // from a previous booking session doesn't bleed into this modify flow.
//     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
//   }

//   router.push(`/book?${params.toString()}`);
// };

// const handleModify = async (booking: Booking) => {
//   // 1. Try amenities already stored on the booking object first (fast path)
//   let prefKeys = booking.preferences ?? [];

//   // 2. If empty, fetch from the seat endpoint using floor_id + seat_id
//   //    The Booking type needs `floorId` and `seatId` raw fields — see step 3.
//   if (prefKeys.length === 0 && booking.floorId && booking.seatId) {
//     prefKeys = await fetchSeatAmenities(
//       booking.floorId,
//       booking.seatId,
//       booking.fromDate,
//     );
//   }
// const handleModify = async (booking: Booking) => {
//   let prefKeys = booking.preferences ?? [];
  
//   console.log("booking.preferences:", booking.preferences);
//   console.log("booking.floorId:", booking.floorId);
//   console.log("booking.seatId:", booking.seatId);

//   if (prefKeys.length === 0 && booking.floorId && booking.seatId) {
//     prefKeys = await fetchSeatAmenities(booking.floorId, booking.seatId, booking.fromDate);
//     console.log("fetched prefKeys:", prefKeys);
//   }
//   const preferencesParam = prefKeys.join(",");
// console.log("final preferencesParam:", prefKeys.join(","));
//   const params = new URLSearchParams({
//     modifyBookingId: booking.id,
//     fromDate:        booking.fromDate,
//     toDate:          booking.toDate,
//     locationName:    booking.location,
//     buildingName:    booking.building,
//     floorName:       booking.floor,
//     seatLabel:       booking.seat,
//      seatId:          booking.seatId ?? "", 
//   });

//   if (preferencesParam) {
//     params.set("preferences", preferencesParam);
//   } else {
//     try { sessionStorage.removeItem("bookingPreferences"); } catch {}
//   }

//   router.push(`/book?${params.toString()}`);
// };

  const handleModify = async (booking: Booking) => {
    let prefKeys = booking.preferences ?? [];
 
    if (prefKeys.length === 0 && booking.floorId && booking.seatId) {
      prefKeys = await fetchSeatAmenities(booking.floorId, booking.seatId, booking.fromDate);
    }
 
    const preferencesParam = prefKeys.join(",");
 
    const params = new URLSearchParams({
      modifyBookingId: booking.id,
      fromDate:        booking.fromDate,
      toDate:          booking.toDate,
      locationName:    booking.location,
      buildingName:    booking.building,
      floorName:       booking.floor,
      // seatLabel → prefill-by-label effect (displays "Seat A-12" in step 1)
      seatLabel:       booking.seat,
      // seatId → numeric ID → fetchSeatsWithAvailability → marks seat as "yours"
      seatId:          booking.seatId ?? "",
    });
 
    if (preferencesParam) {
      params.set("preferences", preferencesParam);
    } else {
      try { sessionStorage.removeItem("bookingPreferences"); } catch {}
    }
 
    router.push(`/book?${params.toString()}`);
  };
  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-[#F7F8FC] font-sans overflow-hidden w-full">
        <AppSidebar user={user} />

        <main className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">

          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-[20px] font-bold text-[#1A1A2E] leading-tight">
                My Bookings
              </h1>
              <p className="text-[12.5px] text-gray-400 mt-0.5">
                Your upcoming and past seat reservations
              </p>
            </div>
            <div className="flex gap-2.5 items-center">
              {/* <Button variant="outline" size="sm" className="h-8 text-[12.5px] text-gray-600">
                Export CSV
              </Button> */}
              {/* <Button
                size="sm"
                className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold gap-1.5"
              >
                <span className="text-base leading-none">+</span>
                New booking
              </Button> */}
              <Button 
                size="sm"
                className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-semibold gap-1.5"
                onClick={() => router.push("/book")}
              >
                <span className="text-base leading-none">+</span>
                New booking
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-gray-400"
                onClick={refreshBookings}
              >
                <RefreshIcon />
              </Button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="flex gap-4">
            <StatCard
              label="Upcoming"
              value={summary.upcomingCount}
              subLabel={summary.nextBookingDate ?? undefined}
              icon={<CalIcon />}
              accentClass="border-l-indigo-400"
            />
            <StatCard
              label="Completed this month"
              value={summary.completedThisMonth}
              subLabel={`${summary.daysInOffice} days in office`}
              icon={<CheckIcon />}
              accentClass="border-l-emerald-400"
            />
            <StatCard
              label="Team in office today"
              value={summary.teamInOffice ?? 0}
              subLabel={
                (summary.teamInOffice ?? 0) === 1
                  ? "1 teammate present"
                  : `${summary.teamInOffice ?? 0} teammates present`
              }
              icon={<UsersIcon />}
              accentClass="border-l-violet-400"
            />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#EBEBF5]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors duration-150",
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600 font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-700",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex flex-col gap-3">

            {isLoading && (
              <div className="text-center py-12 text-gray-400 text-[13.5px]">
                Loading bookings…
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-red-500 text-[13px]">
                {error}
              </div>
            )}

            {!isLoading && !error && displayedBookings.length === 0 && (
              <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
                No {activeTab} bookings found.
              </div>
            )}

            {/* Upcoming tab */}
            {!isLoading && !error && activeTab === "upcoming" && (
              <>
                {upcomingCards.length > 0 ? (
                  upcomingCards.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      onCancelClick={setCancelTarget}
                      onModifyClick={handleModify}
                      showActions
                    />
                  ))
                ) : (
                  <div className="text-center py-16 text-gray-400 text-[13.5px] bg-white rounded-xl border border-dashed border-gray-200">
                    No upcoming bookings.
                  </div>
                )}

                {pastCards.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-2">
                      Past Bookings
                    </p>
                    {pastCards.map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        onCancelClick={setCancelTarget}
                        onModifyClick={handleModify}
                        showActions={false}
                      />
                    ))}
                  </>
                )}
              </>
            )}

            {/* All other tabs */}
            {!isLoading && !error && activeTab !== "upcoming" &&
              sortedDisplayed.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onCancelClick={setCancelTarget}
                  onModifyClick={handleModify}
                  showActions={activeTab !== "past"}
                />
              ))
            }
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <CancelDialog
        open={cancelTarget !== null}
        booking={cancelTarget}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelTarget(null)}
      />
    </SidebarProvider>
  );
};

export default MyBookingsPage;