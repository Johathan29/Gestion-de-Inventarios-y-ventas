<template>
  <div class="max-w-5xl mx-auto">
    <!-- Form Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between" style="gap: var(--aurora-base); margin-bottom: var(--aurora-md);">
      <div class="flex items-start gap-3">
        <button @click="$router.push('/app/products')"
          class="aurora-btn-icon"
          @mouseenter="e => e.currentTarget.style.background = 'rgba(119,56,193,0.05)'"
          @mouseleave="e => e.currentTarget.style.background = 'transparent'">
          <span class="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(1.25rem, 3vw, 1.5rem); line-height: 1.3; font-weight: 700; color: var(--aurora-on-surface);">{{ isEdit ? 'Editar Producto' : 'Nuevo Producto' }}</h2>
          <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: var(--aurora-on-surface-variant); margin-top: 0.25rem;">
            {{ isEdit ? 'Modifica los datos del producto' : 'Completa la información para registrar un nuevo artículo en el inventario.' }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <router-link to="/app/products"
          class="aurora-btn-secondary">
          Cancelar
        </router-link>
        <button type="submit" form="product-form" :disabled="saving"
          class="aurora-btn-primary">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">{{ isEdit ? 'save' : 'add' }}</span>
          {{ saving ? 'Guardando...' : (isEdit ? 'Actualizar Producto' : 'Guardar') }}
        </button>
      </div>
    </div>

    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" style="margin-bottom: var(--aurora-base);" />

    <form id="product-form" @submit.prevent="handleSubmit" style="display: flex; flex-direction: column; gap: 1.25rem;">
      <!-- Información Básica -->
      <div class="aurora-raised-card">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface); padding-bottom: 0.5rem; margin-bottom: var(--aurora-md); display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--aurora-outline-variant);">
          <span class="material-symbols-outlined" style="color: var(--aurora-primary);">info</span>
          Información Básica
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2" style="gap: var(--aurora-base);">
          <div class="md:col-span-2">
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Nombre del Producto <span style="color: #ba1a1a;">*</span></label>
            <input v-model="form.name" required placeholder="Ej. Alimento Premium Gatos 2kg"
              class="aurora-input w-full"
              @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" />
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">SKU (Código Interno) <span style="color: #ba1a1a;">*</span></label>
            <input v-model="form.sku" required placeholder="PROD-001"
              class="aurora-input w-full uppercase"
              style="font-family: 'JetBrains Mono', monospace;"
              @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" />
            <p style="font-size: 0.75rem; color: var(--aurora-on-surface-variant); margin-top: 0.25rem; font-family: 'Inter', sans-serif;">Se genera automáticamente: CATEGORÍA-NÚMERO (ej: ROPA-008)</p>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Código de Barras</label>
            <div class="relative">
              <input v-model="form.barcode" placeholder="0000000000000"
                class="aurora-input w-full"
                style="font-family: 'JetBrains Mono', monospace;"
                @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" />
              <span class="material-symbols-outlined absolute right-3 top-2.5" style="color: var(--aurora-outline-variant); font-size: 1.25rem;">barcode_scanner</span>
            </div>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Categoría</label>
            <select v-model="form.category_id" required
              class="aurora-select"
              :style="{ background: `var(--aurora-surface-bright) url(${selectBgSvg}) no-repeat right 0.75rem center` }"
              @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }">
              <option value="">Selecciona una categoría</option>
              <option v-for="cat in flatCategories" :key="cat.id" :value="cat.id"
                :style="{ paddingLeft: (cat.level * 16 + 8) + 'px' }">
                {{ '—'.repeat(cat.level) + ' ' + cat.name }}
              </option>
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Marca</label>
            <input v-model="form.brand" placeholder="Ej. Royal Canin"
              class="aurora-input w-full"
              @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" />
          </div>
        </div>
      </div>

      <!-- Precios y Stock -->
      <div class="aurora-raised-card">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface); padding-bottom: 0.5rem; margin-bottom: var(--aurora-md); display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--aurora-outline-variant);">
          <span class="material-symbols-outlined" style="color: var(--aurora-primary);">payments</span>
          Precio y Existencias
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style="gap: var(--aurora-base); align-items: end;">
          <!-- Costo -->
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Costo (COP)</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 font-medium" style="font-family: 'JetBrains Mono', monospace; color: var(--aurora-on-surface-variant);">$</span>
              <input v-model.number="form.cost_price" type="number" step="0.01" min="0" placeholder="0.00"
                class="aurora-input w-full text-right"
                style="font-family: 'JetBrains Mono', monospace; padding-left: 2rem;"
                @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
          </div>
          <!-- Precio Venta -->
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Precio de Venta (COP) <span style="color: #ba1a1a;">*</span></label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 font-medium" style="font-family: 'JetBrains Mono', monospace; color: var(--aurora-on-surface-variant);">$</span>
              <input v-model.number="form.price" type="number" step="0.01" min="0" placeholder="0.00" required
                class="aurora-input w-full text-right font-bold"
                style="font-family: 'JetBrains Mono', monospace; color: var(--aurora-primary); padding-left: 2rem;"
                @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
          </div>
          <!-- Precio Comparativa -->
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Precio Comparativa</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 font-medium" style="font-family: 'JetBrains Mono', monospace; color: var(--aurora-on-surface-variant);">$</span>
              <input v-model.number="form.compare_price" type="number" step="0.01" min="0" placeholder="0.00"
                class="aurora-input w-full text-right"
                style="font-family: 'JetBrains Mono', monospace; padding-left: 2rem;"
                @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" />
            </div>
          </div>
          <!-- Estimated Gain (Read Only) -->
          <div class="sm:col-span-2 lg:col-span-1 rounded-lg p-3 flex justify-between items-center border" style="background: var(--aurora-surface-container); border-color: var(--aurora-outline-variant);">
            <div>
              <span style="display: block; margin-bottom: 0.25rem; font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: var(--aurora-on-surface-variant);">Ganancia Estimada</span>
              <span class="font-semibold" style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: var(--aurora-primary);" id="ganancia-calc">{{ formatTable(Math.max(0, form.price - form.cost_price)) }} ({{ marginPercent }}%)</span>
            </div>
            <span class="material-symbols-outlined" style="font-size: 2rem; opacity: 0.5; color: var(--aurora-primary);">trending_up</span>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style="gap: var(--aurora-base); margin-top: var(--aurora-base);">
          <!-- Stock Inicial -->
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Stock Inicial</label>
            <input v-model.number="form.stock" type="number" min="0" placeholder="0" :disabled="isEdit"
              class="aurora-input w-full"
              style="font-family: 'JetBrains Mono', monospace;"
              @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" />
            <p v-if="!isEdit" style="font-size: 0.75rem; color: var(--aurora-on-surface-variant); margin-top: 0.25rem; font-family: 'Inter', sans-serif;">Se creará un movimiento de inventario inicial</p>
          </div>
          <!-- Stock Mínimo -->
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Stock Mínimo (Alerta)</label>
            <div class="relative">
              <input v-model.number="form.min_stock" type="number" min="0" placeholder="5"
                class="aurora-input w-full"
                style="font-family: 'JetBrains Mono', monospace; border-left: 4px solid #ba1a1a;"
                @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
                @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" />
              <span class="material-symbols-outlined absolute right-3 top-2.5" style="color: #ba1a1a; font-size: 1rem;">warning</span>
            </div>
          </div>
          <!-- Unidad -->
          <div>
            <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Unidad</label>
            <select v-model="form.unit"
              class="aurora-select"
              :style="{ background: `var(--aurora-surface-bright) url(${selectBgSvg}) no-repeat right 0.75rem center` }"
              @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
              @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }">
              <option value="unidad">Unidad (Ud)</option>
              <option value="kilogramo">Kilogramo (Kg)</option>
              <option value="litro">Litro (L)</option>
              <option value="metro">Metro (m)</option>
              <option value="caja">Caja (Cja)</option>
              <option value="par">Par</option>
              <option value="pack">Pack</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Descripción -->
      <div class="aurora-raised-card">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface); padding-bottom: 0.5rem; margin-bottom: var(--aurora-md); display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--aurora-outline-variant);">
          <span class="material-symbols-outlined" style="color: var(--aurora-primary);">description</span>
          Descripción
        </h3>
        <textarea v-model="form.description" rows="4"
          placeholder="Descripción del producto, características, especificaciones..."
          class="aurora-input w-full resize-y"
          style="min-height: 100px;"
          @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
          @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }"></textarea>
        <div class="flex items-center" style="gap: 1.5rem; margin-top: var(--aurora-base);">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" v-model="form.featured"
              class="w-4 h-4 rounded transition-all"
              style="accent-color: var(--aurora-primary);" />
            <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Producto Destacado</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" v-model="form.is_active"
              class="w-4 h-4 rounded transition-all"
              style="accent-color: var(--aurora-primary);" />
            <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">Producto Activo</span>
          </label>
        </div>
      </div>

      <!-- Imágenes -->
      <div class="aurora-raised-card">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface); padding-bottom: 0.5rem; margin-bottom: var(--aurora-md); display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--aurora-outline-variant);">
          <span class="material-symbols-outlined" style="color: var(--aurora-primary);">image</span>
          Imágenes del Producto
        </h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          <div v-for="(img, idx) in form.images" :key="idx"
            class="relative group aspect-square rounded-xl overflow-hidden border-2 transition-all"
            style="border-color: var(--aurora-outline-variant); background: var(--aurora-surface-container);">
            <img :src="img" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
            <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
              <button type="button" @click="removeImage(idx)"
                class="p-2 rounded-full transition-all hover:scale-110 active:scale-95"
                style="background: #ba1a1a; color: white;">
                <span class="material-symbols-outlined" style="font-size: 1.125rem;">delete</span>
              </button>
            </div>
          </div>
          <!-- Upload Button -->
          <div @click="triggerUpload"
            class="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all"
            style="border-color: var(--aurora-outline-variant); background: var(--aurora-surface-container);"
            @mouseenter="e => { e.currentTarget.style.background = 'var(--aurora-surface-high)'; e.currentTarget.style.borderColor = 'var(--aurora-primary)'; }"
            @mouseleave="e => { e.currentTarget.style.background = 'var(--aurora-surface-container)'; e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; }">
            <span v-if="uploading" class="w-8 h-8 border-2 rounded-full animate-spin" style="border-color: var(--aurora-primary); border-top-color: transparent;"></span>
            <template v-else>
              <span class="material-symbols-outlined" style="font-size: 2rem; color: var(--aurora-outline-variant);">add_photo_alternate</span>
              <span style="font-size: 0.75rem; color: var(--aurora-on-surface-variant); margin-top: 0.25rem; font-family: 'Inter', sans-serif;">Agregar imagen</span>
            </template>
          </div>
          <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleUpload" />
        </div>
        <div class="flex items-center gap-2">
          <input v-model="imageUrlInput" type="url"
            class="aurora-input flex-1"
            placeholder="O pega una URL de imagen aquí..."
            @focus="e => { e.currentTarget.style.borderColor = 'var(--aurora-primary)'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(119,56,193,0.1)'; }"
            @blur="e => { e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; e.currentTarget.style.boxShadow = 'none'; }" />
          <button type="button" @click="addImageUrl"
            class="aurora-btn-secondary">
            Agregar URL
          </button>
        </div>
      </div>

      <!-- Variants Section -->
      <div class="aurora-raised-card">
        <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface); padding-bottom: 0.5rem; margin-bottom: var(--aurora-md); display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid var(--aurora-outline-variant);">
          <span class="material-symbols-outlined" style="color: var(--aurora-primary);">layers</span>
          Variantes del Producto
          <span style="font-size: 0.75rem; font-weight: 400; margin-left: 0.25rem; color: var(--aurora-on-surface-variant);">(tipo, modelo, color...)</span>
        </h3>

        <!-- Edit Variant Modal -->
        <Teleport to="body">
          <div v-if="showVariantModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.5);" @click.self="closeVariantModal">
            <div class="aurora-raised-card w-full max-w-lg max-h-[90vh] overflow-y-auto" style="padding: 1.5rem;">
              <div class="flex items-center justify-between" style="margin-bottom: var(--aurora-base);">
                <h4 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1rem; font-weight: 600; color: var(--aurora-on-surface);">
                  {{ editingVariantIndex === -1 ? 'Nueva Variante' : 'Editar Variante' }}
                </h4>
                <button type="button" @click="closeVariantModal" class="aurora-btn-icon" style="padding: 0.25rem;">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                <div>
                  <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.8rem; color: var(--aurora-on-surface);">Nombre <span style="color: #ba1a1a;">*</span></label>
                  <input v-model="variantForm.name" placeholder="Ej. Rojo, 2kg, Modelo X"
                    class="aurora-input w-full" style="font-size: 0.875rem;" />
                </div>
                <div class="grid grid-cols-2" style="gap: 0.75rem;">
                  <div>
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.8rem; color: var(--aurora-on-surface);">SKU</label>
                    <input v-model="variantForm.sku" placeholder="Auto-generado si se deja vacío"
                      class="aurora-input w-full uppercase"
                      style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem;" />
                    <p style="font-size: 0.7rem; color: var(--aurora-on-surface-variant); margin-top: 0.2rem;">Se genera automáticamente desde el SKU del producto + atributos</p>
                  </div>
                  <div>
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.8rem; color: var(--aurora-on-surface);">Stock</label>
                    <input v-model.number="variantForm.stock" type="number" min="0"
                      class="aurora-input w-full"
                      style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem;" />
                  </div>
                </div>
                <div class="grid grid-cols-2" style="gap: 0.75rem;">
                  <div>
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.8rem; color: var(--aurora-on-surface);">Precio</label>
                    <div class="relative">
                      <span class="absolute left-3 top-2 text-sm" style="color: var(--aurora-on-surface-variant);">$</span>
                      <input v-model.number="variantForm.price" type="number" step="0.01" min="0"
                        class="aurora-input w-full text-right"
                        style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; padding-left: 1.75rem;" />
                    </div>
                  </div>
                  <div>
                    <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.8rem; color: var(--aurora-on-surface);">Precio Comparativa</label>
                    <div class="relative">
                      <span class="absolute left-3 top-2 text-sm" style="color: var(--aurora-on-surface-variant);">$</span>
                      <input v-model.number="variantForm.compare_price" type="number" step="0.01" min="0"
                        class="aurora-input w-full text-right"
                        style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; padding-left: 1.75rem;" />
                    </div>
                  </div>
                </div>
                <!-- Attributes (key-value) -->
                <div>
                  <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.8rem; color: var(--aurora-on-surface);">Atributos (tipo, modelo, color...)</label>
                  <div v-for="(attr, ai) in variantForm.attributes" :key="ai" class="flex gap-2 mb-2">
                    <input v-model="attr.key" placeholder="Ej. color"
                      class="aurora-input flex-1" style="font-size: 0.875rem;" />
                    <input v-model="attr.value" placeholder="Ej. rojo"
                      class="aurora-input flex-1" style="font-size: 0.875rem;" />
                    <button type="button" @click="variantForm.attributes.splice(ai, 1)" class="aurora-btn-icon danger" style="padding: 0.5rem;">
                      <span class="material-symbols-outlined" style="font-size: 1.125rem;">remove_circle</span>
                    </button>
                  </div>
                  <button type="button" @click="variantForm.attributes.push({ key: '', value: '' })"
                    class="aurora-btn-secondary" style="font-size: 0.875rem; padding: 0.375rem 0.75rem;">
                    <span class="material-symbols-outlined" style="font-size: 1rem;">add</span> Agregar atributo
                  </button>
                </div>
                <!-- Sort Order -->
                <div>
                  <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.8rem; color: var(--aurora-on-surface);">Orden</label>
                  <input v-model.number="variantForm.sort_order" type="number" min="0" placeholder="0"
                    class="aurora-input" style="width: 6rem; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem;" />
                </div>
                <!-- Images -->
                <div>
                  <label style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-family: 'Inter', sans-serif; font-size: 0.8rem; color: var(--aurora-on-surface);">Imágenes</label>
                  <div class="flex flex-wrap gap-2 mb-2">
                    <div v-for="(img, ii) in variantForm.images" :key="ii"
                      class="relative group w-14 h-14 rounded-lg overflow-hidden border"
                      style="border-color: var(--aurora-outline-variant); background: var(--aurora-surface-container);">
                      <img :src="img" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                      <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <button type="button" @click="variantForm.images.splice(ii, 1)"
                          class="p-1 rounded-full bg-red-500 text-white">
                          <span class="material-symbols-outlined" style="font-size: 0.875rem;">delete</span>
                        </button>
                      </div>
                    </div>
                    <!-- Upload tile -->
                    <div @click="variantFileInput?.click()"
                      class="w-14 h-14 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all"
                      style="border-color: var(--aurora-outline-variant); background: var(--aurora-surface-container);"
                      @mouseenter="e => { e.currentTarget.style.background = 'var(--aurora-surface-high)'; e.currentTarget.style.borderColor = 'var(--aurora-primary)'; }"
                      @mouseleave="e => { e.currentTarget.style.background = 'var(--aurora-surface-container)'; e.currentTarget.style.borderColor = 'var(--aurora-outline-variant)'; }">
                      <span v-if="uploadingVariantImage" class="w-5 h-5 border-2 rounded-full animate-spin" style="border-color: var(--aurora-primary); border-top-color: transparent;"></span>
                      <span v-else class="material-symbols-outlined" style="font-size: 1.25rem; color: var(--aurora-outline-variant);">add_photo_alternate</span>
                    </div>
                  </div>
                  <!-- Hidden file input for variant images -->
                  <input type="file" ref="variantFileInput" accept="image/*" multiple
                    style="display: none;" @change="handleVariantUpload" />
                  <!-- URL input as alternative -->
                  <div class="flex gap-2">
                    <input v-model="variantImageUrl" type="url" placeholder="https://ejemplo.com/imagen.jpg"
                      class="aurora-input flex-1" style="font-size: 0.875rem;" />
                    <button type="button" @click="addVariantImage"
                      class="aurora-btn-secondary" style="font-size: 0.875rem;">
                      Agregar URL
                    </button>
                  </div>
                </div>
                <div class="flex items-center gap-2 pt-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" v-model="variantForm.is_active" class="w-4 h-4" style="accent-color: var(--aurora-primary);" />
                    <span style="font-size: 0.85rem; color: var(--aurora-on-surface);">Activo</span>
                  </label>
                </div>
              </div>
              <div class="flex justify-end gap-3 mt-6 pt-4" style="border-top: 1px solid var(--aurora-outline-variant);">
                <button type="button" @click="closeVariantModal"
                  class="aurora-btn-secondary">
                  Cancelar
                </button>
                <button type="button" @click="saveVariant"
                  class="aurora-btn-primary">
                  {{ editingVariantIndex === -1 ? 'Agregar' : 'Guardar' }}
                </button>
              </div>
            </div>
          </div>
        </Teleport>

        <!-- Existing Variants List -->
        <div v-if="variants.length > 0" style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: var(--aurora-base);">
          <div v-for="(v, vi) in variants" :key="v.id || vi"
            class="flex items-center gap-3 p-3 rounded-xl border transition-all"
            style="border-color: var(--aurora-outline-variant); background: var(--aurora-surface-container);">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <div v-if="v.images && v.images[0]" class="w-8 h-8 rounded-md overflow-hidden shrink-0 border" style="border-color: var(--aurora-outline-variant);">
                  <img :src="v.images[0]" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                </div>
                <span class="font-medium truncate" style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface);">{{ v.name }}</span>
                <span v-if="!v.is_active" class="aurora-badge-danger" style="font-size: 0.75rem;">Inactivo</span>
              </div>
              <div class="flex flex-wrap" style="gap: 1rem 0.25rem; margin-top: 0.25rem; font-size: 0.8rem; color: var(--aurora-on-surface-variant); font-family: 'JetBrains Mono', monospace;">
                <span>SKU: {{ v.sku }}</span>
                <span v-if="v.price">Precio: ${{ v.price }}</span>
                <span>Stock: {{ v.stock ?? 0 }}</span>
                <span v-if="v.attributes && Object.keys(v.attributes).length">
                  <template v-for="(val, key) in v.attributes" :key="key">
                    <span class="inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded-full text-xs" style="background: rgba(119,56,193,0.08); color: var(--aurora-primary);">
                      {{ key }}: {{ val }}
                    </span>
                  </template>
                </span>
              </div>
            </div>
            <button type="button" @click="editVariant(vi)"
              class="aurora-btn-icon" style="color: var(--aurora-primary);">
              <span class="material-symbols-outlined" style="font-size: 1.125rem;">edit</span>
            </button>
            <button type="button" @click="deleteVariant(vi)"
              class="aurora-btn-icon danger">
              <span class="material-symbols-outlined" style="font-size: 1.125rem;">delete</span>
            </button>
          </div>
        </div>
        <div v-else style="text-align: center; padding: 1.5rem 0; border-radius: var(--aurora-radius-xl); margin-bottom: var(--aurora-base); border: 1px dashed var(--aurora-outline-variant); background: var(--aurora-surface-container);">
          <span class="material-symbols-outlined" style="display: block; margin-bottom: 0.5rem; color: var(--aurora-outline-variant); font-size: 2rem;">layers</span>
          <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant);">Este producto no tiene variantes aún.</p>
        </div>

        <button type="button" @click="openNewVariantModal"
          class="aurora-btn-secondary">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">add</span>
          Agregar Variante
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { productsAPI, categoriesAPI } from '../../api';
import { supabase } from '../../api/supabase';
import { useCurrency } from '../../composables/useCurrency';
import Alert from '../../components/shared/Alert.vue';

