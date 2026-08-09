<template>
  <div class="dynamic-dashboard">
    <!-- Header -->
    <div class="dash-header" :style="{ background: gradient }">
      <div class="header-content">
        <h1>📊 Dashboard Dinámico</h1>
        <p>{{ widgets.length }} widgets activos · {{ companyName }}</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-white btn-sm" @click="showWidgetCatalog = true">+ Widget</button>
        <button class="btn btn-white btn-sm" @click="showPrefs = true">⚙️</button>
        <button class="btn btn-white btn-sm" @click="refreshAll">🔄</button>
      </div>
    </div>

    <!-- Widget Grid -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando dashboard...</p>
    </div>
    <div v-else-if="widgets.length" class="widget-grid" :class="compactMode ? 'compact' : ''">
      <div
        v-for="w in widgets"
        :key="w.id"
        class="widget-card"
        :class="[`size-${w.grid_width >= 9 ? 'full' : w.grid_width >= 6 ? 'large' : 'medium'}`]"
        :style="widgetStyle(w)"
      >
        <!-- Widget Header -->
        <div class="widget-header">
          <div class="widget-title">
            <span class="widget-icon">{{ widgetIcon(w.widget_slug) }}</span>
            <h3>{{ w.dashboard_widgets?.name || w.widget_slug }}</h3>
          </div>
          <div class="widget-actions">
            <button class="widget-action" @click="refreshWidget(w)" :title="'Refrescar'">🔄</button>
            <button class="widget-action" @click="toggleWidgetVisibility(w)" :title="'Ocultar'">✕</button>
          </div>
        </div>

        <!-- Widget Content -->
        <div class="widget-body">
          <div v-if="widgetData[w.id]" class="widget-data">
            <!-- KPI Widget -->
            <div v-if="isKpiWidget(w.widget_slug)" class="kpi-display">
              <span class="kpi-value">{{ formatKpiValue(widgetData[w.id].value) }}</span>
              <span class="kpi-label">{{ widgetData[w.id].label || 'Total' }}</span>
              <span v-if="widgetData[w.id].change" class="kpi-change" :class="widgetData[w.id].change > 0 ? 'positive' : 'negative'">
                {{ widgetData[w.id].change > 0 ? '▲' : '▼' }} {{ Math.abs(widgetData[w.id].change) }}%
              </span>
            </div>
            <!-- Chart Widget -->
            <div v-else-if="isChartWidget(w.widget_slug)" class="chart-display">
              <div v-for="(item, i) in (widgetData[w.id].items || [])" :key="i" class="chart-bar-row">
                <span class="bar-label">{{ item.label }}</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: item.percentage + '%', background: barColor(i) }"></div>
                </div>
                <span class="bar-value">{{ formatShort(item.value) }}</span>
              </div>
            </div>
            <!-- Table Widget -->
            <div v-else-if="isTableWidget(w.widget_slug)" class="table-display">
              <table class="widget-table">
                <thead>
                  <tr><th v-for="col in (widgetData[w.id].columns || [])" :key="col">{{ col }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in (widgetData[w.id].rows || [])" :key="i">
                    <td v-for="(val, j) in row" :key="j">{{ val }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- List Widget -->
            <div v-else-if="isListWidget(w.widget_slug)" class="list-display">
              <div v-for="(item, i) in (widgetData[w.id].items || [])" :key="i" class="list-item">
                <span class="list-icon">{{ item.icon || '•' }}</span>
                <span class="list-text">{{ item.label }}</span>
                <span class="list-value">{{ item.value }}</span>
              </div>
            </div>
            <!-- Generic -->
            <div v-else class="generic-display">
              <pre class="json-preview">{{ JSON.stringify(widgetData[w.id], null, 2) }}</pre>
            </div>
          </div>
          <div v-else class="widget-placeholder">
            <div class="spinner-sm"></div>
            <p>Cargando datos...</p>
          </div>
        </div>

        <!-- Widget Footer -->
        <div class="widget-footer">
          <span class="widget-update" v-if="widgetData[w.id]?._updated">
            Actualizado: {{ formatTime(widgetData[w.id]._updated) }}
          </span>
          <span class="widget-interval" v-if="w.refresh_interval">
            Auto: {{ w.refresh_interval }}s
          </span>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <span class="empty-icon">📊</span>
      <h3>Sin widgets configurados</h3>
      <p>Agrega widgets desde el catálogo para personalizar tu dashboard.</p>
      <button class="btn btn-primary" @click="showWidgetCatalog = true">+ Agregar Widgets</button>
    </div>

    <!-- Widget Catalog Modal -->
    <div v-if="showWidgetCatalog" class="modal-overlay" @click.self="showWidgetCatalog = false">
      <div class="modal modal-wide">
        <div class="modal-header">
          <h2>📦 Catálogo de Widgets</h2>
          <button class="modal-close" @click="showWidgetCatalog = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="catalog-filters">
            <button v-for="cat in widgetCategories" :key="cat" class="filter-btn" :class="{ active: catalogFilter === cat }" @click="catalogFilter = cat">
              {{ cat }}
            </button>
          </div>
          <div class="catalog-grid">
            <div v-for="w in filteredCatalog" :key="w.id" class="catalog-card" :class="{ 'already-added': isWidgetAdded(w.id) }">
              <div class="catalog-icon">{{ widgetIcon(w.slug) }}</div>
              <h4>{{ w.name }}</h4>
              <p>{{ w.description || 'Widget del dashboard' }}</p>
              <span class="tag">{{ w.category }}</span>
              <button v-if="!isWidgetAdded(w.id)" class="btn btn-sm btn-primary" @click="addWidget(w)" style="margin-top:8px">
                + Agregar
              </button>
              <span v-else class="added-label">✅ Agregado</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Preferences Modal -->
    <div v-if="showPrefs" class="modal-overlay" @click.self="showPrefs = false">
      <div class="modal">
        <div class="modal-header">
          <h2>⚙️ Preferencias</h2>
          <button class="modal-close" @click="showPrefs = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Tema</label>
            <select v-model="prefs.theme" class="form-input">
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
              <option value="auto">Automático</option>
            </select>
          </div>
          <div class="form-group">
            <label>Layout</label>
            <select v-model="prefs.layout" class="form-input">
              <option value="grid">Cuadrícula</option>
              <option value="list">Lista</option>
            </select>
          </div>
          <div class="form-group">
            <label class="check-label">
              <input type="checkbox" v-model="prefs.compactMode" />
              Modo compacto
            </label>
          </div>
          <div class="form-group">
            <label class="check-label">
              <input type="checkbox" v-model="prefs.refreshAuto" />
              Auto-refrescar
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="savePrefs">Guardar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { platformAdminAPI } from '@/api'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const companyId = ref(localStorage.getItem('companyId') || '00000000-0000-0000-0000-000000000001')
const companyName = ref(localStorage.getItem('companyName') || 'Mi Empresa')
const loading = ref(true)

// Data
const widgets = ref([])
const catalog = ref([])
const widgetData = ref({})

// UI
const showWidgetCatalog = ref(false)
const showPrefs = ref(false)
const catalogFilter = ref('todos')
const compactMode = ref(false)

const prefs = ref({
  theme: 'light',
  layout: 'grid',
  compactMode: false,
  refreshAuto: true
})

const gradient = 'radial-gradient(circle at 100% 100%, #667eea 0%, #764ba2 100%)'

const widgetCategories = computed(() => {
  const cats = [...new Set(catalog.value.map(w => w.category))]
  return ['todos', ...cats]
})

const filteredCatalog = computed(() => {
  if (catalogFilter.value === 'todos') return catalog.value
  return catalog.value.filter(w => w.category === catalogFilter.value)
})

function isWidgetAdded(widgetId) {
  return widgets.value.some(w => w.widget_id === widgetId)
}

// Widget type detection
function isKpiWidget(slug) { return ['daily_sales', 'total_revenue', 'active_orders', 'low_stock', 'pending_invoices'].includes(slug) }
function isChartWidget(slug) { return ['top_products', 'sales_trend', 'category_distribution', 'lead_pipeline'].includes(slug) }
function isTableWidget(slug) { return ['recent_orders', 'top_customers', 'pending_tasks'].includes(slug) }
function isListWidget(slug) { return ['recent_activity', 'notifications_summary', 'top_sellers'].includes(slug) }

function widgetIcon(slug) {
  const icons = {
    daily_sales: '💰', total_revenue: '📈', active_orders: '🛒', low_stock: '⚠️',
    pending_invoices: '📄', top_products: '🏆', sales_trend: '📊', category_distribution: '📁',
    recent_orders: '📋', recent_activity: '⚡', lead_pipeline: '🔄', top_customers: '👥',
    notifications_summary: '🔔', pending_tasks: '✅', top_sellers: '🏅'
  }
  return icons[slug] || '📊'
}

function barColor(i) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']
  return colors[i % colors.length]
}

function widgetStyle(w) {
  return {
    gridColumn: `span ${w.grid_width || 6}`,
  }
}

function formatKpiValue(v) {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'number') return v.toLocaleString('es-ES')
  return v
}

