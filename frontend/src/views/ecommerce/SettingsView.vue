<template>
  <div class="ecommerce-settings-page">

    <!-- ==========================================
         HEADER
    =========================================== -->
    <div
      class="mesh-gradient-header"
      style="
        background:
          radial-gradient(
            circle at 100% 100%,
            #f0c04d 0%,
            #9154dc 50%,
            #7738c1 100%
          );
      "
    >
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon">
          store
        </span>
      </div>

      <div class="header-glass">
        <div class="header-information">
          <PageHeader
            title="Configuración Ecommerce"
            description="Información de la tienda, logo, favicon y más"
            tag="h1"
          />
        </div>

        <div class="header-actions"></div>
      </div>
    </div>

    <!-- ==========================================
         CONTENT
    =========================================== -->
    <div class="settings-content">

      <!-- ALERTS -->
      <Alert
        v-if="successMsg"
        type="success"
        :message="successMsg"
        :show="!!successMsg"
        dismissible
        :duration="500"
        @close="successMsg = ''"
      />

      <Alert
        v-if="errorMsg"
        type="error"
        :message="errorMsg"
        :show="!!errorMsg"
        dismissible
        @close="errorMsg = ''"
      />

      <!-- LOADING -->
      <FormSkeleton v-if="loading" />

      <!-- ==========================================
           SETTINGS
      =========================================== -->
      <template v-else>

        <!-- ======================================
             INFORMACIÓN DE LA TIENDA
        ======================================= -->
        <section class="settings-card">

          <div class="settings-card-header">
            <div class="section-icon">
              <span class="material-symbols-outlined">
                store
              </span>
            </div>

            <div>
              <h3>Información de la Tienda</h3>
              <p>
                Configura la información principal de tu ecommerce.
              </p>
            </div>
          </div>

          <div class="settings-card-body">

            <!-- BASIC INFO -->
            <div class="form-grid form-grid-2">

              <div class="form-field">
                <label>Nombre de la Tienda</label>

                <input
                  v-model="form.store_name"
                  class="aurora-input"
                  placeholder="Animal Store"
                />
              </div>

              <div class="form-field">
                <label>País</label>

                <select
                  v-model="form.country_code"
                  @change="onCountryChange"
                  class="aurora-select"
                >
                  <option value="">
                    Seleccionar país...
                  </option>

                  <option
                    v-for="country in countries"
                    :key="country.code"
                    :value="country.code"
                  >
                    {{ country.name }} ({{ country.currency }})
                  </option>
                </select>
              </div>

            </div>

            <!-- DESCRIPTION -->
            <div class="form-field">
              <label>Descripción</label>

              <textarea
                v-model="form.description"
                class="aurora-textarea"
                rows="3"
                placeholder="Descripción de la tienda"
              ></textarea>
            </div>

            <!-- CONTACT -->
            <div class="form-grid form-grid-3">

              <div class="form-field">
                <label>Email de Contacto</label>

                <input
                  v-model="form.contact_email"
                  type="email"
                  class="aurora-input"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div class="form-field">
                <label>Teléfono</label>

                <input
                  v-model="form.phone"
                  class="aurora-input"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div class="form-field">
                <label>WhatsApp</label>

                <input
                  v-model="form.whatsapp_number"
                  class="aurora-input"
                  placeholder="+1234567890"
                />
              </div>

            </div>

            <!-- ADDRESS -->
            <div class="form-field">
              <label>Dirección</label>

              <input
                v-model="form.address"
                class="aurora-input"
                placeholder="Dirección física de la tienda"
              />
            </div>

            <!-- BRANDING -->
            <div class="branding-grid">

              <!-- LOGO -->
              <div class="branding-field">

                <label>Logo de la Empresa</label>

                <div
                  class="upload-zone"
                  @click="triggerLogoUpload"
                  @dragover.prevent="dragOverLogo = true"
                  @dragleave="dragOverLogo = false"
                  @drop.prevent="onDropLogo"
                  :class="{
                    'upload-active':
                      uploadingLogo || dragOverLogo
                  }"
                >

                  <img
                    v-if="form.logo_url"
                    :src="form.logo_url"
                    class="logo-preview"
                  />

                  <div
                    v-if="form.logo_url"
                    class="upload-overlay"
                  >
                    <span class="material-symbols-outlined">
                      cloud_upload
                    </span>

                    <span>
                      Cambiar logo
                    </span>
                  </div>

                  <div
                    v-if="!form.logo_url"
                    class="upload-placeholder"
                  >
                    <span class="material-symbols-outlined">
                      add_photo_alternate
                    </span>

                    <p>
                      Click o arrastra un logo aquí
                    </p>

                    <small>
                      PNG, JPG, WebP, SVG · Máx. 5MB
                    </small>
                  </div>

                  <div
                    v-if="uploadingLogo"
                    class="upload-loading"
                  >
                    <span class="material-symbols-outlined animate-spin">
                      refresh
                    </span>
                  </div>

                  <input
                    ref="logoInputRef"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    class="hidden"
                    @change="onLogoFileSelected"
                  />

                </div>

                <div class="url-input-group">

                  <input
                    v-model="form.logo_url"
                    class="aurora-input"
                    placeholder="O ingresa URL manualmente..."
                  />

                  <button
                    v-if="form.logo_url"
                    type="button"
                    class="aurora-btn-icon danger"
                    @click="clearLogo"
                  >
                    <span class="material-symbols-outlined">
                      delete
                    </span>
                  </button>

                </div>

              </div>

              <!-- FAVICON -->
              <div class="branding-field">

                <label>Favicon</label>

                <div
                  class="upload-zone favicon-zone"
                  @click="triggerFaviconUpload"
                  @dragover.prevent="dragOverFavicon = true"
                  @dragleave="dragOverFavicon = false"
                  @drop.prevent="onDropFavicon"
                  :class="{
                    'upload-active':
                      uploadingFavicon || dragOverFavicon
                  }"
                >

                  <img
                    v-if="form.favicon_url"
                    :src="form.favicon_url"
                    class="favicon-preview"
                  />

                  <div
                    v-if="form.favicon_url"
                    class="upload-overlay"
                  >
                    <span class="material-symbols-outlined">
                      cloud_upload
                    </span>

                    <span>
                      Cambiar favicon
                    </span>
                  </div>

                  <div
                    v-if="!form.favicon_url"
                    class="upload-placeholder"
                  >
                    <span class="material-symbols-outlined">
                      photo_size_small
                    </span>

                    <p>
                      Click o arrastra un favicon aquí
                    </p>

                    <small>
                      PNG, ICO, SVG · Máx. 5MB
                    </small>
                  </div>

                  <div
                    v-if="uploadingFavicon"
                    class="upload-loading"
                  >
                    <span class="material-symbols-outlined animate-spin">
                      refresh
                    </span>
                  </div>

                  <input
                    ref="faviconInputRef"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml,image/x-icon"
                    class="hidden"
                    @change="onFaviconFileSelected"
                  />

                </div>

                <div class="url-input-group">

                  <input
                    v-model="form.favicon_url"
                    class="aurora-input"
                    placeholder="O ingresa URL manualmente..."
                  />

                  <button
                    v-if="form.favicon_url"
                    type="button"
                    class="aurora-btn-icon danger"
                    @click="clearFavicon"
                  >
                    <span class="material-symbols-outlined">
                      delete
                    </span>
                  </button>

                </div>

              </div>

            </div>

            <!-- ACTIVE -->
            <label class="switch-row">

              <input
                v-model="form.is_active"
                type="checkbox"
              />

              <span class="switch"></span>

              <span>
                Tienda Activa
              </span>

            </label>

          </div>

        </section>


        <!-- ======================================
             MONEDA E IMPUESTOS
        ======================================= -->
        <section class="settings-card">

          <div class="settings-card-header">

            <div class="section-icon">
              <span class="material-symbols-outlined">
                payments
              </span>
            </div>

            <div>
              <h3>Moneda e Impuestos</h3>

              <p>
                Configura la moneda, locale e impuestos generales.
              </p>
            </div>

          </div>

          <div class="settings-card-body">

            <div class="form-grid form-grid-3">

              <div class="form-field">
                <label>Moneda</label>

                <input
                  v-model="form.currency_code"
                  class="aurora-input mono"
                  maxlength="5"
                  placeholder="USD"
                />
              </div>

              <div class="form-field">
                <label>Símbolo</label>

                <input
                  v-model="form.currency_symbol"
                  class="aurora-input"
                  maxlength="10"
                  placeholder="$"
                />
              </div>

              <div class="form-field">
                <label>Nombre de Moneda</label>

                <input
                  v-model="form.currency_name"
                  class="aurora-input"
                  placeholder="US Dollar"
                />
              </div>

            </div>

            <div class="form-grid form-grid-2">

              <div class="form-field">

                <label>Locale</label>

                <input
                  v-model="form.locale"
                  class="aurora-input mono"
                  placeholder="en-US"
                />

                <small class="field-hint">
                  Ejemplo: en-US, es-DO, es-ES
                </small>

              </div>

              <div class="form-field">

                <label>Impuesto por defecto</label>

                <select
                  v-model="form.default_tax_rate_id"
                  class="aurora-select"
                >

                  <option :value="null">
                    Sin impuesto por defecto
                  </option>

                  <option
                    v-for="tax in taxRates"
                    :key="tax.id"
                    :value="tax.id"
                  >
                    {{ tax.name }} ({{ tax.rate }}%)
                  </option>

                </select>

              </div>

            </div>

            <label class="switch-row">

              <input
                v-model="form.tax_included"
                type="checkbox"
              />

              <span class="switch"></span>

              <span>
                Impuestos incluidos en el precio
              </span>

            </label>

            <div class="form-field">

              <label>
                Margen de Ganancia (%)
              </label>

              <div class="markup-row">

                <input
                  v-model.number="form.sale_markup_percentage"
                  type="number"
                  step="0.5"
                  min="0"
                  max="1000"
                  class="aurora-input markup-input"
                />

                <span class="markup-preview">
                  Precio venta =
                  Costo ×
                  (1 +
                  {{ (form.sale_markup_percentage || 10) / 100 }})
                </span>

              </div>

              <small class="field-hint">
                Ejemplo: 10% = precio de venta = costo × 1.10
              </small>

            </div>

          </div>

        </section>


        <!-- ======================================
             TASAS DE IMPUESTOS
        ======================================= -->
        <section class="settings-card">

          <div class="settings-card-header tax-header">

            <div class="section-title-group">

              <div class="section-icon">

                <span class="material-symbols-outlined">
                  receipt_long
                </span>

              </div>

              <div>

                <h3>
                  Tasas de Impuesto
                </h3>

                <p>
                  Administra las tasas aplicables a tus productos.
                </p>

              </div>

            </div>

            <button
              class="aurora-btn-primary"
              @click="showTaxForm = !showTaxForm"
            >

              <span class="material-symbols-outlined">
                add
              </span>

              Añadir Impuesto

            </button>

          </div>

          <div class="settings-card-body">

            <!-- TAX FORM -->
            <div
              v-if="showTaxForm"
              class="tax-form"
            >

              <input
                v-model="taxForm.name"
                class="aurora-input"
                placeholder="Nombre"
              />

              <input
                v-model="taxForm.code"
                class="aurora-input mono"
                placeholder="Código"
              />

              <input
                v-model.number="taxForm.rate"
                type="number"
                step="0.01"
                class="aurora-input"
                placeholder="Tasa %"
              />

              <input
                v-model="taxForm.country_code"
                class="aurora-input mono"
                placeholder="País"
                maxlength="5"
              />

              <div class="tax-actions">

                <button
                  class="aurora-btn-primary"
                  @click="saveTaxRate"
                >
                  <span class="material-symbols-outlined">
                    check
                  </span>

                  Guardar
                </button>

                <button
                  class="aurora-btn-secondary"
                  @click="
                    showTaxForm = false;
                    resetTaxForm();
                  "
                >
                  Cancelar
                </button>

              </div>

            </div>

            <!-- TABLE -->
            <DataTable
              :columns="taxColumns"
              :data="taxRates"
              :per-page="50"
              :searchable="false"
              empty-message="No hay tasas de impuesto configuradas."
            >

              <template #cell-code="{ row }">

                <code class="aurora-badge aurora-badge-primary">
                  {{ row.code }}
                </code>

              </template>

              <template #cell-rate="{ row }">

                <span class="font-medium">
                  {{ row.rate }}%
                </span>

              </template>

              <template #cell-country_code="{ row }">

                {{ row.country_code || '—' }}

              </template>

              <template #actions="{ row }">

                <button
                  class="aurora-btn-icon danger"
                  title="Eliminar"
                  @click="deleteTaxRate(row.id)"
                >

                  <span class="material-symbols-outlined">
                    delete
                  </span>

                </button>

              </template>

            </DataTable>

          </div>

        </section>


        <!-- ======================================
             WHATSAPP
        ======================================= -->
        <section class="settings-card">

          <div class="settings-card-header">

            <div class="section-icon whatsapp-icon">

              <span class="material-symbols-outlined">
                chat
              </span>

            </div>

            <div>

              <h3>
                Configuración de WhatsApp
              </h3>

              <p>
                Configura la comunicación automática con tus clientes.
              </p>

            </div>

          </div>

          <form
            class="settings-card-body"
            @submit.prevent="handleSaveWhatsApp"
          >

            <div class="form-grid form-grid-2">

              <div class="form-field">

                <label>
                  Número de WhatsApp
                </label>

                <input
                  v-model="whatsapp.phone_number"
                  class="aurora-input"
                  placeholder="+1234567890"
                />

              </div>

              <div class="form-field">

                <label>
                  Mensaje de Bienvenida
                </label>

                <input
                  v-model="whatsapp.welcome_message"
                  class="aurora-input"
                  placeholder="¡Hola! ¿En qué podemos ayudarte?"
                />

              </div>

            </div>

            <label class="switch-row">

              <input
                v-model="whatsapp.auto_reply_enabled"
                type="checkbox"
              />

              <span class="switch"></span>

              <span>
                Auto-respuesta habilitada
              </span>

            </label>

            <div class="card-footer-actions">

              <button
                type="submit"
                class="aurora-btn-primary"
                :disabled="savingWhatsApp"
              >

                <span
                  v-if="savingWhatsApp"
                  class="material-symbols-outlined animate-spin"
                >
                  refresh
                </span>

                <span
                  v-else
                  class="material-symbols-outlined"
                >
                  save
                </span>

                Guardar Configuración WhatsApp

              </button>

            </div>

          </form>

        </section>


        <!-- ======================================
             GLOBAL ACTION
        ======================================= -->
        <div class="global-actions">

          <button
            class="aurora-btn-primary save-all-btn"
            :disabled="saving"
            @click="handleSave"
          >

            <span
              v-if="saving"
              class="material-symbols-outlined animate-spin"
            >
              refresh
            </span>

            <span
              v-else
              class="material-symbols-outlined"
            >
              save
            </span>

            Guardar Todos los Cambios

          </button>

        </div>

      </template>

    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

