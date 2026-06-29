<template>
  <div>
    <!-- Page Header & Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div>
        <h2 class="font-headline-lg-mobile md:font-headline-lg" style="font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.25; font-weight: 700; color: #0b1c30; letter-spacing: -0.02em; font-family: 'Plus Jakarta Sans', sans-serif;">Productos</h2>
        <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 1rem; line-height: 1.5; margin-top: 0.25rem;">
          {{ pagination.total || products.length }} producto{{ (pagination.total || products.length) !== 1 ? 's' : '' }} registrados en el inventario.
        </p>
      </div>
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <!-- Search -->
        <div class="relative flex-1 sm:flex-none">
          <div class="flex items-center w-full bg-white border border-[#d2c4b4] rounded-full px-4 py-2.5 focus-within:border-[#624200] focus-within:ring-2 focus-within:ring-[rgba(98,66,0,0.2)] transition-all shadow-sm">
            <span class="material-icons-outlined" style="color: #d2c4b4; margin-right: 0.5rem; font-size: 1.25rem;">search</span>
            <input v-model="searchQuery" type="text" placeholder="Buscar productos..."
              class="w-full bg-transparent border-none focus:ring-0 outline-none"
              style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #0b1c30;"
              @input="debouncedSearch" />
          </div>
        </div>
        <button v-if="can('products', 'create')" @click="$router.push('/app/products/create')"
          class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
          style="background: #624200; color: white; border-color: rgba(139,94,0,0.2); font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5;">
          <span class="material-icons-outlined" style="font-size: 1.25rem;">add</span>
          <span class="hidden sm:inline">Nuevo Producto</span>
        </button>
      </div>
    </div>

    <!-- Product Data Table Card -->
    <div class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 overflow-hidden flex flex-col" style="min-height: 500px;">
      <!-- Table Header (Filter/Sort Bar) -->
      <div class="filter-bar-container p-4 border-b border-[#d2c4b4]/30 flex justify-between items-center" style="background: #FDFBF7;">
        <div class="flex gap-2">
          <button @click="toggleFilters"
            class="px-3 py-1.5 text-sm font-medium border border-[#d2c4b4] rounded-md flex items-center gap-1 hover:bg-[#eff4ff] transition-colors bg-white relative"
            :class="{ 'ring-2 ring-[rgba(98,66,0,0.2)] border-[#624200]': showFilters }"
            style="font-family: 'Inter', sans-serif; color: #4f4539;">
            <span class="material-icons-outlined" style="font-size: 1rem;">filter_list</span>
            Filtrar
            <span v-if="hasActiveFilters" class="w-2 h-2 rounded-full absolute -top-1 -right-1" style="background: #ba1a1a;"></span>
          </button>
          <div class="sort-menu-container relative">
            <button @click="toggleSortMenu"
              class="px-3 py-1.5 text-sm font-medium border border-[#d2c4b4] rounded-md flex items-center gap-1 hover:bg-[#eff4ff] transition-colors bg-white"
              :class="{ 'ring-2 ring-[rgba(98,66,0,0.2)] border-[#624200]': showSortMenu }"
              style="font-family: 'Inter', sans-serif; color: #4f4539;">
              <span class="material-icons-outlined" style="font-size: 1rem;">sort</span>
              {{ getActiveSortLabel() }}
            </button>
            <!-- Sort Dropdown -->
            <div v-if="showSortMenu"
              class="absolute top-full left-0 mt-2 z-50 bg-white border border-[#d2c4b4] rounded-lg shadow-lg py-1 w-56"
              style="font-family: 'Inter', sans-serif;">
              <button v-for="opt in sortOptions" :key="opt.key + opt.dir"
                @click="selectSort(opt)"
                class="w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between"
                :class="sortKey === opt.key && sortDir === opt.dir ? 'bg-[#eff4ff] font-semibold' : 'hover:bg-[#eff4ff]'"
                style="color: #0b1c30;">
                {{ opt.label }}
                <span v-if="sortKey === opt.key && sortDir === opt.dir" class="material-icons-outlined" style="font-size: 1rem; color: #624200;">check</span>
              </button>
            </div>
          </div>
        </div>
        <div class="text-sm" style="color: #4f4539; display: flex; align-items: center; gap: 0.5rem;">
          <span class="hidden sm:inline" style="font-family: 'Inter', sans-serif;">Vista:</span>
          <div class="flex border border-[#d2c4b4] rounded-md overflow-hidden bg-white">
            <button @click="viewMode = 'table'"
              class="p-1 transition-colors"
              :class="viewMode === 'table' ? 'bg-[#eff4ff] text-[#624200]' : 'text-[#d2c4b4] hover:bg-[#eff4ff]'">
              <span class="material-icons-outlined" style="font-size: 1.25rem;">table_rows</span>
            </button>
            <button @click="viewMode = 'grid'"
              class="p-1 transition-colors"
              :class="viewMode === 'grid' ? 'bg-[#eff4ff] text-[#624200]' : 'text-[#d2c4b4] hover:bg-[#eff4ff]'">
              <span class="material-icons-outlined" style="font-size: 1.25rem;">grid_view</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Filter Panel -->
      <div v-if="showFilters" class="filter-panel-container px-4 py-4 border-b border-[#d2c4b4]/30" style="background: #faf9f6;">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Categoría</label>
            <select v-model="filters.category_id"
              class="w-full rounded-lg px-3 py-2 text-sm appearance-none bg-white transition-all"
              :style="{ fontFamily: 'Inter, sans-serif', color: '#0b1c30', border: '1.5px solid #E5E7EB', backgroundImage: `url(${selectBgSvg})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', paddingRight: '2.5rem' }">
              <option value="">Todas las categorías</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Estado</label>
            <select v-model="filters.status"
              class="w-full rounded-lg px-3 py-2 text-sm appearance-none bg-white transition-all"
              :style="{ fontFamily: 'Inter, sans-serif', color: '#0b1c30', border: '1.5px solid #E5E7EB', backgroundImage: `url(${selectBgSvg})`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', paddingRight: '2.5rem' }">
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
          <div class="col-span-1 sm:col-span-2 lg:col-span-2">
            <label class="block mb-2 font-medium" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #4f4539;">Rango de Precio (COP)</label>
            <div style="padding: 0.25rem 0;">
              <div class="flex items-center justify-between mb-2">
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; font-weight: 600; color: #624200;">
                  {{ formatCurrency(filters.price_min ?? 0) }}
                </span>
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #4f4539;">
                  {{ formatCurrency(filters.price_max ?? priceRangeMax) }}
                </span>
              </div>
              <div class="relative" style="height: 28px;">
                <!-- Track background -->
                <div style="position: absolute; top: 50%; left: 0; right: 0; transform: translateY(-50%); height: 4px; background: #E5E7EB; border-radius: 999px;"></div>
                <!-- Active range -->
                <div :style="{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', height: '4px', background: '#624200', borderRadius: '999px', left: minPercent + '%', width: rangePercent + '%' }"></div>
                <input type="range" :min="0" :max="priceRangeMax" step="100" v-model.number="filters.price_min" @input="clampMin"
                  class="range-slider-input" />
                <input type="range" :min="0" :max="priceRangeMax" step="100" v-model.number="filters.price_max" @input="clampMax"
                  class="range-slider-input" />
              </div>
              <div class="flex items-center justify-between mt-1">
                <span style="font-size: 0.65rem; color: #9ca3af; font-family: 'Inter', sans-serif;">$0</span>
                <span style="font-size: 0.65rem; color: #9ca3af; font-family: 'Inter', sans-serif;">${{ priceRangeMax.toLocaleString('es-CO') }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 mt-4">
          <button @click="applyFilters"
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style="background: #624200; color: white; font-family: 'Inter', sans-serif;">
            <span class="flex items-center gap-1">
              <span class="material-icons-outlined" style="font-size: 1rem;">search</span>
              Aplicar Filtros
            </span>
          </button>
          <button @click="clearFilters"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all border"
            style="background: #ffffff; color: #4f4539; border-color: #d2c4b4; font-family: 'Inter', sans-serif;">
            Limpiar Filtros
          </button>
        </div>
      </div>

      <Loading v-if="loading" />

      <!-- Desktop Table View -->
      <div v-else-if="viewMode === 'table'" class="hidden md:block overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr style="background: #F9F7F2; border-bottom: 1px solid rgba(210,196,180,0.5);">
              <th class="p-4 font-semibold w-16" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;">Img</th>
              <th class="p-4 font-semibold cursor-pointer select-none" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;"
                  @click="toggleSort('name')">
                <span class="flex items-center gap-1">Nombre <span v-if="sortKey === 'name'" class="material-icons-outlined" style="font-size: 0.875rem;">{{ sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span></span>
              </th>
              <th class="p-4 font-semibold" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;">SKU</th>
              <th class="p-4 font-semibold" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;">Categoría</th>
              <th class="p-4 font-semibold text-right cursor-pointer select-none" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;"
                  @click="toggleSort('price')">
                <span class="flex items-center justify-end gap-1">Precio <span v-if="sortKey === 'price'" class="material-icons-outlined" style="font-size: 0.875rem;">{{ sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</span></span>
              </th>
              <th class="p-4 font-semibold text-center" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;">Stock</th>
              <th class="p-4 font-semibold text-center" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;">Estado</th>
              <th class="p-4 font-semibold text-right" style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; font-weight: 600; text-transform: uppercase; color: #4f4539;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="prod in products" :key="prod.id"
              class="group cursor-pointer"
              style="border-bottom: 1px solid rgba(210,196,180,0.3); transition: background 0.15s;"
              @mouseenter="e => e.currentTarget.style.background = 'rgba(98,66,0,0.02)'"
              @mouseleave="e => e.currentTarget.style.background = ''"
              @click="$router.push(`/app/products/${prod.id}`)">
              <td class="p-4">
                <div class="w-12 h-12 rounded-md overflow-hidden flex items-center justify-center" style="background: #e5eeff; border: 1px solid rgba(210,196,180,0.3);">
                  <img v-if="firstImage(prod)" :src="firstImage(prod)" :alt="prod.name"
                    class="w-full h-full object-cover"
                    @error="brokenImages[prod.id] = true" />
                  <span v-else class="material-icons-outlined" style="color: #d2c4b4; font-size: 1.5rem;">inventory_2</span>
                </div>
              </td>
              <td class="p-4">
                <div style="font-weight: 500; color: #0b1c30; font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5;">{{ prod.name }}</div>
                <div v-if="prod.brand" style="font-size: 0.75rem; color: #4f4539; margin-top: 0.125rem; font-family: 'Inter', sans-serif;">{{ prod.brand }}</div>
              </td>
              <td class="p-4">
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; line-height: 1.4; font-weight: 500; background: #eff4ff; padding: 0.25rem 0.5rem; border-radius: 0.25rem; color: #4f4539; border: 1px solid rgba(210,196,180,0.2);">{{ prod.sku }}</span>
              </td>
              <td class="p-4">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style="background: rgba(253,202,92,0.3); color: #735500; border: 1px solid rgba(121,89,0,0.1); font-family: 'Inter', sans-serif;">
                  {{ prod.categories?.name || prod.category_name || '-' }}
                </span>
              </td>
              <td class="p-4 text-right" style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; line-height: 1.4; font-weight: 600; color: #0b1c30;">{{ formatCurrency(prod.price) }}</td>
              <td class="p-4 text-center">
                <span class="font-medium" :style="{ color: stockColor(prod), fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }">
                  {{ prod.stock ?? 0 }}
                </span>
              </td>
              <td class="p-4 text-center">
                <span v-if="prod.status === 'active' || prod.is_active" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border" style="background: #dcfce7; color: #166534; border-color: #bbf7d0; font-family: 'Inter', sans-serif;">
                  <span class="w-1.5 h-1.5 rounded-full" style="background: #16a34a;"></span>
                  Activo
                </span>
                <span v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border" style="background: #f3f4f6; color: #4b5563; border-color: #e5e7eb; font-family: 'Inter', sans-serif;">
                  <span class="w-1.5 h-1.5 rounded-full" style="background: #9ca3af;"></span>
                  Inactivo
                </span>
              </td>
              <td class="p-4 text-right" @click.stop>
                <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button @click="$router.push(`/app/products/${prod.id}`)"
                    class="p-1.5 rounded-md transition-colors" style="color: #4f4539;"
                    @mouseenter="e => { e.currentTarget.style.color = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.05)'; }"
                    @mouseleave="e => { e.currentTarget.style.color = '#4f4539'; e.currentTarget.style.background = ''; }"
                    title="Ver detalles">
                    <span class="material-icons-outlined" style="font-size: 1.25rem;">visibility</span>
                  </button>
                  <button v-if="can('products', 'update')" @click="$router.push(`/app/products/${prod.id}/edit`)"
                    class="p-1.5 rounded-md transition-colors" style="color: #4f4539;"
                    @mouseenter="e => { e.currentTarget.style.color = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.05)'; }"
                    @mouseleave="e => { e.currentTarget.style.color = '#4f4539'; e.currentTarget.style.background = ''; }"
                    title="Editar">
                    <span class="material-icons-outlined" style="font-size: 1.25rem;">edit</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="products.length === 0">
              <td colspan="8" class="px-5 py-16 text-center">
                <span class="material-icons-outlined" style="font-size: 3rem; color: #d2c4b4; display: block; margin-bottom: 0.75rem;">inventory_2</span>
                <p style="color: #4f4539; margin-bottom: 0.25rem; font-family: 'Inter', sans-serif;">No hay productos registrados</p>
                <p style="font-size: 0.75rem; color: #4f4539; margin-bottom: 1rem; font-family: 'Inter', sans-serif;">Crea tu primer producto para empezar a gestionar tu inventario</p>
                <button @click="$router.push('/app/products/create')"
                  style="font-size: 0.875rem; color: #624200; font-weight: 500; font-family: 'Inter', sans-serif;">
                  + Crear producto
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Desktop Grid View -->
      <div v-else-if="viewMode === 'grid'" class="hidden md:block p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div v-for="prod in products" :key="prod.id"
            class="bg-white rounded-[12px] border border-[#d2c4b4]/30 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-[#624200]/30"
            @click="$router.push(`/app/products/${prod.id}`)">
            <!-- Grid Image -->
            <div class="aspect-[4/3] overflow-hidden flex items-center justify-center" style="background: #e5eeff; border-bottom: 1px solid rgba(210,196,180,0.2);">
              <img v-if="firstImage(prod)" :src="firstImage(prod)" :alt="prod.name"
                class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                @error="brokenImages[prod.id] = true" />
              <span v-else class="material-icons-outlined" style="color: #d2c4b4; font-size: 3rem;">inventory_2</span>
            </div>
            <!-- Grid Body -->
            <div class="p-3">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold truncate" style="color: #0b1c30; font-family: 'Inter', sans-serif;">{{ prod.name }}</p>
                  <p class="text-xs mt-0.5" style="color: #4f4539; font-family: 'Inter', sans-serif;">{{ prod.brand || '' }}</p>
                </div>
                <span v-if="prod.featured" class="material-icons-outlined shrink-0" style="font-size: 1rem; color: #d0a71f;">star</span>
              </div>
              <div class="flex items-center justify-between mt-2">
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; font-weight: 600; color: #624200;">{{ formatCurrency(prod.price) }}</span>
                <span class="text-xs font-medium" :style="{ color: stockColor(prod), fontFamily: 'Inter, sans-serif' }">{{ prod.stock ?? 0 }} uds</span>
              </div>
              <div class="flex items-center justify-between mt-2 pt-2" style="border-top: 1px solid rgba(210,196,180,0.2);">
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style="background: rgba(253,202,92,0.3); color: #735500; font-family: 'Inter', sans-serif;">
                  {{ prod.categories?.name || prod.category_name || 'General' }}
                </span>
                <span v-if="prod.status === 'active' || prod.is_active" class="inline-flex items-center gap-1 text-xs font-semibold" style="color: #166534; font-family: 'Inter', sans-serif;">
                  <span class="w-1.5 h-1.5 rounded-full" style="background: #16a34a;"></span> Activo
                </span>
                <span v-else class="inline-flex items-center gap-1 text-xs font-semibold" style="color: #4b5563; font-family: 'Inter', sans-serif;">
                  <span class="w-1.5 h-1.5 rounded-full" style="background: #9ca3af;"></span> Inactivo
                </span>
              </div>
              <div class="flex gap-2 mt-3" @click.stop>
                <button @click="$router.push(`/app/products/${prod.id}`)"
                  class="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style="background: rgba(253,202,92,0.2); color: #624200; border: 1px solid rgba(139,94,0,0.15); font-family: 'Inter', sans-serif;">
                  Ver más
                </button>
                <button v-if="can('products', 'update')" @click="$router.push(`/app/products/${prod.id}/edit`)"
                  class="px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style="background: #ffffff; color: #4f4539; border: 1px solid #d2c4b4; font-family: 'Inter', sans-serif;">
                  Editar
                </button>
              </div>
            </div>
          </div>
          <div v-if="products.length === 0" class="col-span-full text-center py-16">
            <span class="material-icons-outlined" style="font-size: 3rem; color: #d2c4b4; display: block; margin-bottom: 0.75rem;">inventory_2</span>
            <p style="color: #4f4539; margin-bottom: 0.25rem; font-family: 'Inter', sans-serif;">No hay productos registrados</p>
            <p style="font-size: 0.75rem; color: #4f4539; margin-bottom: 1rem; font-family: 'Inter', sans-serif;">Crea tu primer producto para empezar a gestionar tu inventario</p>
            <button @click="$router.push('/app/products/create')"
              style="font-size: 0.875rem; color: #624200; font-weight: 500; font-family: 'Inter', sans-serif;">
              + Crear producto
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination Footer -->
      <div v-if="totalPages > 1" class="p-4 mt-auto flex flex-col sm:flex-row justify-between items-center gap-4" style="background: #F9F7F2; border-top: 1px solid rgba(210,196,180,0.3);">
        <span style="font-family: 'Inter', sans-serif; font-size: 0.875rem; line-height: 1.5; color: #4f4539; font-weight: 500;">
          Mostrando <strong style="color: #0b1c30; font-weight: 600;">{{ ((currentPage - 1) * perPage) + 1 }}-{{ Math.min(currentPage * perPage, pagination.total) }}</strong> de <strong style="color: #0b1c30; font-weight: 600;">{{ pagination.total }}</strong> productos
        </span>
        <div class="flex gap-1">
          <button @click="changePage(currentPage - 1)" :disabled="currentPage <= 1"
            class="px-3 py-1.5 text-sm font-medium border border-[#d2c4b4] rounded-md flex items-center gap-1 hover:bg-[#eff4ff] transition-colors bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            style="font-family: 'Inter', sans-serif; color: #4f4539;">
            <span class="material-icons-outlined" style="font-size: 1.125rem;">chevron_left</span> Anterior
          </button>
          <button @click="changePage(currentPage + 1)" :disabled="currentPage >= totalPages"
            class="px-3 py-1.5 text-sm font-medium border border-[#d2c4b4] rounded-md flex items-center gap-1 hover:bg-[#eff4ff] transition-colors bg-white hover:text-[#624200] hover:border-[#624200]/50 disabled:opacity-50 disabled:cursor-not-allowed"
            style="font-family: 'Inter', sans-serif; color: #4f4539;">
            Siguiente <span class="material-icons-outlined" style="font-size: 1.125rem;">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Cards with Accordion -->
    <div class="md:hidden space-y-4">
      <Loading v-if="loading" />
      <template v-else>
        <div v-for="prod in products" :key="prod.id"
          class="bg-white rounded-[16px] shadow-[0px_4px_20px_rgba(98,66,0,0.05)] border border-[#d2c4b4]/30 overflow-hidden transition-shadow"
          :class="{ 'shadow-md': accordionOpen === prod.id }">
          <!-- Card Header -->
          <div class="p-4 cursor-pointer" @click="toggleAccordion(prod.id)">
            <div class="flex items-start gap-3">
              <div class="w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center shrink-0" style="background: #e5eeff; border: 1px solid rgba(210,196,180,0.3);">
                <img v-if="firstImage(prod)" :src="firstImage(prod)" :alt="prod.name"
                  class="w-full h-full object-cover"
                  @error="brokenImages[prod.id] = true" />
                <span v-else class="material-icons-outlined" style="color: #d2c4b4; font-size: 1.5rem;">inventory_2</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm font-semibold truncate" style="color: #0b1c30; font-family: 'Inter', sans-serif;">{{ prod.name }}</p>
                  <span class="material-icons-outlined transition-transform duration-300 shrink-0" style="color: #d2c4b4; font-size: 1.25rem;"
                    :class="{ 'rotate-180': accordionOpen === prod.id }">expand_more</span>
                </div>
                <p style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #4f4539; margin-top: 0.25rem;">{{ prod.sku }}</p>
                <div class="flex items-center flex-wrap gap-3 mt-2">
                  <span style="font-family: 'JetBrains Mono', monospace; font-weight: 600; color: #0b1c30; font-size: 0.875rem;">{{ formatCurrency(prod.price) }}</span>
                  <span class="text-xs font-medium" :style="{ color: stockColor(prod), fontFamily: 'Inter, sans-serif' }">
                    {{ prod.stock ?? 0 }} en stock
                  </span>
                  <span v-if="prod.status === 'active' || prod.is_active" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style="background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; font-family: 'Inter', sans-serif;">
                    <span class="w-1.5 h-1.5 rounded-full" style="background: #16a34a;"></span>
                    Activo
                  </span>
                  <span v-else class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style="background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; font-family: 'Inter', sans-serif;">
                    <span class="w-1.5 h-1.5 rounded-full" style="background: #9ca3af;"></span>
                    Inactivo
                  </span>
                </div>
              </div>
            </div>
          </div>
          <!-- Accordion Detail -->
          <div v-show="accordionOpen === prod.id" class="px-4 pb-4 pt-0 border-t animate-fadeIn" style="border-color: rgba(210,196,180,0.3);">
            <div class="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p style="font-size: 0.75rem; color: #4f4539; margin-bottom: 0.125rem; font-family: 'Inter', sans-serif;">Categoría</p>
                <p style="font-weight: 500; color: #0b1c30; font-size: 0.875rem; font-family: 'Inter', sans-serif;">{{ prod.categories?.name || prod.category_name || '-' }}</p>
              </div>
              <div>
                <p style="font-size: 0.75rem; color: #4f4539; margin-bottom: 0.125rem; font-family: 'Inter', sans-serif;">Marca</p>
                <p style="font-weight: 500; color: #0b1c30; font-size: 0.875rem; font-family: 'Inter', sans-serif;">{{ prod.brand || '-' }}</p>
              </div>
              <div>
                <p style="font-size: 0.75rem; color: #4f4539; margin-bottom: 0.125rem; font-family: 'Inter', sans-serif;">Stock Mínimo</p>
                <p style="font-weight: 500; color: #0b1c30; font-size: 0.875rem; font-family: 'Inter', sans-serif;">{{ prod.min_stock ?? 0 }}</p>
              </div>
              <div>
                <p style="font-size: 0.75rem; color: #4f4539; margin-bottom: 0.125rem; font-family: 'Inter', sans-serif;">Unidad</p>
                <p style="font-weight: 500; color: #0b1c30; font-size: 0.875rem; font-family: 'Inter', sans-serif;">{{ prod.unit || 'unidad' }}</p>
              </div>
              <div v-if="prod.cost_price" class="col-span-2">
                <p style="font-size: 0.75rem; color: #4f4539; margin-bottom: 0.125rem; font-family: 'Inter', sans-serif;">Costo</p>
                <p style="font-weight: 500; color: #0b1c30; font-size: 0.875rem; font-family: 'Inter', sans-serif;">{{ formatCurrency(prod.cost_price) }}</p>
              </div>
            </div>
            <div v-if="prod.description" class="mt-3">
              <p style="font-size: 0.75rem; color: #4f4539; margin-bottom: 0.125rem; font-family: 'Inter', sans-serif;">Descripción</p>
              <p style="font-size: 0.875rem; color: #0b1c30; font-family: 'Inter', sans-serif;">{{ prod.description }}</p>
            </div>
            <div class="flex flex-col md:flex-row items-center gap-2 mt-4 pt-3" style="border-top: 1px solid rgba(210,196,180,0.3);">
              <button @click="$router.push(`/app/products/${prod.id}`)"
                class="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all w-full md:w-auto text-center"
                style="background: rgba(253,202,92,0.2); color: #624200; border: 1px solid rgba(139,94,0,0.15); font-family: 'Inter', sans-serif;">
                Ver detalle
              </button>
              <button v-if="can('products', 'update')" @click="$router.push(`/app/products/${prod.id}/edit`)"
                class="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all bg-white w-full md:w-auto text-center hover:bg-[#eff4ff] hover:border-[#624200]/50"
                style="color: #4f4539; border: 1px solid #d2c4b4; font-family: 'Inter', sans-serif;">
                Editar
              </button>
            </div>
          </div>
        </div>
        <div v-if="products.length === 0" class="text-center py-12">
          <span class="material-icons-outlined" style="font-size: 3rem; color: #d2c4b4; display: block; margin-bottom: 0.75rem;">inventory_2</span>
          <p style="color: #4f4539; font-family: 'Inter', sans-serif; font-size: 0.875rem;">No hay productos registrados</p>
        </div>
        <!-- Mobile Pagination -->
        <div v-if="totalPages > 1" class="flex items-center justify-between px-2 py-3">
          <button @click="changePage(currentPage - 1)" :disabled="currentPage <= 1"
            class="px-3 py-2 text-sm font-medium border border-[#d2c4b4] rounded-md bg-white transition-colors hover:bg-[#eff4ff] disabled:opacity-50 disabled:cursor-not-allowed"
            style="color: #4f4539; font-family: 'Inter', sans-serif;">
            <span class="material-icons-outlined" style="font-size: 1rem; vertical-align: middle;">chevron_left</span> Anterior
          </button>
          <span style="font-size: 0.875rem; color: #4f4539; font-family: 'Inter', sans-serif;">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <button @click="changePage(currentPage + 1)" :disabled="currentPage >= totalPages"
            class="px-3 py-2 text-sm font-medium border border-[#d2c4b4] rounded-md bg-white transition-colors hover:bg-[#eff4ff] disabled:opacity-50 disabled:cursor-not-allowed"
            style="color: #4f4539; font-family: 'Inter', sans-serif;">
            Siguiente <span class="material-icons-outlined" style="font-size: 1rem; vertical-align: middle;">chevron_right</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { productsAPI, categoriesAPI } from '../../api';
import { useAuth } from '../../composables/useAuth';
import Loading from '../../components/shared/Loading.vue';
import { formatCurrency } from '../../utils';

const router = useRouter();
const { can } = useAuth();
const products = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const currentPage = ref(1);
const perPage = ref(10);
const sortKey = ref('');
const sortDir = ref('asc');
const accordionOpen = ref(null);
const pagination = ref({ total: 0, totalPages: 1 });
const brokenImages = reactive({});

// Filter state
const showFilters = ref(false);
const showSortMenu = ref(false);
const viewMode = ref('table'); // 'table' | 'grid'
const categories = ref([]);

const filters = reactive({
  category_id: '',
  status: '',
  price_min: null,
  price_max: null
});

// Sort options
const selectBgSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234f4539' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E";

const sortOptions = [
  { key: 'name', dir: 'asc', label: 'Nombre (A-Z)' },
  { key: 'name', dir: 'desc', label: 'Nombre (Z-A)' },
  { key: 'price', dir: 'asc', label: 'Precio (menor a mayor)' },
  { key: 'price', dir: 'desc', label: 'Precio (mayor a menor)' },
  { key: 'created_at', dir: 'desc', label: 'Más recientes' }
];

const totalPages = computed(() => pagination.value.totalPages || 1);

const visiblePages = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const current = currentPage.value;
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }
  return pages;
});

const firstImage = (prod) => {
  if (!prod.images) return null;
  if (brokenImages[prod.id]) return null;
  if (Array.isArray(prod.images) && prod.images.length > 0) return prod.images[0];
  if (typeof prod.images === 'string') return prod.images;
  return null;
};

const stockClass = (prod) => {
  const stock = prod.stock ?? 0;
  const min = prod.min_stock ?? 5;
  if (stock <= 0) return 'text-red-600';
  if (stock <= min) return 'text-yellow-600';
  return 'text-green-600';
};

const stockColor = (prod) => {
  const stock = prod.stock ?? 0;
  const min = prod.min_stock ?? 5;
  if (stock <= 0) return '#991b1b';
  if (stock <= min) return '#b45309';
  return '#166534';
};

const toggleAccordion = (id) => {
  accordionOpen.value = accordionOpen.value === id ? null : id;
};

const toggleSort = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
  fetchProducts();
};

const changePage = (page) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  fetchProducts();
};

