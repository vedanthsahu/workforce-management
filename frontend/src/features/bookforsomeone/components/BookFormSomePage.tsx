// "use client";

// import { useAuthContext } from "@/features/auth/context/AuthContext";
// import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
// import { SidebarProvider } from "@/components/ui/sidebar";
// import { useBookingForm } from "../hooks/useBooking";
// import {
//   BookingTypeSelector,
//   FormFooter,
//   InternalEmployeeForm,
//   VisitorGuestForm,
// } from "./BookForSomeone";

// export default function BookForSomeonePage() {
//   const { user } = useAuthContext();

//   const {
//     formState,
//     setBookingType,
//     setSelectedEmployee,
//     updateVisitorDetails,
//     handleSubmit,
//     handleCancel,
//   } = useBookingForm();

//   return (
//     <SidebarProvider>
//       <div className="flex h-screen bg-[#F7F8FC] font-sans overflow-hidden w-full">
//         <AppSidebar user={user} />

//         <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

//           {/* ── Sticky top zone: header ── */}
//           <div className="shrink-0 bg-[#F7F8FC] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 flex flex-col gap-4 sm:gap-5">

//             {/* Header — matches MyBookingsPage exactly */}
//             <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
//               <div>
//                 <h1 className="text-[18px] sm:text-[20px] font-bold text-[#1A1A2E] leading-tight">
//                   Book for Someone
//                 </h1>
//                 <p className="text-[12px] sm:text-[12.5px] text-gray-400 mt-0.5">
//                   Book a seat for an internal employee or a visitor.
//                 </p>
//               </div>
//             </div>

//           </div>{/* end sticky top zone */}

//           {/* ── Scrollable content ── */}
//           <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
//             <div className="flex gap-6 lg:gap-8 items-start w-full">

//               {/* ── Main form card ── */}
//               <div className="flex-1 min-w-0 bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col gap-0">

//                 {/* Booking type section */}
//                 <div className="px-4 sm:px-5 py-4 sm:py-5">
//                   <BookingTypeSelector
//                     selected={formState.bookingType}
//                     onChange={setBookingType}
//                   />
//                 </div>

//                 <div className="border-t border-[#EBEBF5]" />

//                 {/* Employee / Visitor form section */}
//                 <div className="px-4 sm:px-5 py-4 sm:py-5">
//                   {formState.bookingType === "internal" ? (
//                     <InternalEmployeeForm
//                       selectedEmployee={formState.selectedEmployee}
//                       onSelect={setSelectedEmployee}
//                       onClear={() => setSelectedEmployee(null)}
//                     />
//                   ) : (
//                     <VisitorGuestForm
//                       details={formState.visitorDetails}
//                       onChange={updateVisitorDetails}
//                     />
//                   )}
//                 </div>

//                 <div className="border-t border-[#EBEBF5]" />

//                 {/* Footer section */}
//                 <div className="px-4 sm:px-5 py-4 sm:py-5 bg-[#F7F8FC]">
//                   <FormFooter onCancel={handleCancel} onSubmit={handleSubmit} />
//                 </div>

//               </div>

//               {/* ── Right: Help panel (xl+) ── */}
//               <aside className="hidden xl:flex flex-col gap-3 sm:gap-4 w-[264px] shrink-0">

//                 {/* How it works */}
//                 <div className="bg-white border border-[#EBEBF5] rounded-xl p-4 sm:p-5">
//                   <p className="text-[12px] sm:text-[12.5px] font-semibold text-[#1A1A2E] mb-3">
//                     How it works
//                   </p>
//                   <ol className="flex flex-col gap-3">
//                     {[
//                       {
//                         step: "1",
//                         title: "Choose who",
//                         desc: "Select an internal employee or an external visitor / guest.",
//                       },
//                       {
//                         step: "2",
//                         title: "Fill in details",
//                         desc: "Provide name, contact info, and purpose of visit.",
//                       },
//                       {
//                         step: "3",
//                         title: "Pick a seat",
//                         desc: "Choose workspace, date, and seat preferences in the next step.",
//                       },
//                     ].map(({ step, title, desc }) => (
//                       <li key={step} className="flex gap-3">
//                         <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
//                           {step}
//                         </span>
//                         <span className="flex flex-col gap-0.5">
//                           <span className="text-[12px] sm:text-[12.5px] font-semibold text-[#1A1A2E]">
//                             {title}
//                           </span>
//                           <span className="text-[11.5px] text-gray-400 leading-snug">{desc}</span>
//                         </span>
//                       </li>
//                     ))}
//                   </ol>
//                 </div>

