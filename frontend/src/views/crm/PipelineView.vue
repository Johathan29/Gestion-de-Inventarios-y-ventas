<template>
  <div class="crm-pipeline">
    <!-- Header -->
    <div class="crm-header">
      <div class="crm-header-left">
        <h1 class="crm-title">Pipeline CRM</h1>
        <p class="crm-subtitle">Gestiona tus leads y oportunidades de venta</p>
      </div>
      <div class="crm-header-actions">
        <select v-model="selectedPipeline" @change="fetchPipeline" class="crm-select">
          <option v-for="p in pipelines" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <button class="crm-btn crm-btn-primary" @click="showCreateLead = true">
          + Nuevo Lead
        </button>
      </div>
    </div>

    <!-- Pipeline Stats Bar -->
    <div class="crm-stats-bar" v-if="pipeline">
      <div class="crm-stat">
        <span class="crm-stat-value">{{ totalLeads }}</span>
        <span class="crm-stat-label">Leads Totales</span>
      </div>
      <div class="crm-stat">
        <span class="crm-stat-value crm-text-success">{{ totalValue }}</span>
        <span class="crm-stat-label">Valor Pipeline</span>
      </div>
      <div class="crm-stat">
        <span class="crm-stat-value crm-text-primary">{{ conversionRate }}%</span>
        <span class="crm-stat-label">Tasa Conversión</span>
      </div>
    </div>

    <!-- Kanban Board -->
    <div class="crm-kanban" v-if="stages.length">
      <div
        v-for="stage in stages"
        :key="stage.id"
        class="crm-column"
        @dragover.prevent="onDragOver($event, stage)"
        @drop="onDrop($event, stage)"
      >
        <div class="crm-column-header" :style="{ borderTopColor: stage.color || '#3b82f6' }">
          <div class="crm-column-title">
            <span class="crm-column-name">{{ stage.name }}</span>
            <span class="crm-column-count">{{ getStageLeads(stage.id).length }}</span>
          </div>
          <span class="crm-column-value" v-if="getStageValue(stage.id) > 0">
            ${{ formatMoney(getStageValue(stage.id)) }}
          </span>
        </div>

        <div class="crm-column-body">
          <div
            v-for="lead in getStageLeads(stage.id)"
            :key="lead.id"
            class="crm-lead-card"
            draggable="true"
            @dragstart="onDragStart($event, lead)"
            @click="openLeadDetail(lead)"
          >
            <div class="crm-lead-header">
              <span class="crm-lead-name">{{ lead.name || lead.title }}</span>
              <span class="crm-lead-amount" v-if="lead.estimated_value">
                ${{ formatMoney(lead.estimated_value) }}
              </span>
            </div>
            <p class="crm-lead-desc" v-if="lead.description">{{ lead.description }}</p>
            <div class="crm-lead-meta">
              <span class="crm-lead-source" v-if="lead.lead_sources?.name">
                📍 {{ lead.lead_sources.name }}
              </span>
              <span class="crm-lead-date" v-if="lead.created_at">
                {{ formatDate(lead.created_at) }}
              </span>
            </div>
            <div class="crm-lead-footer" v-if="lead.users?.name">
              <span class="crm-lead-avatar" :style="{ background: getColor(lead.users.name) }">
                {{ getInitials(lead.users.name) }}
              </span>
              <span class="crm-lead-user">{{ lead.users.name }}</span>
            </div>
          </div>

          <div v-if="!getStageLeads(stage.id).length" class="crm-column-empty">
            Sin leads
          </div>
        </div>
      </div>
    </div>

    <!-- Lead Detail Modal -->
    <Teleport to="body">
      <div v-if="selectedLead" class="crm-modal-overlay" @click.self="selectedLead = null">
        <div class="crm-modal">
          <div class="crm-modal-header">
            <h2>{{ selectedLead.name || selectedLead.title }}</h2>
            <button class="crm-close" @click="selectedLead = null">✕</button>
          </div>
          <div class="crm-modal-body">
            <div class="crm-detail-row"><span>Empresa:</span><span>{{ selectedLead.company_name || '—' }}</span></div>
            <div class="crm-detail-row"><span>Email:</span><span>{{ selectedLead.email || '—' }}</span></div>
            <div class="crm-detail-row"><span>Teléfono:</span><span>{{ selectedLead.phone || '—' }}</span></div>
            <div class="crm-detail-row"><span>Valor Estimado:</span><span class="crm-text-primary">${{ formatMoney(selectedLead.estimated_value) }}</span></div>
            <div class="crm-detail-row"><span>Fuente:</span><span>{{ selectedLead.lead_sources?.name || '—' }}</span></div>
            <div class="crm-detail-row"><span>Etapa:</span><span>{{ getStageName(selectedLead.stage_id) }}</span></div>
            <div class="crm-detail-row"><span>Creado:</span><span>{{ formatDate(selectedLead.created_at) }}</span></div>

            <div class="crm-detail-section" v-if="selectedLead.description">
              <h4>Descripción</h4>
              <p>{{ selectedLead.description }}</p>
            </div>

            <!-- Activities -->
            <div class="crm-detail-section">
              <h4>Actividad Reciente</h4>
              <div v-for="act in leadActivities" :key="act.id" class="crm-activity">
                <span class="crm-activity-dot"></span>
                <div>
                  <span class="crm-activity-text">{{ act.description }}</span>
                  <span class="crm-activity-date">{{ formatDate(act.created_at) }}</span>
                </div>
              </div>
              <p v-if="!leadActivities.length" class="crm-empty-text">Sin actividad registrada</p>
            </div>
          </div>
          <div class="crm-modal-footer">
            <button class="crm-btn crm-btn-outline" @click="selectedLead = null">Cerrar</button>
            <button class="crm-btn crm-btn-success" @click="convertLead(selectedLead)" v-if="selectedLead.stage_id">
              ✅ Convertir a Cliente
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Lead Modal -->
    <Teleport to="body">
      <div v-if="showCreateLead" class="crm-modal-overlay" @click.self="showCreateLead = false">
        <div class="crm-modal">
          <div class="crm-modal-header">
            <h2>+ Nuevo Lead</h2>
            <button class="crm-close" @click="showCreateLead = false">✕</button>
          </div>
          <div class="crm-modal-body">
            <div class="crm-form-group">
              <label>Nombre *</label>
              <input v-model="newLead.name" class="crm-input" placeholder="Nombre del lead"/>
            </div>
            <div class="crm-form-row">
              <div class="crm-form-group">
                <label>Email</label>
                <input v-model="newLead.email" class="crm-input" type="email" placeholder="email@ejemplo.com"/>
              </div>
              <div class="crm-form-group">
                <label>Teléfono</label>
                <input v-model="newLead.phone" class="crm-input" placeholder="+52..."/>
              </div>
            </div>
            <div class="crm-form-group">
              <label>Empresa</label>
              <input v-model="newLead.company_name" class="crm-input" placeholder="Nombre de la empresa"/>
            </div>
            <div class="crm-form-row">
              <div class="crm-form-group">
                <label>Valor Estimado ($)</label>
                <input v-model.number="newLead.estimated_value" class="crm-input" type="number" min="0"/>
              </div>
              <div class="crm-form-group">
                <label>Fuente</label>
                <select v-model="newLead.source_id" class="crm-input">
                  <option value="">Seleccionar...</option>
                  <option v-for="s in leadSources" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
            </div>
            <div class="crm-form-group">
              <label>Etapa</label>
              <select v-model="newLead.stage_id" class="crm-input">
                <option v-for="s in stages" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div class="crm-form-group">
              <label>Descripción</label>
              <textarea v-model="newLead.description" class="crm-input" rows="3" placeholder="Detalles del lead..."></textarea>
            </div>
          </div>
          <div class="crm-modal-footer">
            <button class="crm-btn crm-btn-outline" @click="showCreateLead = false">Cancelar</button>
            <button class="crm-btn crm-btn-primary" @click="createLead" :disabled="!newLead.name">Crear Lead</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { crmAPI } from '../../api';