let debounceTimer = null;
const debouncedSearch = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchProducts();
  }, 400);
};

// Filter functions
const toggleFilters = () => {
  showFilters.value = !showFilters.value;
  if (showFilters.value) showSortMenu.value = false;
};

const toggleSortMenu = () => {
  showSortMenu.value = !showSortMenu.value;
  if (showSortMenu.value) showFilters.value = false;
};

const closeMenus = () => {
  showFilters.value = false;
  showSortMenu.value = false;
};

const selectSort = (option) => {
  sortKey.value = option.key;
  sortDir.value = option.dir;
  showSortMenu.value = false;
  currentPage.value = 1;
  fetchProducts();
};

const getActiveSortLabel = () => {
  const active = sortOptions.find(o => o.key === sortKey.value && o.dir === sortDir.value);
  return active ? active.label : 'Ordenar';
};

const applyFilters = () => {
  currentPage.value = 1;
  fetchProducts();
};

const clearFilters = () => {
  filters.category_id = '';
  filters.status = '';
  filters.price_min = null;
  filters.price_max = null;
  currentPage.value = 1;
  fetchProducts();
};

const hasActiveFilters = computed(() => {
  return filters.category_id || filters.status || filters.price_min !== null || filters.price_max !== null;
});

const priceRangeMax = 999999;

