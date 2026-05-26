import { useEffect, useState } from "react";
import { getOffices } from "../services/office.service";
import { Office } from "../types/office.types";
import { toast } from "sonner";

export const useOffices = () => {
  const [data, setData] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = async (searchValue: string = "") => {
    try {
      setLoading(true);
      const res = await getOffices(searchValue);
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load offices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      load(search);
    }, 500);

    return () => clearTimeout(delay);
  }, [search]);

  return {
    data,
    loading,
    search,
    setSearch,
  };
};