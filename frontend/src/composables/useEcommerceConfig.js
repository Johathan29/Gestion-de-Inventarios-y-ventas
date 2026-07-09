import { ref, computed } from 'vue';
import { ecommerceAPI } from '../api';
import { useCurrencyStore } from '../stores/currency';

/**
 * Composable que carga la configuración de ecommerce (moneda e impuestos)
 * y la mantiene disponible de forma reactiva para POS, SaleForm, CartView, etc.
 *
 * - Obtiene la moneda activa (currency_code) desde ecommerce_settings
 *   y la aplica al CurrencyStore automáticamente.
 * - Obtiene el porcentaje de impuesto desde la tasa por defecto (default_tax_rate_id)
 *   en la tabla tax_rates.
 * - Respeta el flag tax_included para calcular IVA incluido/excluido.
 *
 * Uso:
 *   const { taxRate, taxIncluded, loadConfig, loading } = useEcommerceConfig();
 *   await loadConfig();
 *   const iva = subtotal * (taxRate.value / 100);
 */
let cachedSettings = null;
let cachedTaxRate = null;

export function useEcommerceConfig() {
  const currencyStore = useCurrencyStore();
  const taxRate = ref(cachedTaxRate ?? 19);
  const taxIncluded = ref(false);
  const settings = ref(cachedSettings);
  const loaded = ref(!!cachedSettings);
  const loading = ref(false);

  async function loadConfig() {
    if (loaded.value) return;
    loading.value = true;
    try {
      const res = await ecommerceAPI.getSettings();
      const data = res.data || res;
      settings.value = data;
      cachedSettings = data;

      // ── Sincronizar moneda ──────────────────────────────────────
      if (data.currency_code) {
        currencyStore.setCurrency(data.currency_code);
      }

      // ── Flag de impuesto incluido ───────────────────────────────
      taxIncluded.value = data.tax_included ?? false;

      // ── Cargar porcentaje de la tasa por defecto ────────────────
      if (data.default_tax_rate_id) {
        try {
          const taxRes = await ecommerceAPI.getTaxRates();
          const rates = taxRes.data || taxRes;
          if (Array.isArray(rates)) {
            const defaultRate = rates.find(r => r.id === data.default_tax_rate_id);
            if (defaultRate && defaultRate.rate != null) {
              const rate = parseFloat(defaultRate.rate);
              taxRate.value = rate;
              cachedTaxRate = rate;
            }
          }
        } catch (e) {
          console.warn('[useEcommerceConfig] No se pudo cargar la tasa de impuesto, se usa 19% por defecto');
        }
      }

      loaded.value = true;
    } catch (e) {
      console.warn('[useEcommerceConfig] No se pudo cargar la configuración de ecommerce, se usan valores por defecto');
    } finally {
      loading.value = false;
    }
  }

  return {
    /** Porcentaje de impuesto activo (ej: 19, 18, 21) */
    taxRate: computed(() => taxRate.value),
    /** Indica si los precios ya incluyen el impuesto */
    taxIncluded: computed(() => taxIncluded.value),
    /** Objeto completo de configuración de ecommerce */
    settings: computed(() => settings.value),
    /** true si ya se cargó la configuración al menos una vez */
    loaded: computed(() => loaded.value),
    /** true mientras se está cargando */
    loading: computed(() => loading.value),
    /** Carga (o recarga) la configuración */
    loadConfig
  };
}
