export interface Building {
  id: number;
  name: string;
  site: string;
  address: string;
  capacity: number;
  status: "Active" | "Inactive";
  createdOn: string;
}