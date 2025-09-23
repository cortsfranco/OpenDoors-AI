import KPICards from "@/components/Dashboard/KPICards";
import MainChart from "@/components/Dashboard/MainChart";
import QuickStats from "@/components/Dashboard/QuickStats";
import RecentActivity from "@/components/Dashboard/RecentActivity";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6" data-testid="dashboard-page">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
          Bienvenido al Centro de Control Financiero de Open Doors
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
          Panel de control integral para la gestión financiera
        </p>
      </div>
      
      <KPICards />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <MainChart />
        <QuickStats />
      </div>
      
      <RecentActivity />
    </div>
  );
}
