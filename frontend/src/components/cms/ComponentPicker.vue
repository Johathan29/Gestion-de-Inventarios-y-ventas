<template>
  <div class="modal-overlay" style="z-index: 1300" @click.self="$emit('close')">
    <div class="cp-modal">
      <div class="modal-header">
        <h2>🧩 Añadir sección</h2>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body cp-body">
        <input
          v-model="query"
          type="text"
          class="form-input cp-search"
          placeholder="Buscar componente..."
        />
        <div v-for="(list, cat) in filteredGroups" :key="cat" class="cp-category">
          <h4 class="cp-cat-title">{{ cat }}</h4>
          <div class="cp-grid">
            <button
              v-for="comp in list"
              :key="comp.key"
              type="button"
              class="cp-card"
              @click="$emit('select', comp)"
            >
              <span class="cp-icon material-symbols-outlined">{{ comp.icon }}</span>
              <strong class="cp-name">{{ comp.name }}</strong>
              <small class="cp-desc">{{ comp.description }}</small>
            </button>
          </div>
        </div>
        <div v-if="!hasResults" class="cp-empty">
          <p>No se encontraron componentes para «{{ query }}»</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { groupByCategory } from './componentLibrary.js';

const props = defineProps({
  components: { type: Array, default: () => [] }
});
defineEmits(['select', 'close']);

const query = ref('');

const grouped = computed(() => groupByCategory(props.components.length ? props.components : undefined));

const filteredGroups = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return grouped.value;
  const out = {};
  for (const [cat, list] of Object.entries(grouped.value)) {
    const filtered = list.filter(
      (c) => c.name.toLowerCase().includes(q) || c.key.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
    );
    if (filtered.length) out[cat] = filtered;
  }
  return out;
});

const hasResults = computed(() => Object.keys(filteredGroups.value).length > 0);
</script>

<style scoped>
/* clases base del CMS replicadas aquí porque son scoped de PagesManagerView */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1150;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  border-bottom: 1px solid #f1f5f9;
}
.modal-header h2 {
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  font-size: 1.15rem;
  margin: 0;
}
.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #94a3b8;
  line-height: 1;
}
.modal-body {
  flex: 1;
  min-height: 0;
  padding: 20px;
}
.form-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 0.88rem;
  box-sizing: border-box;
}
.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
.cp-modal { background: #fff; border-radius: 16px; width: 860px; max-width: 95vw; max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; }
.cp-body { overflow-y: auto; }
.cp-search { margin-bottom: 16px; }
.cp-category { margin-bottom: 20px; }
.cp-cat-title {
  font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: #94a3b8; margin: 0 0 10px;
}
.cp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
.cp-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
  padding: 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
  text-align: left; cursor: pointer; transition: all 0.15s;
}
.cp-card:hover { border-color: #6366f1; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15); transform: translateY(-2px); }
.cp-icon { font-size: 1.6rem; color: #6366f1; }
.cp-name { font-family: 'Inter', sans-serif; font-size: 0.88rem; font-weight: 700; color: #1e293b; }
.cp-desc { font-size: 0.75rem; color: #64748b; line-height: 1.4; }
.cp-empty { text-align: center; padding: 30px; color: #94a3b8; }
</style>
