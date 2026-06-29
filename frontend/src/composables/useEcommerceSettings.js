import { ref } from 'vue';
import { ecommerceAPI } from '../api';

const cachedSettings = ref(null);
const promise = ref(null);

export function useEcommerceSettings() {
  async function fetchSettings() {
    if (cachedSettings.value) return cachedSettings.value;
    if (promise.value) return promise.value;

    promise.value = (async () => {
      try {
        const res = await ecommerceAPI.getSettings();
        cachedSettings.value = res.data || {};
        return cachedSettings.value;
      } catch {
        cachedSettings.value = {
          store_name: 'Animal Store',
          description: '',
          logo_url: '',
          favicon_url: '',
          contact_email: '',
          phone: '',
          address: ''
        };
        return cachedSettings.value;
      }
    })();

    return promise.value;
  }

  return {
    settings: cachedSettings,
    fetchSettings
  };
}
