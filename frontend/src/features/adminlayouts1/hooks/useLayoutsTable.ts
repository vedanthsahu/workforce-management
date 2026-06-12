"use client";

import { useState, useEffect } from "react";
import { LayoutApiResponse } from "@/features/adminlayouts1/types/layout.types";

// Reset page to 1 whenever the underlying data changes (e.g. floor switch).
// Previously, switching floors while on page 3 would show an empty table
// because the new data might only have 1 page.
export const useLayoutsTable = (data: LayoutApiResponse[]) => {
  const [page, setPage]               = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [data]);

  const total     = data.length;
  const paginated = data.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return {
    page,
    rowsPerPage,
    total,
    paginated,
    setPage,
    setRowsPerPage,
  };
};