import Swal from 'sweetalert2';

const pipelines = ref([]);
const selectedPipeline = ref(null);
const pipeline = ref(null);
const stages = ref([]);
const leads = ref([]);
const leadSources = ref([]);
const selectedLead = ref(null);
const leadActivities = ref([]);
const showCreateLead = ref(false);
const draggedLead = ref(null);

const newLead = ref({
  name: '', email: '', phone: '', company_name: '',
  estimated_value: null, source_id: '', stage_id: '', description: '',
});

const totalLeads = computed(() => leads.value.length);
const totalValue = computed(() => formatMoney(leads.value.reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0)));
const conversionRate = computed(() => {
  if (!leads.value.length || !stages.value.length) return 0;
  const lastStage = stages.value[stages.value.length - 1];
  const converted = leads.value.filter(l => l.stage_id === lastStage?.id).length;
  return ((converted / leads.value.length) * 100).toFixed(1);
});

const formatMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';
const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
const getColor = (name) => {
  const c = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  let h = 0; for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
};

const getStageLeads = (stageId) => leads.value.filter(l => l.stage_id === stageId);
const getStageValue = (stageId) => getStageLeads(stageId).reduce((s, l) => s + (parseFloat(l.estimated_value) || 0), 0);
const getStageName = (stageId) => stages.value.find(s => s.id === stageId)?.name || '—';

