<template>
  <div class="px-gutter">
    <!-- Page Header & Toolbar -->
    <!-- Enhanced Page Header Section -->
    <div
      class="mesh-gradient-header"
      style="
        background: radial-gradient(circle at 100% 100%, #f0c04d 0%, #9154dc 50%, #7738c1 100%);
      "
    >
      <!-- Decorative Icon -->
      <div class="header-icon-container">
        <span class="material-symbols-outlined animate-header-icon"> inventory_2 </span>
      </div>

      <!-- Header Glass Content -->
      <div class="header-glass">
        <!-- Page Information -->
        <div class="header-information">
          <PageHeader
            title="Products Module"
            description="Manage your global inventory and product specifications in real-time."
            tag="h1"
          />
        </div>

        <!-- Header Actions -->
        <div class="header-actions">
          <!-- Search -->
          <div class="header-search-wrapper">
            <input
              class="header-search"
              placeholder="Quick search catalog..."
              type="text"
              @input="debouncedSearch"
            />

            <span class="material-symbols-outlined header-search-icon"> search </span>
          </div>

          <!-- Action Buttons -->
          <div class="header-buttons">
            <!-- New Product -->
            <button
              class="header-button header-button-primary"
              v-if="can('products', 'create')"
              @click="$router.push('/app/products/create')"
            >
              <span class="material-symbols-outlined"> add_box </span>

              New Product
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Product Data Table Card -->
    <div class="aurora-raised-card !p-0 overflow-hidden flex flex-col" style="min-height: 500px">
      <!-- Table Header (Filter/Sort Bar) -->
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-3"
        style="border-color: var(--aurora-outline-variant)"
      >
        <!-- Left: Filters + Sort -->
        <div class="flex flex-wrap items-center gap-3 filter-bar-container">
          <!-- Filter Button -->
          <button
            @click="toggleFilters"
            class="border !px-3 !py-1.5 flex items-center gap-1 border-[var(--aurora-outline-variant)] hover:!bg-[#9161f4] hover:text-white transition-colors duration-200 rounded-md text-[#9161f4] bg-white"
            :class="{ 'aurora-pressed': showFilters }"
            style="padding: 9px 14px; font-size: 0.8rem; position: relative; border-radius: 0.75rem"
          >
            <span class="material-symbols-outlined" style="font-size: 1.05rem"> filter_list </span>

            <span>Filtrar</span>

            <!-- Active Filters Indicator -->
            <span
              v-if="hasActiveFilters"
              class="w-2 h-2 rounded-full absolute -top-1 -right-1"
              style="background: var(--aurora-error, #ef4444)"
            ></span>
          </button>

          <!-- Sort Menu -->
          <div class="sort-menu-container relative">
            <button
              @click="toggleSortMenu"
              class="border !px-3 !py-1.5 flex items-center gap-1 border-[var(--aurora-outline-variant)] hover:!bg-[#9161f4] hover:text-white transition-colors duration-200 rounded-md text-[#9161f4] bg-white"
              :class="{ 'aurora-pressed': showSortMenu }"
              style="padding: 9px 14px; min-height: 38px"
            >
              <span class="material-icons-outlined" style="font-size: 1rem"> sort </span>

              <span>
                {{ getActiveSortLabel() }}
              </span>

              <span class="material-icons-outlined opacity-60" style="font-size: 1rem">
                expand_more
              </span>
            </button>

            <!-- Sort Dropdown -->
            <div
              v-if="showSortMenu"
              class="absolute top-full left-0 mt-2 z-50 aurora-raised-card py-1 w-56 shadow-lg rounded-xl overflow-hidden"
              style="
                background: var(--aurora-surface-container-lowest);
                border: 1px solid var(--aurora-outline-variant);
              "
            >
              <button
                v-for="opt in sortOptions"
                :key="opt.key + opt.dir"
                @click="selectSort(opt)"
                class="w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between text-on-surface hover:bg-[var(--aurora-surface-container)]"
                :class="
                  sortKey === opt.key && sortDir === opt.dir
                    ? 'font-semibold bg-[var(--aurora-surface-container)]'
                    : ''
                "
              >
                <span>{{ opt.label }}</span>

                <span
                  v-if="sortKey === opt.key && sortDir === opt.dir"
                  class="material-icons-outlined"
                  style="font-size: 1rem; color: var(--aurora-primary)"
                >
                  check
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Right: View Mode -->
        <div class="text-sm text-on-surface-variant flex items-center gap-2">
          <span class="hidden sm:inline"> Vista: </span>

          <div
            class="aurora-pressed flex overflow-hidden rounded-xl"
            style="
              background: var(--aurora-surface-container);
              border: 1px solid var(--aurora-outline-variant);
            "
          >
            <!-- Table View -->
            <button
              @click="viewMode = 'table'"
              class="p-2 transition-all duration-200"
              :class="
                viewMode === 'table'
                  ? 'text-[var(--aurora-primary)] bg-[var(--aurora-surface-container-high)]'
                  : 'text-on-surface-variant'
              "
            >
              <span class="material-icons-outlined" style="font-size: 1.2rem"> table_rows </span>
            </button>

            <!-- Grid View -->
            <button
              @click="viewMode = 'grid'"
              class="p-2 transition-all duration-200"
              :class="
                viewMode === 'grid'
                  ? 'text-[var(--aurora-primary)] bg-[var(--aurora-surface-container-high)]'
                  : 'text-on-surface-variant'
              "
            >
              <span class="material-icons-outlined" style="font-size: 1.2rem"> grid_view </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Filter Panel -->
      <div
        v-if="showFilters"
        class="p-4 border-b filter-panel-container"
        style="
          background: var(--aurora-surface-container);
          border-color: var(--aurora-outline-variant);
        "
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <!-- Category -->
          <div class="flex flex-col gap-1">
            <label class="block mb-1 font-medium text-xs text-on-surface-variant">
              Categoría
            </label>

            <select v-model="filters.category_id" class="aurora-select">
              <option value="">Todas las categorías</option>

              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Status -->
          <div class="flex flex-col gap-1">
            <label class="block mb-1 font-medium text-xs text-on-surface-variant"> Estado </label>

            <select v-model="filters.status" class="aurora-select">
              <option value="">Todos los estados</option>

              <option value="active">Activo</option>

              <option value="inactive">Inactivo</option>
            </select>
          </div>

          <!-- Price Range -->
          <div class="col-span-1 sm:col-span-2 lg:col-span-2">
            <label class="block mb-2 font-medium text-xs text-on-surface-variant">
              Rango de Precio
            </label>

            <div style="padding: 0.25rem 0">
              <!-- Values -->
              <div class="flex items-center justify-between mb-2">
                <span class="font-mono text-xs font-semibold" style="color: var(--aurora-primary)">
                  {{ formatTable(filters.price_min ?? 0) }}
                </span>

                <span class="font-mono text-xs text-on-surface-variant">
                  {{ formatTable(filters.price_max ?? priceRangeMax) }}
                </span>
              </div>

              <!-- Slider -->
              <div class="relative" style="height: 28px">
                <!-- Base Track -->
                <div
                  style="
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    transform: translateY(-50%);
                    height: 5px;
                    background: var(--aurora-outline-variant);
                    border-radius: 999px;
                  "
                ></div>

                <!-- Active Track -->
                <div
                  :style="{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '5px',
                    background: 'var(--aurora-primary)',
                    borderRadius: '999px',
                    left: minPercent + '%',
                    width: rangePercent + '%'
                  }"
                ></div>

                <!-- Minimum Price -->
                <input
                  type="range"
                  :min="0"
                  :max="priceRangeMax"
                  step="100"
                  v-model.number="filters.price_min"
                  @input="clampMin"
                  class="range-slider-input"
                />

                <!-- Maximum Price -->
                <input
                  type="range"
                  :min="0"
                  :max="priceRangeMax"
                  step="100"
                  v-model.number="filters.price_max"
                  @input="clampMax"
                  class="range-slider-input"
                />
              </div>

              <!-- Min / Max Labels -->
              <div class="flex items-center justify-between mt-1">
                <span class="text-xs text-on-surface-variant"> $0 </span>

                <span class="text-xs text-on-surface-variant">
                  ${{ priceRangeMax.toLocaleString('es-CO') }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Actions -->
        <div class="flex flex-wrap items-center gap-3 mt-5">
          <!-- Apply -->
          <button @click="applyFilters" class="aurora-btn-primary flex items-center gap-2">
            <span class="material-icons-outlined" style="font-size: 1rem"> search </span>

            Aplicar Filtros
          </button>

          <!-- Clear -->
          <button
            v-if="hasActiveFilters"
            @click="clearFilters"
            class="aurora-btn-icon text-on-surface-variant"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>
      <ProductsSkeleton v-if="loading" />

      <!-- Desktop Table View -->
      <div v-else-if="viewMode === 'table'" class="hidden md:block">
        <DataTable
          :columns="productColumns"
          :data="products"
          :server-pagination="true"
          :total="pagination.total"
          :current-page-prop="currentPage"
          title="Lista de Productos"
          :per-page="perPage"
          empty-message="No hay productos registrados"
          @page-change="changePage"
          @row-click="$router.push(`/app/products/${$event.id}`)"
        >
          <template #cell-image="{ row }">
            <div
              class="w-12 h-12 rounded-[32px] overflow-hidden flex items-center justify-center"
              style="
                background: var(--aurora-surface-container);
                border: 1px solid var(--aurora-outline-variant);
              "
            >
              <img
                v-if="firstImage(row)"
                :src="firstImage(row)"
                :alt="row.name"
                class="w-full h-full object-cover"
                @error="brokenImages[row.id] = true"
              />
              <span
                v-else
                class="material-icons-outlined"
                style="color: var(--aurora-outline); font-size: 1.5rem"
                >inventory_2</span
              >
            </div>
          </template>
          <template #cell-name="{ row }">
            <div class="font-medium text-sm text-on-surface">{{ row.name }}</div>
            <div v-if="row.brand" class="text-xs text-on-surface-variant mt-0.5">
              {{ row.brand }}
            </div>
          </template>
          <template #cell-sku="{ row }">
            <span class="text-xs font-mono font-semibold" style="color: var(--aurora-primary)">{{
              row.sku
            }}</span>
          </template>
          <template #cell-category="{ row }">
            <span class="aurora-badge aurora-badge-primary">
              {{ row.categories?.name || row.category_name || '-' }}
            </span>
          </template>
          <template #cell-stock="{ row }">
            <span class="font-medium text-sm" :style="{ color: stockColor(row) }">
              {{ row.stock ?? 0 }}
            </span>
          </template>
          <template #cell-status="{ row }">
            <span
              v-if="row.status === 'active' || row.is_active"
              class="aurora-badge aurora-badge-success"
              >Activo</span
            >
            <span
              v-else
              class="aurora-badge"
              style="
                background: var(--aurora-surface-container);
                color: var(--aurora-on-surface-variant);
              "
              >Inactivo</span
            >
          </template>
          <template #actions="{ row }">
            <button
              v-if="can('products', 'update')"
              @click.stop="$router.push(`/app/products/${row.id}/edit`)"
              class="aurora-btn-icon"
              title="Editar"
            >
              <span class="material-icons-outlined" style="font-size: 1.25rem">edit</span>
            </button>
          </template>
        </DataTable>
      </div>

      <!-- Desktop Grid View -->
      <div v-else-if="viewMode === 'grid'" class="hidden md:block p-gutter">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
          <div
            v-for="prod in products"
            :key="prod.id"
            class="aurora-raised-card overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg"
            @click="$router.push(`/app/products/${prod.id}`)"
          >
            <!-- Grid Image -->
            <div
              class="aspect-[4/3] overflow-hidden flex items-center justify-center"
              style="
                background: var(--aurora-surface-container);
                border-bottom: 1px solid var(--aurora-outline-variant);
              "
            >
              <img
                v-if="firstImage(prod)"
                :src="firstImage(prod)"
                :alt="prod.name"
                class="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                @error="brokenImages[prod.id] = true"
              />
              <span
                v-else
                class="material-icons-outlined"
                style="color: var(--aurora-outline); font-size: 3rem"
                >inventory_2</span
              >
            </div>
            <!-- Grid Body -->
            <div class="p-md">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold truncate text-on-surface">{{ prod.name }}</p>
                  <p class="text-xs mt-0.5 text-on-surface-variant">{{ prod.brand || '' }}</p>
                </div>
                <span
                  v-if="prod.featured"
                  class="material-icons-outlined shrink-0"
                  style="font-size: 1rem; color: #f59e0b"
                  >star</span
                >
              </div>
              <div class="flex items-center justify-between mt-2">
                <span
                  class="font-mono text-sm font-semibold"
                  style="color: var(--aurora-primary)"
                  >{{ formatTable(prod.price) }}</span
                >
                <span class="text-xs font-medium" :style="{ color: stockColor(prod) }"
                  >{{ prod.stock ?? 0 }} uds</span
                >
              </div>
              <div
                class="flex items-center justify-between mt-2 pt-2"
                style="border-top: 1px solid var(--aurora-outline-variant)"
              >
                <span class="aurora-badge aurora-badge-primary">
                  {{ prod.categories?.name || prod.category_name || 'General' }}
                </span>
                <span
                  v-if="prod.status === 'active' || prod.is_active"
                  class="inline-flex items-center gap-1 text-xs font-semibold"
                  style="color: var(--aurora-success, #166534)"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    style="background: var(--aurora-success, #16a34a)"
                  ></span>
                  Activo
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    style="background: var(--aurora-outline)"
                  ></span>
                  Inactivo
                </span>
              </div>
              <div class="flex gap-2 mt-3" @click.stop>
                <button
                  @click="$router.push(`/app/products/${prod.id}`)"
                  class="aurora-btn-primary flex-1 text-xs"
                >
                  Ver más
                </button>
                <button
                  v-if="can('products', 'update')"
                  @click="$router.push(`/app/products/${prod.id}/edit`)"
                  class="aurora-btn-icon flex-1 text-xs"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
          <div v-if="products.length === 0" class="col-span-full text-center py-16">
            <span
              class="material-icons-outlined"
              style="
                font-size: 3rem;
                color: var(--aurora-outline);
                display: block;
                margin-bottom: 0.75rem;
              "
              >inventory_2</span
            >
            <p class="text-on-surface mb-1">No hay productos registrados</p>
            <p class="text-xs text-on-surface-variant mb-4">
              Crea tu primer producto para empezar a gestionar tu inventario
            </p>
            <button
              @click="$router.push('/app/products/create')"
              class="text-sm font-medium"
              style="color: var(--aurora-primary)"
            >
              + Crear producto
            </button>
          </div>
        </div>
      </div>

      <!-- Grid Pagination Footer -->
      <div
        v-if="viewMode === 'grid' && totalPages > 1"
        class="p-gutter mt-auto flex flex-col sm:flex-row justify-between items-center gap-gutter"
        style="
          background: var(--aurora-surface-container);
          border-top: 1px solid var(--aurora-outline-variant);
        "
      >
        <span class="text-sm text-on-surface-variant font-medium">
          Mostrando
          <strong class="text-on-surface"
            >{{ (currentPage - 1) * perPage + 1 }}-{{
              Math.min(currentPage * perPage, pagination.total)
            }}</strong
          >
          de <strong class="text-on-surface">{{ pagination.total }}</strong> productos
        </span>
        <div class="flex gap-1">
          <button
            @click="changePage(currentPage - 1)"
            :disabled="currentPage <= 1"
            class="aurora-btn-icon text-on-surface-variant disabled:opacity-50"
          >
            <span class="material-icons-outlined" style="font-size: 1.125rem">chevron_left</span>
            Anterior
          </button>
          <button
            @click="changePage(currentPage + 1)"
            :disabled="currentPage >= totalPages"
            class="aurora-btn-icon text-on-surface-variant disabled:opacity-50"
          >
            Siguiente
            <span class="material-icons-outlined" style="font-size: 1.125rem">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Cards with Accordion -->
    <div class="md:hidden space-y-4 px-gutter">
      <CardGridSkeleton v-if="loading" />
      <template v-else>
        <div
          v-for="prod in products"
          :key="prod.id"
          class="aurora-raised-card overflow-hidden transition-shadow"
          :class="{ 'shadow-lg': accordionOpen === prod.id }"
        >
          <!-- Card Header -->
          <div class="p-md cursor-pointer" @click="toggleAccordion(prod.id)">
            <div class="flex items-start gap-3">
              <div
                class="w-14 h-14 rounded-[32px] overflow-hidden flex items-center justify-center shrink-0"
                style="
                  background: var(--aurora-surface-container);
                  border: 1px solid var(--aurora-outline-variant);
                "
              >
                <img
                  v-if="firstImage(prod)"
                  :src="firstImage(prod)"
                  :alt="prod.name"
                  class="w-full h-full object-cover"
                  @error="brokenImages[prod.id] = true"
                />
                <span
                  v-else
                  class="material-icons-outlined"
                  style="color: var(--aurora-outline); font-size: 1.5rem"
                  >inventory_2</span
                >
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-sm font-semibold truncate text-on-surface">{{ prod.name }}</p>
                  <span
                    class="material-icons-outlined transition-transform duration-300 shrink-0 text-on-surface-variant"
                    :class="{ 'rotate-180': accordionOpen === prod.id }"
                    >expand_more</span
                  >
                </div>
                <p class="font-mono text-xs text-on-surface-variant mt-1">{{ prod.sku }}</p>
                <div class="flex items-center flex-wrap gap-3 mt-2">
                  <span
                    class="font-mono font-semibold"
                    style="color: var(--aurora-primary); font-size: 0.875rem"
                    >{{ formatTable(prod.price) }}</span
                  >
                  <span class="text-xs font-medium" :style="{ color: stockColor(prod) }">
                    {{ prod.stock ?? 0 }} en stock
                  </span>
                  <span
                    v-if="prod.status === 'active' || prod.is_active"
                    class="aurora-badge aurora-badge-success"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      style="background: var(--aurora-success, #16a34a)"
                    ></span>
                    Activo
                  </span>
                  <span
                    v-else
                    class="aurora-badge"
                    style="
                      background: var(--aurora-surface-container);
                      color: var(--aurora-on-surface-variant);
                    "
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      style="background: var(--aurora-outline)"
                    ></span>
                    Inactivo
                  </span>
                </div>
              </div>
            </div>
          </div>
          <!-- Accordion Detail -->
          <div
            v-show="accordionOpen === prod.id"
            class="px-md pb-md pt-0 border-t"
            style="border-color: var(--aurora-outline-variant)"
          >
            <div class="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p class="text-xs text-on-surface-variant mb-0.5">Categoría</p>
                <p class="font-medium text-sm text-on-surface">
                  {{ prod.categories?.name || prod.category_name || '-' }}
                </p>
              </div>
              <div>
                <p class="text-xs text-on-surface-variant mb-0.5">Marca</p>
                <p class="font-medium text-sm text-on-surface">{{ prod.brand || '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-on-surface-variant mb-0.5">Stock Mínimo</p>
                <p class="font-medium text-sm text-on-surface">{{ prod.min_stock ?? 0 }}</p>
              </div>
              <div>
                <p class="text-xs text-on-surface-variant mb-0.5">Unidad</p>
                <p class="font-medium text-sm text-on-surface">{{ prod.unit || 'unidad' }}</p>
              </div>
              <div v-if="prod.cost_price" class="col-span-2">
                <p class="text-xs text-on-surface-variant mb-0.5">Costo</p>
                <p class="font-medium text-sm text-on-surface">
                  {{ formatTable(prod.cost_price) }}
                </p>
              </div>
            </div>
            <div v-if="prod.description" class="mt-3">
              <p class="text-xs text-on-surface-variant mb-0.5">Descripción</p>
              <p class="text-sm text-on-surface">{{ prod.description }}</p>
            </div>
            <div
              class="flex flex-col md:flex-row items-center gap-2 mt-4 pt-3"
              style="border-top: 1px solid var(--aurora-outline-variant)"
            >
              <button
                @click="$router.push(`/app/products/${prod.id}`)"
                class="aurora-btn-primary flex-1"
              >
                Ver detalle
              </button>
              <button
                v-if="can('products', 'update')"
                @click="$router.push(`/app/products/${prod.id}/edit`)"
                class="aurora-btn-icon flex-1"
              >
                Editar
              </button>
            </div>
          </div>
        </div>
        <div v-if="products.length === 0" class="text-center py-12">
          <span
            class="material-icons-outlined"
            style="
              font-size: 3rem;
              color: var(--aurora-outline);
              display: block;
              margin-bottom: 0.75rem;
            "
            >inventory_2</span
          >
          <p class="text-sm text-on-surface-variant">No hay productos registrados</p>
        </div>
        <!-- Mobile Pagination (same as desktop) -->
        <div
          v-if="totalPages > 1"
          class="p-gutter mt-auto flex flex-col sm:flex-row justify-between items-center gap-gutter"
          style="
            background: var(--aurora-surface-container);
            border-top: 1px solid var(--aurora-outline-variant);
          "
        >
          <span class="text-sm text-on-surface-variant font-medium">
            Mostrando
            <strong class="text-on-surface"
              >{{ (currentPage - 1) * perPage + 1 }}-{{
                Math.min(currentPage * perPage, pagination.total)
              }}</strong
            >
            de <strong class="text-on-surface">{{ pagination.total }}</strong> productos
          </span>
          <div class="flex gap-1">
            <button
              @click="changePage(currentPage - 1)"
              :disabled="currentPage <= 1"
              class="aurora-btn-icon text-on-surface-variant disabled:opacity-50"
            >
              <span class="material-icons-outlined" style="font-size: 1.125rem">chevron_left</span>
              Anterior
            </button>
            <button
              @click="changePage(currentPage + 1)"
              :disabled="currentPage >= totalPages"
              class="aurora-btn-icon text-on-surface-variant disabled:opacity-50"
            >
              Siguiente
              <span class="material-icons-outlined" style="font-size: 1.125rem">chevron_right</span>
            </button>
          </div>
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
  import CardGridSkeleton from '../../components/skeletons/CardGridSkeleton.vue';
  import Loading from '../../components/shared/Loading.vue';
  import DataTable from '../../components/shared/DataTable.vue';
  import PageHeader from '../../components/shared/PageHeader.vue';
  import { useCurrency } from '../../composables/useCurrency';
  import ProductsSkeleton from '../../components/skeletons/DataTableSkeleton.vue';

  const { formatTable } = useCurrency();

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
  const clearSearch = () => {
    searchQuery.value = '';
    debouncedSearch();
  };
  const filters = reactive({
    category_id: '',
    status: '',
    price_min: null,
    price_max: null
  });

  // Sort options
  const selectBgSvg =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234f4539' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E";

  const productColumns = [
    { key: 'sku', label: 'SKU' },
    { key: 'image', label: 'Img', type: 'custom' },
    { key: 'name', label: 'Nombre', sortable: true },
    { key: 'category', label: 'Categoría' },
    { key: 'price', label: 'Precio', type: 'currency' },
    { key: 'stock', label: 'Stock' },
    { key: 'status', label: 'Estado' }
  ];

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
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++)
        pages.push(i);
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
    const active = sortOptions.find((o) => o.key === sortKey.value && o.dir === sortDir.value);
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
    return (
      filters.category_id ||
      filters.status ||
      filters.price_min !== null ||
      filters.price_max !== null
    );
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
    if (
      !target.closest('.filter-bar-container') &&
      !target.closest('.sort-menu-container') &&
      !target.closest('.filter-panel-container')
    ) {
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
      if (filters.price_min !== null && filters.price_min !== '')
        params.price_min = Number(filters.price_min);
      if (filters.price_max !== null && filters.price_max !== '')
        params.price_max = Number(filters.price_max);
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

<style scoped></style>