import { ecommerceAPI } from '../../api';
import { supabase } from '../../api/supabase';

import PageHeader from '../../components/shared/PageHeader.vue';
import Alert from '../../components/shared/Alert.vue';
import FormSkeleton from '../../components/skeletons/FormSkeleton.vue';
import DataTable from '../../components/shared/DataTable.vue';

const STORAGE_BUCKET = 'branding';

const loading = ref(true);
const saving = ref(false);
const savingWhatsApp = ref(false);

const successMsg = ref('');
const errorMsg = ref('');

const showTaxForm = ref(false);

/*
|--------------------------------------------------------------------------
| Upload State
|--------------------------------------------------------------------------
*/

const uploadingLogo = ref(false);
const dragOverLogo = ref(false);
const logoInputRef = ref(null);

const uploadingFavicon = ref(false);
const dragOverFavicon = ref(false);
const faviconInputRef = ref(null);

/*
|--------------------------------------------------------------------------
| Form
|--------------------------------------------------------------------------
*/

const form = ref({
  store_name: 'Animal Store',
  description: '',
  logo_url: '',
  favicon_url: '',
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
  sale_markup_percentage: 10,
  is_active: true
});

/*
|--------------------------------------------------------------------------
| Taxes
|--------------------------------------------------------------------------
*/

