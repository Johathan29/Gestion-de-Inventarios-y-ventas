<template>
  <div class="dw-widget" :class="`dw-widget-${widget.widget_type || widget.type}`" :style="widgetStyle">
    <!-- Widget Header -->
    <div class="dw-header" v-if="widget.dashboard_widgets?.name || widget.name">
      <div class="dw-header-left">
        <span class="dw-icon">{{ widget.dashboard_widgets?.icon || widget.icon || '📊' }}</span>
        <div>
          <h3 class="dw-title">{{ widget.dashboard_widgets?.name || widget.name }}</h3>
          <p class="dw-subtitle" v-if="widget.dashboard_widgets?.description || widget.description">
            {{ widget.dashboard_widgets?.description || widget.description }}
          </p>
        </div>
      </div>
      <div class="dw-header-actions">
        <button v-if="editable" class="dw-action-btn" @click="$emit('configure', widget)">⚙️</button>
        <button v-if="editable" class="dw-action-btn dw-delete" @click="$emit('remove', widget)">✕</button>
      </div>
    </div>

    <!-- Widget Content based on type -->
    <div class="dw-content">
      <!-- KPI Widget -->
      <div v-if="widgetType === 'kpi'" class="dw-kpi">
        <div class="dw-kpi-value" :style="{ color: widget.config?.color || '#1e293b' }">
          {{ kpiValue }}
        </div>
        <div class="dw-kpi-label">{{ widget.config?.label || 'Valor' }}</div>
        <div v-if="widget.config?.trend != null" class="dw-kpi-trend" :class="widget.config.trend >= 0 ? 'dw-trend-up' : 'dw-trend-down'">
          {{ widget.config.trend >= 0 ? '↑' : '↓' }} {{ Math.abs(widget.config.trend) }}%
        </div>
      </div>

      <!-- Chart Widget -->
      <div v-else-if="widgetType === 'chart'" class="dw-chart">
        <div class="dw-chart-placeholder">
          <span class="material-symbols-outlined" style="font-size: 48px; color: #cbd5e1;">bar_chart</span>
          <p>{{ widget.config?.chartType || 'Gráfico' }}</p>
        </div>
      </div>

      <!-- Table Widget -->
      <div v-else-if="widgetType === 'table'" class="dw-table">
        <table class="dw-table-content">
          <thead>
            <tr>
              <th v-for="col in (widget.config?.columns || [])" :key="col.key">{{ col.label }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in (widget.config?.rows || [])" :key="idx">
              <td v-for="col in (widget.config?.columns || [])" :key="col.key">{{ row[col.key] }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!widget.config?.rows?.length" class="dw-empty">Sin datos disponibles</p>
      </div>

      <!-- List Widget -->
      <div v-else-if="widgetType === 'list'" class="dw-list">
        <div v-for="(item, idx) in (widget.config?.items || [])" :key="idx" class="dw-list-item">
          <span class="dw-list-dot" :style="{ background: item.color || '#3b82f6' }"></span>
          <span class="dw-list-text">{{ item.label }}</span>
          <span class="dw-list-value">{{ item.value }}</span>
        </div>
        <p v-if="!widget.config?.items?.length" class="dw-empty">Sin datos</p>
      </div>

      <!-- Status Widget -->
      <div v-else-if="widgetType === 'status'" class="dw-status">
        <div v-for="(item, idx) in (widget.config?.statuses || [])" :key="idx" class="dw-status-item">
          <span class="dw-status-dot" :class="item.ok ? 'dw-dot-ok' : 'dw-dot-warn'"></span>
          <span class="dw-status-label">{{ item.label }}</span>
          <span class="dw-status-value">{{ item.value }}</span>
        </div>
      </div>

      <!-- Placeholder for unknown types -->
      <div v-else class="dw-placeholder">
        <span>📦 Widget: {{ widgetType }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  widget: { type: Object, required: true },
  editable: { type: Boolean, default: false },
  data: { type: Object, default: () => ({}) },
});

defineEmits(['configure', 'remove']);

const widgetType = computed(() => props.widget.widget_type || props.widget.type || props.widget.dashboard_widgets?.widget_type || 'kpi');

const kpiValue = computed(() => {
  if (props.data?.value != null) return props.data.value;
  return props.widget.config?.value || '—';
});

const widgetStyle = computed(() => {
  const config = props.widget.config || {};
  return {
    '--widget-accent': config.accentColor || '#3b82f6',
    gridColumn: config.colSpan ? `span ${config.colSpan}` : undefined,
  };
});
</script>

<style scoped>
.dw-widget {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}
.dw-widget:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1); }

/* Header */
.dw-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px 8px;
}
.dw-header-left { display: flex; align-items: center; gap: 12px; }
.dw-icon { font-size: 1.5rem; }
.dw-title { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 0.95rem; color: #1e293b; margin: 0; }
.dw-subtitle { font-size: 0.78rem; color: #94a3b8; margin: 2px 0 0; }
.dw-header-actions { display: flex; gap: 4px; }
.dw-action-btn { width: 28px; height: 28px; border: none; border-radius: 6px; background: #f1f5f9; cursor: pointer; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; }
.dw-action-btn:hover { background: #e2e8f0; }
.dw-delete:hover { background: #fee2e2; }

/* Content */
.dw-content { padding: 8px 20px 20px; }

/* KPI */
.dw-kpi { text-align: center; padding: 12px 0; }
.dw-kpi-value { font-family: 'Inter', sans-serif; font-size: 2rem; font-weight: 800; }
.dw-kpi-label { font-size: 0.82rem; color: #94a3b8; margin-top: 4px; }
.dw-kpi-trend { font-size: 0.8rem; font-weight: 600; margin-top: 6px; }
.dw-trend-up { color: #10b981; }
.dw-trend-down { color: #ef4444; }

/* Chart Placeholder */
.dw-chart { padding: 20px; }
.dw-chart-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 120px; color: #94a3b8; }
.dw-chart-placeholder p { margin: 8px 0 0; font-size: 0.85rem; }

/* Table */
.dw-table { overflow-x: auto; }
.dw-table-content { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.dw-table-content th { text-align: left; padding: 8px 10px; font-weight: 600; color: #64748b; border-bottom: 2px solid #f1f5f9; font-size: 0.78rem; text-transform: uppercase; }
.dw-table-content td { padding: 8px 10px; border-bottom: 1px solid #f8fafc; color: #1e293b; }
.dw-empty { text-align: center; color: #cbd5e1; padding: 30px; font-size: 0.85rem; }

/* List */
.dw-list { display: flex; flex-direction: column; gap: 10px; }
.dw-list-item { display: flex; align-items: center; gap: 10px; }
.dw-list-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dw-list-text { flex: 1; font-size: 0.88rem; color: #475569; }
.dw-list-value { font-weight: 700; font-size: 0.88rem; color: #1e293b; }

/* Status */
.dw-status { display: flex; flex-direction: column; gap: 8px; }
.dw-status-item { display: flex; align-items: center; gap: 10px; }
.dw-status-dot { width: 10px; height: 10px; border-radius: 50%; }
.dw-dot-ok { background: #10b981; }
.dw-dot-warn { background: #f59e0b; }
.dw-status-label { flex: 1; font-size: 0.88rem; color: #475569; }
.dw-status-value { font-weight: 600; font-size: 0.88rem; color: #1e293b; }

/* Placeholder */
.dw-placeholder { text-align: center; padding: 30px; color: #94a3b8; font-size: 0.85rem; }
</style>
