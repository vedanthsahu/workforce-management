// // // // // // // // // "use client";

// // // // // // // // // import { useRouter } from "next/navigation";
// // // // // // // // // import { Layout } from "../types/layout.types";

// // // // // // // // // interface ManageLayoutHeaderProps {
// // // // // // // // //   layout?: Layout | null;
// // // // // // // // //   onPublish?: () => void;
// // // // // // // // //   publishing?: boolean;
// // // // // // // // // }

// // // // // // // // // function UploadIcon() {
// // // // // // // // //   return (
// // // // // // // // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // // // // // // // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // // // // // // // //       <polyline points="16 16 12 12 8 16" />
// // // // // // // // //       <line x1="12" y1="12" x2="12" y2="21" />
// // // // // // // // //       <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
// // // // // // // // //     </svg>
// // // // // // // // //   );
// // // // // // // // // }

// // // // // // // // // function PublishIcon() {
// // // // // // // // //   return (
// // // // // // // // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // // // // // // // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // // // // // // // //       <line x1="22" y1="2" x2="11" y2="13" />
// // // // // // // // //       <polygon points="22 2 15 22 11 13 2 9 22 2" />
// // // // // // // // //     </svg>
// // // // // // // // //   );
// // // // // // // // // }

// // // // // // // // // export default function ManageLayoutHeader({
// // // // // // // // //   layout,
// // // // // // // // //   onPublish,
// // // // // // // // //   publishing = false,
// // // // // // // // // }: ManageLayoutHeaderProps) {
// // // // // // // // //   const router = useRouter();

// // // // // // // // //   const canPublish = layout && !layout.is_published && layout.status !== "ARCHIVED";

// // // // // // // // //   return (
// // // // // // // // //     <div className="flex justify-between items-center">

// // // // // // // // //       {/* LEFT */}
// // // // // // // // //       <div>
// // // // // // // // //         <h1 className="text-xl font-semibold">Floor Layout Management</h1>
// // // // // // // // //         <p className="text-sm text-muted-foreground">
// // // // // // // // //           Review, manage and publish floor layouts for employee bookings
// // // // // // // // //         </p>
// // // // // // // // //       </div>

// // // // // // // // //       {/* RIGHT BUTTONS */}
// // // // // // // // //       <div className="flex gap-3">

// // // // // // // // //         {/* View Change History */}
      

// // // // // // // // //         {/* Upload New Layout */}
// // // // // // // // //         <button
// // // // // // // // //           onClick={() => router.push("/admin/layouts/upload")}
// // // // // // // // //           className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
// // // // // // // // //         >
// // // // // // // // //           <UploadIcon />
// // // // // // // // //           Upload New Layout
// // // // // // // // //         </button>

// // // // // // // // //           {/* <button
// // // // // // // // //           className="border px-4 py-2 rounded-md text-sm hover:bg-muted transition-colors bg-primary"
// // // // // // // // //           onClick={() => router.push("/admin/layouts/publish")}
// // // // // // // // //         >
// // // // // // // // //           Publish Layout
// // // // // // // // //         </button> */}

// // // // // // // // //         {/* Publish Layout — only shown when layout is a draft */}
// // // // // // // // //         {canPublish && (
// // // // // // // // //           <button
// // // // // // // // //             onClick={onPublish}
// // // // // // // // //             disabled={publishing}
// // // // // // // // //             className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors"
// // // // // // // // //           >
// // // // // // // // //             <PublishIcon />
// // // // // // // // //             {publishing ? "Publishing…" : "Publish Layout"}
// // // // // // // // //           </button>
// // // // // // // // //         )}
// // // // // // // // //       </div>
// // // // // // // // //     </div>
// // // // // // // // //   );
// // // // // // // // // }

// // // // // // // // "use client";

// // // // // // // // import { useRouter } from "next/navigation";
// // // // // // // // import { Layout, LayoutSeatStats } from "../types/layout.types";

// // // // // // // // interface ManageLayoutHeaderProps {
// // // // // // // //   layout?: Layout | null;
// // // // // // // //   stats?: LayoutSeatStats | null;
// // // // // // // //   onPublish?: () => void;
// // // // // // // //   publishing?: boolean;
// // // // // // // // }

// // // // // // // // function UploadIcon() {
// // // // // // // //   return (
// // // // // // // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // // // // // // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // // // // // // //       <polyline points="16 16 12 12 8 16" />
// // // // // // // //       <line x1="12" y1="12" x2="12" y2="21" />
// // // // // // // //       <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
// // // // // // // //     </svg>
// // // // // // // //   );
// // // // // // // // }

