<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal modal-wide">
      <div class="modal-header">
        <h2>🧭 Editor de Menú — {{ menu.name }}</h2>
        <button class="modal-close" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <!-- Datos del menú -->
        <div class="form-row">
          <div class="form-group"><label>Nombre *</label><input v-model="form.name" class="form-input" /></div>
          <div class="form-group"><label>Ubicación</label>
            <select v-model="form.location" class="form-input">
              <option value="header">Header</option>
              <option value="footer">Footer</option>
              <option value="sidebar">Sidebar</option>
            </select>
          </div>
          <div class="form-group">
            <label>&nbsp;</label>
            <button class="btn btn-outline" @click="saveMenuInfo" :disabled="savingInfo">{{ savingInfo ? 'Guardando...' : 'Guardar menú' }}</button>
          </div>
        </div>

        <div class="items-header">
          <h3>Ítems del menú <span class="count-badge">{{ items.length }}</span></h3>
          <button class="btn btn-primary btn-sm" @click="openNewItem">+ Agregar ítem</button>
        </div>

        <div v-if="items.length" class="item-list">
          <div v-for="(item, idx) in items" :key="item.id" class="item-row" :class="{ 'item-inactive': item.is_active === false }">
            <div class="item-order">
              <button class="icon-btn" title="Subir" @click="moveItem(idx, -1)" :disabled="idx === 0">↑</button>
              <button class="icon-btn" title="Bajar" @click="moveItem(idx, 1)" :disabled="idx === items.length - 1">↓</button>
            </div>
            <div class="item-info">
              <div class="item-label">
                <span v-if="item.icon" class="item-icon material-symbols-outlined">{{ item.icon }}</span>
                {{ item.label || '(sin label)' }}
                <span v-if="item.target === '_blank'" class="badge badge-info">nueva pestaña</span>
                <span v-if="item.is_active === false" class="badge badge-warning">oculto</span>
              </div>
              <div class="item-url">{{ item.url || '#' }}</div>
            </div>
            <div class="item-actions">
              <button class="btn btn-sm btn-outline" @click="openEditItem(item)">✏️</button>
              <button class="btn btn-sm btn-danger" @click="removeItem(item)">🗑️</button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>Este menú no tiene ítems todavía. Agrega enlaces con su ruta (p. ej. <code>/products</code> o <code>/#hero</code>).</p>
        </div>

        <!-- Formulario ítem (nuevo / edición) -->
        <div v-if="showItemForm" class="item-form">
          <h3>{{ editingId ? 'Editar ítem' : 'Nuevo ítem' }}</h3>
          <div class="form-row two">
            <div class="form-group"><label>Texto del enlace *</label><input v-model="itemForm.label" class="form-input" placeholder="Productos" /></div>
            <div class="form-group"><label>Ruta / URL *</label><input v-model="itemForm.url" class="form-input" placeholder="/products o /#hero o https://..." /></div>
          </div>
          <div class="form-row three">
            <div class="form-group"><label>Abrir en</label>
              <select v-model="itemForm.target" class="form-input">
                <option value="_self">Misma pestaña</option>
                <option value="_blank">Nueva pestaña</option>
              </select>
            </div>
            <div class="form-group"><label>Icono (opcional)</label><input v-model="itemForm.icon" class="form-input" placeholder="home" /></div>
            <div class="form-group"><label>Visible</label>
              <select v-model="itemForm.is_active" class="form-input">
                <option :value="true">Sí</option>
                <option :value="false">No</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-outline" @click="showItemForm = false">Cancelar</button>
            <button class="btn btn-primary" @click="saveItem" :disabled="savingItem">
              {{ savingItem ? 'Guardando...' : (editingId ? 'Guardar ítem' : 'Agregar ítem') }}
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-primary" @click="$emit('close')">Listo</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { siteBuilderAPI } from '@/api'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const props = defineProps({
  menu: { type: Object, required: true }
})
const emit = defineEmits(['close', 'saved'])

const form = reactive({ name: props.menu.name || '', location: props.menu.location || 'header' })
const items = ref([])
const savingInfo = ref(false)
const savingItem = ref(false)

const showItemForm = ref(false)
const editingId = ref(null)
const itemForm = reactive({ label: '', url: '', target: '_self', icon: '', is_active: true })

function resetItemForm() {
  itemForm.label = ''
  itemForm.url = ''
  itemForm.target = '_self'
  itemForm.icon = ''
  itemForm.is_active = true
  editingId.value = null
  showItemForm.value = false
}

async function loadItems() {
  try {
    const res = await siteBuilderAPI.getMenu(props.menu.id)
    const data = res.data?.data ?? res.data ?? []
    items.value = Array.isArray(data) ? data : (data.items || [])
  } catch (err) { console.error('[MenuEditor]', err.message) }
}

