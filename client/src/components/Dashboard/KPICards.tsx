import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Calculator, BarChart } from "lucide-react";
import { useKPIs } from "@/hooks/useKPIs";
import { Skeleton } from "@/components/ui/skeleton";

export default function KPICards() {
  const { data: kpis, isLoading } = useKPIs();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-20" />
          </Card>
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  const cards = [
    {
      title: "Total Ingresos",
      value: kpis.totalIncome,
      change: kpis.incomeChange.includes('%') 
        ? `${kpis.incomeChange}% vs mes anterior` 
        : kpis.incomeChange,
      isPositive: kpis.incomeChange.includes('+') || kpis.incomeChange === 'Nuevo',
      icon: DollarSign,
      color: "text-income-green bg-income-green/10",
      cardBg: "bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200",
    },
    {
      title: "Total Egresos",
      value: kpis.totalExpenses,
      change: kpis.expensesChange.includes('%') 
        ? `${kpis.expensesChange}% vs mes anterior` 
        : kpis.expensesChange,
      isPositive: kpis.expensesChange.includes('-') || kpis.expensesChange === 'Sin movimientos',
      icon: DollarSign,
      color: "text-expense-red bg-expense-red/10",
      cardBg: "bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200",
    },
    {
      title: "Balance IVA",
      value: kpis.ivaBalance,
      change: (() => {
        const balanceValue = parseFloat(kpis.ivaBalance.replace(/[^\d.-]/g, ''));
        if (balanceValue > 0) {
          return "A pagar al estado";
        } else if (balanceValue < 0) {
          return "A pagar al estado";
        } else {
          return "Neutro";
        }
      })(),
      isPositive: parseFloat(kpis.ivaBalance.replace(/[^\d.-]/g, '')) >= 0,
      icon: Calculator,
      color: "text-chart-3 bg-chart-3/10",
      cardBg: "bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200",
    },
    {
      title: "Balance General",
      value: kpis.generalBalance,
      change: (() => {
        const balanceValue = parseFloat(kpis.generalBalance.replace(/[^\d.-]/g, ''));
        if (balanceValue > 0) {
          return "Positivo";
        } else if (balanceValue < 0) {
          return "Negativo";
        } else {
          return "Neutro";
        }
      })(),
      isPositive: parseFloat(kpis.generalBalance.replace(/[^\d.-]/g, '')) > 0,
      icon: BarChart,
      color: "text-income-green bg-income-green/10",
      cardBg: "bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {cards.map((card, index) => (
        <Card
          key={index}
          className={`card-hover cursor-pointer border-border shadow-sm transition-all duration-300 ${card.cardBg}`}
          data-testid={`kpi-card-${index}`}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground text-clamp-1">
                  {card.title}
                </p>
                <p
                  className="text-xl sm:text-2xl font-bold text-foreground leading-tight mt-1 text-clamp-1"
                  data-testid={`kpi-value-${index}`}
                  title={card.value}
                >
                  {card.value}
                </p>
                <p
                  className={`text-xs flex items-center gap-1 mt-2 text-clamp-2 ${
                    card.isPositive ? "text-income-green" : "text-expense-red"
                  }`}
                >
                  {card.isPositive ? (
                    <TrendingUp className="w-3 h-3 flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-3 h-3 flex-shrink-0" />
                  )}
                  <span className="min-w-0">{card.change}</span>
                </p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${card.color}`}>
                <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