// // // // // // // // function PublishIcon() {
// // // // // // // //   return (
// // // // // // // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // // // // // // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // // // // // // //       <line x1="22" y1="2" x2="11" y2="13" />
// // // // // // // //       <polygon points="22 2 15 22 11 13 2 9 22 2" />
// // // // // // // //     </svg>
// // // // // // // //   );
// // // // // // // // }

// // // // // // // // export default function ManageLayoutHeader({
// // // // // // // //   layout,
// // // // // // // //   stats,
// // // // // // // //   onPublish,
// // // // // // // //   publishing = false,
// // // // // // // // }: ManageLayoutHeaderProps) {
// // // // // // // //   const router = useRouter();

// // // // // // // //   const canPublish = layout && !layout.is_published && layout.status !== "ARCHIVED";

// // // // // // // //   const allConfigured =
// // // // // // // //     stats != null &&
// // // // // // // //     stats.total_seats > 0 &&
// // // // // // // //     stats.configured_seats === stats.total_seats;

// // // // // // // //   const publishDisabled = publishing || !allConfigured;

// // // // // // // //   const tooltipText = !allConfigured
// // // // // // // //     ? `${(stats?.total_seats ?? 0) - (stats?.configured_seats ?? 0)} seat(s) still unconfigured`
// // // // // // // //     : undefined;

// // // // // // // //   return (
// // // // // // // //     <div className="flex justify-between items-center">

// // // // // // // //       {/* LEFT */}
// // // // // // // //       <div>
// // // // // // // //         <h1 className="text-xl font-semibold">Floor Layout Management</h1>
// // // // // // // //         <p className="text-sm text-muted-foreground">
// // // // // // // //           Review, manage and publish floor layouts for employee bookings
// // // // // // // //         </p>
// // // // // // // //       </div>

// // // // // // // //       {/* RIGHT BUTTONS */}
// // // // // // // //       <div className="flex gap-3 items-center">

// // // // // // // //         {/* Upload New Layout */}
// // // // // // // //         <button
// // // // // // // //           onClick={() => router.push("/admin/layouts/upload")}
// // // // // // // //           className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
// // // // // // // //         >
// // // // // // // //           <UploadIcon />
// // // // // // // //           Upload New Layout
// // // // // // // //         </button>

// // // // // // // //         {/* Publish Layout — only shown when layout is a draft */}
// // // // // // // //         {canPublish && (
// // // // // // // //           <div title={tooltipText} className="flex items-center gap-2">
// // // // // // // //             {!allConfigured && stats && (
// // // // // // // //               <span className="text-xs text-amber-600 font-medium">
// // // // // // // //                 {stats.total_seats - stats.configured_seats} seat(s) unconfigured
// // // // // // // //               </span>
// // // // // // // //             )}
// // // // // // // //             <button
// // // // // // // //               onClick={onPublish}
// // // // // // // //               disabled={publishDisabled}
// // // // // // // //               className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
// // // // // // // //             >
// // // // // // // //               <PublishIcon />
// // // // // // // //               {publishing ? "Publishing…" : "Publish Layout"}
// // // // // // // //             </button>
// // // // // // // //           </div>
// // // // // // // //         )}
// // // // // // // //       </div>
// // // // // // // //     </div>
// // // // // // // //   );
// // // // // // // // }

// // // // // // // "use client";

// // // // // // // import { useRouter } from "next/navigation";
// // // // // // // import { Layout, LayoutSeatStats } from "../types/layout.types";

// // // // // // // interface ManageLayoutHeaderProps {
// // // // // // //   layout?: Layout | null;
// // // // // // //   stats?: LayoutSeatStats | null;
// // // // // // //   canPublish?: boolean;
// // // // // // //   allConfigured?: boolean;
// // // // // // //   onPublish?: () => void;
// // // // // // //   publishing?: boolean;
// // // // // // //   publishError?: boolean;
// // // // // // // }

// // // // // // // function UploadIcon() {
// // // // // // //   return (
// // // // // // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // // // // // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // // // // // //       <polyline points="16 16 12 12 8 16" />
// // // // // // //       <line x1="12" y1="12" x2="12" y2="21" />
// // // // // // //       <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
// // // // // // //     </svg>
// // // // // // //   );
// // // // // // // }

// // // // // // // function PublishIcon() {
// // // // // // //   return (
// // // // // // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // // // // // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // // // // // //       <line x1="22" y1="2" x2="11" y2="13" />
// // // // // // //       <polygon points="22 2 15 22 11 13 2 9 22 2" />
// // // // // // //     </svg>
// // // // // // //   );
// // // // // // // }

