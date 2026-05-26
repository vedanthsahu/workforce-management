import { useEffect, useState } from "react";
import { getOffices } from "../services/office.service";
import { Office } from "../types/office.types";
import { toast } from "sonner";

export const useOffices = () => {
  const [data, setData] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // 🔥 API CALL
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

  // 🔥 INITIAL LOAD
  useEffect(() => {
    load();
  }, []);

  // 🔥 SEARCH TRIGGER (with debounce)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      load(search);
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounce);
  }, [search]);

  return {
    data,
    loading,
    search,
    setSearch,
  };
};