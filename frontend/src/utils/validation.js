// Reglas de validación reutilizables
export const validationRules = {
  required: (v) => !!v || 'Este campo es requerido',
  email: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email inválido',
  phone: (v) => !v || /^[+]?[\d\s()-]{7,20}$/.test(v) || 'Teléfono inválido',
  password: (v) => !v || v.length >= 8 || 'Mínimo 8 caracteres',
  number: (v) => !v || !isNaN(v) || 'Debe ser un número',
  positive: (v) => !v || parseFloat(v) > 0 || 'Debe ser mayor a 0',
  minLength: (min) => (v) => !v || v.length >= min || `Mínimo ${min} caracteres`,
  maxLength: (max) => (v) => !v || v.length <= max || `Máximo ${max} caracteres`,
  url: (v) => !v || /^https?:\/\/.+/.test(v) || 'URL inválida',
  min: (min) => (v) => !v || parseFloat(v) >= min || `Mínimo ${min}`,
  max: (max) => (v) => !v || parseFloat(v) <= max || `Máximo ${max}`
};

// Formatear valores para formularios
export const formatters = {
  currency: {
    parse: (v) => v?.toString().replace(/[^0-9]/g, '') || '',
    format: (v) => {
      if (!v) return '';
      const num = v.toString().replace(/[^0-9]/g, '');
      return new Intl.NumberFormat('es-CO').format(num);
    }
  }
};