function formatShort(v) {
  if (!v) return '0'
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'K'
  return v.toLocaleString('es-ES')
}

function formatTime(d) {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

// Mock data generator for demo
function generateMockData(slug) {
  const now = new Date().toISOString()
  switch (slug) {
    case 'daily_sales':
      return { value: Math.floor(Math.random() * 50000) + 10000, label: 'Ventas Hoy (COP)', change: (Math.random() * 20 - 10).toFixed(1), _updated: now }
    case 'total_revenue':
      return { value: Math.floor(Math.random() * 500000) + 100000, label: 'Ingresos Mes', change: (Math.random() * 15 - 5).toFixed(1), _updated: now }
    case 'active_orders':
      return { value: Math.floor(Math.random() * 30) + 5, label: 'Pedidos Activos', change: (Math.random() * 10 - 5).toFixed(1), _updated: now }
    case 'low_stock':
      return { value: Math.floor(Math.random() * 10) + 1, label: 'Stock Bajo', _updated: now }
    case 'pending_invoices':
      return { value: Math.floor(Math.random() * 8) + 1, label: 'Facturas Pendientes', _updated: now }
    case 'top_products': {
      const items = [
        { label: 'Producto A', value: 145, percentage: 100 },
        { label: 'Producto B', value: 98, percentage: 68 },
        { label: 'Producto C', value: 72, percentage: 50 },
        { label: 'Producto D', value: 55, percentage: 38 },
        { label: 'Producto E', value: 41, percentage: 28 },
      ]
      return { items, _updated: now }
    }
    case 'sales_trend': {
      const items = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => ({
        label: d, value: Math.floor(Math.random() * 30000) + 5000, percentage: Math.floor(Math.random() * 80) + 20
      }))
      return { items, _updated: now }
    }
    case 'category_distribution': {
      const items = [
        { label: 'Electrónica', value: 35, percentage: 100 },
        { label: 'Ropa', value: 28, percentage: 80 },
        { label: 'Hogar', value: 22, percentage: 63 },
        { label: 'Otros', value: 15, percentage: 43 },
      ]
      return { items, _updated: now }
    }
    case 'recent_orders': {
      return {
        columns: ['Pedido', 'Cliente', 'Total', 'Estado'],
        rows: [
          ['#1024', 'Juan P.', '$125.000', '✅'],
          ['#1023', 'María G.', '$89.000', '🔄'],
          ['#1022', 'Carlos L.', '$210.000', '📦'],
          ['#1021', 'Ana R.', '$67.500', '✅'],
        ],
        _updated: now
      }
    }
    case 'lead_pipeline': {
      const items = [
        { label: 'Prospectos', value: 24, percentage: 100 },
        { label: 'Contactados', value: 18, percentage: 75 },
        { label: 'Propuesta', value: 8, percentage: 33 },
        { label: 'Cerrados', value: 3, percentage: 12 },
      ]
      return { items, _updated: now }
    }
    default:
      return { value: '—', label: slug, _updated: now }
  }
}

