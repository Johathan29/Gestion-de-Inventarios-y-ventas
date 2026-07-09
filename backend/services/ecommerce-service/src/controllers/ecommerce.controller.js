const { getSupabaseClient } = require('@inventory/shared');

const supabase = getSupabaseClient();

/**
 * Obtener datos completos para la página principal
 */
const getHomeData = async (req, res, next) => {
  try {
    const [bannersResult, offersResult, featuredResult, categoriesResult] = await Promise.all([
      supabase.from('ecommerce_banners').select('*').eq('active', true).order('sort_order'),
      supabase.from('offers').select('*, products(*)').eq('active', true).order('created_at', { ascending: false }),
      supabase.from('products').select('*, categories(name)').eq('featured', true).eq('status', 'active').limit(12),
      supabase.from('categories').select('*, products(count)').eq('status', 'active').order('name')
    ]);

    res.json({
      success: true,
      data: {
        banners: bannersResult.data || [],
        offers: offersResult.data || [],
        featuredProducts: featuredResult.data || [],
        categories: categoriesResult.data || []
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener banners
 */
const getBanners = async (req, res, next) => {
  try {
    const { data: banners, error } = await supabase
      .from('ecommerce_banners')
      .select('*')
      .eq('active', true)
      .order('sort_order');

    if (error) throw error;
    res.json({ success: true, data: banners });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear banner
 */
const createBanner = async (req, res, next) => {
  try {
    const { title, subtitle, image_url, link_url, sort_order, active } = req.body;

    if (!title || !image_url) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Título e imagen requeridos' }
      });
    }

    const { data: banner, error } = await supabase
      .from('ecommerce_banners')
      .insert({ title, subtitle, image_url, link_url, sort_order: sort_order || 0, active: active !== false })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar banner
 */
const updateBanner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: banner, error } = await supabase
      .from('ecommerce_banners')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar banner
 */
const deleteBanner = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('ecommerce_banners')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Banner eliminado' });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener ofertas
 */
const getOffers = async (req, res, next) => {
  try {
    const { data: offers, error } = await supabase
      .from('offers')
      .select('*, products(name, sku, price, images)')
      .eq('active', true)
      .gte('end_date', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: offers });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear oferta
 */
const createOffer = async (req, res, next) => {
  try {
    const { product_id, discount_percent, start_date, end_date, active } = req.body;

    if (!product_id || discount_percent === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Producto y descuento requeridos' }
      });
    }

    const { data: offer, error } = await supabase
      .from('offers')
      .insert({
        product_id, discount_percent,
        start_date: start_date || new Date().toISOString(),
        end_date,
        active: active !== false
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    next(error);
  }
};

const updateOffer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: offer, error } = await supabase
      .from('offers')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data: offer });
  } catch (error) {
    next(error);
  }
};

const deleteOffer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Oferta eliminada' });
  } catch (error) {
    next(error);
  }
};

