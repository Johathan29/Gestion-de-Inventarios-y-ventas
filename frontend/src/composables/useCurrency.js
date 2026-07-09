import { computed } from 'vue';
import { useCurrencyStore } from '../stores/currency';
import { formatCurrency as baseFormatCurrency, formatNumber as baseFormatNumber } from '../utils';

/**
 * Composable reactivo para formato de moneda y números.
 * Se conecta al CurrencyStore para usar la moneda activa (tipo de cambio, locale, símbolo).
 *
 * Uso:
 *   const { format, formatTable, formatNumber, currencySymbol, currencyCode } = useCurrency();
 *   format(1500000)              // → "$1.5M"  (compacto automático en resúmenes)
 *   formatTable(50)              // → "$50.00" (sin compactar, para tablas)
 *   formatNumber(2500000, true)  // → "2.5M"
 */
export function useCurrency() {
  const store = useCurrencyStore();

  /**
   * Formatea un monto en la moneda activa con COMPACTO automático para millones+.
   * Ideal para tarjetas de resumen, KPIs, totales grandes.
   */
  const format = (value, options = {}) => {
    const cur = store.current;
    return baseFormatCurrency(value, {
      compact: options.compact ?? true,
      currency: options.currency ?? cur.code,
      locale: options.locale ?? cur.locale,
    });
  };

  /**
   * Formatea un monto en la moneda activa SIN compactar.
   * Ideal para celdas de tablas, precios unitarios, facturas.
   */
  const formatTable = (value, options = {}) => {
    const cur = store.current;
    return baseFormatCurrency(value, {
      compact: false,
      currency: options.currency ?? cur.code,
      locale: options.locale ?? cur.locale,
    });
  };

  /**
   * Formatea un número (no monetario) con compacto opcional.
   * Ideal para conteos grandes: productos, clientes, etc.
   */
  const formatNum = (value, compact = true) => {
    const cur = store.current;
    return baseFormatNumber(value, {
      compact,
      locale: cur.locale,
    });
  };

  const currencySymbol = computed(() => store.current.symbol);
  const currencyCode = computed(() => store.current.code);
  const currencyLocale = computed(() => store.current.locale);
  const currencyRate = computed(() => store.current.rate);

  return {
    format,
    formatTable,
    formatNumber: formatNum,
    currencySymbol,
    currencyCode,
    currencyLocale,
    currencyRate,
    store,
  };
}
