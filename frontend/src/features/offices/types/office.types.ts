export type Office = {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  offices: number;
  floors: number;
  seats: number;
  status: "ACTIVE" | "INACTIVE";
  
};