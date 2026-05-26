import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function OfficeFilters() {
  return (
    <div className="flex justify-between items-center p-4 border-b">

     <h2 className="font-bold text-gray-900">
  Offices List
</h2>

      <div className="flex items-center gap-3">

        <div className="relative">
          <Input
            placeholder="Search offices..."
            className="pl-9 rounded-lg"
          />
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        </div>
        


      </div>
    </div>
  );
}