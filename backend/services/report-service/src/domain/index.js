// ============================================================
// Reporting Domain — Value Objects for report data
// ============================================================

import { ValueObject } from '@erp/shared-kernel';

export class DashboardStats extends ValueObject {
  constructor({ totalProducts, lowStock, outOfStock, totalSales, monthSales, todaySales, totalClients, totalUsers, adminUsers, cashierUsers }) {
    super();
    this._totalProducts = totalProducts || 0;
    this._lowStock = lowStock || 0;
    this._outOfStock = outOfStock || 0;
    this._totalSales = totalSales || 0;
    this._monthSales = monthSales || 0;
    this._todaySales = todaySales || 0;
    this._totalClients = totalClients || 0;
    this._totalUsers = totalUsers || 0;
    this._adminUsers = adminUsers || 0;
    this._cashierUsers = cashierUsers || 0;
  }

  get totalProducts() { return this._totalProducts; }
  get lowStock() { return this._lowStock; }
  get outOfStock() { return this._outOfStock; }
  get totalSales() { return this._totalSales; }
  get monthSales() { return this._monthSales; }
  get todaySales() { return this._todaySales; }
  get totalClients() { return this._totalClients; }
  get totalUsers() { return this._totalUsers; }
  get adminUsers() { return this._adminUsers; }
  get cashierUsers() { return this._cashierUsers; }

  toJSON() {
    return {
      totalProducts: this._totalProducts, lowStock: this._lowStock,
      outOfStock: this._outOfStock, totalSales: this._totalSales,
      monthSales: this._monthSales, todaySales: this._todaySales,
      totalClients: this._totalClients, totalUsers: this._totalUsers,
      adminUsers: this._adminUsers, cashierUsers: this._cashierUsers,
    };
  }
}

export class SalesReport extends ValueObject {
  constructor({ summary, byPeriod, sales }) {
    super();
    this._summary = summary;
    this._byPeriod = byPeriod;
    this._sales = sales;
  }

  toJSON() {
    return { summary: this._summary, byPeriod: this._byPeriod, sales: this._sales };
  }
}

export class ChartData extends ValueObject {
  constructor({ todayHourly, monthDaily }) {
    super();
    this._todayHourly = todayHourly;
    this._monthDaily = monthDaily;
  }

  toJSON() {
    return { todayHourly: this._todayHourly, monthDaily: this._monthDaily };
  }
}