const getHomeSettings = async (req, res, next) => {
  try {
    const { data: settings, error } = await supabase
      .from('ecommerce_settings')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({
      success: true,
      data: settings || {
        store_name: 'Mi Tienda',
        description: '',
        logo_url: '',
        favicon_url: '',
        contact_email: '',
        contact_phone: '',
        social_networks: {},
        seo_settings: {}
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateHomeSettings = async (req, res, next) => {
  try {
    // Whitelist de columnas conocidas en ecommerce_settings
    const allowedColumns = [
      'store_name', 'description', 'logo_url', 'favicon_url',
      'contact_email', 'contact_phone', 'phone', 'whatsapp_number', 'whatsapp_message',
      'address', 'currency_code', 'currency_symbol', 'currency_name',
      'country_code', 'country', 'locale', 'default_tax_rate_id', 'tax_included',
      'banner_default_url', 'banner_mobile_url',
      'social_networks', 'seo_settings', 'shipping_settings', 'payment_settings',
      'is_active'
    ];

    const payload = { updated_at: new Date().toISOString() };
    for (const key of allowedColumns) {
      if (key in req.body) {
        payload[key] = req.body[key];
      }
    }

    const { data, error } = await supabase
      .from('ecommerce_settings')
      .update(payload)
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * HERO SETTINGS
 * ==========================================
 */

/**
 * Obtener hero settings activo
 */
const getHeroSettings = async (req, res, next) => {
  try {
    const { data: hero, error } = await supabase
      .from('hero_settings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({
      success: true,
      data: hero || {
        badge: 'Elite Animal Companionship',
        title_line1: 'The Luxury',
        title_line2: 'Pet Atelier.',
        description: 'We treat the bond between humans and pets as a high-art form.',
        button1_text: 'Explore Collection',
        button1_url: '#products',
        button2_text: 'Our Story',
        button2_url: '#story'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar hero settings
 */
const updateHeroSettings = async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('hero_settings')
      .select('id')
      .eq('is_active', true)
      .single();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('hero_settings')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('hero_settings')
        .insert({ ...req.body, is_active: true })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * PRODUCT REVIEWS
 * ==========================================
 */

/**
 * Obtener reviews aprobados para un producto
 */
const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('product_reviews')
      .select('*', { count: 'exact' })
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data: reviews, count, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: reviews,
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
 * Obtener reviews destacados para landing (aprobados, 5 estrellas, más recientes)
 */
const getFeaturedReviews = async (req, res, next) => {
  try {
    const { limit = 3 } = req.query;

    const { data: reviews, error } = await supabase
      .from('product_reviews')
      .select('*, products(id, name, slug)')
      .eq('is_approved', true)
      .eq('rating', 5)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({ success: true, data: reviews || [] });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear un nuevo review (público)
 */
const createProductReview = async (req, res, next) => {
  try {
    const { product_id, client_name, client_title, client_avatar_url, rating, title, comment } = req.body;

    if (!product_id || !client_name || !rating || !comment) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'product_id, client_name, rating y comment son requeridos' }
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'La calificación debe ser entre 1 y 5' }
      });
    }

    const { data: review, error } = await supabase
      .from('product_reviews')
      .insert({
        product_id,
        client_name,
        client_title: client_title || '',
        client_avatar_url: client_avatar_url || '',
        rating,
        title: title || '',
        comment,
        is_approved: false,
        is_featured: false
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: review,
      message: 'Gracias por tu reseña. Será visible una vez aprobada por un administrador.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener todos los reviews (admin) con filtros
 */
const getAllReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, is_approved, rating, product_id, search } = req.query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('product_reviews')
      .select('*, products(id, name, slug)', { count: 'exact' });

    if (is_approved !== undefined && is_approved !== '') {
      query = query.eq('is_approved', is_approved === 'true');
    }
    if (rating) query = query.eq('rating', parseInt(rating));
    if (product_id) query = query.eq('product_id', product_id);
    if (search) {
      query = query.or(`client_name.ilike.%${search}%,comment.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: reviews, count, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: reviews,
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
 * Aprobar/Rechazar un review (admin)
 */
const moderateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_approved, is_featured } = req.body;

    const updateData = {};
    if (is_approved !== undefined) {
      updateData.is_approved = is_approved;
      updateData.approved_by = req.user?.id || null;
      updateData.approved_at = is_approved ? new Date().toISOString() : null;
    }
    if (is_featured !== undefined) {
      updateData.is_featured = is_featured;
    }
    updateData.updated_at = new Date().toISOString();

    const { data: review, error } = await supabase
      .from('product_reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar un review (admin)
 */
const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Reseña eliminada' });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * HERO CAROUSEL SLIDES
 * ==========================================
 */

const getHeroSlides = async (req, res, next) => {
  try {
    const { data: slides, error } = await supabase
      .from('hero_slides')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: slides || [] });
  } catch (error) {
    next(error);
  }
};

const getAllHeroSlides = async (req, res, next) => {
  try {
    const { data: slides, error } = await supabase
      .from('hero_slides')
      .select('*')
      .order('sort_order')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: slides || [] });
  } catch (error) {
    next(error);
  }
};

const createHeroSlide = async (req, res, next) => {
  try {
    const { data: slide, error } = await supabase
      .from('hero_slides')
      .insert(req.body)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: slide });
  } catch (error) {
    next(error);
  }
};

const updateHeroSlide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: slide, error } = await supabase
      .from('hero_slides')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data: slide });
  } catch (error) {
    next(error);
  }
};

const deleteHeroSlide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('hero_slides').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Slide eliminado' });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * FLOATING BANNERS
 * ==========================================
 */

const getFloatingBanners = async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    let query = supabase
      .from('floating_banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    query = query.or(`start_date.is.null,start_date.lte.${now}`);
    query = query.or(`end_date.is.null,end_date.gte.${now}`);

    const { data: banners, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: banners || [] });
  } catch (error) {
    next(error);
  }
};

const getAllFloatingBanners = async (req, res, next) => {
  try {
    const { data: banners, error } = await supabase
      .from('floating_banners')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    res.json({ success: true, data: banners || [] });
  } catch (error) {
    next(error);
  }
};

const createFloatingBanner = async (req, res, next) => {
  try {
    const { data: banner, error } = await supabase
      .from('floating_banners')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

const updateFloatingBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: banner, error } = await supabase
      .from('floating_banners')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

const deleteFloatingBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('floating_banners').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Banner flotante eliminado' });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * TAX RATES
 * ==========================================
 */

const getTaxRates = async (req, res, next) => {
  try {
    const { country_code } = req.query;
    let query = supabase.from('tax_rates').select('*').eq('is_active', true);
    if (country_code) query = query.eq('country_code', country_code);
    query = query.order('name');

    const { data: rates, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: rates || [] });
  } catch (error) {
    next(error);
  }
};

const getAllTaxRates = async (req, res, next) => {
  try {
    const { data: rates, error } = await supabase.from('tax_rates').select('*').order('name');
    if (error) throw error;
    res.json({ success: true, data: rates || [] });
  } catch (error) {
    next(error);
  }
};

const createTaxRate = async (req, res, next) => {
  try {
    const { data: rate, error } = await supabase.from('tax_rates').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json({ success: true, data: rate });
  } catch (error) {
    next(error);
  }
};

const updateTaxRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: rate, error } = await supabase
      .from('tax_rates')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data: rate });
  } catch (error) {
    next(error);
  }
};

const deleteTaxRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('tax_rates').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Tasa de impuesto eliminada' });
  } catch (error) {
    next(error);
  }
};

/**
 * ==========================================
 * WHATSAPP CONFIG
 * ==========================================
 */

const getWhatsappConfig = async (req, res, next) => {
  try {
    const { data: config, error } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({
      success: true,
      data: config || {
        phone_number: '',
        api_token: '',
        api_endpoint: 'https://api.whatsapp.com/send',
        welcome_message: '¡Hola! ¿En qué podemos ayudarte?',
        auto_reply_enabled: true,
        business_hours: {},
        is_active: true
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateWhatsappConfig = async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('whatsapp_config')
      .select('id')
      .eq('is_active', true)
      .single();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('whatsapp_config')
        .insert({ ...req.body, is_active: true })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBanners, createBanner, updateBanner, deleteBanner,
  getOffers, createOffer, updateOffer, deleteOffer,
  getHomeData, updateHomeSettings, getHomeSettings,
  getHeroSettings, updateHeroSettings,
  getProductReviews, getFeaturedReviews, createProductReview,
  getAllReviews, moderateReview, deleteReview,
  // Hero Carousel
  getHeroSlides, getAllHeroSlides, createHeroSlide, updateHeroSlide, deleteHeroSlide,
  // Floating Banners
  getFloatingBanners, getAllFloatingBanners, createFloatingBanner, updateFloatingBanner, deleteFloatingBanner,
  // Tax Rates
  getTaxRates, getAllTaxRates, createTaxRate, updateTaxRate, deleteTaxRate,
  // WhatsApp Config
  getWhatsappConfig, updateWhatsappConfig
};
