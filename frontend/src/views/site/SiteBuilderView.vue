<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">🎨 Site Builder</h1>
        <p class="page-subtitle">Gestiona medios, temas, branding, navegación y código personalizado</p>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="tabs">
      <button v-for="tab in tabs" :key="tab.key" class="tab" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.icon }} {{ tab.label }}
      </button>
    </div>

    <!-- MEDIA LIBRARY -->
    <div v-if="activeTab === 'media'">
      <div class="section-header">
        <h2>📁 Biblioteca de Medios</h2>
        <button class="btn btn-primary btn-sm" @click="showUploadMedia = true">+ Subir Medio</button>
      </div>
      <div v-if="mediaLoading" class="loading-state"><div class="spinner"></div></div>
      <div v-else-if="media.length" class="media-grid">
        <div v-for="item in media" :key="item.id" class="media-card">
          <div class="media-preview">
            <img v-if="item.mime_type?.startsWith('image/')" :src="item.url" :alt="item.alt_text" />
            <div v-else class="media-icon">{{ getMediaIcon(item.mime_type) }}</div>
          </div>
          <div class="media-info">
            <span class="media-name">{{ item.original_name }}</span>
            <span class="media-meta">{{ item.mime_type }} · {{ formatSize(item.file_size) }}</span>
          </div>
          <button class="btn btn-sm btn-danger" @click="deleteMediaItem(item)">🗑️</button>
        </div>
      </div>
      <div v-else class="empty-state"><p>No hay medios subidos</p></div>

      <!-- Upload Modal -->
      <div v-if="showUploadMedia" class="modal-overlay" @click.self="showUploadMedia = false">
        <div class="modal">
          <div class="modal-header"><h2>Subir Medio</h2><button class="modal-close" @click="showUploadMedia = false">&times;</button></div>
          <div class="modal-body">
            <div class="form-group"><label>URL del medio *</label><input v-model="mediaForm.url" class="form-input" placeholder="https://..." /></div>
            <div class="form-group"><label>Nombre del archivo *</label><input v-model="mediaForm.file_name" class="form-input" placeholder="imagen.jpg" /></div>
            <div class="form-group"><label>Texto alternativo</label><input v-model="mediaForm.alt_text" class="form-input" /></div>
            <div class="form-group"><label>Título</label><input v-model="mediaForm.title" class="form-input" /></div>
            <div class="form-group"><label>Carpeta</label><input v-model="mediaForm.folder_path" class="form-input" placeholder="/" /></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showUploadMedia = false">Cancelar</button>
            <button class="btn btn-primary" @click="uploadMedia" :disabled="saving">{{ saving ? 'Subiendo...' : 'Subir' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- THEMES -->
    <div v-if="activeTab === 'themes'">
      <div class="section-header"><h2>🎨 Temas</h2></div>
      <div v-if="themes.length" class="cards-grid">
        <div v-for="theme in themes" :key="theme.id" class="card theme-card">
          <div class="theme-preview" :style="{ background: theme.settings?.primary_color || '#3b82f6' }"></div>
          <div class="card-body">
            <h3 class="card-title">{{ theme.name }}</h3>
            <p class="card-desc">{{ theme.description || 'Sin descripción' }}</p>
            <span class="badge" :class="theme.is_active ? 'badge-success' : 'badge-warning'">
              {{ theme.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state"><p>No hay temas configurados</p></div>

      <!-- Brand Settings -->
      <div class="section-header" style="margin-top: 32px"><h2>🏷️ Branding</h2></div>
      <div class="brand-form">
        <div class="form-row">
          <div class="form-group"><label>Color Primario</label><div class="color-input"><input type="color" v-model="brandForm.primary_color" /><input v-model="brandForm.primary_color" class="form-input" /></div></div>
          <div class="form-group"><label>Color Secundario</label><div class="color-input"><input type="color" v-model="brandForm.secondary_color" /><input v-model="brandForm.secondary_color" class="form-input" /></div></div>
          <div class="form-group"><label>Color Acento</label><div class="color-input"><input type="color" v-model="brandForm.accent_color" /><input v-model="brandForm.accent_color" class="form-input" /></div></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Fuente de Títulos</label><input v-model="brandForm.font_heading" class="form-input" placeholder="Inter" /></div>
          <div class="form-group"><label>Fuente de Cuerpo</label><input v-model="brandForm.font_body" class="form-input" placeholder="Inter" /></div>
        </div>
        <div class="form-group">
          <label>Logo URL</label><input v-model="brandForm.logo_url" class="form-input" placeholder="https://..." />
        </div>
        <button class="btn btn-primary" @click="saveBrand" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar Branding' }}</button>
      </div>
    </div>

    <!-- NAVIGATION -->
    <div v-if="activeTab === 'navigation'">
      <div class="section-header">
        <h2>🧭 Navegación</h2>
        <button class="btn btn-primary btn-sm" @click="showCreateMenu = true">+ Nuevo Menú</button>
      </div>
      <p class="nav-hint">Los menús con ubicación <strong>Header</strong> se muestran en el menú superior de la landing page. Cada ítem define una ruta (p. ej. <code>/products</code>, <code>/#hero</code> o <code>https://...</code>).</p>
      <div v-if="menus.length" class="cards-grid">
        <div v-for="menu in menus" :key="menu.id" class="card">
          <div class="card-header">
            <h3 class="card-title">{{ menu.name }}</h3>
            <span class="badge badge-info">{{ menu.location }}</span>
          </div>
          <div class="card-body">
            <div class="menu-items-list">
              <div v-for="item in (menu.items || []).slice(0, 5)" :key="item.id" class="menu-item-preview">
                <span>{{ item.label }}</span>
                <span class="menu-item-url">{{ item.url }}</span>
              </div>
              <div v-if="(menu.items || []).length > 5" class="menu-more">+{{ menu.items.length - 5 }} más</div>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn btn-sm btn-outline" @click="editMenu(menu)">✏️ Editar</button>
            <button class="btn btn-sm btn-danger" @click="deleteMenuById(menu)">🗑️</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state"><p>No hay menús creados</p></div>

      <!-- Create Menu Modal -->
      <div v-if="showCreateMenu" class="modal-overlay" @click.self="showCreateMenu = false">
        <div class="modal">
          <div class="modal-header"><h2>Nuevo Menú</h2><button class="modal-close" @click="showCreateMenu = false">&times;</button></div>
          <div class="modal-body">
            <div class="form-group"><label>Nombre *</label><input v-model="menuForm.name" class="form-input" placeholder="Menú Principal" /></div>
            <div class="form-group"><label>Ubicación</label>
              <select v-model="menuForm.location" class="form-input">
                <option value="header">Header</option>
                <option value="footer">Footer</option>
                <option value="sidebar">Sidebar</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showCreateMenu = false">Cancelar</button>
            <button class="btn btn-primary" @click="createMenuAction">Crear</button>
          </div>
        </div>
      </div>

      <!-- Menu Editor Modal -->
      <MenuEditorModal
        v-if="editingMenu"
        :menu="editingMenu"
        @close="editingMenu = null"
        @saved="loadAll"
      />
    </div>

    <!-- CUSTOM CODE -->
    <div v-if="activeTab === 'code'">
      <div class="section-header">
        <h2>💻 Código Personalizado</h2>
        <button class="btn btn-primary btn-sm" @click="showCreateCode = true">+ Nuevo Bloque</button>
      </div>
      <div v-if="customCode.length" class="cards-grid">
        <div v-for="block in customCode" :key="block.id" class="card">
          <div class="card-header">
            <div class="card-title-row">
              <h3 class="card-title">{{ block.name }}</h3>
              <span class="badge" :class="block.is_active ? 'badge-success' : 'badge-warning'">{{ block.code_type }}</span>
            </div>
          </div>
          <div class="card-body">
            <pre class="code-preview">{{ block.content?.substring(0, 150) }}...</pre>
            <span class="card-meta">📍 {{ block.location }}</span>
          </div>
          <div class="card-footer">
            <button class="btn btn-sm btn-outline" @click="editCode(block)">✏️</button>
            <button class="btn btn-sm btn-danger" @click="deleteCode(block)">🗑️</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state"><p>No hay bloques de código</p></div>

      <!-- Create Code Modal -->
      <div v-if="showCreateCode" class="modal-overlay" @click.self="showCreateCode = false">
        <div class="modal modal-wide">
          <div class="modal-header"><h2>Nuevo Bloque de Código</h2><button class="modal-close" @click="showCreateCode = false">&times;</button></div>
          <div class="modal-body">
            <div class="form-group"><label>Nombre *</label><input v-model="codeForm.name" class="form-input" /></div>
            <div class="form-row">
              <div class="form-group"><label>Tipo</label>
                <select v-model="codeForm.code_type" class="form-input">
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="javascript">JavaScript</option>
                </select>
              </div>
              <div class="form-group"><label>Ubicación</label>
                <select v-model="codeForm.location" class="form-input">
                  <option value="head">Head</option>
                  <option value="body">Body (inicio)</option>
                  <option value="body_end">Body (fin)</option>
                </select>
              </div>
            </div>
            <div class="form-group"><label>Contenido *</label>
              <textarea v-model="codeForm.content" class="form-input code-textarea" rows="8" placeholder="// Tu código personalizado aquí"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showCreateCode = false">Cancelar</button>
            <button class="btn btn-primary" @click="createCode">Crear</button>
          </div>
        </div>
      </div>
    </div>

    <!-- REDIRECTS -->
    <div v-if="activeTab === 'redirects'">
      <div class="section-header">
        <h2>🔀 Redirecciones URL</h2>
        <button class="btn btn-primary btn-sm" @click="showCreateRedirect = true">+ Nueva Redirección</button>
      </div>
      <div v-if="redirects.length" class="table-container">
        <table class="data-table">
          <thead><tr><th>Origen</th><th>Destino</th><th>Tipo</th><th>Activo</th><th></th></tr></thead>
          <tbody>
            <tr v-for="r in redirects" :key="r.id">
              <td><code>{{ r.source_path }}</code></td>
              <td><code>{{ r.target_url }}</code></td>
              <td>{{ r.redirect_type }}</td>
              <td><span class="badge" :class="r.is_active ? 'badge-success' : 'badge-warning'">{{ r.is_active ? 'Sí' : 'No' }}</span></td>
              <td><button class="btn btn-sm btn-danger" @click="deleteRedirectById(r)">🗑️</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state"><p>No hay redirecciones</p></div>

      <div v-if="showCreateRedirect" class="modal-overlay" @click.self="showCreateRedirect = false">
        <div class="modal">
          <div class="modal-header"><h2>Nueva Redirección</h2><button class="modal-close" @click="showCreateRedirect = false">&times;</button></div>
          <div class="modal-body">
            <div class="form-group"><label>Ruta de origen *</label><input v-model="redirectForm.source_path" class="form-input" placeholder="/antigua-ruta" /></div>
            <div class="form-group"><label>URL destino *</label><input v-model="redirectForm.target_url" class="form-input" placeholder="https://..." /></div>
            <div class="form-group"><label>Tipo</label>
              <select v-model="redirectForm.redirect_type" class="form-input">
                <option :value="301">301 (Permanente)</option>
                <option :value="302">302 (Temporal)</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showCreateRedirect = false">Cancelar</button>
            <button class="btn btn-primary" @click="createRedirect">Crear</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { siteBuilderAPI } from '@/api'
import MenuEditorModal from '../../components/site/MenuEditorModal.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const activeTab = ref('media')
const saving = ref(false)
const tabs = [
  { key: 'media', icon: '📁', label: 'Medios' },
  { key: 'themes', icon: '🎨', label: 'Temas & Branding' },
  { key: 'navigation', icon: '🧭', label: 'Navegación' },
  { key: 'code', icon: '💻', label: 'Código' },
  { key: 'redirects', icon: '🔀', label: 'Redirecciones' },
]

// Media
const media = ref([])
const mediaLoading = ref(true)
const showUploadMedia = ref(false)
const mediaForm = ref({ url: '', file_name: '', alt_text: '', title: '', folder_path: '/' })

// Themes & Brand
const themes = ref([])
const brandForm = ref({ primary_color: '#3b82f6', secondary_color: '#8b5cf6', accent_color: '#10b981', font_heading: 'Inter', font_body: 'Inter', logo_url: '' })

// Navigation
const menus = ref([])
const showCreateMenu = ref(false)
const menuForm = ref({ name: '', location: 'header' })
const editingMenu = ref(null)

// Custom Code
const customCode = ref([])
const showCreateCode = ref(false)
const codeForm = ref({ name: '', code_type: 'html', content: '', location: 'head' })

// Redirects
const redirects = ref([])
const showCreateRedirect = ref(false)
const redirectForm = ref({ source_path: '', target_url: '', redirect_type: 301 })

async function loadAll() {
  mediaLoading.value = true
  try {
    const [mediaRes, themesRes, menusRes, codeRes, redirectsRes, brandRes] = await Promise.all([
      siteBuilderAPI.getMedia().catch(() => ({ data: { data: [] } })),
      siteBuilderAPI.getThemes().catch(() => ({ data: { data: [] } })),
      siteBuilderAPI.getMenus().catch(() => ({ data: { data: [] } })),
      siteBuilderAPI.getCustomCode().catch(() => ({ data: { data: [] } })),
      siteBuilderAPI.getRedirects().catch(() => ({ data: { data: [] } })),
      siteBuilderAPI.getBrand().catch(() => ({ data: { data: null } })),
    ])
    media.value = mediaRes.data?.data || mediaRes.data || []
    themes.value = themesRes.data?.data || themesRes.data || []
    menus.value = menusRes.data?.data || menusRes.data || []
    customCode.value = codeRes.data?.data || codeRes.data || []
    redirects.value = redirectsRes.data?.data || redirectsRes.data || []
    const brand = brandRes.data?.data || brandRes.data
    if (brand) brandForm.value = { primary_color: brand.primary_color || '#3b82f6', secondary_color: brand.secondary_color || '#8b5cf6', accent_color: brand.accent_color || '#10b981', font_heading: brand.font_heading || 'Inter', font_body: brand.font_body || 'Inter', logo_url: brand.logo_url || '' }
  } catch (err) { console.error(err) }
  mediaLoading.value = false
}

async function uploadMedia() {
  saving.value = true
  try {
    await siteBuilderAPI.uploadMedia(mediaForm.value)
    showUploadMedia.value = false
    mediaForm.value = { url: '', file_name: '', alt_text: '', title: '', folder_path: '/' }
    await loadAll()
    toast.success('Medio subido correctamente')
  } catch (err) { toast.error(err.message) }
  saving.value = false
}

async function deleteMediaItem(item) {
  if (!confirm('¿Eliminar medio?')) return
  try { await siteBuilderAPI.deleteMedia(item.id); media.value = media.value.filter(m => m.id !== item.id); toast.success('Medio eliminado') } catch (err) { toast.error(err.message) }
}

async function saveBrand() {
  saving.value = true
  try { await siteBuilderAPI.updateBrand(brandForm.value); toast.success('Marca guardada correctamente') } catch (err) { toast.error(err.message) }
  saving.value = false
}

async function createMenuAction() {
  try { await siteBuilderAPI.createMenu(menuForm.value); showCreateMenu.value = false; menuForm.value = { name: '', location: 'header' }; await loadAll(); toast.success('Menú creado') }
  catch (err) { toast.error(err.message) }
}

function editMenu(menu) { editingMenu.value = menu }

async function deleteMenuById(menu) {
  if (!confirm(`¿Eliminar menú "${menu.name}"?`)) return
  try { await siteBuilderAPI.deleteMenu(menu.id); menus.value = menus.value.filter(m => m.id !== menu.id); toast.success('Menú eliminado') } catch (err) { toast.error(err.message) }
}

async function createCode() {
  try { await siteBuilderAPI.createCustomCode(codeForm.value); showCreateCode.value = false; codeForm.value = { name: '', code_type: 'html', content: '', location: 'head' }; await loadAll(); toast.success('Bloque de código creado') }
  catch (err) { toast.error(err.message) }
}

function editCode(block) { toast.info('Editor de código — ' + block.name) }

async function deleteCode(block) {
  if (!confirm('¿Eliminar bloque?')) return
  try { await siteBuilderAPI.deleteCustomCode(block.id); customCode.value = customCode.value.filter(c => c.id !== block.id); toast.success('Bloque eliminado') } catch (err) { toast.error(err.message) }
}

async function createRedirect() {
  try { await siteBuilderAPI.createRedirect(redirectForm.value); showCreateRedirect.value = false; redirectForm.value = { source_path: '', target_url: '', redirect_type: 301 }; await loadAll(); toast.success('Redirección creada') }
  catch (err) { toast.error(err.message) }
}

async function deleteRedirectById(r) {
  if (!confirm('¿Eliminar redirección?')) return
  try { await siteBuilderAPI.deleteRedirect(r.id); redirects.value = redirects.value.filter(x => x.id !== r.id); toast.success('Redirección eliminada') } catch (err) { toast.error(err.message) }
}

function getMediaIcon(type) { if (type?.includes('pdf')) return '📄'; if (type?.includes('video')) return '🎬'; if (type?.includes('audio')) return '🎵'; return '📁' }
function formatSize(bytes) { if (!bytes) return '0 B'; const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i] }

onMounted(loadAll)
</script>

<style scoped>
.page { padding: 24px; max-width: 1400px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-title { font-family: 'Inter', sans-serif; font-size: 1.8rem; font-weight: 800; color: #1e293b; margin: 0; }
.page-subtitle { color: #64748b; margin: 4px 0 0; }

.tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 0; }
.tab { padding: 10px 18px; border: none; background: none; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.88rem; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
.tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }
.tab:hover { color: #334155; }

.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header h2 { font-family: 'Inter', sans-serif; font-size: 1.15rem; font-weight: 700; margin: 0; }

.media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.media-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
.media-preview { height: 140px; background: #f8fafc; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.media-preview img { width: 100%; height: 100%; object-fit: cover; }
.media-icon { font-size: 2.5rem; }
.media-info { padding: 10px 12px; flex: 1; }
.media-name { display: block; font-weight: 600; font-size: 0.82rem; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.media-meta { display: block; font-size: 0.72rem; color: #94a3b8; margin-top: 2px; }
.media-card .btn { margin: 0 12px 10px; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; }
.card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.card-header { padding: 16px 18px 8px; }
.card-title-row { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-weight: 700; font-size: 1rem; margin: 0; color: #1e293b; }
.card-body { padding: 4px 18px 12px; }
.card-desc { font-size: 0.85rem; color: #64748b; margin: 0; }
.card-footer { display: flex; gap: 8px; padding: 12px 18px; border-top: 1px solid #f1f5f9; }
.card-meta { font-size: 0.78rem; color: #94a3b8; }

.theme-preview { height: 80px; }
.theme-card .card-body { padding-top: 14px; }

.brand-form { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; padding: 22px; }
.color-input { display: flex; align-items: center; gap: 8px; }
.color-input input[type="color"] { width: 36px; height: 36px; border: none; border-radius: 8px; cursor: pointer; padding: 0; }

.menu-items-list { display: flex; flex-direction: column; gap: 4px; }
.nav-hint { color: #64748b; font-size: 0.82rem; margin: -8px 0 16px; }
.nav-hint code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
.menu-item-preview { display: flex; justify-content: space-between; font-size: 0.82rem; padding: 4px 0; }
.menu-item-url { color: #94a3b8; font-size: 0.72rem; }
.menu-more { font-size: 0.78rem; color: #94a3b8; text-align: center; padding: 4px; }

.code-preview { background: #1e293b; color: #a5f3fc; padding: 10px; border-radius: 8px; font-size: 0.72rem; overflow: hidden; font-family: 'Fira Code', monospace; margin: 8px 0; }
.code-textarea { font-family: 'Fira Code', monospace; font-size: 0.82rem; }

.table-container { overflow-x: auto; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { text-align: left; padding: 10px 12px; background: #f8fafc; font-weight: 600; color: #475569; }
.data-table td { padding: 10px 12px; border-top: 1px solid #f1f5f9; }
.data-table code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.78rem; }

.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
.badge-success { background: #d1fae5; color: #065f46; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-info { background: #dbeafe; color: #1e40af; }

.btn { padding: 8px 16px; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.82rem; cursor: pointer; border: none; transition: all 0.2s; }
.btn-primary { background: #3b82f6; color: #fff; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-outline { background: #fff; border: 1px solid #e2e8f0; color: #475569; }
.btn-sm { padding: 5px 10px; font-size: 0.75rem; }

.empty-state, .loading-state { text-align: center; padding: 40px 20px; color: #64748b; }
.spinner { width: 36px; height: 36px; border: 3px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
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
.form-input { width: 100%; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.88rem; box-sizing: border-box; }
.form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
</style>