// // // // // // // export default function ManageLayoutHeader({
// // // // // // //   layout,
// // // // // // //   stats,
// // // // // // //   canPublish,
// // // // // // //   allConfigured,
// // // // // // //   onPublish,
// // // // // // //   publishing = false,
// // // // // // //   publishError = false,
// // // // // // // }: ManageLayoutHeaderProps) {
// // // // // // //   const router = useRouter();

// // // // // // //   const showPublishButton = layout && !layout.is_published && layout.status !== "ARCHIVED";

// // // // // // //   const unconfiguredCount =
// // // // // // //     stats ? stats.total_seats - stats.configured_seats : 0;

// // // // // // //   return (
// // // // // // //     <div className="flex justify-between items-center">

// // // // // // //       {/* LEFT */}
// // // // // // //       <div>
// // // // // // //         <h1 className="text-xl font-semibold">Floor Layout Management</h1>
// // // // // // //         <p className="text-sm text-muted-foreground">
// // // // // // //           Review, manage and publish floor layouts for employee bookings
// // // // // // //         </p>
// // // // // // //       </div>

// // // // // // //       {/* RIGHT BUTTONS */}
// // // // // // //       <div className="flex gap-3 items-center">

// // // // // // //         <button
// // // // // // //           onClick={() => router.push("/admin/layouts/upload")}
// // // // // // //           className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
// // // // // // //         >
// // // // // // //           <UploadIcon />
// // // // // // //           Upload New Layout
// // // // // // //         </button>

// // // // // // //         {showPublishButton && (
// // // // // // //           <div className="flex items-center gap-2">
// // // // // // //             {/* hint when seats remain unconfigured */}
// // // // // // //             {!allConfigured && stats && (
// // // // // // //               <span className="text-xs text-amber-600 font-medium whitespace-nowrap">
// // // // // // //                 {unconfiguredCount} seat{unconfiguredCount !== 1 ? "s" : ""} unconfigured
// // // // // // //               </span>
// // // // // // //             )}
// // // // // // //             {/* error feedback */}
// // // // // // //             {publishError && (
// // // // // // //               <span className="text-xs text-red-500 font-medium">
// // // // // // //                 Publish failed. Try again.
// // // // // // //               </span>
// // // // // // //             )}
// // // // // // //             <button
// // // // // // //               onClick={onPublish}
// // // // // // //               disabled={!canPublish || publishing}
// // // // // // //               title={
// // // // // // //                 !allConfigured
// // // // // // //                   ? `Configure all seats before publishing (${unconfiguredCount} remaining)`
// // // // // // //                   : undefined
// // // // // // //               }
// // // // // // //               className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
// // // // // // //             >
// // // // // // //               <PublishIcon />
// // // // // // //               {publishing ? "Publishing…" : "Publish Layout"}
// // // // // // //             </button>
// // // // // // //           </div>
// // // // // // //         )}
// // // // // // //       </div>
// // // // // // //     </div>
// // // // // // //   );
// // // // // // // }

// // // // // // "use client";

// // // // // // import { useRouter } from "next/navigation";
// // // // // // import { Layout, LayoutSeatStats } from "../types/layout.types";

// // // // // // interface ManageLayoutHeaderProps {
// // // // // //   layout?:       Layout | null;
// // // // // //   stats?:        LayoutSeatStats | null;
// // // // // //   canPublish?:   boolean;
// // // // // //   allConfigured?: boolean;
// // // // // //   onPublish?:    () => void;
// // // // // //   publishing?:   boolean;
// // // // // //   publishError?: boolean;
// // // // // // }

// // // // // // function UploadIcon() {
// // // // // //   return (
// // // // // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // // // // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // // // // //       <polyline points="16 16 12 12 8 16" />
// // // // // //       <line x1="12" y1="12" x2="12" y2="21" />
// // // // // //       <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
// // // // // //     </svg>
// // // // // //   );
// // // // // // }

// // // // // // function PublishIcon() {
// // // // // //   return (
// // // // // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // // // // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // // // // //       <line x1="22" y1="2" x2="11" y2="13" />
// // // // // //       <polygon points="22 2 15 22 11 13 2 9 22 2" />
// // // // // //     </svg>
// // // // // //   );
// // // // // // }

// // // // // // export default function ManageLayoutHeader({
// // // // // //   layout,
// // // // // //   stats,
// // // // // //   canPublish,
// // // // // //   allConfigured,
// // // // // //   onPublish,
// // // // // //   publishing = false,
// // // // // //   publishError = false,
// // // // // // }: ManageLayoutHeaderProps) {
// // // // // //   const router = useRouter();