const taxForm = ref({
  name: '',
  code: '',
  rate: 0,
  country_code: ''
});

const taxRates = ref([]);

const taxColumns = [
  {
    key: 'name',
    label: 'Nombre'
  },
  {
    key: 'code',
    label: 'Código'
  },
  {
    key: 'rate',
    label: 'Tasa'
  },
  {
    key: 'country_code',
    label: 'País'
  }
];

/*
|--------------------------------------------------------------------------
| WhatsApp
|--------------------------------------------------------------------------
*/

const whatsapp = ref({
  phone_number: '',
  welcome_message: '¡Hola! ¿En qué podemos ayudarte?',
  auto_reply_enabled: true
});

/*
|--------------------------------------------------------------------------
| Countries
|--------------------------------------------------------------------------
*/

const countries = [
  {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    symbol: '$',
    locale: 'en-US'
  },
  {
    code: 'DO',
    name: 'República Dominicana',
    currency: 'DOP',
    symbol: 'RD$',
    locale: 'es-DO'
  },
  {
    code: 'ES',
    name: 'España',
    currency: 'EUR',
    symbol: '€',
    locale: 'es-ES'
  },
  {
    code: 'MX',
    name: 'México',
    currency: 'MXN',
    symbol: '$',
    locale: 'es-MX'
  },
  {
    code: 'CO',
    name: 'Colombia',
    currency: 'COP',
    symbol: '$',
    locale: 'es-CO'
  },
  {
    code: 'AR',
    name: 'Argentina',
    currency: 'ARS',
    symbol: '$',
    locale: 'es-AR'
  },
  {
    code: 'CL',
    name: 'Chile',
    currency: 'CLP',
    symbol: '$',
    locale: 'es-CL'
  },
  {
    code: 'PE',
    name: 'Perú',
    currency: 'PEN',
    symbol: 'S/',
    locale: 'es-PE'
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    symbol: '£',
    locale: 'en-GB'
  },
  {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    symbol: 'CA$',
    locale: 'en-CA'
  }
];

