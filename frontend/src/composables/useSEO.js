/**
 * useSEO composable
 * Maneja meta tags, title y Open Graph para SEO en componentes Vue
 */
import { onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';

const SITE_NAME = 'Animal Store';
const DEFAULT_DESCRIPTION = 'Tienda especializada en productos para mascotas. Encuentra alimento, accesorios, juguetes y más para tu mascota.';
const DEFAULT_IMAGE = '/og-image.png';
const BASE_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

/**
 * Establece meta tags en el head del documento
 */
function setMetaTag(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    if (name.startsWith('og:') || name.startsWith('twitter:')) {
      el.setAttribute('property', name);
    } else {
      el.setAttribute('name', name);
    }
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Remueve un meta tag
 */
function removeMetaTag(name) {
  const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  if (el) el.remove();
}

/**
 * Composable para SEO
 * @param {Object} options - Opciones de SEO
 * @param {string} options.title - Título de la página
 * @param {string} options.description - Descripción
 * @param {string} options.image - URL de imagen OG
 * @param {string} options.url - URL canónica (por defecto usa la ruta actual)
 * @param {string} options.type - Tipo OG (website, article, product)
 * @param {Object} options.twitter - Configuración Twitter Card
 */
export function useSEO(options = {}) {
  const route = useRoute();
  let headObserver = null;

  const applyMeta = (opts) => {
    const title = opts.title
      ? `${opts.title} | ${SITE_NAME}`
      : SITE_NAME;
    const description = opts.description || DEFAULT_DESCRIPTION;
    const image = opts.image || DEFAULT_IMAGE;
    const url = opts.url || `${BASE_URL}${route.path}`;
    const type = opts.type || 'website';

    // Title
    document.title = title;

    // Meta tags estándar
    setMetaTag('description', description);

    // Open Graph
    setMetaTag('og:title', title);
    setMetaTag('og:description', description);
    setMetaTag('og:image', image);
    setMetaTag('og:url', url);
    setMetaTag('og:type', type);
    setMetaTag('og:site_name', SITE_NAME);

    // Twitter Card
    setMetaTag('twitter:card', opts.twitter?.card || 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', image);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // JSON-LD Structured Data (opcional)
    if (opts.structuredData) {
      let ldEl = document.querySelector('#structured-data');
      if (!ldEl) {
        ldEl = document.createElement('script');
        ldEl.id = 'structured-data';
        ldEl.setAttribute('type', 'application/ld+json');
        document.head.appendChild(ldEl);
      }
      ldEl.textContent = JSON.stringify(opts.structuredData);
    }
  };

  const removeMeta = () => {
    ['description', 'og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name',
      'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'
    ].forEach(removeMetaTag);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.remove();
    const ldEl = document.querySelector('#structured-data');
    if (ldEl) ldEl.remove();
  };

  onMounted(() => {
    applyMeta(options);

    // Observar cambios en el título de la ruta
    if (options.watchRoute !== false) {
      headObserver = watch(() => route.meta?.title, (newTitle) => {
        if (newTitle) {
          applyMeta({ ...options, title: newTitle });
        }
      });
    }
  });

  onUnmounted(() => {
    if (headObserver) headObserver();
  });

  return {
    applyMeta,
    removeMeta,
    setMetaTag,
    removeMetaTag
  };
}

/**
 * Genera structured data para un producto (JSON-LD)
 */
export function productStructuredData(product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images?.[0] || product.image,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Animal Store'
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'COP',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${BASE_URL}/products/${product.id}`
    }
  };
}

/**
 * Genera structured data para una organización
 */
export function organizationStructuredData(name = SITE_NAME) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name,
    description: DEFAULT_DESCRIPTION,
    url: BASE_URL,
    image: DEFAULT_IMAGE,
    sameAs: []
  };
}