// Drag & Drop
const onDragStart = (e, lead) => {
  draggedLead.value = lead;
  e.dataTransfer.effectAllowed = 'move';
};
const onDragOver = (e, stage) => { e.preventDefault(); e.currentTarget.classList.add('crm-column-drag-over'); };
const onDrop = async (e, stage) => {
  e.currentTarget.classList.remove('crm-column-drag-over');
  if (!draggedLead.value || draggedLead.value.stage_id === stage.id) return;
  try {
    await crmAPI.moveLead(draggedLead.value.id, { stage_id: stage.id });
    draggedLead.value.stage_id = stage.id;
  } catch (err) {
    Swal.fire('Error', 'No se pudo mover el lead', 'error');
  }
  draggedLead.value = null;
};

// Fetch data
const fetchPipelines = async () => {
  try {
    const res = await crmAPI.getPipelines();
    pipelines.value = res.data || [];
    if (pipelines.value.length) {
      selectedPipeline.value = pipelines.value[0].id;
      await fetchPipeline();
    }
  } catch (e) {
    // Pipeline endpoint might not be available yet
    console.warn('CRM pipelines not available:', e.message);
    // Create a default pipeline
    pipelines.value = [{ id: 1, name: 'Pipeline Principal' }];
    selectedPipeline.value = 1;
  }
};

const fetchPipeline = async () => {
  try {
    const [stagesRes, leadsRes] = await Promise.all([
      crmAPI.getPipelineStages(selectedPipeline.value),
      crmAPI.getLeads({ pipeline_id: selectedPipeline.value }),
    ]);
    stages.value = stagesRes.data || [];
    leads.value = leadsRes.data || [];
  } catch (e) {
    console.warn('CRM data not available:', e.message);
  }
};

const openLeadDetail = async (lead) => {
  selectedLead.value = lead;
  try {
    const res = await crmAPI.getLeadActivities(lead.id);
    leadActivities.value = res.data || [];
  } catch (e) {
    leadActivities.value = [];
  }
};

const createLead = async () => {
  try {
    await crmAPI.createLead({
      ...newLead.value,
      pipeline_id: selectedPipeline.value,
    });
    showCreateLead.value = false;
    newLead.value = { name: '', email: '', phone: '', company_name: '', estimated_value: null, source_id: '', stage_id: '', description: '' };
    await fetchPipeline();
    Swal.fire({ icon: 'success', title: 'Lead creado', timer: 1500 });
  } catch (e) {
    Swal.fire('Error', 'No se pudo crear el lead', 'error');
  }
};

const convertLead = async (lead) => {
  const r = await Swal.fire({
    title: '¿Convertir lead a cliente?',
    text: lead.name,
    icon: 'question',
    showCancelButton: true,
  });
  if (!r.isConfirmed) return;
  try {
    await crmAPI.convertLead(lead.id);
    selectedLead.value = null;
    await fetchPipeline();
    Swal.fire({ icon: 'success', title: 'Lead convertido', timer: 2000 });
  } catch (e) {
    Swal.fire('Error', 'No se pudo convertir el lead', 'error');
  }
};

onMounted(async () => {
  await fetchPipelines();
  try {
    const srcRes = await crmAPI.getLeadSources();
    leadSources.value = srcRes.data || [];
  } catch (e) { /* not available */ }
});
</script>

<style scoped>
.crm-pipeline { padding: 24px; height: calc(100vh - 80px); display: flex; flex-direction: column; }