/*
|--------------------------------------------------------------------------
| Upload Logo
|--------------------------------------------------------------------------
*/

function triggerLogoUpload() {
  logoInputRef.value?.click();
}

function onDropLogo(event) {
  dragOverLogo.value = false;

  const files = event.dataTransfer?.files;

  if (files?.length) {
    uploadLogoFile(files[0]);
  }
}

function onLogoFileSelected(event) {
  const files = event.target.files;

  if (files?.length) {
    uploadLogoFile(files[0]);
  }
}

async function uploadLogoFile(file) {

  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml'
  ];

  if (!allowed.includes(file.type)) {
    errorMsg.value =
      'Formato no soportado. Usa PNG, JPG, WebP o SVG.';

    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    errorMsg.value =
      'La imagen es demasiado grande. Máximo 5MB.';

    return;
  }

  uploadingLogo.value = true;
  errorMsg.value = '';

  try {

    const extension =
      file.name.split('.').pop();

    const fileName =
      `logo/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

    const {
      error: uploadError
    } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(
        fileName,
        file,
        {
          cacheControl: '3600',
          upsert: false
        }
      );

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: {
        publicUrl
      }
    } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    form.value.logo_url = publicUrl;

    successMsg.value =
      'Logo subido exitosamente';

  } catch (error) {

    console.error(
      'Error uploading logo:',
      error
    );

    errorMsg.value =
      error.message ||
      'Error al subir logo';

  } finally {

    uploadingLogo.value = false;

    if (logoInputRef.value) {
      logoInputRef.value.value = '';
    }

  }

}

function clearLogo() {
  form.value.logo_url = '';
}

/*
|--------------------------------------------------------------------------
| Upload Favicon
|--------------------------------------------------------------------------
*/

function triggerFaviconUpload() {
  faviconInputRef.value?.click();
}

function onDropFavicon(event) {

  dragOverFavicon.value = false;

  const files =
    event.dataTransfer?.files;

  if (files?.length) {
    uploadFaviconFile(files[0]);
  }

}

function onFaviconFileSelected(event) {

  const files =
    event.target.files;

  if (files?.length) {
    uploadFaviconFile(files[0]);
  }

}

async function uploadFaviconFile(file) {

  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/x-icon'
  ];

  if (!allowed.includes(file.type)) {

    errorMsg.value =
      'Formato no soportado. Usa PNG, ICO, SVG, JPG o WebP.';

    return;

  }

  if (file.size > 5 * 1024 * 1024) {

    errorMsg.value =
      'La imagen es demasiado grande. Máximo 5MB.';

    return;

  }

  uploadingFavicon.value = true;
  errorMsg.value = '';

  try {

    const extension =
      file.name.split('.').pop();

    const fileName =
      `favicon/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

    const {
      error: uploadError
    } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(
        fileName,
        file,
        {
          cacheControl: '3600',
          upsert: false
        }
      );

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: {
        publicUrl
      }
    } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    form.value.favicon_url =
      publicUrl;

    successMsg.value =
      'Favicon subido exitosamente';

  } catch (error) {

    console.error(
      'Error uploading favicon:',
      error
    );

    errorMsg.value =
      error.message ||
      'Error al subir favicon';

  } finally {

    uploadingFavicon.value = false;

    if (faviconInputRef.value) {
      faviconInputRef.value.value = '';
    }

  }

}