const minPercent = computed(() => {
  return ((filters.price_min ?? 0) / priceRangeMax) * 100;
});

const maxPercent = computed(() => {
  return ((filters.price_max ?? priceRangeMax) / priceRangeMax) * 100;
});

const rangePercent = computed(() => {
  return Math.max(0, maxPercent.value - minPercent.value);
});

function clampMin() {
  if (filters.price_min > filters.price_max) {
    filters.price_max = filters.price_min;
  }
}

function clampMax() {
  if (filters.price_max < filters.price_min) {
    filters.price_min = filters.price_max;
  }
}

// Click outside handler
const handleClickOutside = (e) => {
  const target = e.target;
  if (!target.closest('.filter-bar-container') && !target.closest('.sort-menu-container') && !target.closest('.filter-panel-container')) {
    closeMenus();
  }
};

onMounted(async () => {
  document.addEventListener('click', handleClickOutside);
  // Fetch categories for filter dropdown
  try {
    const catRes = await categoriesAPI.getAll();
    categories.value = Array.isArray(catRes.data) ? catRes.data : [];
  } catch (e) {
    console.error('Error fetching categories:', e);
  }
  fetchProducts();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

const fetchProducts = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: perPage.value,
      search: searchQuery.value || undefined,
      sort_by: sortKey.value || undefined,
      sort_order: sortDir.value || undefined
    };
    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.status) params.status = filters.status;
    if (filters.price_min !== null && filters.price_min !== '') params.price_min = Number(filters.price_min);
    if (filters.price_max !== null && filters.price_max !== '') params.price_max = Number(filters.price_max);
    const res = await productsAPI.getAll(params);
    // After interceptor unwrap: res.data = products array, res.pagination = { total, totalPages, ... }
    products.value = Array.isArray(res.data) ? res.data : [];
    if (res.pagination) {
      pagination.value = res.pagination;
    }
  } catch (e) {
    console.error('Error fetching products:', e);
    products.value = [];
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.range-slider-input {
  position: absolute;
  inset: 0;
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  pointer-events: none;
  margin: 0;
  padding: 0;
}
.range-slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #624200;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  cursor: pointer;
  pointer-events: auto;
}
.range-slider-input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #624200;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  cursor: pointer;
  pointer-events: auto;
}
.range-slider-input:focus {
  outline: none;
}
</style>
