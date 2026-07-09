<template>
  <div>
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Configuración Ecommerce</h2>
        <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.5; margin-top: 0.25rem;">Información de la tienda, logo, favicon y más</p>
      </div>
    </div>
    <div class="space-y-8">
    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible @close="successMsg = ''" class="mb-4" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />

    <Loading v-if="loading" />

    <template v-else>
      <!-- Información General -->
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <div class="flex items-center gap-2 pb-2 mb-5" style="border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200; font-size: 1.25rem;">store</span>
          <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: #0b1c30;">Información de la Tienda</h3>
        </div>
        <form @submit.prevent="handleSave" class="flex flex-col gap-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Nombre de la Tienda</label>
              <input v-model="form.store_name"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="Animal Store"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">País</label>
              <select v-model="form.country_code" @change="onCountryChange"
                class="w-full rounded-lg px-3 py-2.5 appearance-none transition-all"
                :style="{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#0b1c30', background: '#ffffff', border: '1.5px solid #E5E7EB' }"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
                <option value="">Seleccionar país...</option>
                <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.name }} ({{ c.currency }})</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Descripción</label>
            <textarea v-model="form.description" class="w-full rounded-lg px-3 py-2.5 transition-all resize-none" rows="3"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              placeholder="Descripción de la tienda"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }"></textarea>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Email de Contacto</label>
              <input v-model="form.contact_email" type="email"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="correo@ejemplo.com"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Teléfono</label>
              <input v-model="form.phone"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="+1 234 567 8900"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">WhatsApp</label>
              <input v-model="form.whatsapp_number"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="+1234567890 (solo números)"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Dirección</label>
            <input v-model="form.address"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              placeholder="Dirección física de la tienda"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Logo de la Empresa -->
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Logo de la Empresa</label>
              <div class="mt-2">
                <!-- Upload area -->
                <div
                  class="relative w-full h-40 rounded-xl border-2 border-dashed border-white/20 hover:border-primary/50 transition-all flex flex-col items-center justify-center cursor-pointer bg-white/5 hover:bg-white/10 overflow-hidden"
                  @click="triggerLogoUpload"
                  @dragover.prevent="dragOverLogo = true"
                  @dragleave="dragOverLogo = false"
                  @drop.prevent="onDropLogo"
                  :class="{ 'bg-primary/10 border-primary': uploadingLogo, 'border-primary/50': dragOverLogo }"
                >
                  <img v-if="form.logo_url" :src="form.logo_url" class="absolute inset-0 w-full h-full object-cover" />
                  <div v-if="form.logo_url" class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span class="material-symbols-outlined text-3xl text-white">cloud_upload</span>
                  </div>
                  <div v-if="!form.logo_url" class="text-center p-4">
                    <span class="material-symbols-outlined text-3xl text-gray-400 mb-2">add_photo_alternate</span>
                    <p class="text-xs text-gray-400">Click o arrastra un logo aquí</p>
                    <p class="text-xs text-gray-500 mt-1">PNG, JPG, WebP, SVG • Max 5MB</p>
                  </div>
                  <div v-if="uploadingLogo" class="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span class="material-symbols-outlined animate-spin text-3xl text-white">refresh</span>
                  </div>
                  <input ref="logoInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" class="hidden" @change="onLogoFileSelected" />
                </div>
                <div class="mt-2 flex gap-2 items-center">
                  <input v-model="form.logo_url"
                    class="w-full rounded-lg px-3 py-2 transition-all flex-1 text-xs"
                    style="font-family: 'Inter', sans-serif; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                    placeholder="O ingresa URL manualmente..."
                    @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                    @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
                  <button v-if="form.logo_url" type="button" @click="clearLogo" class="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-400/10 flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Favicon -->
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Favicon</label>
              <div class="mt-2">
                <div
                  class="relative w-full h-40 rounded-xl border-2 border-dashed border-white/20 hover:border-primary/50 transition-all flex flex-col items-center justify-center cursor-pointer bg-white/5 hover:bg-white/10 overflow-hidden"
                  @click="triggerFaviconUpload"
                  @dragover.prevent="dragOverFavicon = true"
                  @dragleave="dragOverFavicon = false"
                  @drop.prevent="onDropFavicon"
                  :class="{ 'bg-primary/10 border-primary': uploadingFavicon, 'border-primary/50': dragOverFavicon }"
                >
                  <img v-if="form.favicon_url" :src="form.favicon_url" class="absolute inset-0 w-full h-full object-contain p-4" />
                  <div v-if="form.favicon_url" class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span class="material-symbols-outlined text-3xl text-white">cloud_upload</span>
                  </div>
                  <div v-if="!form.favicon_url" class="text-center p-4">
                    <span class="material-symbols-outlined text-3xl text-gray-400 mb-2">photo_size_small</span>
                    <p class="text-xs text-gray-400">Click o arrastra un favicon aquí</p>
                    <p class="text-xs text-gray-500 mt-1">PNG, ICO, SVG • Max 5MB</p>
                  </div>
                  <div v-if="uploadingFavicon" class="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span class="material-symbols-outlined animate-spin text-3xl text-white">refresh</span>
                  </div>
                  <input ref="faviconInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,image/x-icon" class="hidden" @change="onFaviconFileSelected" />
                </div>
                <div class="mt-2 flex gap-2 items-center">
                  <input v-model="form.favicon_url"
                    class="w-full rounded-lg px-3 py-2 transition-all flex-1 text-xs"
                    style="font-family: 'Inter', sans-serif; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                    placeholder="O ingresa URL manualmente..."
                    @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                    @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
                  <button v-if="form.favicon_url" type="button" @click="clearFavicon" class="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-400/10 flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" v-model="form.is_active" id="store_active" class="w-4 h-4 rounded" style="accent-color: #624200;" />
            <label for="store_active" style="font-family: 'Inter', sans-serif; color: #0b1c30; font-size: 0.875rem;">Tienda Activa</label>
          </div>
        </form>
      </div>

      <!-- Moneda e Impuestos -->
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <div class="flex items-center gap-2 pb-2 mb-5" style="border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200; font-size: 1.25rem;">payments</span>
          <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: #0b1c30;">Moneda e Impuestos</h3>
        </div>
        <form @submit.prevent="handleSave" class="flex flex-col gap-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Moneda</label>
              <input v-model="form.currency_code"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="USD" maxlength="5"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Símbolo</label>
              <input v-model="form.currency_symbol"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="$" maxlength="10"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Nombre de Moneda</label>
              <input v-model="form.currency_name"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="US Dollar"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Locale</label>
              <input v-model="form.locale"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="en-US"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              <p class="text-xs text-gray-500 mt-1">Formato: en-US, es-DO, es-ES, etc.</p>
            </div>
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Impuesto por defecto</label>
              <select v-model="form.default_tax_rate_id"
                class="w-full rounded-lg px-3 py-2.5 appearance-none transition-all"
                :style="{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#0b1c30', background: '#ffffff', border: '1.5px solid #E5E7EB' }"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }">
                <option :value="null">Sin impuesto por defecto</option>
                <option v-for="tax in taxRates" :key="tax.id" :value="tax.id">
                  {{ tax.name }} ({{ tax.rate }}%)
                </option>
              </select>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" v-model="form.tax_included" id="tax_included" class="w-4 h-4 rounded" style="accent-color: #624200;" />
            <label for="tax_included" style="font-family: 'Inter', sans-serif; color: #0b1c30; font-size: 0.875rem;">Impuestos incluidos en el precio</label>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Margen de Ganancia (%)</label>
            <div class="flex items-center gap-3">
              <input v-model.number="form.sale_markup_percentage" type="number" step="0.5" min="0" max="1000"
                class="w-32 rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="10"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
              <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #4f4539;">
                Precio venta = Costo × (1 + {{ (form.sale_markup_percentage || 10) / 100 }})
              </span>
            </div>
            <p class="text-xs text-gray-500 mt-1">Porcentaje de ganancia sobre el precio de costo para calcular el precio de venta automáticamente. Ej: 10% = precio venta = costo × 1.10</p>
          </div>
        </form>
      </div>

      <!-- Tasas de Impuesto -->
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <div class="flex items-center justify-between mb-5" style="border-bottom: 1px solid #d2c4b4; padding-bottom: 0.75rem;">
          <div class="flex items-center gap-2">
            <span class="material-icons-outlined" style="color: #624200; font-size: 1.25rem;">receipt_long</span>
            <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: #0b1c30;">Tasas de Impuesto</h3>
          </div>
          <button @click="showTaxForm = true"
            class="inline-flex items-center gap-2 font-semibold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95"
            style="background: #624200; color: white; font-family: 'Inter', sans-serif; font-size: 0.875rem;">
            <span class="material-icons-outlined" style="font-size: 1.125rem;">add</span>
            Añadir Impuesto
          </button>
        </div>

        <!-- Formulario nuevo impuesto -->
        <div v-if="showTaxForm" class="mb-6 p-4 rounded-xl" style="background: rgba(98,66,0,0.03); border: 1px solid #d2c4b4;">
          <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
            <input v-model="taxForm.name"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              placeholder="Nombre (ej: ITEBIS)"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            <input v-model="taxForm.code"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              placeholder="Código (ej: ITEBIS)"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            <input v-model.number="taxForm.rate" type="number" step="0.01"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              placeholder="Tasa %"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            <input v-model="taxForm.country_code"
              class="w-full rounded-lg px-3 py-2.5 transition-all"
              style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
              placeholder="País (ej: DO)" maxlength="5"
              @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            <div class="flex gap-2">
              <button @click="saveTaxRate"
                class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
                style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
                <span class="material-icons-outlined" style="font-size: 1.125rem;">check</span>
                Guardar
              </button>
              <button @click="showTaxForm = false; resetTaxForm()"
                class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
                style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
                @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
                @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">Cancelar</button>
            </div>
          </div>
        </div>

        <DataTable :columns="taxColumns" :data="taxRates" :per-page="50" empty-message="No hay tasas de impuesto configuradas." searchable=false>
          <template #cell-code="{ row }">
            <code class="text-primary">{{ row.code }}</code>
          </template>
          <template #cell-rate="{ row }">
            <span class="font-medium">{{ row.rate }}%</span>
          </template>
          <template #cell-country_code="{ row }">
            {{ row.country_code || '—' }}
          </template>
          <template #actions="{ row }">
            <button @click="deleteTaxRate(row.id)" class="inline-flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200" title="Eliminar" style="color: #dc2626; background: transparent; border: none; cursor: pointer;" @mouseenter="e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }" @mouseleave="e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#dc2626'; }">
              <span class="material-icons-outlined" style="font-size: 1.25rem;">delete</span>
            </button>
          </template>
        </DataTable>
      </div>

      <!-- WhatsApp Config -->
      <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 p-5 md:p-6">
        <div class="flex items-center gap-2 pb-2 mb-5" style="border-bottom: 1px solid #d2c4b4;">
          <span class="material-icons-outlined" style="color: #624200; font-size: 1.25rem;">chat</span>
          <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: #0b1c30;">Configuración de WhatsApp</h3>
        </div>
        <form @submit.prevent="handleSaveWhatsApp" class="flex flex-col gap-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Número de WhatsApp</label>
              <input v-model="whatsapp.phone_number"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="+1234567890"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
            <div>
              <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30;">Mensaje de Bienvenida</label>
              <input v-model="whatsapp.welcome_message"
                class="w-full rounded-lg px-3 py-2.5 transition-all"
                style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: #0b1c30; background: #ffffff; border: 1.5px solid #E5E7EB;"
                placeholder="¡Hola! ¿En qué podemos ayudarte?"
                @focus="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(98,66,0,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" v-model="whatsapp.auto_reply_enabled" id="auto_reply" class="w-4 h-4 rounded" style="accent-color: #624200;" />
            <label for="auto_reply" style="font-family: 'Inter', sans-serif; color: #0b1c30; font-size: 0.875rem;">Auto-respuesta habilitada</label>
          </div>
          <div class="flex justify-end pt-4">
            <button @click="handleSaveWhatsApp" type="submit" :disabled="savingWhatsApp"
              class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
              style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
              <span v-if="savingWhatsApp" class="material-symbols-outlined animate-spin" data-icon="refresh">refresh</span>
              <span v-else class="material-icons-outlined" style="font-size: 1.125rem;">save</span>
              Guardar Configuración WhatsApp
            </button>
          </div>
        </form>
      </div>

      <!-- Botón Guardar General -->
      <div class="flex justify-end pt-4">
        <button @click="handleSave" :disabled="saving"
          class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
          style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;">
          <span v-if="saving" class="material-symbols-outlined animate-spin" data-icon="refresh">refresh</span>
          <span v-else class="material-icons-outlined" style="font-size: 1.125rem;">save</span>
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
import Alert from '../../components/shared/Alert.vue';
import Loading from '../../components/shared/Loading.vue';
import DataTable from '../../components/shared/DataTable.vue';