// // // // // //   const showPublishButton =
// // // // // //     layout && !layout.is_published && layout.status !== "ARCHIVED";

// // // // // //   const unconfiguredCount =
// // // // // //     stats ? stats.total_seats - stats.configured_seats : 0;

// // // // // //   return (
// // // // // //     <div className="flex justify-between items-center">

// // // // // //       {/* LEFT */}
// // // // // //       <div>
// // // // // //         <h1 className="text-xl font-semibold">Floor Layout Management</h1>
// // // // // //         <p className="text-sm text-muted-foreground">
// // // // // //           Review, manage and publish floor layouts for employee bookings
// // // // // //         </p>
// // // // // //       </div>

// // // // // //       {/* RIGHT BUTTONS */}
// // // // // //       <div className="flex gap-3 items-center">

// // // // // //         <button
// // // // // //           onClick={() => router.push("/admin/layouts/upload")}
// // // // // //           className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
// // // // // //         >
// // // // // //           <UploadIcon />
// // // // // //           Upload New Layout
// // // // // //         </button>

// // // // // //         {showPublishButton && (
// // // // // //           <div className="flex items-center gap-2">

// // // // // //             {!allConfigured && stats && (
// // // // // //               <span className="text-xs text-amber-600 font-medium whitespace-nowrap">
// // // // // //                 {unconfiguredCount} seat{unconfiguredCount !== 1 ? "s" : ""} unconfigured
// // // // // //               </span>
// // // // // //             )}

// // // // // //             {publishError && (
// // // // // //               <span className="text-xs text-red-500 font-medium whitespace-nowrap">
// // // // // //                 Publish failed. Try again.
// // // // // //               </span>
// // // // // //             )}

// // // // // //             <button
// // // // // //               onClick={onPublish}
// // // // // //               disabled={!canPublish || publishing}
// // // // // //               title={
// // // // // //                 !allConfigured
// // // // // //                   ? `Configure all seats before publishing (${unconfiguredCount} remaining)`
// // // // // //                   : undefined
// // // // // //               }
// // // // // //               className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
// // // // // //             >
// // // // // //               <PublishIcon />
// // // // // //               {publishing ? "Publishing…" : "Publish Layout"}
// // // // // //             </button>

// // // // // //           </div>
// // // // // //         )}
// // // // // //       </div>
// // // // // //     </div>
// // // // // //   );
// // // // // // }
// // // // // "use client";

// // // // // import { useRouter } from "next/navigation";
// // // // // import { Layout, LayoutSeatStats } from "../types/layout.types";

// // // // // interface ManageLayoutHeaderProps {
// // // // //   layout?:        Layout | null;
// // // // //   stats?:         LayoutSeatStats | null;
// // // // //   canPublish?:    boolean;
// // // // //   allConfigured?: boolean;
// // // // //   onPublish?:     () => void;
// // // // //   publishing?:    boolean;
// // // // //   publishError?:  boolean;
// // // // // }

// // // // // function UploadIcon() {
// // // // //   return (
// // // // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // // // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // // // //       <polyline points="16 16 12 12 8 16" />
// // // // //       <line x1="12" y1="12" x2="12" y2="21" />
// // // // //       <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
// // // // //     </svg>
// // // // //   );
// // // // // }

// // // // // function PublishIcon() {
// // // // //   return (
// // // // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // // // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // // // //       <line x1="22" y1="2" x2="11" y2="13" />
// // // // //       <polygon points="22 2 15 22 11 13 2 9 22 2" />
// // // // //     </svg>
// // // // //   );
// // // // // }

// // // // // export default function ManageLayoutHeader({
// // // // //   layout,
// // // // //   stats,
// // // // //   canPublish,
// // // // //   allConfigured,
// // // // //   onPublish,
// // // // //   publishing = false,
// // // // //   publishError = false,
// // // // // }: ManageLayoutHeaderProps) {
// // // // //   const router = useRouter();

// // // // //   // Show for any unpublished layout (DRAFT or ARCHIVED)
// // // // //   const showPublishButton = layout && !layout.is_published;

// // // // //   const unconfiguredCount = stats ? stats.total_seats - stats.configured_seats : 0;

// // // // //   return (
// // // // //     <div className="flex justify-between items-center">

// // // // //       {/* LEFT */}
// // // // //       <div>
// // // // //         <h1 className="text-xl font-semibold">Floor Layout Management</h1>
// // // // //         <p className="text-sm text-muted-foreground">
// // // // //           Review, manage and publish floor layouts for employee bookings
// // // // //         </p>
// // // // //       </div>

