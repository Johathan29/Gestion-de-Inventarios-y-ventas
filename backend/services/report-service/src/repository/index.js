// ============================================================
// Reporting Supabase Repository
// ============================================================

import { DashboardStats, SalesReport, ChartData } from '../domain/index.js';

export class SupabaseReportRepository {
  constructor(supabase) {
    this._supabase = supabase;
  }

  async getDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [
      { count: totalProducts },
      { count: lowStock },
      { count: outOfStock },
      { count: totalSales },
      salesSumResult,
      todaySalesResult,
      { count: totalClients },
      adminUsersResult,
      cashierUsersResult,
      { count: totalUsers }
    ] = await Promise.all([
      this._supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      this._supabase.from('inventory').select('id', { count: 'exact', head: true }).lte('stock', 5).gt('stock', 0),
      this._supabase.from('inventory').select('id', { count: 'exact', head: true }).eq('stock', 0),
      this._supabase.from('sales').select('id', { count: 'exact', head: true }),
      this._supabase.from('sales').select('total').gte('created_at', startOfMonth),
      this._supabase.from('sales').select('total').gte('created_at', today),
      this._supabase.from('clients').select('id', { count: 'exact', head: true }),
      this._supabase.from('users').select('id, roles!inner(name)', { count: 'exact', head: true }).eq('roles.name', 'admin').eq('is_active', true),
      this._supabase.from('users').select('id, roles!inner(name)', { count: 'exact', head: true }).eq('roles.name', 'cajero').eq('is_active', true),
      this._supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    const monthlySales = salesSumResult.data?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
    const todaySales = todaySalesResult.data?.reduce((sum, s) => sum + Number(s.total), 0) || 0;

    return new DashboardStats({
      totalProducts: totalProducts || 0,
      lowStock: lowStock || 0,
      outOfStock: outOfStock || 0,
      totalSales: totalSales || 0,
      monthSales: monthlySales,
      todaySales,
      totalClients: totalClients || 0,
      totalUsers: totalUsers || 0,
      adminUsers: adminUsersResult.count || 0,
      cashierUsers: cashierUsersResult.count || 0,
    });
  }

  async getSalesReport({ start_date, end_date, group_by }) {
    const { data: sales, error } = await this._supabase
      .from('sales')
      .select('*')
      .gte('created_at', start_date)
      .lte('created_at', end_date)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalAmount = sales?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
    const totalTax = sales?.reduce((sum, s) => sum + Number(s.tax || 0), 0) || 0;
    const totalDiscount = sales?.reduce((sum, s) => sum + Number(s.discount || 0), 0) || 0;

    const grouped = {};
    sales?.forEach(sale => {
      const date = new Date(sale.created_at);
      let key;
      if (group_by === 'month') key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      else if (group_by === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else key = sale.created_at.split('T')[0];

      if (!grouped[key]) grouped[key] = { count: 0, total: 0 };
      grouped[key].count++;
      grouped[key].total += Number(sale.total);
    });

    return new SalesReport({
      summary: { totalSales: sales?.length || 0, totalAmount, totalTax, totalDiscount },
      byPeriod: Object.entries(grouped).map(([period, data]) => ({ period, ...data })),
      sales,
    });
  }

  async getSalesChartData() {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const now = new Date();

    const { data: todaySales } = await this._supabase
      .from('sales')
      .select('created_at, total')
      .gte('created_at', today)
      .order('created_at', { ascending: true });

    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`, total: 0, count: 0,
    }));

    todaySales?.forEach(sale => {
      const h = new Date(sale.created_at).getHours();
      hourlyData[h].total += Number(sale.total);
      hourlyData[h].count++;
    });

    const { data: monthSales } = await this._supabase
      .from('sales')
      .select('created_at, total')
      .gte('created_at', startOfMonth)
      .order('created_at', { ascending: true });

    const dailyMap = {};
    monthSales?.forEach(sale => {
      const day = sale.created_at.split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { total: 0, count: 0 };
      dailyMap[day].total += Number(sale.total);
      dailyMap[day].count++;
    });

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyData.push({ date: dayStr, total: dailyMap[dayStr]?.total || 0, count: dailyMap[dayStr]?.count || 0 });
    }

    return new ChartData({
      todayHourly: hourlyData.filter(h => h.total > 0 || h.count > 0),
      monthDaily: dailyData,
    });
  }

  async getInventoryReport(filters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    let countQuery = this._supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true });

    let query = this._supabase
      .from('inventory')
      .select('*, products(id, name, sku, price, category_id, categories(name))')
      .order('stock', { ascending: true });

    if (filters.min_stock) {
      countQuery = countQuery.gte('stock', parseInt(filters.min_stock));
      query = query.gte('stock', parseInt(filters.min_stock));
    }
    if (filters.max_stock) {
      countQuery = countQuery.lte('stock', parseInt(filters.max_stock));
      query = query.lte('stock', parseInt(filters.max_stock));
    }
    if (filters.category) {
      query = query.eq('products.category_id', filters.category);
      countQuery = countQuery.eq('products.category_id', filters.category);
    }

    const { count } = await countQuery;

    const from = (page - 1) * limit;
    const { data: inventory, error } = await query.range(from, from + limit - 1);
    if (error) throw error;

    const totalValue = inventory?.reduce((sum, item) => sum + (Number(item.stock) * Number(item.products?.price || 0)), 0) || 0;
    const totalProducts = inventory?.length || 0;
    const itemsWithIssues = inventory?.filter(item => item.stock <= (item.min_stock || 5)).length || 0;

    return {
      summary: { totalProducts, totalValue, itemsWithIssues },
      items: inventory,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) },
    };
  }

  async getTopProducts({ start_date, end_date, limit, groupByVariant }) {
    let itemsQuery = this._supabase
      .from('sale_items')
      .select('product_id, variant_id, variant_name, variant_attributes, products(name, sku, price), quantity, total, sales(created_at)');

    if (start_date) itemsQuery = itemsQuery.gte('sales.created_at', start_date);
    if (end_date) itemsQuery = itemsQuery.lte('sales.created_at', end_date);

    const { data: items, error } = await itemsQuery;
    if (error) throw error;

    const groupByVariantKey = groupByVariant === true || groupByVariant === 'true';
    const productMap = {};
    items?.forEach(item => {
      // Determine grouping key: use variant_id if present and groupByVariant is requested
      const useVariant = groupByVariantKey && item.variant_id;
      const key = useVariant ? `${item.product_id}::${item.variant_id}` : item.product_id;

      if (!productMap[key]) {
        productMap[key] = {
          product_id: item.product_id,
          variant_id: item.variant_id || null,
          variant_name: item.variant_name || null,
          variant_attributes: item.variant_attributes || null,
          name: useVariant
            ? `${item.products?.name || 'N/A'} - ${item.variant_name || ''}`
            : item.products?.name || 'N/A',
          sku: item.products?.sku || 'N/A',
          price: item.products?.price || 0,
          totalQuantity: 0, totalRevenue: 0, orderCount: 0,
        };
      }
      productMap[key].totalQuantity += item.quantity;
      productMap[key].totalRevenue += Number(item.total);
      productMap[key].orderCount++;
    });

    return Object.values(productMap)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, parseInt(limit) || 50);
  }

  async getClientReport({ start_date, end_date, page = 1, limit = 20 }) {
    let countQuery = this._supabase.from('clients').select('*', { count: 'exact', head: true });
    let query = this._supabase.from('clients').select('*, sales(id, total, created_at)');

    const { count } = await countQuery;

    const from = (page - 1) * limit;
    const { data: clients, error } = await query.range(from, from + limit - 1);
    if (error) throw error;

    const mapped = clients?.map(client => {
      const clientSales = client.sales?.filter(s => {
        if (start_date && end_date) return s.created_at >= start_date && s.created_at <= end_date;
        return true;
      }) || [];

      const totalPurchases = clientSales.length;
      const totalSpent = clientSales.reduce((sum, s) => sum + Number(s.total), 0);
      const lastPurchase = clientSales.length > 0
        ? clientSales.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at
        : null;

      return {
        id: client.id, name: client.name, email: client.email,
        phone: client.phone, totalPurchases, totalSpent,
        averageTicket: totalPurchases > 0 ? totalSpent / totalPurchases : 0, lastPurchase,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent) || [];

    return { data: mapped, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } };
  }
}
