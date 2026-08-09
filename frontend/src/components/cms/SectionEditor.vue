<template>
  <div class="modal-overlay se-editor-overlay" style="z-index: 1200" @click.self="$emit('close')">
    <div class="se-editor">
      <!-- Header -->
      <div class="se-header">
        <div>
          <h2>✏️ Editar sección — {{ component?.name || 'Sección' }}</h2>
          <p v-if="component?.description" class="se-desc">{{ component.description }}</p>
        </div>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>

      <div class="se-body">
        <!-- ═══ FORM ═══ -->
        <div class="se-form">
          <div
            v-for="(field, fi) in component?.fields || []"
            :key="'f' + fi"
            class="form-group"
          >
            <label>{{ field.label }}</label>

            <!-- text -->
            <input
              v-if="field.type === 'text'"
              :value="modelValue(field)"
              @input="setValue(field, $event.target.value)"
              type="text"
              class="form-input"
              :placeholder="field.placeholder"
            />

            <!-- number -->
            <input
              v-else-if="field.type === 'number'"
              :value="modelValue(field)"
              @input="setValue(field, $event.target.value === '' ? 0 : Number($event.target.value))"
              type="number"
              class="form-input"
              :min="field.min"
              :max="field.max"
            />

            <!-- textarea -->
            <textarea
              v-else-if="field.type === 'textarea'"
              :value="modelValue(field)"
              @input="setValue(field, $event.target.value)"
              class="form-input"
              rows="3"
              :placeholder="field.placeholder"
            ></textarea>

            <!-- html -->
            <textarea
              v-else-if="field.type === 'html'"
              :value="modelValue(field)"
              @input="setValue(field, $event.target.value)"
              class="form-input se-code"
              rows="5"
              :placeholder="field.placeholder"
            ></textarea>

            <!-- image -->
            <div v-else-if="field.type === 'image'" class="se-image-field">
              <div class="se-image-row">
                <input
                  :value="modelValue(field)"
                  @input="setValue(field, $event.target.value)"
                  type="text"
                  class="form-input"
                  placeholder="https://... o /media/..."
                />
              </div>
              <img
                v-if="modelValue(field)"
                :src="modelValue(field)"
                :alt="field.label"
                class="se-image-preview"
                @error="$event.target.style.display = 'none'"
                @load="$event.target.style.display = ''"
              />
            </div>

            <!-- color -->
            <div v-else-if="field.type === 'color'" class="se-color-row">
              <input
                :value="validHex(modelValue(field))"
                @input="setValue(field, $event.target.value)"
                type="color"
                class="se-color-input"
              />
              <input
                :value="modelValue(field)"
                @input="setValue(field, $event.target.value)"
                type="text"
                class="form-input"
                placeholder="#ffffff"
              />
            </div>

            <!-- select -->
            <select
              v-else-if="field.type === 'select'"
              :value="modelValue(field)"
              @change="setValue(field, $event.target.value)"
              class="form-input"
            >
              <option v-for="opt in field.options || []" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>

            <!-- toggle -->
            <label v-else-if="field.type === 'toggle'" class="se-toggle">
              <input
                :checked="modelValue(field)"
                @change="setValue(field, $event.target.checked)"
                type="checkbox"
              />
              <span class="se-toggle-track"></span>
              <span class="se-toggle-label">{{ field.label }}</span>
            </label>

            <!-- items (repetibles) -->
            <div v-else-if="field.type === 'items'" class="se-items">
              <div
                v-for="(item, i) in itemsOf(field)"
                :key="'i' + i"
                class="se-item-card"
              >
                <div class="se-item-header">
                  <strong>{{ field.itemLabel || 'Item' }} {{ i + 1 }}</strong>
                  <div class="se-item-btns">
                    <button type="button" class="btn btn-sm btn-outline" @click="moveItem(field, i, -1)" :disabled="i === 0">↑</button>
                    <button type="button" class="btn btn-sm btn-outline" @click="moveItem(field, i, 1)" :disabled="i === itemsOf(field).length - 1">↓</button>
                    <button type="button" class="btn btn-sm btn-danger" @click="removeItem(field, i)">✕</button>
                  </div>
                </div>
                <div
                  v-for="(sub, si) in field.itemFields || []"
                  :key="'s' + si"
                  class="form-group se-sub"
                >
                  <label>{{ sub.label }}</label>
                  <input
                    v-if="sub.type === 'text'"
                    v-model="item[sub.key]"
                    type="text"
                    class="form-input"
                    :placeholder="sub.placeholder"
                  />
                  <input
                    v-else-if="sub.type === 'image'"
                    v-model="item[sub.key]"
                    type="text"
                    class="form-input"
                    placeholder="https://..."
                  />
                  <textarea
                    v-else-if="sub.type === 'textarea'"
                    v-model="item[sub.key]"
                    class="form-input"
                    rows="2"
                    :placeholder="sub.placeholder"
                  ></textarea>
                </div>
              </div>
              <button type="button" class="btn btn-outline se-add-item" @click="addItem(field)">
                {{ field.addLabel || '+ Añadir item' }}
              </button>
            </div>
          </div>
        </div>

        <!-- ═══ LIVE PREVIEW ═══ -->
        <div class="se-preview">
          <div class="se-preview-label">Vista previa</div>
          <div class="se-preview-stage">
            <RenderSection :section="previewSection" />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="se-footer">
        <button class="btn btn-outline" @click="$emit('close')">Cancelar</button>
        <button class="btn btn-primary" @click="save" :disabled="saving">
          {{ saving ? 'Guardando...' : '💾 Guardar sección' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { getComponentByKey } from './componentLibrary.js';
import RenderSection from './RenderSection.vue';

const props = defineProps({
  section: { type: Object, required: true }
});
const emit = defineEmits(['save', 'close']);

const saving = ref(false);
const component = computed(() => getComponentByKey(props.section?.component_key) || null);

const model = reactive({
  title: '',
  settings: {},
  content: {}
});

function init() {
  const comp = component.value;
  model.title = props.section?.title || '';
  model.settings = { ...(comp?.defaults?.settings || {}), ...(props.section?.settings || {}) };
  const content = { ...(comp?.defaults?.content || {}), ...(props.section?.content || {}) };
  // deep copy items arrays so we don't mutate the original section
  Object.keys(content).forEach((k) => {
    if (Array.isArray(content[k])) content[k] = JSON.parse(JSON.stringify(content[k]));
  });
  Object.keys(model.settings).forEach((k) => {
    if (Array.isArray(model.settings[k])) model.settings[k] = JSON.parse(JSON.stringify(model.settings[k]));
  });
  model.content = content;
}
watch(() => props.section, init, { immediate: true });

// Lectura/escritura dinámica según el target del campo
function modelValue(field) {
  return field.target === 'title'
    ? model.title
    : field.target === 'settings'
      ? model.settings[field.key]
      : model.content[field.key];
}

function setValue(field, val) {
  if (field.target === 'title') model.title = val;
  else if (field.target === 'settings') model.settings[field.key] = val;
  else model.content[field.key] = val;
}

// El input type=color solo acepta #rrggbb; cae a negro si está vacío
function validHex(v) {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#000000';
}

function itemsOf(field) {
  const list = field.target === 'content' ? model.content : model.settings;
  if (!Array.isArray(list[field.key])) list[field.key] = [];
  return list[field.key];
}

function addItem(field) {
  const item = {};
  for (const sub of field.itemFields || []) {
    item[sub.key] = sub.type === 'toggle' ? false : sub.type === 'number' ? 0 : '';
  }
  itemsOf(field).push(item);
}

function removeItem(field, idx) {
  itemsOf(field).splice(idx, 1);
}

function moveItem(field, idx, dir) {
  const list = itemsOf(field);
  const j = idx + dir;
  if (j < 0 || j >= list.length) return;
  const tmp = list[idx];
  list[idx] = list[j];
  list[j] = tmp;
}

const previewSection = computed(() => ({
  id: props.section?.id,
  component_key: component.value?.key || props.section?.component_key,
  title: model.title,
  settings: { ...model.settings },
  content: { ...model.content }
}));

function save() {
  saving.value = true;
  try {
    emit('save', {
      title: model.title || null,
      settings: { ...model.settings },
      content: { ...model.content }
    });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
/* Reutiliza los estilos globales del CMS (.modal-overlay, .modal-close, .form-input, .btn) */
.se-editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}
/* clases base del CMS replicadas aquí porque son scoped de PagesManagerView */
.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #94a3b8;
  line-height: 1;
}
.form-group {
  margin-bottom: 14px;
}
.form-group label {
  display: block;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 0.82rem;
  color: #475569;
  margin-bottom: 5px;
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
.btn {
  padding: 8px 16px;
  border-radius: 10px;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}
.btn-primary {
  background: #3b82f6;
  color: #fff;
}
.btn-primary:hover {
  background: #2563eb;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-outline {
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #475569;
}
.btn-outline:hover {
  background: #f8fafc;
}
.se-editor {
  background: #fff;
  border-radius: 16px;
  width: 1080px;
  max-width: 96vw;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.se-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 18px 22px;
  border-bottom: 1px solid #f1f5f9;
}
.se-header h2 { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1.15rem; margin: 0; }
.se-desc { font-size: 0.8rem; color: #64748b; margin: 4px 0 0; }
.se-body {
  flex: 1;
  display: grid;
  grid-template-columns: 420px 1fr;
  min-height: 0;
  overflow: hidden;
}
.se-form {
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid #f1f5f9;
}
.se-code { font-family: 'Fira Code', monospace; font-size: 0.8rem; }
.se-image-row { display: flex; gap: 8px; }
.se-image-preview {
  margin-top: 8px;
  max-width: 100%;
  max-height: 140px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  object-fit: cover;
}
.se-color-row { display: flex; gap: 8px; align-items: center; }
.se-color-input { width: 48px; height: 38px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 2px; cursor: pointer; }
.se-toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.85rem; color: #475569; font-weight: 500; }
.se-toggle input { display: none; }
.se-toggle-track {
  width: 40px; height: 22px; border-radius: 20px; background: #cbd5e1;
  position: relative; transition: background 0.2s; flex-shrink: 0;
}
.se-toggle input:checked + .se-toggle-track { background: #3b82f6; }
.se-toggle-track::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px;
  border-radius: 50%; background: #fff; transition: transform 0.2s;
}
.se-toggle input:checked + .se-toggle-track::after { transform: translateX(18px); }
.se-toggle-label { display: none; }

.se-items { display: flex; flex-direction: column; gap: 10px; }
.se-item-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #f8fafc; }
.se-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 0.85rem; color: #475569; }
.se-item-btns { display: flex; gap: 4px; }
.se-sub { margin-bottom: 8px; }
.se-sub label { font-size: 0.75rem; }
.se-add-item { width: 100%; }

.se-preview { display: flex; flex-direction: column; min-height: 0; background: #0f0a15; }
.se-preview-label {
  padding: 10px 16px; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: #94a3b8; background: #1e1b29; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.se-preview-stage { flex: 1; overflow-y: auto; padding: 16px; color: #e8e0e4; }

.se-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 22px; border-top: 1px solid #f1f5f9;
}
</style>
