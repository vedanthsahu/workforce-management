"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Building2, Search } from "lucide-react";

type Floor = {
  name: string;
};

type Tower = {
  name: string;
  floors: Floor[];
};

type Office = {
  name: string;
  towers: Tower[];
};

const offices: Office[] = [
  {
    name: "Hyderabad Office",
    towers: [
      {
        name: "Tower 1",
        floors: [
          { name: "1st Floor" },
          { name: "2nd Floor" },
          { name: "3rd Floor" },
          { name: "4th Floor" },
        ],
      },
      {
        name: "Tower 2",
        floors: [
          { name: "1st Floor" },
          { name: "2nd Floor" },
          { name: "3rd Floor" },
          { name: "4th Floor" },
        ],
      },
      {
        name: "Tower 3",
        floors: [
          { name: "1st Floor" },
          { name: "2nd Floor" },
          { name: "3rd Floor" },
          { name: "4th Floor" },
        ],
      },
    ],
  },
  {
    name: "Bangalore Office",
    towers: [
      {
        name: "Tower 1",
        floors: [
          { name: "1st Floor" },
          { name: "2nd Floor" },
          { name: "3rd Floor" },
          { name: "4th Floor" },
        ],
      },
      {
        name: "Tower 2",
        floors: [
          { name: "1st Floor" },
          { name: "2nd Floor" },
          { name: "3rd Floor" },
          { name: "4th Floor" },
        ],
      },
      {
        name: "Tower 3",
        floors: [
          { name: "1st Floor" },
          { name: "2nd Floor" },
          { name: "3rd Floor" },
          { name: "4th Floor" },
        ],
      },
    ],
  },
];
type Props = {
  onSelect: (data: {
    office: string;
    tower: string;
    floor: string;
  }) => void;
};

export default function FloorTree({ onSelect }: Props) {
  const [expandedOffice, setExpandedOffice] = useState<string | null>("Hyderabad Office");
  const [expandedTower, setExpandedTower] = useState<string | null>("Tower 1");
  const [selectedFloor, setSelectedFloor] = useState<string>("3rd Floor");
  const [search, setSearch] = useState("");

  return (
    <div className="bg-white border rounded-lg p-4 ">

      {/* TITLE */}
      <h3 className="font-medium mb-3">Floors</h3>

      {/* SEARCH */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search floors..."
          className="w-full h-10 pl-9 pr-3 border rounded-md text-sm"
        />
      </div>

      {/* TREE */}
      <div className="text-sm space-y-3">

        {offices.map((office) => (
          <div key={office.name}>

            {/* OFFICE */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() =>
                setExpandedOffice(
                  expandedOffice === office.name ? null : office.name
                )
              }
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{office.name}</span>
              </div>

              {expandedOffice === office.name ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>

            {/* TOWERS */}
            {expandedOffice === office.name && (
              <div className="ml-5 mt-2 space-y-2">

                {office.towers.map((tower) => (
                  <div key={tower.name}>

                    {/* TOWER */}
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() =>
                        setExpandedTower(
                          expandedTower === tower.name ? null : tower.name
                        )
                      }
                    >
                      <span>{tower.name}</span>

                      {expandedTower === tower.name ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>

                    {/* FLOORS */}
                    {expandedTower === tower.name && (
                      <div className="ml-5 mt-2 space-y-1">

                        {tower.floors
                          .filter((f) =>
                            f.name.toLowerCase().includes(search.toLowerCase())
                          )
                          .map((floor) => (
                            <div
                              key={floor.name}
                              onClick={() => {
  setSelectedFloor(floor.name);

  onSelect({
    office: office.name,
    tower: tower.name,
    floor: floor.name,
  });
}}
                              className={`cursor-pointer px-2 py-1 rounded ${
                                selectedFloor === floor.name
                                  ? "bg-indigo-100 text-indigo-600"
                                  : "hover:bg-gray-100"
                              }`}
                            >
                              {floor.name}
                            </div>
                          ))}

                      </div>
                    )}

                  </div>
                ))}

              </div>
            )}

          </div>
        ))}

      </div>
    </div>
  );
}