function clearFavicon() {
  form.value.favicon_url = '';
}

/*
|--------------------------------------------------------------------------
| Mounted
|--------------------------------------------------------------------------
*/

onMounted(async () => {

  try {

    const [
      settingsRes,
      taxRes,
      whatsappRes
    ] = await Promise.all([

      ecommerceAPI
        .getSettings()
        .catch(() => ({
          data: null
        })),

      ecommerceAPI
        .getAllTaxRates()
        .catch(() => ({
          data: []
        })),

      ecommerceAPI
        .getWhatsappConfig()
        .catch(() => ({
          data: null
        }))

    ]);

    if (
      settingsRes.data &&
      typeof settingsRes.data === 'object'
    ) {

      form.value = {
        ...form.value,
        ...settingsRes.data
      };

    }

    if (
      Array.isArray(taxRes.data)
    ) {

      taxRates.value =
        taxRes.data;

    }

    if (
      whatsappRes.data &&
      typeof whatsappRes.data === 'object'
    ) {

      whatsapp.value = {
        ...whatsapp.value,
        ...whatsappRes.data
      };

    }

  } catch (error) {

    console.warn(
      'Error loading settings:',
      error
    );

  } finally {

    loading.value = false;

  }

});

/*
|--------------------------------------------------------------------------
| Country
|--------------------------------------------------------------------------
*/

