// import OfficeForm from "@/features/offices/components/OfficeForm";

// export default function AddOfficePage() {
//   return (
//     <div className="p-6">
//       <OfficeForm />
//     </div>
//   );
// }

// app/admin/offices/addoffice/page.tsx
import OfficeForm from "@/features/offices/components/OfficeForm";

export default function AddOfficePage() {
  return <OfficeForm />;  // ← removed the wrapping <div className="p-6">
}