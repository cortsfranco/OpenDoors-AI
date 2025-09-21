import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useKPIs() {
  return useQuery({
    queryKey: ['/api/kpis'],
    queryFn: api.getKPIs,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useChartData() {
  return useQuery({
    queryKey: ['/api/chart-data'],
    queryFn: api.getChartData,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useQuickStats() {
  return useQuery({
    queryKey: ['/api/quick-stats'],
    queryFn: api.getQuickStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useRecentInvoices(limit = 10) {
  return useQuery({
    queryKey: ['/api/recent-invoices', limit],
    queryFn: () => api.getRecentInvoices(limit),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useFilteredReports(month?: number, year?: number) {
  return useQuery({
    queryKey: ['/api/reports', month, year],
    queryFn: () => api.getFilteredReports(month, year),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useComprehensiveReport(filters?: {
  month?: number;
  year?: number;
  ownerName?: string;
  clientProviderName?: string;
  type?: 'income' | 'expense';
}) {
  return useQuery({
    queryKey: ['/api/reports', filters],
    queryFn: () => api.getComprehensiveReport(filters),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useFiscalPeriodKPIs(startMonth: number, startYear: number, endMonth: number, endYear: number) {
  return useQuery({
    queryKey: ['/api/kpi/fiscal-period', { startMonth, startYear, endMonth, endYear }],
    queryFn: async () => {
      const params = new URLSearchParams({
        startMonth: String(startMonth),
        startYear: String(startYear),
        endMonth: String(endMonth),
        endYear: String(endYear)
      });
      const response = await fetch(`/api/kpi/fiscal-period?${params}`);
      if (!response.ok) throw new Error('Failed to fetch fiscal period KPIs');
      return response.json();
    },
    enabled: !!startMonth && !!startYear && !!endMonth && !!endYear,
  });
}

export function useFiscalPeriodChart(startMonth: number, startYear: number, endMonth: number, endYear: number) {
  return useQuery({
    queryKey: ['/api/chart-data/fiscal-period', { startMonth, startYear, endMonth, endYear }],
    queryFn: async () => {
      const params = new URLSearchParams({
        startMonth: String(startMonth),
        startYear: String(startYear),
        endMonth: String(endMonth),
        endYear: String(endYear)
      });
      const response = await fetch(`/api/chart-data/fiscal-period?${params}`);
      if (!response.ok) throw new Error('Failed to fetch fiscal period chart data');
      return response.json();
    },
    enabled: !!startMonth && !!startYear && !!endMonth && !!endYear,
  });
}
