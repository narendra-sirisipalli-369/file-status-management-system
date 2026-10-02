import { useEffect, useState } from 'react';

const PAGE_SIZE = 10;

/** Client-side pagination for an already-fetched list — 10 per page, resets to page 1 whenever the list identity/length changes (e.g. a filter or search narrows it). */
export function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return { page: safePage, setPage, totalPages, pageItems };
}
