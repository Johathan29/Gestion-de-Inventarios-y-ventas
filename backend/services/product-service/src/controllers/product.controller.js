const { createTenantClient } = require('@inventory/shared');
const path = require('path');

const STORAGE_BUCKET = 'product-images';

/**
 * Listar productos con paginación y filtros
 */
const getProducts = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { 
      page = 1, limit = 10, search, category_id, brand, 
      min_price, max_price, status, featured, available_for_sale, is_catalog_only, sort_by, sort_order 
    } = req.query;

    // `active` es un alias de status='active' (usado por el Punto de Venta)
    const effectiveStatus = status || (req.query.active === 'true' ? 'active' : undefined);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('products')
      .select('*, categories(name), product_variants(*), inventory(stock, warehouse)', { count: 'exact' });

    // Filtros
    if (category_id) query = query.eq('category_id', category_id);
    if (brand) query = query.eq('brand', brand);
    if (effectiveStatus) query = query.eq('status', effectiveStatus);
    if (featured) query = query.eq('featured', featured === 'true');
    if (min_price) query = query.gte('price', parseFloat(min_price));
    if (max_price) query = query.lte('price', parseFloat(max_price));
    if (available_for_sale !== undefined) query = query.eq('available_for_sale', available_for_sale === 'true');
    if (is_catalog_only !== undefined) query = query.eq('is_catalog_only', is_catalog_only === 'true');
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`
      );
    }

    // Ordenamiento
    const orderColumn = sort_by || 'created_at';
    const ascending = sort_order === 'asc';
    query = query.order(orderColumn, { ascending });

    // Paginación
    query = query.range(from, to);

    const { data: products, count, error } = await query;

    if (error) throw error;

    // Calcular stock total desde inventory
    const productsWithStock = products.map(p => ({
      ...p,
      stock: Array.isArray(p.inventory)
        ? p.inventory.reduce((sum, inv) => sum + (inv.stock || 0), 0)
        : 0
    }));

    res.json({
      success: true,
      data: productsWithStock,
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
 * Obtener producto por ID
 */
const getProductById = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select('*, categories(*), product_variants(*), inventory(stock, warehouse)')
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Producto no encontrado' }
      });
    }

    // Calcular stock total desde inventory
    product.stock = Array.isArray(product.inventory)
      ? product.inventory.reduce((sum, inv) => sum + (inv.stock || 0), 0)
      : 0;

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear producto
 */
const createProduct = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const {
      name, description, sku, barcode, price, cost_price, category_id,
      brand, unit, min_stock, max_stock, images, featured, status
    } = req.body;

    if (!name || !sku || !price) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Nombre, SKU y precio requeridos' }
      });
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name, description, sku: sku.toUpperCase(), barcode,
        price, cost_price, category_id, brand, unit: unit || 'unidad',
        min_stock: min_stock || 0, max_stock: max_stock || 999999,
        images: images || [], featured: featured || false,
        status: status || 'active',
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: { code: 'SKU_EXISTS', message: 'El SKU ya existe' }
        });
      }
      throw error;
    }

    // Notificar a todos los clientes activos sobre el nuevo producto
    try {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, user_id')
        .not('email', 'is', null);

      if (clients && clients.length > 0) {
        const notifications = clients.map(c => ({
          user_id: c.user_id,
          type: 'new_product',
          title: '¡Nuevo producto agregado!',
          message: `${product.name} ya está disponible en nuestra tienda.`,
          is_read: false,
          created_at: new Date().toISOString()
        })).filter(n => n.user_id);
        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }

      // También notificar por correo a admins
      try {
        const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL || 'http://localhost:3014';
        const { data: admins } = await supabase
          .from('users')
          .select('email, name')
          .eq('is_active', true)
          .in('role', ['admin', 'supervisor']);
        if (admins) {
          for (const admin of admins) {
            await fetch(`${EMAIL_SERVICE_URL}/api/email/new-products`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: admin.email,
                adminName: admin.name || 'Admin',
                productName: product.name,
                productId: product.id
              })
            }).catch(() => {});
          }
        }
      } catch (emailErr) {
        console.error('[ProductService] Error sending new product email:', emailErr.message);
      }
    } catch (notifErr) {
      console.error('[ProductService] Error creating notifications:', notifErr.message);
    }

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar producto
 */
const updateProduct = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData.created_by;

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar producto (soft delete)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { id } = req.params;

    const { error } = await supabase
      .from('products')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Producto desactivado exitosamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Productos destacados
 */
const getFeaturedProducts = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { data: products, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('featured', true)
      .eq('status', 'active')
      .limit(20);

    if (error) throw error;

    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

/**
 * Productos por categoría
 */
const getProductsByCategory = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { categoryId } = req.params;

    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', categoryId)
      .eq('status', 'active');

    if (error) throw error;

    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

/**
 * Productos con bajo stock
 */
const getLowStockProducts = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .lt('stock', supabase.rpc('get_column_ref', { table: 'products', column: 'min_stock' }))
      .order('stock', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

/**
 * Subir imagen de producto (multipart file upload → Supabase Storage)
 * 
 * ⚠️ El trigger `handle_product_image_insert` en la DB se encarga de
 *     agregar la URL pública al array `products.images` automáticamente.
 *     Este controller SOLO sube el archivo a Storage y lee el resultado.
 */
const uploadProductImage = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Archivo de imagen requerido' }
      });
    }

    const file = req.file;
    const ext = path.extname(file.originalname) || '.jpg';
    const fileName = `products/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    // Subir a Supabase Storage
    // El trigger AFTER INSERT en storage.objects se encargará de:
    //   1. Extraer el product ID del path
    //   2. Construir la URL pública
    //   3. Agregarla al array products.images
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      // Si el bucket no existe, intentar crearlo
      if (uploadError.message?.includes('bucket') || uploadError.statusCode === 404) {
        const { error: bucketError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
          public: true,
          fileSizeLimit: 5242880 // 5MB
        });
        if (bucketError) throw bucketError;

        // Reintentar la subida
        const { data: retryData, error: retryError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
          });
        if (retryError) throw retryError;
      } else {
        throw uploadError;
      }
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    // Leer el producto actualizado (el trigger ya debió agregar la URL)
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('images')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    let images = product.images || [];

    // Fallback: si el trigger no está activo y la URL no se agregó sola,
    // la agregamos manualmente aquí para no depender exclusivamente del trigger
    if (!images.includes(publicUrl)) {
      images = [...images, publicUrl];
      const { error: updateError } = await supabase
        .from('products')
        .update({ images, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
    }

    res.json({
      success: true,
      data: { images, publicUrl },
      message: 'Imagen subida exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Subir imagen por URL (descarga y almacena en Supabase Storage)
 * 
 * ⚠️ El trigger `handle_product_image_insert` se encarga de la DB.
 *     Si el trigger no está activo, este controller agrega la URL manualmente.
 */
const uploadProductImageByUrl = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { id } = req.params;
    const { image_url } = req.body;

    if (!image_url) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'URL de imagen requerida' }
      });
    }

    // Descargar la imagen desde la URL
    const response = await fetch(image_url);
    if (!response.ok) throw new Error('No se pudo descargar la imagen desde la URL');

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.split('/')[1] || 'jpg';
    const fileName = `products/${id}/${Date.now()}-url-${Math.random().toString(36).slice(2)}.${ext}`;

    // Subir a Supabase Storage (trigger agregará la URL a la DB)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    // Leer el producto actualizado y verificar que la URL esté en images
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('images')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    let images = product.images || [];

    // Fallback: si el trigger no está activo, agregar la URL manualmente
    if (!images.includes(publicUrl)) {
      images = [...images, publicUrl];
      const { error: updateError } = await supabase
        .from('products')
        .update({ images, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
    }

    res.json({
      success: true,
      data: { images, publicUrl },
      message: 'Imagen subida exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar imagen de producto (de Storage)
 * 
 * ⚠️ El trigger `handle_product_image_delete` se encarga de remover
 *     la URL del array products.images automáticamente.
 *     Si el trigger no está activo, este controller la remueve manualmente.
 */
const deleteProductImage = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { id } = req.params;
    const { image_url } = req.body;

    if (!image_url) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'URL de imagen requerida' }
      });
    }

    // Eliminar de Storage (si es una URL de nuestro bucket)
    // El trigger AFTER DELETE en storage.objects se encargará de:
    //   1. Extraer el product ID del path
    //   2. Remover la URL del array products.images
    if (image_url.includes(STORAGE_BUCKET)) {
      const urlParts = image_url.split(`${STORAGE_BUCKET}/`);
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split('?')[0];
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([filePath]);
      }
    }

    // Leer el producto actualizado (el trigger ya debió remover la URL)
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('images')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    let images = (product.images || []).filter(img => img !== image_url);

    // Si después de filtrar sigue apareciendo la URL, es que el trigger
    // no se ejecutó; ya la filtramos manualmente arriba, así que solo
    // actualizamos si cambió algo
    if (JSON.stringify(images) !== JSON.stringify(product.images || [])) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ images, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
    }

    res.json({ success: true, data: { images } });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener variantes de producto
 */