const { formatTable } = useCurrency();

const selectBgSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234f4539' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E";

const route = useRoute();
const router = useRouter();
const isEdit = computed(() => !!route.params.id);
const categories = ref([]);
const saving = ref(false);
const uploading = ref(false);
const errorMsg = ref('');
const fileInput = ref(null);
const imageUrlInput = ref('');

const form = reactive({
  name: '',
  sku: '',
  barcode: '',
  category_id: '',
  brand: '',
  price: 0,
  cost_price: 0,
  compare_price: 0,
  stock: 0,
  min_stock: 5,
  unit: 'unidad',
  description: '',
  featured: false,
  is_active: true,
  images: []
});

// ========== Variant State ==========
const variants = ref([]);
const showVariantModal = ref(false);
const editingVariantIndex = ref(-1);
const savingVariant = ref(false);
const variantImageUrl = ref('');
const variantFileInput = ref(null);
const uploadingVariantImage = ref(false);

const defaultVariantForm = () => ({
  name: '', sku: '', price: null, stock: 0, compare_price: null,
  attributes: [], is_active: true, sort_order: 0,
  images: []
});

const variantForm = reactive(defaultVariantForm());

function resetVariantForm() {
  Object.assign(variantForm, defaultVariantForm());
}

function openNewVariantModal() {
  resetVariantForm();
  // Prefill SKU, price, stock from product
  variantForm.sku = form.sku || '';
  variantForm.price = form.price ?? null;
  variantForm.stock = form.stock || 0;
  editingVariantIndex.value = -1;
  showVariantModal.value = true;
}

