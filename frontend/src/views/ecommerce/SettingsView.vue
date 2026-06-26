<template>
  <div class="space-y-8">
    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible @close="successMsg = ''" class="mb-4" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />

    <Loading v-if="loading" />

    <template v-else>
      <!-- Información General -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Información de la Tienda</h3>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="form-label">Nombre de la Tienda</label>
              <input v-model="form.store_name" class="form-input" placeholder="Animal Store" />
            </div>
            <div>
              <label class="form-label">País</label>
              <select v-model="form.country_code" @change="onCountryChange" class="form-input">
                <option value="">Seleccionar país...</option>
                <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.name }} ({{ c.currency }})</option>
              </select>
            </div>
          </div>
          <div>
            <label class="form-label">Descripción</label>
            <textarea v-model="form.description" class="form-input" rows="3" placeholder="Descripción de la tienda"></textarea>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="form-label">Email de Contacto</label>
              <input v-model="form.contact_email" type="email" class="form-input" placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label class="form-label">Teléfono</label>
              <input v-model="form.phone" class="form-input" placeholder="+1 234 567 8900" />
            </div>
            <div>
              <label class="form-label">WhatsApp</label>
              <input v-model="form.whatsapp_number" class="form-input" placeholder="+1234567890 (solo números)" />
            </div>
          </div>
          <div>
            <label class="form-label">Dirección</label>
            <input v-model="form.address" class="form-input" placeholder="Dirección física de la tienda" />
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" v-model="form.is_active" id="store_active" class="w-4 h-4 rounded border-white/20" />
            <label for="store_active" class="text-sm text-gray-700 dark:text-gray-300">Tienda Activa</label>
          </div>
        </form>
      </div>

      <!-- Moneda e Impuestos -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Moneda e Impuestos</h3>
        <form @submit.prevent="handleSave" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="form-label">Moneda</label>
              <input v-model="form.currency_code" class="form-input" placeholder="USD" maxlength="5" />
            </div>
            <div>
              <label class="form-label">Símbolo</label>
              <input v-model="form.currency_symbol" class="form-input" placeholder="$" maxlength="10" />
            </div>
            <div>
              <label class="form-label">Nombre de Moneda</label>
              <input v-model="form.currency_name" class="form-input" placeholder="US Dollar" />
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="form-label">Locale</label>
              <input v-model="form.locale" class="form-input" placeholder="en-US" />
              <p class="text-xs text-gray-500 mt-1">Formato: en-US, es-DO, es-ES, etc.</p>
            </div>
            <div>
              <label class="form-label">Impuesto por defecto</label>
              <select v-model="form.default_tax_rate_id" class="form-input">
                <option :value="null">Sin impuesto por defecto</option>
                <option v-for="tax in taxRates" :key="tax.id" :value="tax.id">
                  {{ tax.name }} ({{ tax.rate }}%)
                </option>
              </select>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" v-model="form.tax_included" id="tax_included" class="w-4 h-4 rounded border-white/20" />
            <label for="tax_included" class="text-sm text-gray-700 dark:text-gray-300">Impuestos incluidos en el precio</label>
          </div>
        </form>
      </div>

      <!-- Tasas de Impuesto -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Tasas de Impuesto</h3>
          <button @click="showTaxForm = true" class="btn btn-primary text-sm">
            <span class="material-symbols-outlined text-sm mr-1" data-icon="add">add</span>
            Añadir Impuesto
          </button>
        </div>

        <!-- Formulario nuevo impuesto -->
        <div v-if="showTaxForm" class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-white/10">
          <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
            <input v-model="taxForm.name" class="form-input" placeholder="Nombre (ej: ITEBIS)" />
            <input v-model="taxForm.code" class="form-input" placeholder="Código (ej: ITEBIS)" />
            <input v-model.number="taxForm.rate" type="number" step="0.01" class="form-input" placeholder="Tasa %" />
            <input v-model="taxForm.country_code" class="form-input" placeholder="País (ej: DO)" maxlength="5" />
            <div class="flex gap-2">
              <button @click="saveTaxRate" class="btn btn-primary text-sm flex-1">Guardar</button>
              <button @click="showTaxForm = false; resetTaxForm()" class="btn btn-ghost text-sm">Cancelar</button>
            </div>
          </div>
        </div>

        <div v-if="taxRates.length === 0" class="text-sm text-gray-500 text-center py-4">No hay tasas de impuesto configuradas.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left border-b border-white/10">
                <th class="pb-3 font-medium text-gray-500">Nombre</th>
                <th class="pb-3 font-medium text-gray-500">Código</th>
                <th class="pb-3 font-medium text-gray-500">Tasa</th>
                <th class="pb-3 font-medium text-gray-500">País</th>
                <th class="pb-3 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tax in taxRates" :key="tax.id" class="border-b border-white/5 hover:bg-white/5">
                <td class="py-3">{{ tax.name }}</td>
                <td class="py-3"><code class="text-primary">{{ tax.code }}</code></td>
                <td class="py-3 font-medium">{{ tax.rate }}%</td>
                <td class="py-3">{{ tax.country_code || '—' }}</td>
                <td class="py-3">
                  <button @click="deleteTaxRate(tax.id)" class="text-red-400 hover:text-red-300 text-xs">Eliminar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- WhatsApp Config -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">Configuración de WhatsApp</h3>
        <form @submit.prevent="handleSaveWhatsApp" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="form-label">Número de WhatsApp</label>
              <input v-model="whatsapp.phone_number" class="form-input" placeholder="+1234567890" />
            </div>
            <div>
              <label class="form-label">Mensaje de Bienvenida</label>
              <input v-model="whatsapp.welcome_message" class="form-input" placeholder="¡Hola! ¿En qué podemos ayudarte?" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" v-model="whatsapp.auto_reply_enabled" id="auto_reply" class="w-4 h-4 rounded border-white/20" />
            <label for="auto_reply" class="text-sm text-gray-700 dark:text-gray-300">Auto-respuesta habilitada</label>
          </div>
          <div class="flex justify-end pt-4">
            <button @click="handleSaveWhatsApp" type="submit" :disabled="savingWhatsApp" class="btn btn-primary">
              <span v-if="savingWhatsApp" class="material-symbols-outlined animate-spin inline-block mr-2" data-icon="refresh">refresh</span>
              Guardar Configuración WhatsApp
            </button>
          </div>
        </form>
      </div>

      <!-- Botón Guardar General -->
      <div class="flex justify-end pt-4">
        <button @click="handleSave" :disabled="saving" class="btn btn-primary px-8">
          <span v-if="saving" class="material-symbols-outlined animate-spin inline-block mr-2" data-icon="refresh">refresh</span>
          Guardar Todos los Cambios
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ecommerceAPI } from '../../api';
import Alert from '../../components/shared/Alert.vue';
import Loading from '../../components/shared/Loading.vue';

