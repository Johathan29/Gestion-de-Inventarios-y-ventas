const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Listar categorías (con estructura jerárquica)
 */
const getCategories = async (req, res, next) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    // Construir árbol jerárquico
    const buildTree = (parentId = null) => {
      return categories
        .filter(c => c.parent_id === parentId)
        .map(c => ({
          ...c,
          children: buildTree(c.id)
        }));
    };

    const tree = buildTree(null);

    res.json({ success: true, data: tree });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener categoría por ID
 */
const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !category) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Categoría no encontrada' }
      });
    }

    // Obtener subcategorías
    const { data: children } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', id);

    res.json({
      success: true,
      data: { ...category, children: children || [] }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crear categoría
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, description, parent_id, image_url } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Nombre requerido' }
      });
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert({ name, description, parent_id, image_url })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: { code: 'NAME_EXISTS', message: 'Ya existe una categoría con ese nombre' }
        });
      }
      throw error;
    }

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar categoría
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, parent_id, image_url, status } = req.body;

    const { data: category, error } = await supabase
      .from('categories')
      .update({ name, description, parent_id, image_url, status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar categoría
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verificar si tiene subcategorías
    const { data: children } = await supabase
      .from('categories')
      .select('id')
      .eq('parent_id', id);

    if (children && children.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'HAS_CHILDREN', message: 'No se puede eliminar: tiene subcategorías' }
      });
    }

    const { error } = await supabase
      .from('categories')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Categoría desactivada exitosamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories, getCategoryById, createCategory, updateCategory, deleteCategory
};
