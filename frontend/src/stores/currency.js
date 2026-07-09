import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * Currency Store — maneja la moneda activa, el tipo de cambio y la configuración regional.
 * Moneda por defecto: USD (dólar americano).
 * Los montos se convierten usando el tipo de cambio (rate) respecto a USD.
 */
export const useCurrencyStore = defineStore('currency', () => {
  // ─── Monedas disponibles ──────────────────────────────────────────────
  const currencies = {
    USD: { code: 'USD', symbol: '$', locale: 'en-US', name: 'US Dollar', rate: 1 },
    COP: { code: 'COP', symbol: '$', locale: 'es-CO', name: 'Peso Colombiano', rate: 4200 },
    EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', name: 'Euro', rate: 0.92 },
    MXN: { code: 'MXN', symbol: '$', locale: 'es-MX', name: 'Peso Mexicano', rate: 18.50 },
    ARS: { code: 'ARS', symbol: '$', locale: 'es-AR', name: 'Peso Argentino', rate: 350 },
    CLP: { code: 'CLP', symbol: '$', locale: 'es-CL', name: 'Peso Chileno', rate: 950 },
    PEN: { code: 'PEN', symbol: 'S/', locale: 'es-PE', name: 'Sol Peruano', rate: 3.75 },
    DOP: { code: 'DOP', symbol: 'RD$', locale: 'es-DO', name: 'Peso Dominicano', rate: 58 },
    GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', name: 'British Pound', rate: 0.79 },
    CAD: { code: 'CAD', symbol: 'C$', locale: 'en-CA', name: 'Canadian Dollar', rate: 1.36 },
  };

  // ─── Estado ───────────────────────────────────────────────────────────
  const saved = localStorage.getItem('currencyCode');
  const code = ref(saved && currencies[saved] ? saved : 'USD');

  // ─── Getters ──────────────────────────────────────────────────────────
  const current = computed(() => currencies[code.value] || currencies.USD);
  const symbol = computed(() => current.value.symbol);
  const locale = computed(() => current.value.locale);
  const rate = computed(() => current.value.rate);
  const currencyList = computed(() => Object.values(currencies));

  // ─── Acciones ─────────────────────────────────────────────────────────
  function setCurrency(newCode) {
    if (currencies[newCode]) {
      code.value = newCode;
      localStorage.setItem('currencyCode', newCode);
    }
  }

  return {
    code, current, symbol, locale, rate, currencyList,
    setCurrency,
  };
});
