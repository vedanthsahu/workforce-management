import { useEffect, useState } from "react";
import { getOffices } from "../services/office.service";
import { Office } from "../types/office.types";
import { toast } from "sonner";

export const useOffices = () => {
  const [data, setData] = useState<Office[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await getOffices();
      setData(res);
    } catch {
      toast.error("Failed to load offices");
    }
  };

  return { data };
};