async function loadWidgets() {
  loading.value = true
  try {
    // Load available widgets from catalog
    const catalogRes = await platformAdminAPI.getWidgets().catch(() => ({ data: { data: [] } }))
    catalog.value = catalogRes.data?.data || catalogRes.data || []

    // Load company's widget assignments
    const widgetsRes = await platformAdminAPI.getCompanyWidgets(companyId.value).catch(() => ({ data: { data: [] } }))
    widgets.value = widgetsRes.data?.data || widgetsRes.data || []

    // If no widgets assigned, assign defaults based on catalog
    if (widgets.value.length === 0 && catalog.value.length > 0) {
      const defaults = catalog.value.filter(w => w.is_system || w.slug === 'daily_sales' || w.slug === 'active_orders' || w.slug === 'top_products').slice(0, 6)
      for (const w of defaults) {
        try {
          const { data } = await platformAdminAPI.addCompanyWidget(companyId.value, {
            widget_id: w.id,
            is_visible: true,
            sort_order: w.sort_order,
            grid_width: w.default_size === 'full' ? 12 : w.default_size === 'large' ? 8 : 6,
          })
          if (data?.data) widgets.value.push(data.data)
        } catch (e) { console.warn('Error adding default widget:', e) }
      }
    }

    // Load data for each widget
    loadWidgetData()
  } catch (err) {
    console.error('Dashboard load error:', err)
  }
  loading.value = false
}

