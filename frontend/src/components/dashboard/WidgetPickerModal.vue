<template>
  <Teleport to="body">
    <div v-if="show" class="wpm-overlay" @click.self="$emit('close')">
      <div class="wpm-modal">
        <div class="wpm-header">
          <h2>🎨 Seleccionar Widget</h2>
          <button class="wpm-close" @click="$emit('close')">✕</button>
        </div>
        <p class="wpm-desc">Elige un widget del catálogo para agregar al dashboard de la empresa.</p>

        <div class="wpm-grid">
          <div
            v-for="widget in widgets"
            :key="widget.id"
            class="wpm-card"
            @click="selectWidget(widget)"
          >
            <div class="wpm-card-icon" :style="{ background: widget.color || '#eff6ff', color: widget.icon_color || '#3b82f6' }">
              {{ widget.icon || '📊' }}
            </div>
            <div class="wpm-card-info">
              <span class="wpm-card-name">{{ widget.name }}</span>
              <span class="wpm-card-desc">{{ widget.description }}</span>
              <span class="wpm-card-type">{{ widget.widget_type }}</span>
            </div>
          </div>
        </div>

        <div v-if="!widgets.length" class="wpm-empty">
          No hay widgets disponibles en el catálogo.
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { platformAdminAPI } from '../../api';

const props = defineProps({
  show: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'select']);

const widgets = ref([]);

const fetchWidgets = async () => {
  try {
    const res = await platformAdminAPI.getWidgets();
    widgets.value = res.data || [];
  } catch (e) {
    console.error('Failed to load widget catalog:', e);
  }
};

const selectWidget = (widget) => {
  emit('select', widget);
  emit('close');
};

watch(() => props.show, (val) => {
  if (val) fetchWidgets();
});

onMounted(() => {
  if (props.show) fetchWidgets();
});
</script>

<style scoped>
.wpm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999; backdrop-filter: blur(4px);
}
.wpm-modal {
  background: #fff; border-radius: 20px; padding: 28px;
  max-width: 640px; width: 90%; max-height: 80vh; overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.25);
}
.wpm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.wpm-header h2 { font-family: 'Inter', sans-serif; font-size: 1.2rem; font-weight: 800; margin: 0; }
.wpm-close { width: 32px; height: 32px; border: none; border-radius: 8px; background: #f1f5f9; cursor: pointer; font-size: 1rem; }
.wpm-close:hover { background: #e2e8f0; }
.wpm-desc { font-size: 0.88rem; color: #64748b; margin: 0 0 20px; }
.wpm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 560px) { .wpm-grid { grid-template-columns: 1fr; } }
.wpm-card {
  display: flex; align-items: center; gap: 14px; padding: 16px;
  border: 2px solid #e2e8f0; border-radius: 14px; cursor: pointer;
  transition: all 0.2s;
}
.wpm-card:hover { border-color: #3b82f6; background: #eff6ff; transform: translateY(-1px); }
.wpm-card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
.wpm-card-info { flex: 1; min-width: 0; }
.wpm-card-name { display: block; font-weight: 700; font-size: 0.88rem; color: #1e293b; }
.wpm-card-desc { display: block; font-size: 0.75rem; color: #94a3b8; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wpm-card-type { display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; background: #f1f5f9; color: #64748b; }
.wpm-empty { text-align: center; color: #94a3b8; padding: 40px; font-size: 0.9rem; }
</style>
