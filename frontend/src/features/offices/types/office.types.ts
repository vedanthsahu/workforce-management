// export type Office = {
//   id: string;
//   code: string;
//   name: string;
//   city: string;
//   country: string;
//   timezone: string;
//   offices: number;
//   floors: number;
//   seats: number;
//   status: "ACTIVE" | "INACTIVE";
  
// };
export type OfficeStatus = "ACTIVE" | "INACTIVE";

export interface Office {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;

  buildings: number; // from building_count
  floors: number;    // from floor_count
  seats: number;     // from seat_count

  status: OfficeStatus;
}