// // // // //       {/* RIGHT BUTTONS */}
// // // // //       <div className="flex gap-3 items-center">

// // // // //         <button
// // // // //           onClick={() => router.push("/admin/layouts/upload")}
// // // // //           className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
// // // // //         >
// // // // //           <UploadIcon />
// // // // //           Upload New Layout
// // // // //         </button>

// // // // //         {showPublishButton && (
// // // // //           <div className="flex items-center gap-2">

// // // // //             {/* Same warning for both DRAFT and ARCHIVED when seats unconfigured */}
// // // // //             {!allConfigured && stats && stats.total_seats > 0 && (
// // // // //               <span className="text-xs text-amber-600 font-medium whitespace-nowrap">
// // // // //                 {unconfiguredCount} seat{unconfiguredCount !== 1 ? "s" : ""} unconfigured
// // // // //               </span>
// // // // //             )}

// // // // //             {publishError && (
// // // // //               <span className="text-xs text-red-500 font-medium whitespace-nowrap">
// // // // //                 Publish failed. Try again.
// // // // //               </span>
// // // // //             )}

// // // // //             <button
// // // // //               onClick={onPublish}
// // // // //               disabled={!canPublish || publishing}
// // // // //               title={
// // // // //                 !allConfigured
// // // // //                   ? `Configure all seats before publishing (${unconfiguredCount} remaining)`
// // // // //                   : undefined
// // // // //               }
// // // // //               className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
// // // // //             >
// // // // //               <PublishIcon />
// // // // //               {publishing ? "Publishing…" : "Publish Layout"}
// // // // //             </button>

// // // // //           </div>
// // // // //         )}
// // // // //       </div>
// // // // //     </div>
// // // // //   );
// // // // // }

// // // // "use client";

// // // // import { useRouter } from "next/navigation";
// // // // import { Layout, LayoutSeatStats } from "../types/layout.types";

// // // // interface ManageLayoutHeaderProps {
// // // //   layout?:        Layout | null;
// // // //   stats?:         LayoutSeatStats | null;
// // // //   canPublish?:    boolean;
// // // //   allConfigured?: boolean;
// // // //   onPublish?:     () => void;
// // // //   publishing?:    boolean;
// // // //   publishError?:  boolean;
// // // // }

// // // // function UploadIcon() {
// // // //   return (
// // // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // // //       <polyline points="16 16 12 12 8 16" />
// // // //       <line x1="12" y1="12" x2="12" y2="21" />
// // // //       <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
// // // //     </svg>
// // // //   );
// // // // }

// // // // function PublishIcon() {
// // // //   return (
// // // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // // //       <line x1="22" y1="2" x2="11" y2="13" />
// // // //       <polygon points="22 2 15 22 11 13 2 9 22 2" />
// // // //     </svg>
// // // //   );
// // // // }

// // // // export default function ManageLayoutHeader({
// // // //   layout,
// // // //   stats,
// // // //   canPublish,
// // // //   allConfigured,
// // // //   onPublish,
// // // //   publishing = false,
// // // //   publishError = false,
// // // // }: ManageLayoutHeaderProps) {
// // // //   const router = useRouter();

// // // //   // Show publish button for every layout — disabled state handles all gating
// // // //   const showPublishButton = !!layout;

// // // //   const unconfiguredCount = stats ? stats.total_seats - stats.configured_seats : 0;

// // // //   return (
// // // //     <div className="flex justify-between items-center">

// // // //       {/* LEFT */}
// // // //       <div>
// // // //         <h1 className="text-xl font-semibold">Floor Layout Management</h1>
// // // //         <p className="text-sm text-muted-foreground">
// // // //           Review, manage and publish floor layouts for employee bookings
// // // //         </p>
// // // //       </div>

// // // //       {/* RIGHT BUTTONS */}
// // // //       <div className="flex gap-3 items-center">

// // // //         <button
// // // //           onClick={() => router.push("/admin/layouts/upload")}
// // // //           className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
// // // //         >
// // // //           <UploadIcon />
// // // //           Upload New Layout
// // // //         </button>

// // // //         {/* {showPublishButton && (
// // // //           <div className="flex items-center gap-2">

// // // //             {publishError && (
// // // //               <span className="text-xs text-red-500 font-medium whitespace-nowrap">
// // // //                 Publish failed. Try again.
// // // //               </span>
// // // //             )}