const loading = ref(true);
const saving = ref(false);
const savingWhatsApp = ref(false);
const successMsg = ref('');
const errorMsg = ref('');
const showTaxForm = ref(false);

const form = ref({
  store_name: 'Animal Store',
  description: '',
  contact_email: '',
  phone: '',
  whatsapp_number: '',
  address: '',
  currency_code: 'USD',
  currency_symbol: '$',
  currency_name: 'US Dollar',
  country_code: 'US',
  locale: 'en-US',
  default_tax_rate_id: null,
  tax_included: false,
  is_active: true
});

const taxForm = ref({ name: '', code: '', rate: 0, country_code: '' });
const taxRates = ref([]);

const whatsapp = ref({
  phone_number: '',
  welcome_message: '¡Hola! ¿En qué podemos ayudarte?',
  auto_reply_enabled: true
});

const countries = [
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'DO', name: 'República Dominicana', currency: 'DOP', symbol: 'RD$', locale: 'es-DO' },
  { code: 'ES', name: 'España', currency: 'EUR', symbol: '€', locale: 'es-ES' },
  { code: 'MX', name: 'México', currency: 'MXN', symbol: '$', locale: 'es-MX' },
  { code: 'CO', name: 'Colombia', currency: 'COP', symbol: '$', locale: 'es-CO' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', symbol: '$', locale: 'es-AR' },
  { code: 'CL', name: 'Chile', currency: 'CLP', symbol: '$', locale: 'es-CL' },
  { code: 'PE', name: 'Perú', currency: 'PEN', symbol: 'S/', locale: 'es-PE' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'CA$', locale: 'en-CA' }
];