const getProductVariants = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { id } = req.params;

    const { data: variants, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', id);

    if (error) throw error;

    res.json({ success: true, data: variants });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear variante de producto
 */
const createProductVariant = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { id } = req.params;
    const { name, sku, price, stock, attributes, images, compare_price, is_active, sort_order } = req.body;

    // Auto-generate SKU from product if not provided
    let variantSku = sku;
    if (!variantSku || !variantSku.trim()) {
      const { data: product } = await supabase
        .from('products')
        .select('sku')
        .eq('id', id)
        .single();
      const baseSku = product?.sku || 'VAR';
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      variantSku = `${baseSku}-${randomSuffix}`;
    }

    const insertData = {
      product_id: id,
      name,
      sku: variantSku.trim().toUpperCase(),
      price: price || null,
      stock: stock || 0,
      attributes: attributes || {},
      images: images || [],
      compare_price: compare_price || null,
      is_active: is_active !== undefined ? is_active : true,
      sort_order: sort_order || 0
    };

    const { data: variant, error } = await supabase
      .from('product_variants')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data: variant });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar variante de producto
 */
const updateProductVariant = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { id, variantId } = req.params;
    const { name, sku, price, stock, attributes, images, is_active, compare_price, sort_order } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (sku !== undefined && sku.trim()) updateData.sku = sku.trim().toUpperCase();
    if (price !== undefined) updateData.price = price;
    if (stock !== undefined) updateData.stock = stock;
    if (attributes !== undefined) updateData.attributes = attributes;
    if (images !== undefined) updateData.images = images;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (compare_price !== undefined) updateData.compare_price = compare_price;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    updateData.updated_at = new Date().toISOString();

    const { data: variant, error } = await supabase
      .from('product_variants')
      .update(updateData)
      .eq('id', variantId)
      .eq('product_id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: variant });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar variante de producto
 */
const deleteProductVariant = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { id, variantId } = req.params;

    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('id', variantId)
      .eq('product_id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Variante eliminada correctamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts, getProductById, createProduct, updateProduct, deleteProduct,
  getFeaturedProducts, getProductsByCategory, getLowStockProducts,
  uploadProductImage, uploadProductImageByUrl, deleteProductImage,
  getProductVariants, createProductVariant, updateProductVariant, deleteProductVariant
};