// // // //             <button
// // // //               onClick={onPublish}
// // // //               disabled={!canPublish || publishing}
// // // //               title={
// // // //                 !allConfigured
// // // //                   ? `Configure all seats before publishing (${unconfiguredCount} remaining)`
// // // //                   : undefined
// // // //               }
// // // //               className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
// // // //             >
// // // //               <PublishIcon />
// // // //               {publishing ? "Publishing…" : "Publish Layout"}
// // // //             </button>

// // // //           </div>
// // // //         )} */}
// // // //       </div>
// // // //     </div>
// // // //   );
// // // // }

// // // "use client";

// // // import { useRouter, useSearchParams } from "next/navigation";
// // // import { ArrowLeft } from "lucide-react";
// // // import { Layout, LayoutSeatStats } from "../types/layout.types";

// // // interface ManageLayoutHeaderProps {
// // //   layout?:        Layout | null;
// // //   stats?:         LayoutSeatStats | null;
// // //   canPublish?:    boolean;
// // //   allConfigured?: boolean;
// // //   onPublish?:     () => void;
// // //   publishing?:    boolean;
// // //   publishError?:  boolean;
// // // }

// // // function UploadIcon() {
// // //   return (
// // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // //       <polyline points="16 16 12 12 8 16" />
// // //       <line x1="12" y1="12" x2="12" y2="21" />
// // //       <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
// // //     </svg>
// // //   );
// // // }

// // // function PublishIcon() {
// // //   return (
// // //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// // //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// // //       <line x1="22" y1="2" x2="11" y2="13" />
// // //       <polygon points="22 2 15 22 11 13 2 9 22 2" />
// // //     </svg>
// // //   );
// // // }

// // // export default function ManageLayoutHeader({
// // //   layout,
// // //   stats,
// // //   canPublish,
// // //   allConfigured,
// // //   onPublish,
// // //   publishing = false,
// // //   publishError = false,
// // // }: ManageLayoutHeaderProps) {
// // //   const router      = useRouter();
// // //   const searchParams = useSearchParams();

// // //   // ── Back: return to /admin/layouts with all context preserved ────────────
// // //   // The manage-layout page URL already carries siteId, buildingId, floorId,
// // //   // layoutId (set by handleManage in LayoutTable).  We just forward them to
// // //   // the layouts list so the FloorTree expands + LayoutTable highlights.
// // //   const handleBack = () => {
// // //     const siteId     = searchParams.get("siteId")     ?? "";
// // //     const buildingId = searchParams.get("buildingId") ?? "";
// // //     const floorId    = searchParams.get("floorId")    ?? "";
// // //     const layoutId   = searchParams.get("layoutId")   ?? layout?.layout_id ?? "";

// // //     const params = new URLSearchParams();
// // //     if (siteId)     params.set("siteId",     siteId);
// // //     if (buildingId) params.set("buildingId", buildingId);
// // //     if (floorId)    params.set("floorId",    floorId);
// // //     if (layoutId)   params.set("layoutId",   layoutId);

// // //     router.push(`/admin/layouts?${params.toString()}`);
// // //   };

// // //   const showPublishButton   = !!layout;
// // //   const unconfiguredCount   = stats ? stats.total_seats - stats.configured_seats : 0;

// // //   return (
// // //     <div className="flex justify-between items-center">

// // //       {/* LEFT — back button + title */}
// // //       <div className="flex items-center gap-3">

// // //         <button
// // //           onClick={handleBack}
// // //           title="Back to layouts"
// // //           className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
// // //         >
// // //           <ArrowLeft className="w-4 h-4" />
// // //         </button>

// // //         <div>
// // //           <h1 className="text-xl font-semibold">Floor Layout Management</h1>
// // //           <p className="text-sm text-muted-foreground">
// // //             Review, manage and publish floor layouts for employee bookings
// // //           </p>
// // //         </div>

// // //       </div>

// // //       {/* RIGHT BUTTONS */}
// // //       <div className="flex gap-3 items-center">

// // //         <button
// // //           onClick={() => router.push("/admin/layouts/upload")}
// // //           className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
// // //         >
// // //           <UploadIcon />
// // //           Upload New Layout
// // //         </button>

// // //         {showPublishButton && (
// // //           <div className="flex items-center gap-2">

// // //             {publishError && (
// // //               <span className="text-xs text-red-500 font-medium whitespace-nowrap">
// // //                 Publish failed. Try again.
// // //               </span>
// // //             )}

