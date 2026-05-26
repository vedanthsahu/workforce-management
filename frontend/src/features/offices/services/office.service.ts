import { Office } from "../types/office.types";

export const getOffices = async (): Promise<Office[]> => {
  return [
    {
      id: "1",
      code: "HYD",
      name: "Hyderabad Office",
      city: "Hyderabad",
      country: "India",
      timezone: "Asia/Kolkata",
      offices: 2,
      floors: 8,
      seats: 1250,
      status: "ACTIVE",
      createdOn: "09 Apr 2026",
    },
    {
      id: "2",
      code: "BLR",
      name: "Bangalore Office",
      city: "Bangalore",
      country: "India",
      timezone: "Asia/Kolkata",
      offices: 3,
      floors: 12,
      seats: 1850,
      status: "ACTIVE",
      createdOn: "09 Apr 2026",
    },
  ];
};