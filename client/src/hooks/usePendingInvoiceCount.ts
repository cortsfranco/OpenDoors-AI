import { useQuery } from "@tanstack/react-query";

export function usePendingInvoiceCount() {
  return useQuery({
    queryKey: ['/api/invoices/pending-review'],
    queryFn: () => fetch('/api/invoices/pending-review').then(res => res.json()),
    select: (data) => data?.length || 0,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider stale after 10 seconds
  });
}