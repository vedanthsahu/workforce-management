import { Building } from "../types/building";

export const getBuildings = async (): Promise<Building[]> => {
  return [
    {
      id: 1,
      name: "Hyderabad Office",
      site: "Hyderabad Campus",
      address: "Hitech City, Hyderabad, TS",
      capacity: 850,
      status: "Active",
      createdOn: "12 May 2024",
    },
    {
      id: 2,
      name: "Bangalore Office",
      site: "Bangalore Campus",
      address: "Koramangala, Bangalore, KA",
      capacity: 650,
      status: "Active",
      createdOn: "18 May 2024",
    },
    {
      id: 3,
      name: "Pune Office",
      site: "Pune Campus",
      address: "Kharadi, Pune, MH",
      capacity: 400,
      status: "Active",
      createdOn: "25 May 2024",
    },
    {
      id: 4,
      name: "Chennai Office",
      site: "Chennai Campus",
      address: "OMR, Chennai, TN",
      capacity: 500,
      status: "Inactive",
      createdOn: "02 Jun 2024",
    },
    {
      id: 5,
      name: "Noida Office",
      site: "Noida Campus",
      address: "Sector 62, Noida, UP",
      capacity: 300,
      status: "Active",
      createdOn: "10 Jun 2024",
    },
    {
      id: 6,
      name: "Mumbai Office",
      site: "Mumbai Campus",
      address: "Andheri East, Mumbai, MH",
      capacity: 750,
      status: "Inactive",
      createdOn: "15 Jun 2024",
    },
  ];
};