const STORAGE_BUCKET = 'branding';

// Upload state — Logo
const uploadingLogo = ref(false);
const dragOverLogo = ref(false);
const logoInputRef = ref(null);

// Upload state — Favicon
const uploadingFavicon = ref(false);
const dragOverFavicon = ref(false);
const faviconInputRef = ref(null);

const loading = ref(true);
const saving = ref(false);

const taxColumns = [
  { key: 'name', label: 'Nombre' },
  { key: 'code', label: 'Código' },
  { key: 'rate', label: 'Tasa' },
  { key: 'country_code', label: 'País' }
];
const savingWhatsApp = ref(false);
const successMsg = ref('');
const errorMsg = ref('');
const showTaxForm = ref(false);

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

// ==========================================
// Upload functions — Logo
// ==========================================
function triggerLogoUpload() { logoInputRef.value?.click(); }
function onDropLogo(e) { dragOverLogo.value = false; const files = e.dataTransfer?.files; if (files?.length) uploadLogoFile(files[0]); }
function onLogoFileSelected(e) { const files = e.target.files; if (files?.length) uploadLogoFile(files[0]); }

async function uploadLogoFile(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (!allowed.includes(file.type)) { errorMsg.value = 'Formato no soportado. Usa PNG, JPG, WebP o SVG.'; return; }
  if (file.size > 5 * 1024 * 1024) { errorMsg.value = 'La imagen es demasiado grande. Máximo 5MB.'; return; }

  uploadingLogo.value = true;
  errorMsg.value = '';

  try {
    const ext = file.name.split('.').pop();
    const fileName = `logo/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    form.value.logo_url = publicUrl;
    successMsg.value = 'Logo subido exitosamente';
  } catch (err) {
    console.error('Error uploading logo:', err);
    if (err.message?.includes('row-level security')) {
      errorMsg.value = 'Error de permisos: Ejecuta la migración 012 en Supabase SQL Editor para configurar las políticas RLS del bucket.';
    } else if (err.message?.includes('bucket')) {
      errorMsg.value = 'El bucket "branding" no existe. Ejecuta la migración 012 en Supabase.';
    } else {
      errorMsg.value = err.message || 'Error al subir logo';
    }
  } finally {
    uploadingLogo.value = false;
    if (logoInputRef.value) logoInputRef.value.value = '';
  }
}

function clearLogo() { form.value.logo_url = ''; }

// ==========================================
// Upload functions — Favicon
// ==========================================
function triggerFaviconUpload() { faviconInputRef.value?.click(); }
function onDropFavicon(e) { dragOverFavicon.value = false; const files = e.dataTransfer?.files; if (files?.length) uploadFaviconFile(files[0]); }
function onFaviconFileSelected(e) { const files = e.target.files; if (files?.length) uploadFaviconFile(files[0]); }

async function uploadFaviconFile(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon'];
  if (!allowed.includes(file.type)) { errorMsg.value = 'Formato no soportado. Usa PNG, ICO, SVG, JPG o WebP.'; return; }
  if (file.size > 5 * 1024 * 1024) { errorMsg.value = 'La imagen es demasiado grande. Máximo 5MB.'; return; }

  uploadingFavicon.value = true;
  errorMsg.value = '';

  try {
    const ext = file.name.split('.').pop();
    const fileName = `favicon/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    form.value.favicon_url = publicUrl;
    successMsg.value = 'Favicon subido exitosamente';
  } catch (err) {
    console.error('Error uploading favicon:', err);
    if (err.message?.includes('row-level security')) {
      errorMsg.value = 'Error de permisos: Ejecuta la migración 012 en Supabase SQL Editor para configurar las políticas RLS del bucket.';
    } else if (err.message?.includes('bucket')) {
      errorMsg.value = 'El bucket "branding" no existe. Ejecuta la migración 012 en Supabase.';
    } else {
      errorMsg.value = err.message || 'Error al subir favicon';
    }
  } finally {
    uploadingFavicon.value = false;
    if (faviconInputRef.value) faviconInputRef.value.value = '';
  }
}

function clearFavicon() { form.value.favicon_url = ''; }

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
      logo_url: form.value.logo_url,
      favicon_url: form.value.favicon_url,
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
      tax_included: form.value.tax_included,
      sale_markup_percentage: form.value.sale_markup_percentage
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
