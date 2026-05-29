"use client";

import { useState } from "react";

export const useLayoutsTable = (data: any[]) => {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const total = data.length;

  const paginated = data.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return {
    page,
    rowsPerPage,
    total,
    paginated,
    setPage,
    setRowsPerPage,
  };
};


