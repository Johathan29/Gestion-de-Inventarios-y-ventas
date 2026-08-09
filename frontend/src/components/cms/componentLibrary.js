// ============================================================================
// Biblioteca de componentes de secciones para el Page Builder del CMS.
// Fuente de verdad para el selector ("Añadir sección") y el editor de
// contenido (SectionEditor.vue). Cada componente define:
//   - key        : coincide con el `component_key` de cms_page_sections y con
//                  los renderers de RenderSection.vue
//   - name/icon  : para mostrar en el picker y en la lista de secciones
//   - category   : agrupación en el picker
//   - description: ayuda en el picker
//   - defaults   : settings y content iniciales al añadir la sección
//   - fields     : campos editables (target: 'title' | 'settings' | 'content')
//
// Tipos de campo soportados por SectionEditor.vue:
//   text | textarea | html | image | color | select | number | toggle | items
// ============================================================================

export const componentLibrary = [
  // ───────────────────────────────────────────────────────────────
  // LAYOUT
  // ───────────────────────────────────────────────────────────────
  {
    key: 'hero',
    name: 'Hero',
    icon: 'panorama',
    category: 'Layout',
    description: 'Banner principal con imagen de fondo, título, subtítulo y botones de acción.',
    defaults: {
      settings: { overlay: true, align: 'center', padding: '80px 0' },
      content: { text: '', cta_label: '', cta_url: '/', cta_secondary_label: '', cta_secondary_url: '#' }
    },
    fields: [
      { type: 'text', key: 'title', label: 'Título', target: 'title', placeholder: 'Título principal del hero' },
      { type: 'textarea', key: 'text', label: 'Subtítulo', target: 'content', placeholder: 'Texto descriptivo' },
      { type: 'text', key: 'eyebrow', label: 'Eyebrow', target: 'settings', placeholder: 'Texto pequeño superior (opcional)' },
      { type: 'text', key: 'cta_label', label: 'Texto botón principal', target: 'settings', placeholder: 'Ej. Comprar ahora' },
      { type: 'text', key: 'cta_url', label: 'URL botón principal', target: 'settings', placeholder: '/' },
      { type: 'text', key: 'cta_secondary_label', label: 'Texto botón secundario', target: 'settings' },
      { type: 'text', key: 'cta_secondary_url', label: 'URL botón secundario', target: 'settings' },
      { type: 'image', key: 'background_image', label: 'Imagen de fondo', target: 'settings' },
      { type: 'toggle', key: 'overlay', label: 'Overlay oscuro', target: 'settings' },
      { type: 'select', key: 'align', label: 'Alineación', target: 'settings', options: [
        { value: 'center', label: 'Centro' }, { value: 'left', label: 'Izquierda' }, { value: 'right', label: 'Derecha' }
      ]},
      { type: 'color', key: 'text_color', label: 'Color de texto', target: 'settings' },
      { type: 'text', key: 'padding', label: 'Padding', target: 'settings', placeholder: '80px 0' }
    ]
  },

  {
    key: 'cta',
    name: 'Call to Action',
    icon: 'call_to_action',
    category: 'Layout',
    description: 'Banner de llamada a la acción con título, texto y botón.',
    defaults: {
      settings: { cta_label: 'Contáctanos', cta_url: '/contacto' },
      content: { text: '' }
    },
    fields: [
      { type: 'text', key: 'title', label: 'Título', target: 'title' },
      { type: 'textarea', key: 'text', label: 'Texto', target: 'content' },
      { type: 'text', key: 'cta_label', label: 'Texto del botón', target: 'settings' },
      { type: 'text', key: 'cta_url', label: 'URL del botón', target: 'settings' },
      { type: 'image', key: 'background_image', label: 'Imagen de fondo', target: 'settings' },
      { type: 'toggle', key: 'overlay', label: 'Overlay oscuro', target: 'settings' },
      { type: 'color', key: 'background', label: 'Color de fondo', target: 'settings' },
      { type: 'color', key: 'text_color', label: 'Color de texto', target: 'settings' }
    ]
  },

  {
    key: 'divider',
    name: 'Divisor',
    icon: 'horizontal_rule',
    category: 'Layout',
    description: 'Línea separadora para dividir secciones de la página.',
    defaults: {
      settings: { style: 'solid', padding: '40px 0', max_width: '1200px' },
      content: {}
    },
    fields: [
      { type: 'select', key: 'style', label: 'Estilo', target: 'settings', options: [
        { value: 'solid', label: 'Sólida' }, { value: 'dashed', label: 'Discontinua' }, { value: 'dotted', label: 'Punteada' }
      ]},
      { type: 'text', key: 'max_width', label: 'Ancho máximo', target: 'settings', placeholder: '1200px o 80%' },
      { type: 'text', key: 'padding', label: 'Padding', target: 'settings', placeholder: '40px 0' }
    ]
  },

  // ───────────────────────────────────────────────────────────────
  // CONTENIDO
  // ───────────────────────────────────────────────────────────────
  {
    key: 'text',
    name: 'Texto / Párrafo',
    icon: 'notes',
    category: 'Contenido',
    description: 'Bloque de texto enriquecido (HTML) con alineación y colores.',
    defaults: {
      settings: { align: 'left' },
      content: { text: '', html: '' }
    },
    fields: [
      { type: 'text', key: 'title', label: 'Título', target: 'title' },
      { type: 'textarea', key: 'text', label: 'Texto', target: 'content' },
      { type: 'html', key: 'html', label: 'HTML personalizado', target: 'content', placeholder: '<p>Contenido con formato...</p>' },
      { type: 'select', key: 'align', label: 'Alineación', target: 'settings', options: [
        { value: 'left', label: 'Izquierda' }, { value: 'center', label: 'Centro' }, { value: 'right', label: 'Derecha' }
      ]},
      { type: 'color', key: 'text_color', label: 'Color de texto', target: 'settings' },
      { type: 'color', key: 'background', label: 'Color de fondo', target: 'settings' },
      { type: 'text', key: 'padding', label: 'Padding', target: 'settings', placeholder: '40px 0' }
    ]
  },

  {
    key: 'features',
    name: 'Características / Tarjetas',
    icon: 'view_module',
    category: 'Contenido',
    description: 'Cuadrícula de tarjetas con icono, título y descripción.',
    defaults: {
      settings: {},
      content: {
        text: '',
        items: [
          { icon: 'verified', title: 'Calidad', text: 'Describe tu primera característica.' },
          { icon: 'schedule', title: 'Rapidez', text: 'Describe tu segunda característica.' },
          { icon: 'support_agent', title: 'Soporte', text: 'Describe tu tercera característica.' }
        ]
      }
    },
    fields: [
      { type: 'text', key: 'title', label: 'Título', target: 'title' },
      { type: 'textarea', key: 'text', label: 'Subtítulo', target: 'content' },
      {
        type: 'items', key: 'items', label: 'Tarjetas', addLabel: '+ Añadir tarjeta', itemLabel: 'Tarjeta', target: 'content',
        itemFields: [
          { type: 'text', key: 'icon', label: 'Icono (material symbol)', placeholder: 'verified, star, favorite...' },
          { type: 'text', key: 'title', label: 'Título' },
          { type: 'textarea', key: 'text', label: 'Descripción' }
        ]
      }
    ]
  },

  {
    key: 'faq',
    name: 'Preguntas Frecuentes',
    icon: 'help',
    category: 'Contenido',
    description: 'Acordeón de preguntas y respuestas.',
    defaults: {
      settings: {},
      content: {
        items: [
          { title: '¿Pregunta frecuente?', text: 'Aquí va la respuesta.' },
          { title: '¿Otra pregunta?', text: 'Aquí va otra respuesta.' }
        ]
      }
    },
    fields: [
      { type: 'text', key: 'title', label: 'Título', target: 'title' },
      {
        type: 'items', key: 'items', label: 'Preguntas', addLabel: '+ Añadir pregunta', itemLabel: 'Pregunta', target: 'content',
        itemFields: [
          { type: 'text', key: 'title', label: 'Pregunta' },
          { type: 'textarea', key: 'text', label: 'Respuesta' }
        ]
      }
    ]
  },

  {
    key: 'stats',
    name: 'Estadísticas / Contadores',
    icon: 'monitoring',
    category: 'Contenido',
    description: 'Contadores destacados con valor y etiqueta.',
    defaults: {
      settings: {},
      content: {
        items: [
          { value: '10K+', label: 'Clientes felices' },
          { value: '500+', label: 'Productos' },
          { value: '99%', label: 'Satisfacción' },
          { value: '24/7', label: 'Soporte' }
        ]
      }
    },
    fields: [
      { type: 'text', key: 'title', label: 'Título', target: 'title' },
      {
        type: 'items', key: 'items', label: 'Estadísticas', addLabel: '+ Añadir estadística', itemLabel: 'Estadística', target: 'content',
        itemFields: [
          { type: 'text', key: 'value', label: 'Valor', placeholder: '10K+' },
          { type: 'text', key: 'label', label: 'Etiqueta' }
        ]
      }
    ]
  },

  {
    key: 'testimonials',
    name: 'Testimonios',
    icon: 'format_quote',
    category: 'Contenido',
    description: 'Testimonios de clientes con cita, nombre y foto.',
    defaults: {
      settings: {},
      content: {
        items: [
          { text: 'Excelente experiencia de compra, lo recomiendo totalmente.', title: 'María Gómez', role: 'Cliente', image: '' }
        ]
      }
    },
    fields: [
      { type: 'text', key: 'title', label: 'Título', target: 'title' },
      {
        type: 'items', key: 'items', label: 'Testimonios', addLabel: '+ Añadir testimonio', itemLabel: 'Testimonio', target: 'content',
        itemFields: [
          { type: 'textarea', key: 'text', label: 'Cita' },
          { type: 'text', key: 'title', label: 'Nombre' },
          { type: 'text', key: 'role', label: 'Rol / Empresa' },
          { type: 'image', key: 'image', label: 'Foto (URL)' }
        ]
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────
  // MEDIA
  // ───────────────────────────────────────────────────────────────
  {
    key: 'image',
    name: 'Imagen / Banner',
    icon: 'image',
    category: 'Media',
    description: 'Imagen de fondo con título y texto superpuestos.',
    defaults: {
      settings: { overlay: true, align: 'center' },
      content: { text: '' }
    },
    fields: [
      { type: 'text', key: 'title', label: 'Título', target: 'title' },
      { type: 'textarea', key: 'text', label: 'Texto', target: 'content' },
      { type: 'image', key: 'background_image', label: 'Imagen de fondo', target: 'settings' },
      { type: 'toggle', key: 'overlay', label: 'Overlay oscuro', target: 'settings' },
      { type: 'select', key: 'align', label: 'Alineación', target: 'settings', options: [
        { value: 'center', label: 'Centro' }, { value: 'left', label: 'Izquierda' }, { value: 'right', label: 'Derecha' }
      ]},
      { type: 'color', key: 'text_color', label: 'Color de texto', target: 'settings' }
    ]
  },

  {
    key: 'gallery',
    name: 'Galería de Imágenes',
    icon: 'photo_library',
    category: 'Media',
    description: 'Cuadrícula de imágenes con leyenda.',
    defaults: {
      settings: {},
      content: {
        text: '',
        items: [
          { title: 'Imagen 1', image: '' },
          { title: 'Imagen 2', image: '' },
          { title: 'Imagen 3', image: '' }
        ]
      }
    },
    fields: [
      { type: 'text', key: 'title', label: 'Título', target: 'title' },
      { type: 'textarea', key: 'text', label: 'Subtítulo', target: 'content' },
      {
        type: 'items', key: 'items', label: 'Imágenes', addLabel: '+ Añadir imagen', itemLabel: 'Imagen', target: 'content',
        itemFields: [
          { type: 'image', key: 'image', label: 'URL de la imagen' },
          { type: 'text', key: 'title', label: 'Leyenda' }
        ]
      }
    ]
  },

  {
    key: 'video',
    name: 'Video',
    icon: 'play_circle',
    category: 'Media',
    description: 'Video embebido de YouTube, Vimeo o URL directa.',
    defaults: {
      settings: {},
      content: { video_url: '', text: '' }
    },
    fields: [
      { type: 'text', key: 'title', label: 'Título', target: 'title' },
      { type: 'text', key: 'video_url', label: 'URL del video (YouTube/Vimeo)', target: 'content', placeholder: 'https://www.youtube.com/watch?v=...' },
      { type: 'textarea', key: 'text', label: 'Descripción', target: 'content' }
    ]
  },

  {
    key: 'logos',
    name: 'Logos / Marcas',
    icon: 'spa',
    category: 'Media',
    description: 'Nube de logos de marcas o clientes.',
    defaults: {
      settings: {},
      content: {
        items: [
          { title: 'Marca 1', image: '' },
          { title: 'Marca 2', image: '' },
          { title: 'Marca 3', image: '' }
        ]
      }
    },
    fields: [
      { type: 'text', key: 'title', label: 'Título', target: 'title' },
      {
        type: 'items', key: 'items', label: 'Logos', addLabel: '+ Añadir logo', itemLabel: 'Logo', target: 'content',
        itemFields: [
          { type: 'image', key: 'image', label: 'URL del logo' },
          { type: 'text', key: 'title', label: 'Nombre' }
        ]
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────
  // COMERCIO
  // ───────────────────────────────────────────────────────────────
  {
    key: 'products',
    name: 'Grid de Productos',
    icon: 'shopping_bag',
    category: 'Comercio',
    description: 'Cuadrícula de productos destacados del catálogo.',
    defaults: {
      settings: { limit: 3 },
      content: { text: '' }
    },
    fields: [
      { type: 'text', key: 'title', label: 'Título', target: 'title' },
      { type: 'textarea', key: 'text', label: 'Subtítulo', target: 'content' },
      { type: 'number', key: 'limit', label: 'Cantidad de productos', target: 'settings', min: 1, max: 12 }
    ]
  },

  // ───────────────────────────────────────────────────────────────
  // FORM
  // ───────────────────────────────────────────────────────────────
  {
    key: 'contact',
    name: 'Formulario de Contacto',
    icon: 'mail',
    category: 'Formularios',
    description: 'Formulario de contacto funcional para la página.',
    defaults: {
      settings: {},
      content: { text: '' }
    },
    fields: [
      { type: 'text', key: 'title', label: 'Título', target: 'title' },
      { type: 'textarea', key: 'text', label: 'Texto', target: 'content' }
    ]
  },

  // ───────────────────────────────────────────────────────────────
  // PERSONALIZADO
  // ───────────────────────────────────────────────────────────────
  {
    key: 'html',
    name: 'HTML Personalizado',
    icon: 'code',
    category: 'Personalizado',
    description: 'Bloque de código HTML/embeds (iframe, scripts, widgets).',
    defaults: {
      settings: {},
      content: { html: '' }
    },
    fields: [
      { type: 'html', key: 'html', label: 'Código HTML', target: 'content', placeholder: '<div>Contenido personalizado</div>' }
    ]
  }
];

// ── Helpers ────────────────────────────────────────────────────────────────

export function getComponentByKey(key) {
  return componentLibrary.find((c) => c.key === key) || null;
}

export function getComponentName(key) {
  return getComponentByKey(key)?.name || key || 'Sección';
}

export function getComponentIcon(key) {
  return getComponentByKey(key)?.icon || 'widgets';
}

export function groupByCategory(list = componentLibrary) {
  const groups = {};
  for (const c of list) {
    if (!groups[c.category]) groups[c.category] = [];
    groups[c.category].push(c);
  }
  return groups;
}

export default componentLibrary;