function onCountryChange() {

  const country =
    countries.find(
      item =>
        item.code ===
        form.value.country_code
    );

  if (!country) {
    return;
  }

  form.value.currency_code =
    country.currency;

  form.value.currency_symbol =
    country.symbol;

  form.value.locale =
    country.locale;

  form.value.currency_name =
    `${country.name} ${country.currency}`;

}

/*
|--------------------------------------------------------------------------
| Taxes
|--------------------------------------------------------------------------
*/

function resetTaxForm() {

  taxForm.value = {
    name: '',
    code: '',
    rate: 0,
    country_code: ''
  };

}

async function saveTaxRate() {

  if (
    !taxForm.value.name ||
    !taxForm.value.code ||
    !taxForm.value.rate
  ) {

    errorMsg.value =
      'Completa todos los campos del impuesto.';

    return;

  }

  try {

    await ecommerceAPI.createTaxRate(
      taxForm.value
    );

    const response =
      await ecommerceAPI.getAllTaxRates();

    if (
      Array.isArray(response.data)
    ) {

      taxRates.value =
        response.data;

    }

    showTaxForm.value = false;

    resetTaxForm();

    successMsg.value =
      'Impuesto agregado exitosamente';

  } catch (error) {

    errorMsg.value =
      'Error al crear impuesto';

  }

}

async function deleteTaxRate(id) {

  try {

    await ecommerceAPI.deleteTaxRate(id);

    taxRates.value =
      taxRates.value.filter(
        tax => tax.id !== id
      );

    successMsg.value =
      'Impuesto eliminado';

  } catch (error) {

    errorMsg.value =
      'Error al eliminar impuesto';

  }

}

/*
|--------------------------------------------------------------------------
| Save General Settings
|--------------------------------------------------------------------------
*/

async function handleSave() {

  saving.value = true;

  errorMsg.value = '';
  successMsg.value = '';

  try {

    const payload = {

      store_name:
        form.value.store_name,

      description:
        form.value.description,

      logo_url:
        form.value.logo_url,

      favicon_url:
        form.value.favicon_url,

      contact_email:
        form.value.contact_email,

      phone:
        form.value.phone,

      whatsapp_number:
        form.value.whatsapp_number,

      address:
        form.value.address,

      currency_code:
        form.value.currency_code,

      currency_symbol:
        form.value.currency_symbol,

      currency_name:
        form.value.currency_name,

      country_code:
        form.value.country_code,

      locale:
        form.value.locale,

      default_tax_rate_id:
        form.value.default_tax_rate_id,

      tax_included:
        form.value.tax_included,

      sale_markup_percentage:
        form.value.sale_markup_percentage

    };

    await ecommerceAPI.updateSettings(
      payload
    );

    successMsg.value =
      'Configuración guardada exitosamente';

  } catch (error) {

    errorMsg.value =
      'Error al guardar configuración';

  } finally {

    saving.value = false;

    setTimeout(() => {

      successMsg.value = '';
      errorMsg.value = '';

    }, 4000);

  }

}

