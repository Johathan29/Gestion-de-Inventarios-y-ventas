const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Dashboard - KPIs principales
 */
const getDashboardStats = async (req, res, next) => {
  try {
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
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('inventory').select('id', { count: 'exact', head: true }).lte('stock', 5).gt('stock', 0),
      supabase.from('inventory').select('id', { count: 'exact', head: true }).eq('stock', 0),
      supabase.from('sales').select('id', { count: 'exact', head: true }),
      supabase.from('sales').select('total').gte('created_at', startOfMonth),
      supabase.from('sales').select('total').gte('created_at', today),
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id, roles!inner(name)', { count: 'exact', head: true }).eq('roles.name', 'admin').eq('is_active', true),
      supabase.from('users').select('id, roles!inner(name)', { count: 'exact', head: true }).eq('roles.name', 'cajero').eq('is_active', true),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true)
    ]);

    const monthlySales = salesSumResult.data?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
    const todaySales = todaySalesResult.data?.reduce((sum, s) => sum + Number(s.total), 0) || 0;

    res.json({
      success: true,
      data: {
        totalProducts: totalProducts || 0,
        lowStock: lowStock || 0,
        outOfStock: outOfStock || 0,
        totalSales: totalSales || 0,
        monthSales: monthlySales,
        todaySales,
        totalClients: totalClients || 0,
        totalUsers: totalUsers || 0,
        adminUsers: adminUsersResult.count || 0,
        cashierUsers: cashierUsersResult.count || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ventas por período
 */
const getSalesReport = async (req, res, next) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'start_date y end_date requeridos' }
      });
    }

    const { data: sales, error } = await supabase
      .from('sales')
      .select('*')
      .gte('created_at', start_date)
      .lte('created_at', end_date)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalAmount = sales?.reduce((sum, s) => sum + Number(s.total), 0) || 0;
    const totalTax = sales?.reduce((sum, s) => sum + Number(s.tax || 0), 0) || 0;
    const totalDiscount = sales?.reduce((sum, s) => sum + Number(s.discount || 0), 0) || 0;

    // Agrupar por período
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

    res.json({
      success: true,
      data: {
        summary: { totalSales: sales?.length || 0, totalAmount, totalTax, totalDiscount },
        byPeriod: Object.entries(grouped).map(([period, data]) => ({ period, ...data })),
        sales
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reporte de inventario
 */
const getInventoryReport = async (req, res, next) => {
  try {
    const { min_stock, max_stock, category } = req.query;

    let query = supabase
      .from('inventory')
      .select('*, products(id, name, sku, price, category_id, categories(name))')
      .order('stock', { ascending: true });

    if (min_stock) query = query.gte('stock', parseInt(min_stock));
    if (max_stock) query = query.lte('stock', parseInt(max_stock));
    if (category) query = query.eq('products.category_id', category);

    const { data: inventory, error } = await query;
    if (error) throw error;

    const totalValue = inventory?.reduce((sum, item) => sum + (Number(item.stock) * Number(item.products?.price || 0)), 0) || 0;
    const totalProducts = inventory?.length || 0;
    const itemsWithIssues = inventory?.filter(item => item.stock <= (item.min_stock || 5)).length || 0;

    res.json({
      success: true,
      data: {
        summary: { totalProducts, totalValue, itemsWithIssues },
        items: inventory
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reporte de productos más vendidos
 */
const getTopProducts = async (req, res, next) => {
  try {
    const { start_date, end_date, limit = 10 } = req.query;

    let itemsQuery = supabase
      .from('sale_items')
      .select('product_id, products(name, sku, price), quantity, total, sales(created_at)');

    if (start_date) itemsQuery = itemsQuery.gte('sales.created_at', start_date);
    if (end_date) itemsQuery = itemsQuery.lte('sales.created_at', end_date);

    const { data: items, error } = await itemsQuery;
    if (error) throw error;

    // Agrupar por producto
    const productMap = {};
    items?.forEach(item => {
      const id = item.product_id;
      if (!productMap[id]) {
        productMap[id] = {
          product_id: id,
          name: item.products?.name || 'N/A',
          sku: item.products?.sku || 'N/A',
          price: item.products?.price || 0,
          totalQuantity: 0,
          totalRevenue: 0,
          orderCount: 0
        };
      }
      productMap[id].totalQuantity += item.quantity;
      productMap[id].totalRevenue += Number(item.total);
      productMap[id].orderCount++;
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, parseInt(limit));

    res.json({ success: true, data: topProducts });
  } catch (error) {
    next(error);
  }
};

/**
 * Reporte de clientes
 */
const getClientReport = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;

    let query = supabase
      .from('clients')
      .select('*, sales(id, total, created_at)');

    const { data: clients, error } = await query;
    if (error) throw error;

    const clientStats = clients?.map(client => {
      const clientSales = client.sales?.filter(s => {
        if (start_date && end_date) {
          return s.created_at >= start_date && s.created_at <= end_date;
        }
        return true;
      }) || [];

      const totalPurchases = clientSales.length;
      const totalSpent = clientSales.reduce((sum, s) => sum + Number(s.total), 0);
      const lastPurchase = clientSales.length > 0
        ? clientSales.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at
        : null;

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        totalPurchases,
        totalSpent,
        averageTicket: totalPurchases > 0 ? totalSpent / totalPurchases : 0,
        lastPurchase
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    res.json({ success: true, data: clientStats });
  } catch (error) {
    next(error);
  }
};

/**
 * Datos para gráficos del dashboard
 * - Ventas de hoy (por hora)
 * - Ventas del mes (por día)
 */
const getSalesChartData = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const now = new Date();

    // Obtener ventas de hoy
    const { data: todaySales, error: err1 } = await supabase
      .from('sales')
      .select('created_at, total')
      .gte('created_at', today)
      .order('created_at', { ascending: true });

    if (err1) throw err1;

    // Agrupar ventas de hoy por hora
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      total: 0,
      count: 0
    }));

    todaySales?.forEach(sale => {
      const saleHour = new Date(sale.created_at).getHours();
      hourlyData[saleHour].total += Number(sale.total);
      hourlyData[saleHour].count++;
    });

    // Obtener ventas del mes actual
    const { data: monthSales, error: err2 } = await supabase
      .from('sales')
      .select('created_at, total')
      .gte('created_at', startOfMonth)
      .order('created_at', { ascending: true });

    if (err2) throw err2;

    // Agrupar ventas del mes por día
    const dailyMap = {};
    monthSales?.forEach(sale => {
      const day = sale.created_at.split('T')[0];
      if (!dailyMap[day]) dailyMap[day] = { total: 0, count: 0 };
      dailyMap[day].total += Number(sale.total);
      dailyMap[day].count++;
    });

    // Generar array de días del mes
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dailyData = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyData.push({
        date: dayStr,
        total: dailyMap[dayStr]?.total || 0,
        count: dailyMap[dayStr]?.count || 0
      });
    }

    res.json({
      success: true,
      data: {
        todayHourly: hourlyData.filter(h => h.total > 0 || h.count > 0),
        monthDaily: dailyData
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats, getSalesReport, getInventoryReport, getTopProducts, getClientReport, getSalesChartData };