function loadWidgetData() {
  widgets.value.forEach(w => {
    const slug = w.widget_slug || w.dashboard_widgets?.slug
    if (slug) {
      widgetData.value[w.id] = generateMockData(slug)
    }
  })
}

async function refreshAll() {
  loading.value = true
  await loadWidgets()
}

function refreshWidget(w) {
  const slug = w.widget_slug || w.dashboard_widgets?.slug
  if (slug) {
    widgetData.value[w.id] = generateMockData(slug)
  }
}

async function addWidget(widget) {
  try {
    const { data } = await platformAdminAPI.addCompanyWidget(companyId.value, {
      widget_id: widget.id,
      is_visible: true,
      sort_order: widgets.value.length,
      grid_width: widget.default_size === 'full' ? 12 : widget.default_size === 'large' ? 8 : 6,
    })
    if (data?.data) {
      widgets.value.push(data.data)
      const slug = widget.slug
      widgetData.value[data.data.id] = generateMockData(slug)
    }
    toast.success('Widget agregado al dashboard')
  } catch (err) {
    toast.error('Error: ' + err.message)
  }
}

async function toggleWidgetVisibility(w) {
  try {
    await platformAdminAPI.removeCompanyWidget(companyId.value, w.id)
    widgets.value = widgets.value.filter(widget => widget.id !== w.id)
    delete widgetData.value[w.id]
    toast.info('Widget ocultado del dashboard')
  } catch (err) {
    toast.error('Error: ' + err.message)
  }
}

function savePrefs() {
  compactMode.value = prefs.value.compactMode
  showPrefs.value = false
  toast.success('Preferencias guardadas')
}

let refreshTimer = null
onMounted(() => {
  loadWidgets()
  refreshTimer = setInterval(() => {
    if (prefs.value.refreshAuto) loadWidgetData()
  }, 60000)
})

onUnmounted(() => { if (refreshTimer) clearInterval(refreshTimer) })
</script>

<style scoped>
.dynamic-dashboard { min-height: 100vh; background: #f8fafc; }
.dash-header { padding: 24px 32px; display: flex; justify-content: space-between; align-items: center; color: #fff; }
.dash-header h1 { margin: 0; font-size: 1.5rem; font-weight: 800; font-family: 'Inter', sans-serif; }
.dash-header p { margin: 4px 0 0; opacity: 0.8; font-size: 0.85rem; }
.header-actions { display: flex; gap: 8px; }

.widget-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; padding: 24px 32px; }
.widget-grid.compact { gap: 8px; }
.widget-card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; }
.widget-card.size-full { grid-column: span 12; }
.widget-card.size-large { grid-column: span 8; }
.widget-card.size-medium { grid-column: span 6; }
.widget-card.size-small { grid-column: span 4; }

