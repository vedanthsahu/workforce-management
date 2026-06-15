import { siteDirectoryService } from "@/features/siteDirectory/services/siteDirectory.service";
import SiteDirectoryTable from "@/features/siteDirectory/components/SiteDirectoryTable";
import AddSiteForm from "@/features/siteDirectory/components/AddSiteForm";

// Server Component: fetches the site list once, server-side, at request time.
// No "use client", no useEffect, no loading state needed for this part.
export default async function SiteDirectoryPage() {
  const sites = await siteDirectoryService.getSites().catch(() => []);

  return (
    <main className="flex-1 p-6 bg-gray-50 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Site Directory</h1>
        <p className="text-sm text-gray-500">
          All registered office sites (server-rendered, with client-side search).
        </p>
      </div>

      <AddSiteForm />

      <SiteDirectoryTable initialSites={sites} />
    </main>
  );
}
