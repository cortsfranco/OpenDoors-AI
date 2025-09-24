import { FinancialCalculator } from './financial-calculator';
import type { InvoiceWithRelations } from './schema';

export interface FinancialReport {
  totals: {
    income: {
      total: number;
      iva: number;
      count: number;
    };
    expense: {
      total: number;
      iva: number;
      count: number;
    };
    balance: number;
    ivaBalance: number;
    totalCount: number;
    averageAmount: number;
    profitability: number;
  };
  invoiceTypeBreakdown: {
    A: { count: number; total: number; iva: number; percentage: number };
    B: { count: number; total: number; iva: number; percentage: number };
    C: { count: number; total: number; iva: number; percentage: number };
  };
  ownerStatistics: Array<{
    name: string;
    income: { total: number; iva: number; count: number };
    expense: { total: number; iva: number; count: number };
    balance: number;
  }>;
}

export class ReportCalculator {
  /**
   * Calcula un reporte financiero completo con precisión decimal
   */
  static calculateFinancialReport(invoices: InvoiceWithRelations[]): FinancialReport {
    const totals = {
      income: { total: 0, iva: 0, count: 0 },
      expense: { total: 0, iva: 0, count: 0 },
      balance: 0,
      ivaBalance: 0,
      totalCount: 0,
      averageAmount: 0,
      profitability: 0,
    };

    const invoiceTypeBreakdown = {
      A: { count: 0, total: 0, iva: 0, percentage: 0 },
      B: { count: 0, total: 0, iva: 0, percentage: 0 },
      C: { count: 0, total: 0, iva: 0, percentage: 0 },
    };

    let totalSum = new Decimal(0);
    const ownerStats = new Map<string, {
      income: { total: Decimal; iva: Decimal; count: number };
      expense: { total: Decimal; iva: Decimal; count: number };
    }>();

    // Procesar cada factura con precisión decimal
    invoices.forEach(invoice => {
      const total = FinancialCalculator.roundToCents(invoice.totalAmount);
      const iva = FinancialCalculator.roundToCents(invoice.ivaAmount);
      const ownerName = invoice.ownerName || 'Sin asignar';

      // Inicializar estadísticas del propietario si no existen
      if (!ownerStats.has(ownerName)) {
        ownerStats.set(ownerName, {
          income: { total: new Decimal(0), iva: new Decimal(0), count: 0 },
          expense: { total: new Decimal(0), iva: new Decimal(0), count: 0 }
        });
      }

      const ownerStat = ownerStats.get(ownerName)!;

      if (invoice.type === 'income') {
        totals.income.total = FinancialCalculator.add(totals.income.total, total).toNumber();
        totals.income.iva = FinancialCalculator.add(totals.income.iva, iva).toNumber();
        totals.income.count++;
        
        ownerStat.income.total = FinancialCalculator.add(ownerStat.income.total, total);
        ownerStat.income.iva = FinancialCalculator.add(ownerStat.income.iva, iva);
        ownerStat.income.count++;
      } else {
        totals.expense.total = FinancialCalculator.add(totals.expense.total, total).toNumber();
        totals.expense.iva = FinancialCalculator.add(totals.expense.iva, iva).toNumber();
        totals.expense.count++;
        
        ownerStat.expense.total = FinancialCalculator.add(ownerStat.expense.total, total);
        ownerStat.expense.iva = FinancialCalculator.add(ownerStat.expense.iva, iva);
        ownerStat.expense.count++;
      }

      // Track invoice class breakdown
      const invoiceClass = invoice.invoiceClass || 'A';
      if (invoiceTypeBreakdown[invoiceClass as keyof typeof invoiceTypeBreakdown]) {
        invoiceTypeBreakdown[invoiceClass as keyof typeof invoiceTypeBreakdown].count++;
        invoiceTypeBreakdown[invoiceClass as keyof typeof invoiceTypeBreakdown].total = 
          FinancialCalculator.add(invoiceTypeBreakdown[invoiceClass as keyof typeof invoiceTypeBreakdown].total, total).toNumber();
        invoiceTypeBreakdown[invoiceClass as keyof typeof invoiceTypeBreakdown].iva = 
          FinancialCalculator.add(invoiceTypeBreakdown[invoiceClass as keyof typeof invoiceTypeBreakdown].iva, iva).toNumber();
      }

      totalSum = FinancialCalculator.add(totalSum, total);
      totals.totalCount++;
    });

    // Calcular totales finales con precisión decimal
    totals.balance = FinancialCalculator.subtract(totals.income.total, totals.expense.total).toNumber();
    totals.ivaBalance = FinancialCalculator.subtract(totals.income.iva, totals.expense.iva).toNumber();
    totals.averageAmount = totals.totalCount > 0 ? FinancialCalculator.divide(totalSum, totals.totalCount).toNumber() : 0;
    
    // Calcular rentabilidad con validación de división por cero
    if (totals.expense.total > 0) {
      totals.profitability = FinancialCalculator.divide(
        FinancialCalculator.subtract(totals.income.total, totals.expense.total),
        totals.expense.total
      ).times(100).toNumber();
    } else {
      totals.profitability = totals.income.total > 0 ? 100 : 0;
    }

    // Calcular porcentajes para tipos de factura
    Object.keys(invoiceTypeBreakdown).forEach(type => {
      const breakdown = invoiceTypeBreakdown[type as keyof typeof invoiceTypeBreakdown];
      breakdown.percentage = totals.totalCount > 0 
        ? FinancialCalculator.divide(breakdown.count, totals.totalCount).times(100).toNumber()
        : 0;
    });

    // Convertir estadísticas de propietarios
    const ownerStatistics = Array.from(ownerStats.entries()).map(([name, stats]) => ({
      name,
      income: {
        total: stats.income.total.toNumber(),
        iva: stats.income.iva.toNumber(),
        count: stats.income.count
      },
      expense: {
        total: stats.expense.total.toNumber(),
        iva: stats.expense.iva.toNumber(),
        count: stats.expense.count
      },
      balance: FinancialCalculator.subtract(stats.income.total, stats.expense.total).toNumber()
    }));

    return {
      totals,
      invoiceTypeBreakdown,
      ownerStatistics
    };
  }

