const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Buscar productos en el catálogo
 */
const searchCatalog = async (req, res, next) => {
  try {
    const { q, category, brand, min_price, max_price, page = 1, limit = 20, sort } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('products')
      .select('*, categories(name)', { count: 'exact' })
      .eq('status', 'active');

    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,sku.ilike.%${q}%`);
    }
    if (category) query = query.eq('category_id', category);
    if (brand) query = query.eq('brand', brand);
    if (min_price) query = query.gte('price', parseFloat(min_price));
    if (max_price) query = query.lte('price', parseFloat(max_price));

    // Ordenamiento
    switch (sort) {
      case 'price_asc': query = query.order('price', { ascending: true }); break;
      case 'price_desc': query = query.order('price', { ascending: false }); break;
      case 'name_asc': query = query.order('name', { ascending: true }); break;
      case 'name_desc': query = query.order('name', { ascending: false }); break;
      case 'newest': default: query = query.order('created_at', { ascending: false }); break;
    }

    query = query.range(from, to);

    const { data: products, count, error } = await query;

    if (error) throw error;

    // Obtener marcas y rangos de precio para filtros
    const { data: brands } = await supabase
      .from('products')
      .select('brand')
      .eq('status', 'active')
      .not('brand', 'is', null);

    const uniqueBrands = [...new Set(brands?.map(b => b.brand).filter(Boolean))];

    res.json({
      success: true,
      data: products,
      filters: { brands: uniqueBrands },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener producto del catálogo por ID
 */
const getCatalogProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories(*), product_variants(*)')
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (error || !product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Producto no encontrado' }
      });
    }

    // Obtener productos relacionados
    const { data: related } = await supabase
      .from('products')
      .select('id, name, price, images, category_id')
      .eq('category_id', product.category_id)
      .eq('status', 'active')
      .neq('id', id)
      .limit(6);

    res.json({
      success: true,
      data: { ...product, related_products: related || [] }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { searchCatalog, getCatalogProduct };
