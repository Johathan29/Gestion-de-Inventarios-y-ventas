<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">⚡ Integraciones</h1>
        <p class="page-subtitle">Webhooks, automatizaciones y reglas de negocio</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'webhooks' }" @click="tab = 'webhooks'">🔗 Webhooks</button>
      <button class="tab" :class="{ active: tab === 'automations' }" @click="tab = 'automations'">🤖 Automatizaciones</button>
    </div>

    <!-- WEBHOOKS -->
    <div v-if="tab === 'webhooks'">
      <div class="section-header">
        <h2>Webhooks</h2>
        <button class="btn btn-primary btn-sm" @click="showCreateWebhook = true">+ Nuevo Webhook</button>
      </div>
      <div v-if="loading" class="loading-state"><div class="spinner"></div></div>
      <div v-else-if="webhooks.length" class="cards-grid">
        <div v-for="wh in webhooks" :key="wh.id" class="card">
          <div class="card-header">
            <div class="card-title-row">
              <h3 class="card-title">{{ wh.name }}</h3>
              <span class="badge" :class="wh.is_active ? 'badge-success' : 'badge-warning'">{{ wh.is_active ? 'Activo' : 'Inactivo' }}</span>
            </div>
            <span class="card-meta">{{ wh.url }}</span>
          </div>
          <div class="card-body">
            <div class="webhook-events">
              <span v-for="et in (wh.event_types || [])" :key="et.id" class="tag">{{ et.name || et.event_key }}</span>
              <span v-if="!wh.event_types?.length" class="text-muted">Todos los eventos</span>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn btn-sm btn-info" @click="testWebhook(wh)" :disabled="testingId === wh.id">
              {{ testingId === wh.id ? 'Probando...' : '🧪 Probar' }}
            </button>
            <button class="btn btn-sm btn-outline" @click="viewWebhookLogs(wh)">📋 Logs</button>
            <button class="btn btn-sm btn-danger" @click="deleteWebhookById(wh)">🗑️</button>
          </div>
          <div v-if="testResult?.webhookId === wh.id" class="test-result" :class="testResult.status === 'success' ? 'test-success' : 'test-error'">
            {{ testResult.status === 'success' ? '✅' : '❌' }} {{ testResult.message }}
          </div>
        </div>
      </div>
      <div v-else class="empty-state"><p>No hay webhooks configurados</p></div>

      <!-- Create Webhook Modal -->
      <div v-if="showCreateWebhook" class="modal-overlay" @click.self="showCreateWebhook = false">
        <div class="modal modal-wide">
          <div class="modal-header"><h2>Nuevo Webhook</h2><button class="modal-close" @click="showCreateWebhook = false">&times;</button></div>
          <div class="modal-body">
            <div class="form-group"><label>Nombre *</label><input v-model="webhookForm.name" class="form-input" placeholder="Mi Webhook" /></div>
            <div class="form-group"><label>URL de destino *</label><input v-model="webhookForm.url" class="form-input" placeholder="https://hooks.example.com/webhook" /></div>
            <div class="form-group"><label>Secreto (para verificación HMAC)</label><input v-model="webhookForm.secret" class="form-input" placeholder="Opcional" /></div>
            <div class="form-group"><label>Eventos</label>
              <div class="events-grid">
                <label v-for="et in eventTypes" :key="et.id" class="event-checkbox">
                  <input type="checkbox" :value="et.id" v-model="webhookForm.event_type_ids" />
                  <span>{{ et.name }}</span>
                  <span class="event-cat">{{ et.category }}</span>
                </label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showCreateWebhook = false">Cancelar</button>
            <button class="btn btn-primary" @click="createWebhook">Crear</button>
          </div>
        </div>
      </div>

      <!-- Webhook Logs Modal -->
      <div v-if="viewingLogs" class="modal-overlay" @click.self="viewingLogs = null" style="z-index:1100">
        <div class="modal modal-wide">
          <div class="modal-header"><h2>📋 Logs — {{ viewingLogs.name }}</h2><button class="modal-close" @click="viewingLogs = null">&times;</button></div>
          <div class="modal-body">
            <div v-if="webhookLogs.length" class="table-container">
              <table class="data-table">
                <thead><tr><th>Fecha</th><th>Evento</th><th>Estado</th><th>Código</th><th>Duración</th></tr></thead>
                <tbody>
                  <tr v-for="log in webhookLogs" :key="log.id">
                    <td>{{ formatDate(log.created_at) }}</td>
                    <td><code>{{ log.event_type }}</code></td>
                    <td><span class="badge" :class="log.response_status === 'success' ? 'badge-success' : 'badge-warning'">{{ log.response_status }}</span></td>
                    <td>{{ log.response_code || '-' }}</td>
                    <td>{{ log.duration_ms }}ms</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-state"><p>No hay logs</p></div>
          </div>
        </div>
      </div>
    </div>

    <!-- AUTOMATIONS -->
    <div v-if="tab === 'automations'">
      <div class="section-header">
        <h2>Automatizaciones</h2>
        <button class="btn btn-primary btn-sm" @click="showCreateAutomation = true">+ Nueva Automatización</button>
      </div>
      <div v-if="automations.length" class="cards-grid">
        <div v-for="auto in automations" :key="auto.id" class="card">
          <div class="card-header">
            <div class="card-title-row">
              <h3 class="card-title">{{ auto.name }}</h3>
              <span class="badge" :class="auto.is_active ? 'badge-success' : 'badge-warning'">{{ auto.is_active ? 'Activa' : 'Inactiva' }}</span>
            </div>
            <span class="card-meta">⚡ {{ auto.trigger_event }} · {{ auto.execution_count || 0 }} ejecuciones</span>
          </div>
          <div class="card-body">
            <p class="card-desc">{{ auto.description || 'Sin descripción' }}</p>
            <div class="auto-conditions">
              <span v-for="(v, k) in (auto.conditions || {})" :key="k" class="tag">{{ k }}: {{ v }}</span>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn btn-sm" :class="auto.is_active ? 'btn-warning' : 'btn-success'" @click="toggleAuto(auto)">
              {{ auto.is_active ? '⏸ Pausar' : '▶ Activar' }}
            </button>
            <button class="btn btn-sm btn-info" @click="testAuto(auto)">🧪 Probar</button>
            <button class="btn btn-sm btn-outline" @click="viewAutoLogs(auto)">📋 Logs</button>
            <button class="btn btn-sm btn-danger" @click="deleteAuto(auto)">🗑️</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state"><p>No hay automatizaciones</p></div>

      <!-- Create Automation Modal -->
      <div v-if="showCreateAutomation" class="modal-overlay" @click.self="showCreateAutomation = false">
        <div class="modal modal-wide">
          <div class="modal-header"><h2>Nueva Automatización</h2><button class="modal-close" @click="showCreateAutomation = false">&times;</button></div>
          <div class="modal-body">
            <div class="form-group"><label>Nombre *</label><input v-model="automationForm.name" class="form-input" placeholder="Notificar venta alta" /></div>
            <div class="form-group"><label>Descripción</label><textarea v-model="automationForm.description" class="form-input" rows="2"></textarea></div>
            <div class="form-group"><label>Evento trigger *</label>
              <select v-model="automationForm.trigger_event" class="form-input">
                <option value="">Seleccionar...</option>
                <option v-for="et in eventTypes" :key="et.id" :value="et.event_key">{{ et.name }} ({{ et.category }})</option>
              </select>
            </div>
            <div class="form-group"><label>Prioridad</label><input v-model.number="automationForm.priority" type="number" class="form-input" min="0" max="10" /></div>
            <div class="form-group"><label>Acciones</label>
              <div v-for="(action, idx) in automationForm.actions" :key="idx" class="action-row">
                <select v-model="action.action_type" class="form-input" style="flex:1">
                  <option value="send_email">Enviar Email</option>
                  <option value="send_notification">Notificación</option>
                  <option value="update_status">Actualizar Estado</option>
                  <option value="call_webhook">Llamar Webhook</option>
                  <option value="create_task">Crear Tarea</option>
                </select>
                <button class="btn btn-sm btn-danger" @click="automationForm.actions.splice(idx, 1)">✕</button>
              </div>
              <button class="btn btn-outline btn-sm" @click="automationForm.actions.push({ action_type: 'send_email', action_config: {} })" style="margin-top:8px">+ Acción</button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="showCreateAutomation = false">Cancelar</button>
            <button class="btn btn-primary" @click="createAutomation">Crear</button>
          </div>
        </div>
      </div>

      <!-- Auto Logs Modal -->
      <div v-if="viewingAutoLogs" class="modal-overlay" @click.self="viewingAutoLogs = null" style="z-index:1100">
        <div class="modal modal-wide">
          <div class="modal-header"><h2>📋 Logs — {{ viewingAutoLogs.name }}</h2><button class="modal-close" @click="viewingAutoLogs = null">&times;</button></div>
          <div class="modal-body">
            <div v-if="autoLogs.length" class="table-container">
              <table class="data-table">
                <thead><tr><th>Fecha</th><th>Evento</th><th>Estado</th><th>Duración</th><th>Error</th></tr></thead>
                <tbody>
                  <tr v-for="log in autoLogs" :key="log.id">
                    <td>{{ formatDate(log.created_at) }}</td>
                    <td><code>{{ log.trigger_event }}</code></td>
                    <td><span class="badge" :class="log.status === 'success' ? 'badge-success' : log.status === 'simulated' ? 'badge-info' : 'badge-warning'">{{ log.status }}</span></td>
                    <td>{{ log.duration_ms }}ms</td>
                    <td class="error-cell">{{ log.error_message || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-state"><p>No hay logs</p></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { integrationsAPI } from '@/api'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const tab = ref('webhooks')
const loading = ref(true)
const webhooks = ref([])
const automations = ref([])
const eventTypes = ref([])

const showCreateWebhook = ref(false)
const showCreateAutomation = ref(false)
const testingId = ref(null)
const testResult = ref(null)
const viewingLogs = ref(null)
const webhookLogs = ref([])
const viewingAutoLogs = ref(null)
const autoLogs = ref([])

const webhookForm = ref({ name: '', url: '', secret: '', event_type_ids: [] })
const automationForm = ref({ name: '', description: '', trigger_event: '', conditions: {}, actions: [], priority: 0 })

async function loadAll() {
  loading.value = true
  try {
    const [whRes, autoRes, etRes] = await Promise.all([
      integrationsAPI.getWebhooks().catch(() => ({ data: { data: [] } })),
      integrationsAPI.getAutomations().catch(() => ({ data: { data: [] } })),
      integrationsAPI.getEventTypes().catch(() => ({ data: { data: [] } })),
    ])
    webhooks.value = whRes.data?.data || whRes.data || []
    automations.value = autoRes.data?.data || autoRes.data || []
    eventTypes.value = etRes.data?.data || etRes.data || []
  } catch (err) { console.error(err) }
  loading.value = false
}

async function createWebhook() {
  try { await integrationsAPI.createWebhook(webhookForm.value); showCreateWebhook.value = false; webhookForm.value = { name: '', url: '', secret: '', event_type_ids: [] }; await loadAll(); toast.success('Webhook creado') }
  catch (err) { toast.error(err.message) }
}

async function testWebhook(wh) {
  testingId.value = wh.id
  testResult.value = null
  try {
    const { data } = await integrationsAPI.testWebhook(wh.id)
    testResult.value = { webhookId: wh.id, status: data?.data?.status || 'success', message: `HTTP ${data?.data?.response_code || '?'} — ${data?.data?.duration_ms || 0}ms` }
  } catch (err) { testResult.value = { webhookId: wh.id, status: 'error', message: err.message } }
  testingId.value = null
}

async function viewWebhookLogs(wh) {
  viewingLogs.value = wh
  try { const { data } = await integrationsAPI.getWebhookLogs(wh.id); webhookLogs.value = data?.data || data || [] }
  catch { webhookLogs.value = [] }
}

async function deleteWebhookById(wh) {
  if (!confirm(`¿Eliminar webhook "${wh.name}"?`)) return
  try { await integrationsAPI.deleteWebhook(wh.id); webhooks.value = webhooks.value.filter(w => w.id !== wh.id); toast.success('Webhook eliminado') }
  catch (err) { toast.error(err.message) }
}

async function createAutomation() {
  try { await integrationsAPI.createAutomation(automationForm.value); showCreateAutomation.value = false; automationForm.value = { name: '', description: '', trigger_event: '', conditions: {}, actions: [], priority: 0 }; await loadAll(); toast.success('Automatización creada') }
  catch (err) { toast.error(err.message) }
}

async function toggleAuto(auto) {
  const wasActive = auto.is_active
  try { await integrationsAPI.toggleAutomation(auto.id); await loadAll(); toast.success(wasActive ? 'Automatización desactivada' : 'Automatización activada') }
  catch (err) { toast.error(err.message) }
}

async function testAuto(auto) {
  try { await integrationsAPI.testAutomation(auto.id, {}); toast.success('Automatización probada (simulada)') }
  catch (err) { toast.error(err.message) }
}

async function viewAutoLogs(auto) {
  viewingAutoLogs.value = auto
  try { const { data } = await integrationsAPI.getAutomationLogs(auto.id); autoLogs.value = data?.data || data || [] }
  catch { autoLogs.value = [] }
}

async function deleteAuto(auto) {
  if (!confirm(`¿Eliminar "${auto.name}"?`)) return
  try { await integrationsAPI.deleteAutomation(auto.id); automations.value = automations.value.filter(a => a.id !== auto.id); toast.success('Automatización eliminada') }
  catch (err) { toast.error(err.message) }
}

function formatDate(d) { return d ? new Date(d).toLocaleString('es-ES') : '-' }

onMounted(loadAll)
</script>

<style scoped>
.page { padding: 24px; max-width: 1400px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-title { font-family: 'Inter', sans-serif; font-size: 1.8rem; font-weight: 800; color: #1e293b; margin: 0; }
.page-subtitle { color: #64748b; margin: 4px 0 0; }

.tabs { display: flex; gap: 4px; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; }
.tab { padding: 10px 18px; border: none; background: none; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.88rem; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }

.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header h2 { font-size: 1.15rem; font-weight: 700; margin: 0; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
.card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; }
.card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.card-header { padding: 16px 18px 8px; }
.card-title-row { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-weight: 700; font-size: 1rem; margin: 0; color: #1e293b; }
.card-meta { font-size: 0.78rem; color: #94a3b8; }
.card-body { padding: 4px 18px 12px; }
.card-desc { font-size: 0.85rem; color: #64748b; margin: 0; }
.card-footer { display: flex; gap: 8px; padding: 12px 18px; border-top: 1px solid #f1f5f9; flex-wrap: wrap; }

.webhook-events { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.tag { display: inline-block; padding: 2px 8px; background: #f1f5f9; border-radius: 6px; font-size: 0.72rem; color: #475569; }
.text-muted { color: #94a3b8; font-size: 0.82rem; }
.auto-conditions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }

.test-result { padding: 8px 18px; font-size: 0.82rem; font-weight: 600; }
.test-success { background: #d1fae5; color: #065f46; }
.test-error { background: #fee2e2; color: #991b1b; }

.action-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.events-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; max-height: 200px; overflow-y: auto; }
.event-checkbox { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; cursor: pointer; }
.event-cat { font-size: 0.68rem; color: #94a3b8; margin-left: auto; }

.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
.badge-success { background: #d1fae5; color: #065f46; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-info { background: #dbeafe; color: #1e40af; }

.btn { padding: 8px 16px; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.82rem; cursor: pointer; border: none; transition: all 0.2s; }
.btn-primary { background: #3b82f6; color: #fff; }
.btn-success { background: #10b981; color: #fff; }
.btn-warning { background: #f59e0b; color: #fff; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-info { background: #6366f1; color: #fff; }
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

.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { text-align: left; padding: 10px 12px; background: #f8fafc; font-weight: 600; color: #475569; }
.data-table td { padding: 10px 12px; border-top: 1px solid #f1f5f9; }
.data-table code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.78rem; }
.error-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #ef4444; font-size: 0.78rem; }
</style>
