// ============================================================
// Reporting Use Cases
// ============================================================

export class GetDashboardStatsUseCase {
  constructor({ reportRepo }) {
    this._reportRepo = reportRepo;
  }

  async execute() {
    return this._reportRepo.getDashboardStats();
  }
}

export class GetSalesReportUseCase {
  constructor({ reportRepo }) {
    this._reportRepo = reportRepo;
  }

  async execute(query) {
    return this._reportRepo.getSalesReport(query);
  }
}

export class GetSalesChartDataUseCase {
  constructor({ reportRepo }) {
    this._reportRepo = reportRepo;
  }

  async execute() {
    return this._reportRepo.getSalesChartData();
  }
}

export class GetInventoryReportUseCase {
  constructor({ reportRepo }) {
    this._reportRepo = reportRepo;
  }

  async execute(filters) {
    return this._reportRepo.getInventoryReport(filters);
  }
}

export class GetTopProductsUseCase {
  constructor({ reportRepo }) {
    this._reportRepo = reportRepo;
  }

  async execute(query) {
    return this._reportRepo.getTopProducts(query);
  }
}

export class GetClientReportUseCase {
  constructor({ reportRepo }) {
    this._reportRepo = reportRepo;
  }

  async execute(query) {
    return this._reportRepo.getClientReport(query);
  }
}
