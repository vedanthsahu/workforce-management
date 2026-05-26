export type OfficeStatus = "ACTIVE" | "INACTIVE";

export interface Office {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;

  buildings: number;
  floors: number;
  seats: number;

  status: OfficeStatus;
}