onMounted(async () => {
  try {
    const [settingsRes, taxRes, whatsappRes] = await Promise.all([
      ecommerceAPI.getSettings().catch(() => ({ data: null })),
      ecommerceAPI.getAllTaxRates().catch(() => ({ data: [] })),
      ecommerceAPI.getWhatsappConfig().catch(() => ({ data: null }))
    ]);

    if (settingsRes.data && typeof settingsRes.data === 'object') {
      form.value = { ...form.value, ...settingsRes.data };
    }
    if (Array.isArray(taxRes.data)) taxRates.value = taxRes.data;
    if (whatsappRes.data && typeof whatsappRes.data === 'object') {
      whatsapp.value = { ...whatsapp.value, ...whatsappRes.data };
    }
  } catch (e) {
    console.warn('Error loading settings:', e);
  } finally {
    loading.value = false;
  }
});

function onCountryChange() {
  const country = countries.find(c => c.code === form.value.country_code);
  if (country) {
    form.value.currency_code = country.currency;
    form.value.currency_symbol = country.symbol;
    form.value.locale = country.locale;
    form.value.currency_name = country.name + ' ' + country.currency;
  }
}

function resetTaxForm() {
  taxForm.value = { name: '', code: '', rate: 0, country_code: '' };
}

async function saveTaxRate() {
  if (!taxForm.value.name || !taxForm.value.code || !taxForm.value.rate) return;
  try {
    await ecommerceAPI.createTaxRate(taxForm.value);
    const res = await ecommerceAPI.getAllTaxRates();
    if (Array.isArray(res.data)) taxRates.value = res.data;
    showTaxForm.value = false;
    resetTaxForm();
    successMsg.value = 'Impuesto agregado exitosamente';
  } catch (e) {
    errorMsg.value = 'Error al crear impuesto';
  }
}

async function deleteTaxRate(id) {
  try {
    await ecommerceAPI.deleteTaxRate(id);
    taxRates.value = taxRates.value.filter(t => t.id !== id);
    successMsg.value = 'Impuesto eliminado';
  } catch (e) {
    errorMsg.value = 'Error al eliminar impuesto';
  }
}

async function handleSave() {
  saving.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    const payload = {
      store_name: form.value.store_name,
      description: form.value.description,
      contact_email: form.value.contact_email,
      phone: form.value.phone,
      whatsapp_number: form.value.whatsapp_number,
      address: form.value.address,
      currency_code: form.value.currency_code,
      currency_symbol: form.value.currency_symbol,
      currency_name: form.value.currency_name,
      country_code: form.value.country_code,
      locale: form.value.locale,
      default_tax_rate_id: form.value.default_tax_rate_id,
      tax_included: form.value.tax_included
    };
    await ecommerceAPI.updateSettings(payload);
    successMsg.value = 'Configuración guardada exitosamente';
  } catch (e) {
    errorMsg.value = 'Error al guardar configuración';
  } finally {
    saving.value = false;
    setTimeout(() => { successMsg.value = ''; errorMsg.value = ''; }, 4000);
  }
}

async function handleSaveWhatsApp() {
  savingWhatsApp.value = true;
  try {
    await ecommerceAPI.updateWhatsappConfig(whatsapp.value);
    successMsg.value = 'Configuración de WhatsApp guardada';
  } catch (e) {
    errorMsg.value = 'Error al guardar WhatsApp';
  } finally {
    savingWhatsApp.value = false;
  }
}
</script>