/*
|--------------------------------------------------------------------------
| Save WhatsApp
|--------------------------------------------------------------------------
*/

async function handleSaveWhatsApp() {

  savingWhatsApp.value = true;

  try {

    await ecommerceAPI.updateWhatsappConfig(
      whatsapp.value
    );

    successMsg.value =
      'Configuración de WhatsApp guardada';

  } catch (error) {

    errorMsg.value =
      'Error al guardar WhatsApp';

  } finally {

    savingWhatsApp.value = false;

  }

}

</script>

<style scoped>

/* ==========================================
   PAGE
========================================== */

.ecommerce-settings-page {
  width: 100%;
  min-height: 100%;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-top: 2rem;
}


/* ==========================================
   CARDS
========================================== */

.settings-card {
  position: relative;
  overflow: hidden;

  background: var(--aurora-surface);

  border: 1px solid
    var(--aurora-outline-variant);

  border-radius: 1.25rem;

  box-shadow:
    0 8px 24px
    rgba(0, 0, 0, 0.04);

  transition:
    transform 0.35s ease,
    box-shadow 0.35s ease,
    border-color 0.35s ease;
}

.settings-card::before {
  content: '';

  position: absolute;

  left: 0;
  top: 0;
  bottom: 0;

  width: 3px;

  background:
    linear-gradient(
      180deg,
      var(--aurora-primary),
      #9154dc
    );

  opacity: 0;

  transform: scaleY(0.4);

  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.settings-card:hover {
  transform: translateY(-4px);

  border-color:
    color-mix(
      in srgb,
      var(--aurora-primary) 40%,
      var(--aurora-outline-variant)
    );

  box-shadow:
    0 18px 40px
    rgba(0, 0, 0, 0.10);
}

.settings-card:hover::before {
  opacity: 1;
  transform: scaleY(1);
}


/* ==========================================
   HEADER
========================================== */

.settings-card-header {
  display: flex;
  align-items: center;
  gap: 1rem;

  padding: 1.5rem;

  border-bottom: 1px solid
    var(--aurora-outline-variant);
}

.settings-card-header h3 {
  margin: 0;

  color: var(--aurora-on-surface);

  font-family:
    'Plus Jakarta Sans',
    sans-serif;

  font-size: 1.1rem;
  font-weight: 700;
}

.settings-card-header p {
  margin-top: 0.3rem;

  color:
    var(--aurora-on-surface-variant);

  font-size: 0.8rem;
}

.section-icon {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 2.75rem;
  height: 2.75rem;

  flex-shrink: 0;

  border-radius: 0.85rem;

  color:
    var(--aurora-primary);

  background:
    color-mix(
      in srgb,
      var(--aurora-primary) 12%,
      transparent
    );

  transition:
    transform 0.35s ease,
    background 0.35s ease;
}

.settings-card:hover .section-icon {
  transform:
    rotate(-5deg)
    scale(1.08);

  background:
    color-mix(
      in srgb,
      var(--aurora-primary) 20%,
      transparent
    );
}

.section-icon span {
  font-size: 1.35rem;
}


/* ==========================================
   BODY
========================================== */

.settings-card-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  padding: 1.5rem;
}


/* ==========================================
   FORM
========================================== */

.form-grid {
  display: grid;
  gap: 1.25rem;
}

.form-grid-2 {
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
}