/* Header */
.crm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-shrink: 0; }
.crm-title { font-family: 'Inter', sans-serif; font-size: 1.75rem; font-weight: 800; color: #1e293b; margin: 0; }
.crm-subtitle { font-size: 0.9rem; color: #94a3b8; margin: 4px 0 0; }
.crm-header-actions { display: flex; gap: 10px; align-items: center; }
.crm-select { padding: 8px 14px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.88rem; background: #fff; }

/* Stats Bar */
.crm-stats-bar { display: flex; gap: 32px; padding: 14px 24px; background: #fff; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); flex-shrink: 0; }
.crm-stat { display: flex; flex-direction: column; }
.crm-stat-value { font-size: 1.15rem; font-weight: 800; color: #1e293b; }
.crm-stat-label { font-size: 0.75rem; color: #94a3b8; }
.crm-text-success { color: #10b981 !important; }
.crm-text-primary { color: #3b82f6 !important; }

/* Kanban Board */
.crm-kanban { display: flex; gap: 16px; overflow-x: auto; flex: 1; padding-bottom: 16px; }
.crm-column { min-width: 280px; max-width: 320px; flex: 1; display: flex; flex-direction: column; border-radius: 14px; background: #f8fafc; border: 2px solid transparent; transition: border-color 0.2s; }
.crm-column-drag-over { border-color: #3b82f6; background: #eff6ff; }
.crm-column-header { padding: 14px 16px; border-top: 3px solid #3b82f6; background: #fff; border-radius: 14px 14px 0 0; }
.crm-column-title { display: flex; justify-content: space-between; align-items: center; }
.crm-column-name { font-weight: 700; font-size: 0.9rem; color: #1e293b; }
.crm-column-count { background: #f1f5f9; padding: 2px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; color: #64748b; }
.crm-column-value { display: block; font-size: 0.78rem; color: #10b981; font-weight: 600; margin-top: 4px; }
.crm-column-body { flex: 1; padding: 10px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; max-height: calc(100vh - 340px); }
.crm-column-empty { text-align: center; color: #cbd5e1; padding: 30px; font-size: 0.85rem; }

/* Lead Cards */
.crm-lead-card { background: #fff; border-radius: 12px; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); cursor: grab; transition: transform 0.15s, box-shadow 0.15s; border: 1px solid #f1f5f9; }
.crm-lead-card:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.crm-lead-card:active { cursor: grabbing; }
.crm-lead-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.crm-lead-name { font-weight: 700; font-size: 0.88rem; color: #1e293b; }
.crm-lead-amount { font-weight: 700; font-size: 0.82rem; color: #10b981; }
.crm-lead-desc { font-size: 0.78rem; color: #64748b; margin: 0 0 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.crm-lead-meta { display: flex; gap: 10px; font-size: 0.72rem; color: #94a3b8; margin-bottom: 8px; }
.crm-lead-footer { display: flex; align-items: center; gap: 8px; }
.crm-lead-avatar { width: 24px; height: 24px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; color: #fff; flex-shrink: 0; }
.crm-lead-user { font-size: 0.75rem; color: #64748b; }

/* Modal */
.crm-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px); }
.crm-modal { background: #fff; border-radius: 20px; max-width: 560px; width: 90%; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
.crm-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 0; }
.crm-modal-header h2 { font-size: 1.15rem; font-weight: 800; margin: 0; }
.crm-close { width: 32px; height: 32px; border: none; border-radius: 8px; background: #f1f5f9; cursor: pointer; font-size: 1rem; }
.crm-modal-body { padding: 20px 24px; }
.crm-modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #f1f5f9; }
.crm-detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f8fafc; font-size: 0.88rem; }
.crm-detail-row span:first-child { color: #64748b; }
.crm-detail-row span:last-child { font-weight: 600; color: #1e293b; }
.crm-detail-section { margin-top: 16px; }
.crm-detail-section h4 { font-size: 0.9rem; font-weight: 700; margin: 0 0 10px; }
.crm-detail-section p { font-size: 0.88rem; color: #475569; line-height: 1.5; margin: 0; }
.crm-activity { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 10px; }
.crm-activity-dot { width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; margin-top: 5px; flex-shrink: 0; }
.crm-activity-text { display: block; font-size: 0.85rem; color: #1e293b; }
.crm-activity-date { font-size: 0.75rem; color: #94a3b8; }
.crm-empty-text { color: #cbd5e1; font-size: 0.85rem; text-align: center; padding: 20px; }

/* Form */
.crm-form-group { margin-bottom: 14px; }
.crm-form-group label { display: block; font-weight: 600; font-size: 0.82rem; color: #475569; margin-bottom: 4px; }
.crm-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.crm-input { width: 100%; padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 10px; font-size: 0.88rem; font-family: 'Inter', sans-serif; outline: none; }
.crm-input:focus { border-color: #3b82f6; }

/* Buttons */
.crm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.85rem; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
.crm-btn-primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.crm-btn-primary:hover { background: #2563eb; }
.crm-btn-success { background: #10b981; color: #fff; border-color: #10b981; }
.crm-btn-success:hover { background: #059669; }
.crm-btn-outline { border-color: #e2e8f0; color: #475569; background: #fff; }
.crm-btn-outline:hover { border-color: #94a3b8; }
.crm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