function editVariant(idx) {
  const v = variants.value[idx];
  editingVariantIndex.value = idx;
  // Convert attributes object to array of key-value
  const attrs = [];
  if (v.attributes && typeof v.attributes === 'object') {
    for (const [key, value] of Object.entries(v.attributes)) {
      attrs.push({ key, value: String(value) });
    }
  }
  Object.assign(variantForm, {
    name: v.name || '',
    sku: v.sku || '',
    price: v.price ?? null,
    stock: v.stock ?? 0,
    compare_price: v.compare_price ?? null,
    attributes: attrs,
    is_active: v.is_active !== false,
    sort_order: v.sort_order ?? 0,
    images: Array.isArray(v.images) ? [...v.images] : []
  });
  showVariantModal.value = true;
}

function closeVariantModal() {
  showVariantModal.value = false;
  resetVariantForm();
}

function addVariantImage() {
  const url = variantImageUrl.value.trim();
  if (url) {
    variantForm.images.push(url);
    variantImageUrl.value = '';
  }
}

async function handleVariantUpload(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  uploadingVariantImage.value = true;
  const productId = route.params.id;
  try {
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const fileName = `products/${productId}/variants/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) {
        console.error('Variant image upload error:', error);
        if (error.message?.includes('bucket') || error.statusCode === 404) {
          alert('El bucket de almacenamiento no existe. Crea el bucket "product-images" (público) en Supabase Dashboard > Storage.');
        } else {
          throw error;
        }
        break;
      }
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);
      variantForm.images.push(publicUrl);
    }
  } catch (err) {
    console.error('Error uploading variant image:', err);
    alert('Error al subir imagen de variante');
  } finally {
    uploadingVariantImage.value = false;
    if (variantFileInput.value) variantFileInput.value.value = '';
  }
}

async function saveVariant() {
  if (!variantForm.name.trim()) {
    return alert('El nombre de la variante es requerido');
  }
  savingVariant.value = true;
  try {
    // Build attributes object from array
    const attrsObj = {};
    for (const attr of variantForm.attributes) {
      if (attr.key.trim()) attrsObj[attr.key.trim()] = attr.value.trim();
    }

    // Auto-generate SKU from product SKU + attributes if not provided
    let variantSku = variantForm.sku.trim();
    if (!variantSku) {
      const attrParts = Object.values(attrsObj).filter(Boolean).join('-');
      variantSku = form.sku
        ? `${form.sku}-${attrParts || Math.random().toString(36).substring(2, 6)}`
        : `VAR-${Date.now().toString(36).toUpperCase()}`;
    }

    const payload = {
      name: variantForm.name.trim(),
      sku: variantSku.toUpperCase(),
      price: variantForm.price || null,
      stock: variantForm.stock || 0,
      compare_price: variantForm.compare_price || null,
      attributes: attrsObj,
      is_active: variantForm.is_active,
      sort_order: variantForm.sort_order || 0,
      images: variantForm.images.filter(u => u.trim())
    };

    if (editingVariantIndex.value === -1) {
      // Create new variant
      const res = await productsAPI.createVariant(route.params.id, payload);
      variants.value.push(res.data);
    } else {
      // Update existing variant
      const existing = variants.value[editingVariantIndex.value];
      await productsAPI.updateVariant(route.params.id, existing.id, payload);
      variants.value[editingVariantIndex.value] = { ...existing, ...payload };
    }
    closeVariantModal();
  } catch (err) {
    console.error('Error saving variant:', err);
    alert('Error al guardar variante: ' + (err.response?.data?.error?.message || err.message));
  } finally {
    savingVariant.value = false;
  }
}

async function deleteVariant(idx) {
  const v = variants.value[idx];
  if (!confirm(`¿Eliminar la variante "${v.name}"?`)) return;
  try {
    if (v.id) {
      await productsAPI.deleteVariant(route.params.id, v.id);
    }
    variants.value.splice(idx, 1);
  } catch (err) {
    console.error('Error deleting variant:', err);
    alert('Error al eliminar variante');
  }
}

// Aplanar categorías para el select
const flatCategories = computed(() => {
  const flatten = (items, level = 0) => {
    let result = [];
    for (const item of items) {
      result.push({ ...item, level });
      if (item.children && item.children.length > 0) {
        result = result.concat(flatten(item.children, level + 1));
      }
    }
    return result;
  };
  return flatten(categories.value);
});

// Obtener abreviatura de categoría (primeras 4 letras en mayúscula)
const getCategoryAbbreviation = (categoryId) => {
  if (!categoryId) return 'PROD';
  const cat = flatCategories.value.find(c => c.id === categoryId);
  if (!cat) return 'PROD';
  // Tomar primeras 4 letras del nombre, eliminar espacios y caracteres especiales
  const name = cat.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚüÜñÑ\s]/g, '').trim();
  const words = name.split(/\s+/);
  if (words.length >= 2) {
    return words.map(w => w.charAt(0).toUpperCase()).join('').substring(0, 4);
  }
  return name.substring(0, 4).toUpperCase();
};

// Auto-generar SKU cuando se selecciona una categoría
watch(() => form.category_id, async (newVal) => {
  if (!newVal || isEdit.value) return;
  const prefix = getCategoryAbbreviation(newVal);
  try {
    // Obtener el último SKU con ese prefijo para generar el correlativo
    const res = await productsAPI.getAll({ search: prefix, limit: 1 });
    const products = res.data || [];
    let maxNum = 0;
    products.forEach(p => {
      if (p.sku && p.sku.startsWith(prefix + '-')) {
        const num = parseInt(p.sku.split('-')[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    const nextNum = String(maxNum + 1).padStart(3, '0');
    form.sku = `${prefix}-${nextNum}`;
  } catch (e) {
    // Si hay error, usar un número por defecto
    form.sku = `${prefix}-001`;
  }
});

// Margen de ganancia estimado
const marginPercent = computed(() => {
  if (form.cost_price <= 0) return 0;
  return Math.round(((form.price - form.cost_price) / form.cost_price) * 100);
});

onMounted(async () => {
  try {
    const catRes = await categoriesAPI.getAll();
    categories.value = Array.isArray(catRes.data) ? catRes.data : [];
  } catch (e) {
    console.error('Error fetching categories:', e);
  }
  if (isEdit.value) {
    try {
      const res = await productsAPI.getById(route.params.id);
      const prod = res.data || {};
      form.name = prod.name || '';
      form.sku = prod.sku || '';
      form.barcode = prod.barcode || '';
      form.category_id = prod.category_id || '';
      form.brand = prod.brand || '';
      form.price = prod.price ?? 0;
      form.cost_price = prod.cost_price ?? 0;
      form.compare_price = prod.compare_price ?? 0;
      form.stock = prod.stock ?? 0;
      form.min_stock = prod.min_stock ?? 5;
      form.unit = prod.unit || 'unidad';
      form.description = prod.description || '';
      form.featured = prod.featured ?? false;
      form.is_active = prod.status === 'active' || prod.is_active;
      form.images = Array.isArray(prod.images) ? [...prod.images] : [];
      // Load variants
      if (Array.isArray(prod.product_variants)) {
        variants.value = prod.product_variants.map(v => ({
          ...v,
          attributes: typeof v.attributes === 'object' && v.attributes ? v.attributes : {}
        }));
      } else {
        // Fetch variants separately
        try {
          const varRes = await productsAPI.getVariants(route.params.id);
          variants.value = (varRes.data || []).map(v => ({
            ...v,
            attributes: typeof v.attributes === 'object' && v.attributes ? v.attributes : {}
          }));
        } catch (e) {
          console.warn('Error fetching variants:', e);
        }
      }
    } catch (e) {
      errorMsg.value = 'Error al cargar producto';
      console.error(e);
    }
  }
});

const triggerUpload = () => {
  fileInput.value?.click();
};

const handleUpload = async (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  uploading.value = true;
  try {
    for (const file of files) {
      // Intentar subir a través del backend (product-service)
      // que almacena en Supabase Storage y guarda la URL en la BD
      if (isEdit.value) {
        try {
          const res = await productsAPI.uploadImage(route.params.id, file);
          const { images, publicUrl } = res.data;
          form.images = images || [...form.images, publicUrl];
          continue;
        } catch (backendErr) {
          console.warn('Backend upload failed, trying direct Supabase upload:', backendErr);
          // Fallback: subir directamente a Supabase Storage
        }
      }

      // Upload directo a Supabase Storage (fallback o para nuevos productos)
      // Incluimos el product ID en la ruta para que el trigger de Storage
      // pueda emparejar el archivo con el producto correspondiente
      const productId = route.params.id || 'new';
      const ext = file.name.split('.').pop();
      const fileName = `products/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) {
        console.error('Upload error:', error);
        if (error.message?.includes('bucket') || error.statusCode === 404) {
          errorMsg.value = 'El bucket de almacenamiento no existe. Crea el bucket "product-images" (público) en Supabase Dashboard > Storage.';
        } else {
          throw error;
        }
        break;
      }
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(data.path);
      form.images.push(publicUrl);
    }
  } catch (err) {
    console.error('Error uploading image:', err);
    errorMsg.value = 'Error al subir imagen';
  } finally {
    uploading.value = false;
    // Reset file input
    if (fileInput.value) fileInput.value.value = '';
  }
};