.form-grid-3 {
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.form-field label,
.branding-field > label {
  color:
    var(--aurora-on-surface);

  font-size: 0.82rem;
  font-weight: 600;
}

.field-hint {
  color:
    var(--aurora-on-surface-variant);

  font-size: 0.72rem;
}

.mono {
  font-family:
    'JetBrains Mono',
    monospace;
}


/* ==========================================
   BRANDING
========================================== */

.branding-grid {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 1.5rem;
}

.branding-field {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.upload-zone {
  position: relative;

  height: 11rem;

  display: flex;
  align-items: center;
  justify-content: center;

  overflow: hidden;

  cursor: pointer;

  border: 2px dashed
    var(--aurora-outline-variant);

  border-radius: 1rem;

  background:
    color-mix(
      in srgb,
      var(--aurora-surface-container) 70%,
      transparent
    );

  transition:
    border-color 0.3s ease,
    background 0.3s ease,
    transform 0.3s ease;
}

.upload-zone:hover,
.upload-zone.upload-active {
  border-color:
    var(--aurora-primary);

  background:
    color-mix(
      in srgb,
      var(--aurora-primary) 5%,
      var(--aurora-surface)
    );

  transform:
    translateY(-2px);
}

.logo-preview {
  width: 100%;
  height: 100%;

  object-fit: cover;
}

.favicon-preview {
  width: 100%;
  height: 100%;

  padding: 1.5rem;

  object-fit: contain;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;

  text-align: center;

  color:
    var(--aurora-on-surface-variant);
}

.upload-placeholder span {
  margin-bottom: 0.5rem;

  font-size: 2.25rem;
}

.upload-placeholder p {
  margin: 0;

  font-size: 0.8rem;
}

.upload-placeholder small {
  margin-top: 0.3rem;

  font-size: 0.7rem;
}

.upload-overlay {
  position: absolute;
  inset: 0;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;

  color: white;

  background:
    rgba(0, 0, 0, 0.55);

  opacity: 0;

  transition:
    opacity 0.3s ease;
}

.upload-zone:hover .upload-overlay {
  opacity: 1;
}

.upload-overlay span:first-child {
  font-size: 2rem;
}

.upload-overlay span:last-child {
  font-size: 0.75rem;
}

.upload-loading {
  position: absolute;
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  color: white;

  background:
    rgba(0, 0, 0, 0.6);
}

.url-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}


/* ==========================================
   SWITCH
========================================== */

.switch-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  cursor: pointer;

  color:
    var(--aurora-on-surface);

  font-size: 0.85rem;
}

.switch-row input {
  display: none;
}

.switch {
  position: relative;

  width: 2.6rem;
  height: 1.45rem;

  border-radius: 999px;

  background:
    var(--aurora-outline-variant);

  transition:
    background 0.3s ease;
}

.switch::after {
  content: '';

  position: absolute;

  top: 3px;
  left: 3px;

  width: 1.1rem;
  height: 1.1rem;

  border-radius: 50%;

  background: white;

  box-shadow:
    0 2px 5px
    rgba(0, 0, 0, 0.2);

  transition:
    transform 0.3s ease;
}

.switch-row input:checked + .switch {
  background:
    var(--aurora-primary);
}

.switch-row input:checked + .switch::after {
  transform:
    translateX(1.15rem);
}


/* ==========================================
   MARKUP
========================================== */

.markup-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.markup-input {
  width: 8rem;
}

.markup-preview {
  color:
    var(--aurora-on-surface-variant);

  font-size: 0.85rem;
}


/* ==========================================
   TAX
========================================== */

.tax-header {
  justify-content: space-between;
}

.section-title-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.tax-form {
  display: grid;

  grid-template-columns:
    repeat(4, minmax(0, 1fr))
    auto;

  gap: 0.75rem;

  padding: 1rem;

  border: 1px solid
    var(--aurora-outline-variant);

  border-radius: 1rem;

  background:
    var(--aurora-surface-container);
}

.tax-actions {
  display: flex;
  gap: 0.5rem;
}


/* ==========================================
   FOOTER ACTIONS
========================================== */

.card-footer-actions,
.global-actions {
  display: flex;
  justify-content: flex-end;
}

.global-actions {
  padding-bottom: 1rem;
}

.save-all-btn {
  min-width: 14rem;
}


/* ==========================================
   RESPONSIVE
========================================== */

@media (max-width: 900px) {

  .form-grid-3 {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .branding-grid {
    grid-template-columns:
      1fr;
  }

  .tax-form {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

}

@media (max-width: 640px) {

  .settings-content {
    gap: 1rem;
  }

  .settings-card-header,
  .settings-card-body {
    padding: 1.1rem;
  }

  .form-grid-2,
  .form-grid-3 {
    grid-template-columns:
      1fr;
  }

  .tax-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .tax-form {
    grid-template-columns:
      1fr;
  }

  .tax-actions {
    flex-direction: column;
  }

  .markup-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .markup-input {
    width: 100%;
  }

  .card-footer-actions,
  .global-actions {
    justify-content: stretch;
  }

  .card-footer-actions button,
  .global-actions button {
    width: 100%;
  }

}

</style>