// // //             <button
// // //               onClick={onPublish}
// // //               disabled={!canPublish || publishing}
// // //               title={
// // //                 !allConfigured
// // //                   ? `Configure all seats before publishing (${unconfiguredCount} remaining)`
// // //                   : undefined
// // //               }
// // //               className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
// // //             >
// // //               <PublishIcon />
// // //               {publishing ? "Publishing…" : "Publish Layout"}
// // //             </button>

// // //           </div>
// // //         )}

// // //       </div>
// // //     </div>
// // //   );
// // // }

// // "use client";

// // import { useRouter, useSearchParams } from "next/navigation";
// // import { ArrowLeft } from "lucide-react";
// // import { Layout, LayoutSeatStats } from "../types/layout.types";

// // interface ManageLayoutHeaderProps {
// //   layout?:        Layout | null;
// //   stats?:         LayoutSeatStats | null;
// //   canPublish?:    boolean;
// //   allConfigured?: boolean;
// //   onPublish?:     () => void;
// //   publishing?:    boolean;
// //   publishError?:  boolean;
// // }

// // function UploadIcon() {
// //   return (
// //     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
// //       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// //       <polyline points="16 16 12 12 8 16" />
// //       <line x1="12" y1="12" x2="12" y2="21" />
// //       <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
// //     </svg>
// //   );
// // }

// // export default function ManageLayoutHeader({
// //   layout,
// //   stats,
// //   canPublish,
// //   allConfigured,
// //   onPublish,
// //   publishing = false,
// //   publishError = false,
// // }: ManageLayoutHeaderProps) {
// //   const router       = useRouter();
// //   const searchParams = useSearchParams();

// //   const handleBack = () => {
// //     const siteId     = searchParams.get("siteId")     ?? "";
// //     const buildingId = searchParams.get("buildingId") ?? "";
// //     const floorId    = searchParams.get("floorId")    ?? "";
// //     const layoutId   = searchParams.get("layoutId")   ?? layout?.layout_id ?? "";

// //     const params = new URLSearchParams();
// //     if (siteId)     params.set("siteId",     siteId);
// //     if (buildingId) params.set("buildingId", buildingId);
// //     if (floorId)    params.set("floorId",    floorId);
// //     if (layoutId)   params.set("layoutId",   layoutId);

// //     router.push(`/admin/layouts?${params.toString()}`);
// //   };

// //   return (
// //     <div className="flex justify-between items-center">

// //       {/* LEFT — back button + title */}
// //       <div className="flex items-center gap-3">

// //         <button
// //           onClick={handleBack}
// //           title="Back to layouts"
// //           className="flex items-center justify-center w-8 h-8 rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
// //         >
// //           <ArrowLeft className="w-4 h-4" />
// //         </button>

// //         <div>
// //           <h1 className="text-xl font-semibold">Floor Layout Management</h1>
// //           <p className="text-sm text-muted-foreground">
// //             Review, manage and publish floor layouts for employee bookings
// //           </p>
// //         </div>

// //       </div>

// //       {/* RIGHT — upload button only */}
// //       <div className="flex gap-3 items-center">
// //         <button
// //           onClick={() => router.push("/admin/layouts/upload")}
// //           className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
// //         >
// //           <UploadIcon />
// //           Upload New Layout
// //         </button>
// //       </div>

// //     </div>
// //   );
// // }

// "use client";

// import { useRouter, useSearchParams } from "next/navigation";
// import { ArrowLeft } from "lucide-react";
// import { Layout, LayoutSeatStats } from "../types/layout.types";

// interface ManageLayoutHeaderProps {
//   layout?:        Layout | null;
//   stats?:         LayoutSeatStats | null;
//   canPublish?:    boolean;
//   allConfigured?: boolean;
//   onPublish?:     () => void;
//   publishing?:    boolean;
//   publishError?:  boolean;
// }

// function UploadIcon() {
//   return (
//     <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
//       stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
//       <polyline points="16 16 12 12 8 16" />
//       <line x1="12" y1="12" x2="12" y2="21" />
//       <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
//     </svg>
//   );
// }

// export default function ManageLayoutHeader({
//   layout,
//   stats,
//   canPublish,
//   allConfigured,
//   onPublish,
//   publishing = false,
//   publishError = false,
// }: ManageLayoutHeaderProps) {
//   const router       = useRouter();
//   const searchParams = useSearchParams();

//   const handleBack = () => {
//     const siteId     = searchParams.get("siteId")     ?? "";
//     const buildingId = searchParams.get("buildingId") ?? "";
//     const floorId    = searchParams.get("floorId")    ?? "";
//     const layoutId   = searchParams.get("layoutId")   ?? layout?.layout_id ?? "";