.widget-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid #f1f5f9; }
.widget-title { display: flex; align-items: center; gap: 8px; }
.widget-icon { font-size: 1.2rem; }
.widget-title h3 { margin: 0; font-size: 0.88rem; font-weight: 700; color: #1e293b; }
.widget-actions { display: flex; gap: 4px; }
.widget-action { background: none; border: none; cursor: pointer; font-size: 0.85rem; opacity: 0.5; padding: 2px 4px; }
.widget-action:hover { opacity: 1; }

.widget-body { padding: 16px 18px; min-height: 120px; }
.widget-footer { display: flex; justify-content: space-between; padding: 8px 18px; border-top: 1px solid #f1f5f9; font-size: 0.7rem; color: #94a3b8; }

/* KPI */
.kpi-display { text-align: center; padding: 8px 0; }
.kpi-value { display: block; font-size: 2rem; font-weight: 800; color: #1e293b; font-family: 'Inter', sans-serif; }
.kpi-label { display: block; font-size: 0.82rem; color: #64748b; margin-top: 4px; }
.kpi-change { display: inline-block; margin-top: 8px; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; }
.kpi-change.positive { background: #d1fae5; color: #065f46; }
.kpi-change.negative { background: #fee2e2; color: #991b1b; }

/* Chart bars */
.chart-display { display: flex; flex-direction: column; gap: 8px; }
.chart-bar-row { display: flex; align-items: center; gap: 10px; }
.bar-label { width: 90px; font-size: 0.78rem; color: #475569; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-track { flex: 1; height: 18px; background: #f1f5f9; border-radius: 9px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 9px; transition: width 0.6s ease; }
.bar-value { width: 50px; font-size: 0.75rem; font-weight: 700; color: #334155; }

/* Table */
.table-display { overflow-x: auto; }
.widget-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.widget-table th { text-align: left; padding: 6px 8px; background: #f8fafc; font-weight: 600; color: #475569; }
.widget-table td { padding: 6px 8px; border-top: 1px solid #f1f5f9; }

/* List */
.list-display { display: flex; flex-direction: column; gap: 6px; }
.list-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; }
.list-item:hover { background: #f8fafc; }
.list-icon { font-size: 0.85rem; }
.list-text { flex: 1; font-size: 0.82rem; color: #334155; }
.list-value { font-size: 0.82rem; font-weight: 600; color: #475569; }

/* Generic */
.generic-display { max-height: 200px; overflow-y: auto; }
.json-preview { font-size: 0.7rem; color: #475569; background: #f8fafc; padding: 8px; border-radius: 6px; margin: 0; }

.widget-placeholder { text-align: center; padding: 20px; color: #94a3b8; }
.widget-placeholder p { margin: 8px 0 0; font-size: 0.82rem; }

/* Catalog */
.catalog-filters { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
.filter-btn { padding: 5px 14px; border-radius: 20px; border: 1px solid #e2e8f0; background: #fff; font-size: 0.78rem; cursor: pointer; color: #475569; }
.filter-btn.active { background: #3b82f6; color: #fff; border-color: #3b82f6; }

.catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; max-height: 400px; overflow-y: auto; }
.catalog-card { padding: 14px; border: 1px solid #e2e8f0; border-radius: 10px; text-align: center; }
.catalog-card.already-added { opacity: 0.6; background: #f8fafc; }
.catalog-icon { font-size: 1.5rem; margin-bottom: 6px; }
.catalog-card h4 { margin: 0 0 4px; font-size: 0.85rem; }
.catalog-card p { margin: 0; font-size: 0.75rem; color: #64748b; }
.added-label { font-size: 0.75rem; color: #10b981; font-weight: 600; }

.btn { padding: 8px 16px; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.82rem; cursor: pointer; border: none; transition: all 0.2s; }
.btn-primary { background: #3b82f6; color: #fff; }
.btn-white { background: rgba(255,255,255,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.3); }
.btn-white:hover { background: rgba(255,255,255,0.3); }
.btn-sm { padding: 5px 10px; font-size: 0.75rem; }

.tag { display: inline-block; padding: 2px 8px; background: #f1f5f9; border-radius: 6px; font-size: 0.7rem; color: #475569; }

.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 3rem; }
.empty-state h3 { margin: 16px 0 8px; color: #1e293b; }
.empty-state p { color: #64748b; }

.loading-state { text-align: center; padding: 60px 20px; color: #64748b; }
.spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
.spinner-sm { width: 20px; height: 20px; border: 2px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 16px; width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
.modal-wide { width: 700px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; }
.modal-header h2 { font-weight: 700; font-size: 1.15rem; margin: 0; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
.modal-body { padding: 22px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid #f1f5f9; }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-weight: 600; font-size: 0.82rem; color: #475569; margin-bottom: 5px; }
.check-label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.form-input { width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.88rem; box-sizing: border-box; }

@media (max-width: 1024px) {
  .widget-card.size-full,
  .widget-card.size-large,
  .widget-card.size-medium,
  .widget-card.size-small { grid-column: span 12; }
}
</style>
