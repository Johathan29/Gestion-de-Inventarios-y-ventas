<template>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">📄 CMS — Gestor de Páginas</h1>
        <p class="page-subtitle">Crea, edita y publica páginas con el editor visual</p>
      </div>
      <div class="header-actions">
        <select v-model="filterStatus" class="input-select">
          <option value="">Todos</option>
          <option value="published">Publicados</option>
          <option value="draft">Borradores</option>
        </select>
        <button class="btn btn-primary" @click="showCreate = true">+ Nueva Página</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row" v-if="stats">
      <div class="stat-card">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">Total Páginas</span>
      </div>
      <div class="stat-card stat-success">
        <span class="stat-value">{{ stats.published }}</span>
        <span class="stat-label">Publicadas</span>
      </div>
      <div class="stat-card stat-warning">
        <span class="stat-value">{{ stats.draft }}</span>
        <span class="stat-label">Borradores</span>
      </div>
      <div class="stat-card stat-info">
        <span class="stat-value">{{ stats.total_views }}</span>
        <span class="stat-label">Vistas Totales</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando páginas...</p>
    </div>

    <!-- Pages Grid -->
    <div v-else-if="filteredPages.length" class="cards-grid">
      <div v-for="page in filteredPages" :key="page.id" class="card page-card">
        <div class="card-header">
          <div class="card-title-row">
            <h3 class="card-title">{{ page.title }}</h3>
            <span class="badge" :class="page.is_published ? 'badge-success' : 'badge-warning'">
              {{ page.is_published ? 'Publicada' : 'Borrador' }}
            </span>
          </div>
          <span class="card-meta">/ {{ page.slug }}</span>
        </div>
        <div class="card-body">
          <p class="card-desc">{{ page.meta_description || 'Sin descripción' }}</p>
          <div class="card-stats">
            <span>📐 {{ (page.sections || []).length }} secciones</span>
            <span>👁️ {{ page.view_count || 0 }} vistas</span>
          </div>
        </div>
        <div class="card-footer">
          <button class="btn btn-sm btn-outline" @click="editPage(page)">✏️ Editar</button>
          <button v-if="!page.is_published" class="btn btn-sm btn-success" @click="publishPage(page)">🚀 Publicar</button>
          <button v-else class="btn btn-sm btn-warning" @click="unpublishPage(page)">📥 Despublicar</button>
          <button class="btn btn-sm btn-info" @click="duplicatePage(page)">📋 Duplicar</button>
          <button class="btn btn-sm btn-danger" @click="deletePage(page)">🗑️</button>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <span class="empty-icon">📄</span>
      <p>No hay páginas creadas aún</p>
      <button class="btn btn-primary" @click="showCreate = true">Crear primera página</button>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreate || editingPage" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ editingPage ? 'Editar Página' : 'Nueva Página' }}</h2>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Título *</label>
            <input v-model="form.title" class="form-input" placeholder="Mi nueva página" />
          </div>
          <div class="form-group">
            <label>Slug</label>
            <input v-model="form.slug" class="form-input" placeholder="mi-nueva-pagina (auto-generado si está vacío)" />
          </div>
          <div class="form-group">
            <label>Descripción</label>
            <textarea v-model="form.description" class="form-input" rows="2" placeholder="Breve descripción de la página"></textarea>
          </div>
          <div class="form-group">
            <label>Layout</label>
            <select v-model="form.layout" class="form-input">
              <option value="default">Default</option>
              <option value="full-width">Ancho Completo</option>
              <option value="sidebar">Con Sidebar</option>
              <option value="blank">En blanco</option>
            </select>
          </div>
          <div class="form-group">
            <label>Meta Título (SEO)</label>
            <input v-model="form.meta_title" class="form-input" placeholder="Título para buscadores" />
          </div>
          <div class="form-group">
            <label>Meta Descripción (SEO)</label>
            <textarea v-model="form.meta_description" class="form-input" rows="2" placeholder="Descripción para buscadores"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="closeModal">Cancelar</button>
          <button class="btn btn-primary" @click="savePage" :disabled="saving">
            {{ saving ? 'Guardando...' : (editingPage ? 'Actualizar' : 'Crear Página') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Page Builder Modal (secciones) -->
    <div v-if="editingPage" class="modal-overlay" @click.self="closeSectionEditor" style="z-index:1100">
      <div class="modal modal-wide">
        <div class="modal-header">
          <h2>📐 Página — {{ editingPage.title }}</h2>
          <button class="modal-close" @click="closeSectionEditor">&times;</button>
        </div>
        <div class="modal-body">
          <!-- Selector de componentes -->
          <div v-if="showPicker">
            <ComponentPicker :components="componentLibrary" @select="pickComponent" @close="showPicker = false" />
          </div>

          <!-- Lista de secciones -->
          <div v-else>
            <div class="section-list">
              <div v-for="(section, idx) in sections" :key="section.id" class="section-item">
                <span class="section-icon material-symbols-outlined">{{ iconOf(section.component_key) }}</span>
                <div class="section-info">
                  <strong>{{ section.title || nameOf(section.component_key) }}</strong>
                  <span class="badge badge-info">{{ nameOf(section.component_key) }}</span>
                </div>
                <div class="section-actions">
                  <button class="btn btn-sm btn-outline" @click="moveSection(idx, -1)" :disabled="idx === 0" title="Subir">↑</button>
                  <button class="btn btn-sm btn-outline" @click="moveSection(idx, 1)" :disabled="idx === sections.length - 1" title="Bajar">↓</button>
                  <button class="btn btn-sm btn-info" @click="openSectionEditor(section)" title="Editar contenido">✏️</button>
                  <button class="btn btn-sm btn-outline" @click="duplicateSection(section)" title="Duplicar">📋</button>
                  <button class="btn btn-sm btn-danger" @click="deleteSection(section)" title="Eliminar">🗑️</button>
                </div>
              </div>
              <div v-if="!sections.length" class="empty-sections">
                <p>No hay secciones. Añade una para empezar.</p>
              </div>
            </div>
            <button class="btn btn-primary" @click="showPicker = true" style="margin-top: 12px">+ Añadir Sección</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Editor de sección (contenido editable + vista previa) -->
    <SectionEditor
      v-if="editingSection"
      :section="editingSection"
      @save="saveSection"
      @close="editingSection = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { cmsAPI } from '@/api'
import { componentLibrary, getComponentName, getComponentIcon } from '../../components/cms/componentLibrary.js'
import SectionEditor from '../../components/cms/SectionEditor.vue'
import ComponentPicker from '../../components/cms/ComponentPicker.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const pages = ref([])
const templates = ref([])
const loading = ref(true)
const saving = ref(false)
const showCreate = ref(false)
const editingPage = ref(null)
const filterStatus = ref('')
const sections = ref([])
const showPicker = ref(false)
const editingSection = ref(null)

const nameOf = (key) => getComponentName(key)
const iconOf = (key) => getComponentIcon(key)

const statusOf = (p) => p.is_published ? 'published' : 'draft'

const form = ref({
  title: '', slug: '', description: '', layout: 'default',
  meta_title: '', meta_description: ''
})

const stats = computed(() => {
  const total = pages.value.length
  const published = pages.value.filter(p => p.is_published).length
  const draft = pages.value.filter(p => !p.is_published).length
  const total_views = pages.value.reduce((sum, p) => sum + (p.view_count || 0), 0)
  return { total, published, draft, total_views }
})

const filteredPages = computed(() => {
  if (!filterStatus.value) return pages.value
  return pages.value.filter(p => statusOf(p) === filterStatus.value)
})

async function loadPages() {
  loading.value = true
  try {
    const [pagesRes, templatesRes] = await Promise.all([
      cmsAPI.getPages(),
      cmsAPI.getTemplates().catch(() => ({ data: { data: [] } }))
    ])
    pages.value = pagesRes.data?.data || pagesRes.data || []
    templates.value = templatesRes.data?.data || templatesRes.data || []
  } catch (err) { console.error('Error loading pages:', err) }
  loading.value = false
}

function editPage(page) {
  editingPage.value = page
  form.value = {
    title: page.title, slug: page.slug, description: page.meta_description || '',
    layout: page.template || 'default',
    meta_title: page.meta_title || '', meta_description: page.meta_description || ''
  }
  loadSections(page.id)
}

async function loadSections(pageId) {
  try {
    const { data } = await cmsAPI.getSections(pageId)
    sections.value = data?.data || data || []
  } catch { sections.value = [] }
}

async function savePage() {
  saving.value = true
  try {
    const payload = { ...form.value }
    delete payload.description
    payload.template = payload.layout || 'default'
    delete payload.layout
    if (!payload.slug && payload.title) {
      payload.slug = payload.title.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }
    if (editingPage.value) {
      await cmsAPI.updatePage(editingPage.value.id, payload)
      toast.success('Página actualizada')
    } else {
      await cmsAPI.createPage(payload)
      toast.success('Página creada')
    }
    closeModal()
    await loadPages()
  } catch (err) { toast.error('Error: ' + (err.response?.data?.error || err.message)) }
  saving.value = false
}

async function publishPage(page) {
  try { await cmsAPI.publishPage(page.id); await loadPages(); toast.success('Página publicada') }
  catch (err) { toast.error('Error: ' + (err.response?.data?.error || err.message)) }
}

async function unpublishPage(page) {
  try { await cmsAPI.unpublishPage(page.id); await loadPages(); toast.info('Página despublicada') }
  catch (err) { toast.error('Error: ' + (err.response?.data?.error || err.message)) }
}

async function duplicatePage(page) {
  try { await cmsAPI.duplicatePage(page.id); await loadPages(); toast.success('Página duplicada') }
  catch (err) { toast.error('Error: ' + (err.response?.data?.error || err.message)) }
}

async function deletePage(page) {
  if (!confirm(`¿Eliminar página "${page.title}"?`)) return
  try { await cmsAPI.deletePage(page.id); await loadPages(); toast.success('Página eliminada') }
  catch (err) { toast.error('Error: ' + (err.response?.data?.error || err.message)) }
}

function pickComponent(comp) {
  if (!editingPage.value) return
  createSection(comp)
}

async function createSection(comp) {
  try {
    await cmsAPI.createSection(editingPage.value.id, {
      title: comp.defaults?.content?.title || comp.name,
      component_key: comp.key,
      settings: comp.defaults?.settings || {},
      content: comp.defaults?.content || {},
      sort_order: sections.value.length + 1
    })
    showPicker.value = false
    await loadSections(editingPage.value.id)
    toast.success('Sección agregada')
  } catch (err) { toast.error('Error: ' + err.message) }
}

function openSectionEditor(section) { editingSection.value = section }

async function saveSection(payload) {
  if (!editingSection.value || !editingPage.value) return
  try {
    await cmsAPI.updateSection(editingPage.value.id, editingSection.value.id, payload)
    editingSection.value = null
    await loadSections(editingPage.value.id)
    toast.success('Sección guardada')
  } catch (err) { toast.error('Error: ' + err.message) }
}

async function duplicateSection(section) {
  if (!editingPage.value) return
  try {
    await cmsAPI.createSection(editingPage.value.id, {
      title: section.title,
      component_key: section.component_key,
      settings: section.settings || {},
      content: section.content || {},
      sort_order: (section.sort_order || sections.value.length) + 1
    })
    await loadSections(editingPage.value.id)
    toast.success('Sección duplicada')
  } catch (err) { toast.error('Error: ' + err.message) }
}

async function moveSection(idx, dir) {
  if (!editingPage.value) return
  const arr = [...sections.value]
  const j = idx + dir
  if (j < 0 || j >= arr.length) return
  const tmp = arr[idx]; arr[idx] = arr[j]; arr[j] = tmp
  sections.value = arr
  try {
    await cmsAPI.reorderSections(editingPage.value.id, { section_ids: arr.map(s => s.id) })
    await loadSections(editingPage.value.id)
  } catch (err) { toast.error('Error: ' + err.message) }
}

async function deleteSection(section) {
  if (!editingPage.value) return
  try {
    await cmsAPI.deleteSection(editingPage.value.id, section.id)
    await loadSections(editingPage.value.id)
    toast.success('Sección eliminada')
  } catch (err) { toast.error('Error: ' + err.message) }
}

function closeModal() { showCreate.value = false; editingPage.value = null; form.value = { title: '', slug: '', description: '', layout: 'default', template_id: '', meta_title: '', meta_description: '' } }
function closeSectionEditor() { editingPage.value = null; sections.value = []; showPicker.value = false; editingSection.value = null }

onMounted(loadPages)
</script>

<style scoped>
.page { padding: 24px; max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.page-title { font-family: 'Inter', sans-serif; font-size: 1.8rem; font-weight: 800; color: #1e293b; margin: 0; }
.page-subtitle { font-family: 'Inter', sans-serif; color: #64748b; margin: 4px 0 0; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.input-select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 0.85rem; }

.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: #fff; border-radius: 12px; padding: 18px; text-align: center; border: 1px solid #e2e8f0; }
.stat-value { display: block; font-size: 1.8rem; font-weight: 800; color: #1e293b; font-family: 'Inter', sans-serif; }
.stat-label { display: block; font-size: 0.78rem; color: #64748b; margin-top: 4px; }
.stat-success .stat-value { color: #10b981; }
.stat-warning .stat-value { color: #f59e0b; }
.stat-info .stat-value { color: #3b82f6; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; transition: box-shadow 0.2s; }
.card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.card-header { padding: 16px 18px 8px; }
.card-title-row { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-family: 'Inter', sans-serif; font-weight: 700; font-size: 1rem; margin: 0; color: #1e293b; }
.card-meta { font-size: 0.78rem; color: #94a3b8; font-family: 'Fira Code', monospace; }
.card-body { padding: 4px 18px 12px; }
.card-desc { font-size: 0.85rem; color: #64748b; margin: 0 0 8px; }
.card-stats { display: flex; gap: 14px; font-size: 0.78rem; color: #94a3b8; }
.card-footer { display: flex; gap: 8px; padding: 12px 18px; border-top: 1px solid #f1f5f9; flex-wrap: wrap; }

.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
.badge-success { background: #d1fae5; color: #065f46; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-info { background: #dbeafe; color: #1e40af; }

.btn { padding: 8px 16px; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.82rem; cursor: pointer; border: none; transition: all 0.2s; }
.btn-primary { background: #3b82f6; color: #fff; }
.btn-primary:hover { background: #2563eb; }
.btn-success { background: #10b981; color: #fff; }
.btn-warning { background: #f59e0b; color: #fff; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-info { background: #6366f1; color: #fff; }
.btn-outline { background: #fff; border: 1px solid #e2e8f0; color: #475569; }
.btn-sm { padding: 5px 10px; font-size: 0.75rem; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

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
.form-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.section-list { display: flex; flex-direction: column; gap: 8px; }
.section-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; }
.section-icon { color: #6366f1; font-size: 1.2rem; flex-shrink: 0; }
.section-info { flex: 1; display: flex; align-items: center; gap: 8px; font-size: 0.88rem; min-width: 0; }
.section-info strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.section-actions { display: flex; gap: 4px; flex-shrink: 0; }
.empty-sections { text-align: center; padding: 24px; color: #94a3b8; }
</style>