//                 {/* Policy */}
//                 <div className="bg-[#EEF2FF] border border-indigo-100 rounded-xl p-4 sm:p-5">
//                   <p className="text-[12px] sm:text-[12.5px] font-semibold text-indigo-800 mb-1.5">
//                     Booking policy
//                   </p>
//                   <p className="text-[11.5px] text-indigo-500 leading-relaxed">
//                     You can book a seat up to 30 days in advance. Visitors must be
//                     accompanied by a host employee at all times.
//                   </p>
//                 </div>

//               </aside>

//             </div>
//           </div>{/* end scrollable zone */}

//         </main>
//       </div>
//     </SidebarProvider>
//   );
// }

"use client";

import { useRouter } from "next/navigation";
import { useBookingForm } from "../hooks/useBooking";
import {
  BookingTypeSelector,
  FormFooter,
  InternalEmployeeForm,
  VisitorGuestForm,
} from "./BookForSomeone";

export default function BookForSomeonePage() {

  const router = useRouter();

  const {
    formState,
    setBookingType,
    setSelectedEmployee,
    updateVisitorDetails,
    handleCancel,
  } = useBookingForm();

  const handleSubmit = () => {
    router.push("/book");
  };

  return (
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F7F8FC]">

          {/* ── Sticky top zone: header ── */}
          <div className="shrink-0 bg-[#F7F8FC] px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 flex flex-col gap-4 sm:gap-5">

            {/* Header — matches MyBookingsPage exactly */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
              <div>
                <h1 className="text-[18px] sm:text-[20px] font-bold text-[#1A1A2E] leading-tight">
                  Book for Someone
                </h1>
                <p className="text-[12px] sm:text-[12.5px] text-gray-400 mt-0.5">
                  Book a seat for an internal employee or a visitor.
                </p>
              </div>
            </div>

          </div>{/* end sticky top zone */}

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
            <div className="flex gap-6 lg:gap-8 items-start w-full">

              {/* ── Main form card ── */}
              <div className="flex-1 min-w-0 bg-white border border-[#EBEBF5] rounded-xl overflow-hidden flex flex-col gap-0">

                {/* Booking type section */}
                <div className="px-4 sm:px-5 py-4 sm:py-5">
                  <BookingTypeSelector
                    selected={formState.bookingType}
                    onChange={setBookingType}
                  />
                </div>

                <div className="border-t border-[#EBEBF5]" />

                {/* Employee / Visitor form section */}
                <div className="px-4 sm:px-5 py-4 sm:py-5">
                  {formState.bookingType === "internal" ? (
                    <InternalEmployeeForm
                      selectedEmployee={formState.selectedEmployee}
                      onSelect={setSelectedEmployee}
                      onClear={() => setSelectedEmployee(null)}
                    />
                  ) : (
                    <VisitorGuestForm
                      details={formState.visitorDetails}
                      onChange={updateVisitorDetails}
                    />
                  )}
                </div>

                <div className="border-t border-[#EBEBF5]" />

                {/* Footer section */}
                <div className="px-4 sm:px-5 py-4 sm:py-5 bg-[#F7F8FC]">
                  <FormFooter onCancel={handleCancel} onSubmit={handleSubmit} />
                </div>

              </div>

              {/* ── Right: Help panel (xl+) ── */}
              <aside className="hidden xl:flex flex-col gap-3 sm:gap-4 w-[264px] shrink-0">

                {/* How it works */}
                <div className="bg-white border border-[#EBEBF5] rounded-xl p-4 sm:p-5">
                  <p className="text-[12px] sm:text-[12.5px] font-semibold text-[#1A1A2E] mb-3">
                    How it works
                  </p>
                  <ol className="flex flex-col gap-3">
                    {[
                      {
                        step: "1",
                        title: "Choose who",
                        desc: "Select an internal employee or an external visitor / guest.",
                      },
                      {
                        step: "2",
                        title: "Fill in details",
                        desc: "Provide name, contact info, and purpose of visit.",
                      },
                      {
                        step: "3",
                        title: "Pick a seat",
                        desc: "Choose workspace, date, and seat preferences in the next step.",
                      },
                    ].map(({ step, title, desc }) => (
                      <li key={step} className="flex gap-3">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                          {step}
                        </span>
                        <span className="flex flex-col gap-0.5">
                          <span className="text-[12px] sm:text-[12.5px] font-semibold text-[#1A1A2E]">
                            {title}
                          </span>
                          <span className="text-[11.5px] text-gray-400 leading-snug">{desc}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Policy */}
                <div className="bg-[#EEF2FF] border border-indigo-100 rounded-xl p-4 sm:p-5">
                  <p className="text-[12px] sm:text-[12.5px] font-semibold text-indigo-800 mb-1.5">
                    Booking policy
                  </p>
                  <p className="text-[11.5px] text-indigo-500 leading-relaxed">
                    You can book a seat up to 30 days in advance. Visitors must be
                    accompanied by a host employee at all times.
                  </p>
                </div>

              </aside>

            </div>
          </div>{/* end scrollable zone */}

        </main>
  );
}