const addImageUrl = () => {
  const url = imageUrlInput.value?.trim();
  if (!url) return;
  // Si estamos editando, podemos usar el backend para descargar y almacenar la imagen
  if (isEdit.value) {
    productsAPI.uploadImageByUrl(route.params.id, url)
      .then(res => {
        form.images = res.data.images || [...form.images, res.data.publicUrl];
      })
      .catch(err => {
        console.warn('Backend URL upload failed, adding URL directly:', err);
        form.images.push(url);
      });
  } else {
    form.images.push(url);
  }
  imageUrlInput.value = '';
};

const removeImage = async (idx) => {
  const removedUrl = form.images[idx];
  form.images.splice(idx, 1);
  // Si estamos editando, eliminar también del backend storage
  if (isEdit.value && removedUrl) {
    try {
      await productsAPI.deleteImage(route.params.id, removedUrl);
    } catch (err) {
      console.warn('Could not delete image from storage:', err);
    }
  }
};

const handleSubmit = async () => {
  saving.value = true;
  errorMsg.value = '';
  try {
    // Prepare data for backend
    const productData = {
      name: form.name,
      barcode: form.barcode || undefined,
      category_id: form.category_id || null,
      brand: form.brand || undefined,
      price: form.price,
      cost_price: form.cost_price > 0 ? form.cost_price : undefined,
      compare_price: form.compare_price > 0 ? form.compare_price : undefined,
      min_stock: form.min_stock,
      unit: form.unit,
      description: form.description || undefined,
      featured: form.featured,
      status: form.is_active ? 'active' : 'inactive',
      images: form.images
    };
    if (!isEdit.value && form.stock > 0) {
      productData.stock = form.stock;
    }
    if (isEdit.value) {
      await productsAPI.update(route.params.id, productData);
    } else {
      await productsAPI.create(productData);
    }
    router.push('/app/products');
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Error al guardar producto';
    errorMsg.value = msg;
  } finally {
    saving.value = false;
  }
};
</script>
