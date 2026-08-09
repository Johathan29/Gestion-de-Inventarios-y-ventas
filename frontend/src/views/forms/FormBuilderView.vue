<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">📝 Form Builder</h1>
        <p class="page-subtitle">Crea formularios dinámicos con campos personalizados</p>
      </div>
      <button class="btn btn-primary" @click="showCreate = true">+ Nuevo Formulario</button>
    </div>

    <!-- Stats -->
    <div class="stats-row" v-if="stats">
      <div class="stat-card"><span class="stat-value">{{ stats.total }}</span><span class="stat-label">Total</span></div>
      <div class="stat-card stat-success"><span class="stat-value">{{ stats.published }}</span><span class="stat-label">Publicados</span></div>
      <div class="stat-card stat-warning"><span class="stat-value">{{ stats.totalSubmissions }}</span><span class="stat-label">Envíos Totales</span></div>
    </div>

    <div v-if="loading" class="loading-state"><div class="spinner"></div></div>

    <div v-else-if="forms.length" class="cards-grid">
      <div v-for="form in forms" :key="form.id" class="card">
        <div class="card-header">
          <div class="card-title-row">
            <h3 class="card-title">{{ form.title }}</h3>
            <span class="badge" :class="form.status === 'published' ? 'badge-success' : 'badge-warning'">
              {{ form.status === 'published' ? 'Publicado' : 'Borrador' }}
            </span>
          </div>
          <span class="card-meta">{{ form.submission_count || 0 }} envíos · {{ form.fields?.length || form.field_count || 0 }} campos</span>
        </div>
        <div class="card-body">
          <p class="card-desc">{{ form.description || 'Sin descripción' }}</p>
        </div>
        <div class="card-footer">
          <button class="btn btn-sm btn-outline" @click="editForm(form)">✏️ Editar</button>
          <button v-if="form.status !== 'published'" class="btn btn-sm btn-success" @click="publishForm(form)">🚀 Publicar</button>
          <button class="btn btn-sm btn-info" @click="viewSubmissions(form)">📬 Envíos</button>
          <button class="btn btn-sm btn-danger" @click="deleteForm(form)">🗑️</button>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <span class="empty-icon">📝</span>
      <p>No hay formularios creados</p>
      <button class="btn btn-primary" @click="showCreate = true">Crear primer formulario</button>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <div class="modal-header">
          <h2>Nuevo Formulario</h2>
          <button class="modal-close" @click="showCreate = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Título *</label>
            <input v-model="newForm.title" class="form-input" placeholder="Formulario de contacto" />
          </div>
          <div class="form-group">
            <label>Descripción</label>
            <textarea v-model="newForm.description" class="form-input" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label>Slug</label>
            <input v-model="newForm.slug" class="form-input" placeholder="contacto (auto si vacío)" />
          </div>
          <div class="form-group">
            <label>Texto del botón de envío</label>
            <input v-model="newForm.submit_text" class="form-input" placeholder="Enviar" />
          </div>
          <div class="form-group">
            <label>Mensaje post-envío</label>
            <input v-model="newForm.success_message" class="form-input" placeholder="¡Gracias por tu mensaje!" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showCreate = false">Cancelar</button>
          <button class="btn btn-primary" @click="createForm" :disabled="saving">
            {{ saving ? 'Creando...' : 'Crear Formulario' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Field Editor Modal -->
    <div v-if="editingForm" class="modal-overlay" @click.self="editingForm = null" style="z-index:1100">
      <div class="modal modal-wide">
        <div class="modal-header">
          <h2>✏️ Editar — {{ editingForm.title }}</h2>
          <button class="modal-close" @click="editingForm = null">&times;</button>
        </div>
        <div class="modal-body">
          <h3 style="font-size: 0.95rem; margin-bottom: 12px;">Campos del formulario</h3>
          <div v-for="(field, idx) in editFields" :key="field.id || idx" class="field-card">
            <div class="field-card-header">
              <input v-model="field.label" class="form-input" placeholder="Etiqueta del campo" style="flex:2" />
              <select v-model="field.field_type" class="form-input" style="flex:1">
                <option value="text">Texto</option>
                <option value="email">Email</option>
                <option value="phone">Teléfono</option>
                <option value="number">Número</option>
                <option value="textarea">Textarea</option>
                <option value="select">Select</option>
                <option value="checkbox">Checkbox</option>
                <option value="radio">Radio</option>
                <option value="date">Fecha</option>
                <option value="file">Archivo</option>
              </select>
              <label class="field-required-toggle">
                <input type="checkbox" v-model="field.is_required" /> Req
              </label>
              <button class="btn btn-sm btn-danger" @click="editFields.splice(idx, 1)">✕</button>
            </div>
            <div v-if="['select','radio'].includes(field.field_type)" class="field-options">
              <input v-model="field.options_input" class="form-input" placeholder="Opciones separadas por coma" />
            </div>
          </div>
          <button class="btn btn-outline" @click="addField" style="margin-top: 10px">+ Añadir Campo</button>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="editingForm = null">Cancelar</button>
          <button class="btn btn-primary" @click="saveFields" :disabled="saving">
            {{ saving ? 'Guardando...' : 'Guardar Campos' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Submissions Modal -->
    <div v-if="viewingForm" class="modal-overlay" @click.self="viewingForm = null" style="z-index:1100">
      <div class="modal modal-wide">
        <div class="modal-header">
          <h2>📬 Envíos — {{ viewingForm.title }}</h2>
          <button class="modal-close" @click="viewingForm = null">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="submissions.length" class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Datos</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sub in submissions" :key="sub.id">
                  <td>{{ formatDate(sub.created_at) }}</td>
                  <td class="submission-data">{{ JSON.stringify(sub.data || sub.submission_data || {}) }}</td>
                  <td><span class="badge badge-info">{{ sub.status || 'new' }}</span></td>
                  <td>
                    <button class="btn btn-sm btn-danger" @click="deleteSubmission(sub)">🗑️</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state" style="padding:20px"><p>No hay envíos aún</p></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { formBuilderAPI } from '@/api'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const forms = ref([])
const loading = ref(true)
const saving = ref(false)
const showCreate = ref(false)
const editingForm = ref(null)
const editFields = ref([])
const viewingForm = ref(null)
const submissions = ref([])

const newForm = ref({ title: '', description: '', slug: '', submit_text: 'Enviar', success_message: '¡Gracias!' })

const stats = computed(() => ({
  total: forms.value.length,
  published: forms.value.filter(f => f.status === 'published').length,
  totalSubmissions: forms.value.reduce((s, f) => s + (f.submission_count || 0), 0)
}))

async function loadForms() {
  loading.value = true
  try {
    const { data } = await formBuilderAPI.getForms()
    forms.value = data?.data || data || []
  } catch (err) { console.error(err) }
  loading.value = false
}

async function createForm() {
  saving.value = true
  try {
    const payload = { ...newForm.value }
    if (!payload.slug && payload.title) payload.slug = payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    await formBuilderAPI.createForm(payload)
    showCreate.value = false
    newForm.value = { title: '', description: '', slug: '', submit_text: 'Enviar', success_message: '¡Gracias!' }
    await loadForms()
    toast.success('Formulario creado')
  } catch (err) { toast.error('Error: ' + (err.response?.data?.error || err.message)) }
  saving.value = false
}

function editForm(form) {
  editingForm.value = form
  editFields.value = (form.fields || []).map(f => ({ ...f, options_input: Array.isArray(f.options) ? f.options.join(', ') : (f.options || '') }))
}

function addField() {
  editFields.value.push({ label: '', field_type: 'text', is_required: false, sort_order: editFields.value.length + 1, options_input: '' })
}

async function saveFields() {
  saving.value = true
  try {
    for (const field of editFields.value) {
      const payload = {
        label: field.label,
        field_type: field.field_type,
        is_required: field.is_required,
        sort_order: field.sort_order,
        options: field.options_input ? field.options_input.split(',').map(o => o.trim()) : null
      }
      if (field.id) {
        await formBuilderAPI.updateField(editingForm.value.id, field.id, payload)
      } else {
        await formBuilderAPI.createField(editingForm.value.id, payload)
      }
    }
    editingForm.value = null
    await loadForms()
    toast.success('Campos guardados')
  } catch (err) { toast.error('Error: ' + err.message) }
  saving.value = false
}

async function publishForm(form) {
  try { await formBuilderAPI.publishForm(form.id); await loadForms(); toast.success('Formulario publicado') } catch (err) { toast.error(err.message) }
}

async function deleteForm(form) {
  if (!confirm(`¿Eliminar "${form.title}"?`)) return
  try { await formBuilderAPI.deleteForm(form.id); await loadForms(); toast.success('Formulario eliminado') } catch (err) { toast.error(err.message) }
}

async function viewSubmissions(form) {
  viewingForm.value = form
  try {
    const { data } = await formBuilderAPI.getSubmissions(form.id)
    submissions.value = data?.data || data || []
  } catch { submissions.value = [] }
}

async function deleteSubmission(sub) {
  if (!confirm('¿Eliminar envío?')) return
  try { await formBuilderAPI.deleteSubmission(viewingForm.value.id, sub.id); submissions.value = submissions.value.filter(s => s.id !== sub.id); toast.success('Envío eliminado') } catch (err) { toast.error(err.message) }
}

function formatDate(d) { return d ? new Date(d).toLocaleString('es-ES') : '-' }

onMounted(loadForms)
</script>

<style scoped>
.page { padding: 24px; max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.page-title { font-family: 'Inter', sans-serif; font-size: 1.8rem; font-weight: 800; color: #1e293b; margin: 0; }
.page-subtitle { font-family: 'Inter', sans-serif; color: #64748b; margin: 4px 0 0; }

.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border-radius: 12px; padding: 18px; text-align: center; border: 1px solid #e2e8f0; }
.stat-value { display: block; font-size: 1.8rem; font-weight: 800; color: #1e293b; font-family: 'Inter', sans-serif; }
.stat-label { display: block; font-size: 0.78rem; color: #64748b; margin-top: 4px; }
.stat-success .stat-value { color: #10b981; }
.stat-warning .stat-value { color: #f59e0b; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; }
.card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.card-header { padding: 16px 18px 8px; }
.card-title-row { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1rem; margin: 0; color: #1e293b; }
.card-meta { font-size: 0.78rem; color: #94a3b8; }
.card-body { padding: 4px 18px 12px; }
.card-desc { font-size: 0.85rem; color: #64748b; margin: 0; }
.card-footer { display: flex; gap: 8px; padding: 12px 18px; border-top: 1px solid #f1f5f9; flex-wrap: wrap; }

.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
.badge-success { background: #d1fae5; color: #065f46; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-info { background: #dbeafe; color: #1e40af; }

.btn { padding: 8px 16px; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.82rem; cursor: pointer; border: none; transition: all 0.2s; }
.btn-primary { background: #3b82f6; color: #fff; }
.btn-success { background: #10b981; color: #fff; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-info { background: #6366f1; color: #fff; }
.btn-outline { background: #fff; border: 1px solid #e2e8f0; color: #475569; }
.btn-sm { padding: 5px 10px; font-size: 0.75rem; }
.btn:disabled { opacity: 0.5; }

.empty-state, .loading-state { text-align: center; padding: 60px 20px; color: #64748b; }
.empty-icon { font-size: 3rem; display: block; margin-bottom: 12px; }
.spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 16px; width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
.modal-wide { width: 700px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; }
.modal-header h2 { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1.15rem; margin: 0; }
.modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8; }
.modal-body { padding: 22px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid #f1f5f9; }

.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.82rem; color: #475569; margin-bottom: 5px; }
.form-input { width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 0.88rem; box-sizing: border-box; }
.form-input:focus { outline: none; border-color: #3b82f6; }

.field-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
.field-card-header { display: flex; align-items: center; gap: 8px; }
.field-required-toggle { font-size: 0.78rem; color: #64748b; display: flex; align-items: center; gap: 4px; white-space: nowrap; }
.field-options { margin-top: 8px; }

.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-family: 'Inter', sans-serif; font-size: 0.85rem; }
.data-table th { text-align: left; padding: 10px 12px; background: #f8fafc; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
.data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.submission-data { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.78rem; color: #64748b; }
</style>
