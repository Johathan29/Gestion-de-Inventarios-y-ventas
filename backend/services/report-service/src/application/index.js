// ============================================================
// Reporting Application Service — Façade
// ============================================================

import {
  GetDashboardStatsUseCase, GetSalesReportUseCase, GetSalesChartDataUseCase,
  GetInventoryReportUseCase, GetTopProductsUseCase, GetClientReportUseCase,
} from '../usecases/index.js';

export class ReportApplicationService {
  constructor({ reportRepo }) {
    this._getDashboard = new GetDashboardStatsUseCase({ reportRepo });
    this._getSalesReport = new GetSalesReportUseCase({ reportRepo });
    this._getSalesChart = new GetSalesChartDataUseCase({ reportRepo });
    this._getInventoryReport = new GetInventoryReportUseCase({ reportRepo });
    this._getTopProducts = new GetTopProductsUseCase({ reportRepo });
    this._getClientReport = new GetClientReportUseCase({ reportRepo });
  }

  getDashboardStats() { return this._getDashboard.execute(); }
  getSalesReport(query) { return this._getSalesReport.execute(query); }
  getSalesChartData() { return this._getSalesChart.execute(); }
  getInventoryReport(filters) { return this._getInventoryReport.execute(filters); }
  getTopProducts(query) { return this._getTopProducts.execute(query); }
  getClientReport(query) { return this._getClientReport.execute(query); }
}