async function saveMenuInfo() {
  savingInfo.value = true
  try {
    await siteBuilderAPI.updateMenu(props.menu.id, { name: form.name, location: form.location })
    emit('saved')
    toast.success('Menú actualizado')
  } catch (err) { toast.error(err.message) }
  savingInfo.value = false
}

function openNewItem() {
  resetItemForm()
  showItemForm.value = true
}

function openEditItem(item) {
  editingId.value = item.id
  itemForm.label = item.label || ''
  itemForm.url = item.url || ''
  itemForm.target = item.target || '_self'
  itemForm.icon = item.icon || ''
  itemForm.is_active = item.is_active !== false
  showItemForm.value = true
}

async function saveItem() {
  if (!itemForm.label.trim()) { toast.warning('El texto del enlace es obligatorio'); return }
  savingItem.value = true
  try {
    const payload = {
      label: itemForm.label.trim(),
      url: itemForm.url.trim() || '#',
      target: itemForm.target,
      icon: itemForm.icon.trim() || null,
      is_active: itemForm.is_active
    }
    if (editingId.value) {
      await siteBuilderAPI.updateMenuItem(editingId.value, payload)
    } else {
      await siteBuilderAPI.createMenuItem(props.menu.id, payload)
    }
    resetItemForm()
    await loadItems()
    emit('saved')
    toast.success(editingId.value ? 'Ítem actualizado' : 'Ítem agregado')
  } catch (err) { toast.error(err.message) }
  savingItem.value = false
}

async function removeItem(item) {
  if (!confirm(`¿Eliminar ítem "${item.label}"?`)) return
  try {
    await siteBuilderAPI.deleteMenuItem(item.id)
    await loadItems()
    emit('saved')
    toast.success('Ítem eliminado')
  } catch (err) { toast.error(err.message) }
}

async function moveItem(idx, dir) {
  const target = idx + dir
  if (target < 0 || target >= items.value.length) return
  const arr = [...items.value]
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
  try {
    await siteBuilderAPI.reorderMenuItems(props.menu.id, { item_ids: arr.map(i => i.id) })
    await loadItems()
    emit('saved')
  } catch (err) { toast.error(err.message) }
}

onMounted(loadItems)
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1050; }
.modal { background: #fff; border-radius: 16px; width: 720px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
.modal-wide { width: 720px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; }
.modal-header h2 { font-weight: 700; font-size: 1.1rem; margin: 0; color: #1e293b; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
.modal-body { padding: 22px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid #f1f5f9; }

.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-weight: 600; font-size: 0.82rem; color: #475569; margin-bottom: 5px; }
.form-input { width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.88rem; box-sizing: border-box; }
.form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.form-row.two { grid-template-columns: 1fr 1fr; }
.form-row.three { grid-template-columns: 1fr 1fr 1fr; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }

.items-header { display: flex; justify-content: space-between; align-items: center; margin: 18px 0 10px; }
.items-header h3 { font-size: 1rem; font-weight: 700; margin: 0; color: #1e293b; }
.count-badge { display: inline-block; background: #dbeafe; color: #1e40af; border-radius: 20px; padding: 2px 10px; font-size: 0.72rem; font-weight: 700; margin-left: 6px; }

.item-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; padding: 2px; }
.item-row { display: flex; align-items: center; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; }
.item-inactive { opacity: 0.55; }
.item-order { display: flex; flex-direction: column; gap: 2px; }
.icon-btn { width: 22px; height: 22px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; cursor: pointer; font-size: 0.7rem; color: #475569; }
.icon-btn:disabled { opacity: 0.35; cursor: default; }
.item-info { flex: 1; min-width: 0; }
.item-label { font-weight: 600; font-size: 0.88rem; color: #1e293b; display: flex; align-items: center; gap: 6px; }
.item-icon { font-size: 1.05rem; color: #64748b; }
.item-url { font-size: 0.75rem; color: #94a3b8; font-family: 'Fira Code', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-actions { display: flex; gap: 6px; }

.item-form { margin-top: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; }
.item-form h3 { font-size: 0.95rem; font-weight: 700; margin: 0 0 12px; color: #1e40af; }

.badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 0.68rem; font-weight: 600; }
.badge-info { background: #dbeafe; color: #1e40af; }
.badge-warning { background: #fef3c7; color: #92400e; }

.btn { padding: 8px 16px; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.82rem; cursor: pointer; border: none; transition: all 0.2s; }
.btn-primary { background: #3b82f6; color: #fff; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-outline { background: #fff; border: 1px solid #e2e8f0; color: #475569; }
.btn-sm { padding: 5px 10px; font-size: 0.75rem; }
.btn:disabled { opacity: 0.6; cursor: default; }

.empty-state { text-align: center; padding: 22px 12px; color: #64748b; font-size: 0.85rem; }
.empty-state code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
</style>
