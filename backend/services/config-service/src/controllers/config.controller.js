const { createTenantClient } = require('@inventory/shared');

/**
 * Obtener configuración general
 */
const getConfig = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { key, section } = req.query;

    let query = supabase
      .from('system_config')
      .select('*')
      .order('section')
      .order('key');

    if (key) query = query.eq('key', key);
    if (section) query = query.eq('section', section);

    const { data: configs, error } = await query;
    if (error) throw error;

    // Si hay una clave específica, devolver valor único
    if (key && configs?.length === 1) {
      return res.json({
        success: true,
        data: { key: configs[0].key, value: configs[0].value, section: configs[0].section }
      });
    }

    // Agrupar por sección
    const grouped = {};
    configs?.forEach(config => {
      if (!grouped[config.section]) grouped[config.section] = {};
      grouped[config.section][config.key] = config.value;
    });

    res.json({ success: true, data: grouped });
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar configuración
 */
const updateConfig = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { key, value, section, description } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'key y value requeridos' }
      });
    }

    const configSection = section || 'general';

    // Upsert
    const { data: existing } = await supabase
      .from('system_config')
      .select('id')
      .eq('key', key)
      .eq('section', configSection)
      .single();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('system_config')
        .update({ value, description, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('system_config')
        .insert({ key, value, section: configSection, description })
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
 * Actualizar múltiples configuraciones
 */
const bulkUpdateConfig = async (req, res, next) => {
  try {
    const supabase = createTenantClient(req);
    const { configs } = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Array de configuraciones requerido' }
      });
    }

    const results = [];
    for (const config of configs) {
      const { key, value, section, description } = config;
      const configSection = section || 'general';

      const { data: existing } = await supabase
        .from('system_config')
        .select('id')
        .eq('key', key)
        .eq('section', configSection)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('system_config')
          .update({ value, description, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        if (!error) results.push(data);
      } else {
        const { data, error } = await supabase
          .from('system_config')
          .insert({ key, value, section: configSection, description })
          .select()
          .single();
        if (!error) results.push(data);
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtener secciones disponibles
 */
const getSections = async (req, res, next) => {
  try {
    const { data: sections, error } = await supabase
      .from('system_config')
      .select('section')
      .order('section');

    if (error) throw error;

    const uniqueSections = [...new Set(sections?.map(s => s.section).filter(Boolean))];

    res.json({ success: true, data: uniqueSections });
  } catch (error) {
    next(error);
  }
};

module.exports = { getConfig, updateConfig, bulkUpdateConfig, getSections };
