import KPICards from "@/components/Dashboard/KPICards";
import MainChart from "@/components/Dashboard/MainChart";
import QuickStats from "@/components/Dashboard/QuickStats";
import RecentActivity from "@/components/Dashboard/RecentActivity";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Bienvenido al Centro de Control Financiero de Open Doors
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Panel de control integral para la gestión financiera
        </p>
      </div>
      
      <KPICards />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <MainChart />
        <QuickStats />
      </div>
      
      <RecentActivity />
    </div>
  );
}