  /**
   * Calcula el impuesto a las ganancias
   */
  static calculateIncomeTax(netIncome: number): number {
    return FinancialCalculator.calculateIncomeTax(netIncome).toNumber();
  }

  /**
   * Calcula el balance de IVA
   */
  static calculateIVABalance(ivaDebit: number, ivaCredit: number): number {
    return FinancialCalculator.calculateIVABalance(ivaDebit, ivaCredit).toNumber();
  }

  /**
   * Valida la integridad de los cálculos del reporte
   */
  static validateReportIntegrity(report: FinancialReport): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar que los totales sean consistentes
    const calculatedBalance = FinancialCalculator.subtract(report.totals.income.total, report.totals.expense.total);
    if (!calculatedBalance.equals(report.totals.balance)) {
      errors.push('Balance total inconsistente');
    }

    const calculatedIVABalance = FinancialCalculator.subtract(report.totals.income.iva, report.totals.expense.iva);
    if (!calculatedIVABalance.equals(report.totals.ivaBalance)) {
      errors.push('Balance de IVA inconsistente');
    }

    // Validar que los porcentajes sumen 100%
    const totalPercentage = Object.values(report.invoiceTypeBreakdown)
      .reduce((sum, breakdown) => sum + breakdown.percentage, 0);
    
    if (Math.abs(totalPercentage - 100) > 0.1) {
      errors.push('Los porcentajes de tipos de factura no suman 100%');
    }

    // Validar que los totales de propietarios sean consistentes
    const totalOwnerIncome = report.ownerStatistics.reduce((sum, owner) => sum + owner.income.total, 0);
    const totalOwnerExpense = report.ownerStatistics.reduce((sum, owner) => sum + owner.expense.total, 0);

    if (!FinancialCalculator.subtract(totalOwnerIncome, report.totals.income.total).equals(0)) {
      errors.push('Total de ingresos por propietario inconsistente');
    }

    if (!FinancialCalculator.subtract(totalOwnerExpense, report.totals.expense.total).equals(0)) {
      errors.push('Total de egresos por propietario inconsistente');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