//     const params = new URLSearchParams();
//     if (siteId)     params.set("siteId",     siteId);
//     if (buildingId) params.set("buildingId", buildingId);
//     if (floorId)    params.set("floorId",    floorId);
//     if (layoutId)   params.set("layoutId",   layoutId);

//     router.push(`/admin/layouts?${params.toString()}`);
//   };

//   return (
//     <div className="flex justify-between items-center">

//       {/* LEFT — title only */}
//       <div>
//         <h1 className="text-xl font-semibold">Floor Layout Management</h1>
//         <p className="text-sm text-muted-foreground">
//           Review, manage and publish floor layouts for employee bookings
//         </p>
//       </div>

//       {/* RIGHT — back button + upload button */}
//       <div className="flex gap-3 items-center">

//         <button
//           onClick={handleBack}
//           className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
//         >
//           <ArrowLeft className="w-4 h-4" />
//           Back to Layouts
//         </button>

//         {/* <button
//           onClick={() => router.push("/admin/layouts/upload")}
//           className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
//         >
//           <UploadIcon />
//           Upload New Layout
//         </button> */}

//         <button
//   onClick={() => {
//     const siteId     = searchParams.get("siteId")     ?? "";
//     const buildingId = searchParams.get("buildingId") ?? "";
//     const floorId    = searchParams.get("floorId")    ?? "";

//     const params = new URLSearchParams();
//     if (siteId)     params.set("siteId",     siteId);
//     if (buildingId) params.set("buildingId", buildingId);
//     if (floorId)    params.set("floorId",    floorId);

//     router.push(`/admin/layouts/upload?${params.toString()}`);
//   }}
//   className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
// >
//   <UploadIcon />
//   Upload New Layout
// </button>

//       </div>

//     </div>
//   );
// }

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEffect, useCallback } from "react";
import { Layout, LayoutSeatStats } from "../types/layout.types";

interface ManageLayoutHeaderProps {
  layout?:        Layout | null;
  stats?:         LayoutSeatStats | null;
  canPublish?:    boolean;
  allConfigured?: boolean;
  onPublish?:     () => void;
  publishing?:    boolean;
  publishError?:  boolean;
}

function UploadIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

export default function ManageLayoutHeader({
  layout,
  stats,
  canPublish,
  allConfigured,
  onPublish,
  publishing  = false,
  publishError = false,
}: ManageLayoutHeaderProps) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // Read params once — stable across renders
  const siteId     = searchParams.get("siteId")     ?? "";
  const buildingId = searchParams.get("buildingId") ?? "";
  const floorId    = searchParams.get("floorId")    ?? "";
  const layoutId   = searchParams.get("layoutId")   ?? layout?.layout_id ?? "";

  // FIX: Prefetch both destination routes on mount.
  // Back button → /admin/layouts
  // Upload button → /admin/layouts/upload
  // Both JS bundles are downloaded before the user clicks anything.
  useEffect(() => {
    router.prefetch("/admin/layouts");
    router.prefetch("/admin/layouts/upload");
  }, [router]);

  const handleBack = useCallback(() => {
    const params = new URLSearchParams();
    if (siteId)     params.set("siteId",     siteId);
    if (buildingId) params.set("buildingId", buildingId);
    if (floorId)    params.set("floorId",    floorId);
    if (layoutId)   params.set("layoutId",   layoutId);

    router.push(`/admin/layouts?${params.toString()}`);
  }, [router, siteId, buildingId, floorId, layoutId]);

  const handleUpload = useCallback(() => {
    const params = new URLSearchParams();
    if (siteId)     params.set("siteId",     siteId);
    if (buildingId) params.set("buildingId", buildingId);
    if (floorId)    params.set("floorId",    floorId);

    router.push(`/admin/layouts/upload?${params.toString()}`);
  }, [router, siteId, buildingId, floorId]);

  return (
    <div className="flex justify-between items-center">

      {/* LEFT — title */}
      <div>
        <h1 className="text-xl font-semibold">Floor Layout Management</h1>
        <p className="text-sm text-muted-foreground">
          Review, manage and publish floor layouts for employee bookings
        </p>
      </div>

      {/* RIGHT — back + upload */}
      <div className="flex gap-3 items-center">

        <button
          onClick={handleBack}
          onMouseEnter={() => router.prefetch("/admin/layouts")}
          className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Layouts
        </button>

        <button
          onClick={handleUpload}
          onMouseEnter={() => router.prefetch("/admin/layouts/upload")}
          className="flex items-center gap-2 border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          <UploadIcon />
          Upload New Layout
        </button>

      </div>

    </div>
  );
}