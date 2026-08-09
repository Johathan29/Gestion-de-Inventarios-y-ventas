<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">🔐 RBAC & Feature Flags</h1>
        <p class="page-subtitle">Gestión de roles, permisos y banderas de funcionalidad</p>
      </div>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'roles' }" @click="tab = 'roles'">👥 Roles</button>
      <button class="tab" :class="{ active: tab === 'features' }" @click="tab = 'features'">🚩 Feature Flags</button>
      <button class="tab" :class="{ active: tab === 'plans' }" @click="tab = 'plans'">💳 Planes</button>
      <button class="tab" :class="{ active: tab === 'audit' }" @click="tab = 'audit'">📋 Auditoría</button>
    </div>

    <!-- ROLES -->
    <div v-if="tab === 'roles'">
      <div class="section-header">
        <h2>Roles Personalizados</h2>
        <button class="btn btn-primary btn-sm" @click="showCreateRole = true">+ Nuevo Rol</button>
      </div>
      <div v-if="roles.length" class="cards-grid">
        <div v-for="role in roles" :key="role.id" class="card">
          <div class="card-header">
            <div class="card-title-row">
              <h3 class="card-title">
                <span class="role-dot" :style="{ background: role.color || '#6366f1' }"></span>
                {{ role.name }}
              </h3>
              <span class="badge" :class="role.is_active ? 'badge-success' : 'badge-warning'">{{ role.is_active ? 'Activo' : 'Inactivo' }}</span>
            </div>
          </div>
          <div class="card-body">
            <p class="card-desc">{{ role.description || 'Sin descripción' }}</p>
            <div class="perm-tags">
              <span v-for="perm in (role.permissions || []).slice(0, 8)" :key="perm.permission_id" class="perm-tag">
                {{ perm.permission?.module }}.{{ perm.permission?.action }}
              </span>
              <span v-if="(role.permissions || []).length > 8" class="perm-tag more">+{{ role.permissions.length - 8 }}</span>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn btn-sm btn-outline" @click="editRole(role)">✏️ Editar</button>
            <button class="btn btn-sm btn-danger" @click="deleteRoleById(role)">🗑️</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state"><p>No hay roles personalizados</p></div>

      <!-- Create/Edit Role Modal -->
      <div v-if="showCreateRole || editingRole" class="modal-overlay" @click.self="closeRoleModal">
        <div class="modal modal-wide">
          <div class="modal-header">
            <h2>{{ editingRole ? 'Editar Rol' : 'Nuevo Rol' }}</h2>
            <button class="modal-close" @click="closeRoleModal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group"><label>Nombre *</label><input v-model="roleForm.name" class="form-input" placeholder="Nombre del rol" /></div>
            <div class="form-group"><label>Descripción</label><input v-model="roleForm.description" class="form-input" /></div>
            <div class="form-group"><label>Color</label><div class="color-input"><input type="color" v-model="roleForm.color" /><input v-model="roleForm.color" class="form-input" style="width:120px" /></div></div>
            <div class="form-group">
              <label>Permisos</label>
              <div class="perm-group" v-for="(perms, module) in permissionsByModule" :key="module">
                <h4 class="perm-module">{{ module }}</h4>
                <div class="perm-checkboxes">
                  <label v-for="p in perms" :key="p.id" class="perm-check">
                    <input type="checkbox" :value="p.id" v-model="roleForm.permission_ids" />
                    <span>{{ p.action }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="closeRoleModal">Cancelar</button>
            <button class="btn btn-primary" @click="saveRole">{{ editingRole ? 'Actualizar' : 'Crear' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- FEATURE FLAGS -->
    <div v-if="tab === 'features'">
      <div class="section-header">
        <h2>Feature Flags</h2>
        <button class="btn btn-primary btn-sm" @click="showCreateFlag = true">+ Nueva Flag</button>
      </div>
      <div v-if="featureFlags.length" class="table-container">
        <table class="data-table">
          <thead>
            <tr><th>Nombre</th><th>Slug</th><th>Categoría</th><th>Activo</th><th>Rollout %</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="flag in featureFlags" :key="flag.id">
              <td><strong>{{ flag.name }}</strong><br><span class="text-muted">{{ flag.description }}</span></td>
              <td><code>{{ flag.slug }}</code></td>
              <td><span class="tag">{{ flag.category }}</span></td>
              <td>
                <button class="toggle-btn" :class="flag.is_active ? 'toggle-on' : 'toggle-off'" @click="toggleFlag(flag)">
                  {{ flag.is_active ? 'ON' : 'OFF' }}
                </button>
              </td>
              <td>{{ flag.rollout_percentage || 100 }}%</td>
              <td><button class="btn btn-sm btn-outline" @click="editFlag(flag)">✏️</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state"><p>No hay feature flags</p></div>

      <!-- Create Flag Modal -->
      <div v-if="showCreateFlag || editingFlag" class="modal-overlay" @click.self="closeFlagModal">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editingFlag ? 'Editar Flag' : 'Nueva Feature Flag' }}</h2>
            <button class="modal-close" @click="closeFlagModal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group"><label>Nombre *</label><input v-model="flagForm.name" class="form-input" /></div>
            <div class="form-group"><label>Slug</label><input v-model="flagForm.slug" class="form-input" placeholder="auto-generado" /></div>
            <div class="form-group"><label>Descripción</label><input v-model="flagForm.description" class="form-input" /></div>
            <div class="form-group"><label>Categoría</label>
              <select v-model="flagForm.category" class="form-input">
                <option value="general">General</option>
                <option value="erp">ERP</option>
                <option value="ecommerce">E-Commerce</option>
                <option value="crm">CRM</option>
                <option value="cms">CMS</option>
                <option value="experimental">Experimental</option>
              </select>
            </div>
            <div class="form-group"><label>Rollout %</label><input v-model.number="flagForm.rollout_percentage" type="number" min="0" max="100" class="form-input" /></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" @click="closeFlagModal">Cancelar</button>
            <button class="btn btn-primary" @click="saveFlag">{{ editingFlag ? 'Actualizar' : 'Crear' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- PLANS -->
    <div v-if="tab === 'plans'">
      <div class="section-header">
        <h2>Planes de Suscripción</h2>
        <button class="btn btn-primary btn-sm" @click="showCreatePlan = true">+ Nuevo Plan</button>
      </div>
      <div v-if="plans.length" class="plans-grid">
        <div v-for="plan in plans" :key="plan.id" class="plan-card">
          <div class="plan-header">
            <h3>{{ plan.name }}</h3>
            <div class="plan-price">
              <span class="price-amount">${{ plan.price_monthly }}</span>
              <span class="price-period">/mes</span>
            </div>
          </div>
          <div class="plan-body">
            <div class="plan-feature">👥 {{ plan.max_users }} usuarios</div>
            <div class="plan-feature">📦 {{ plan.max_products }} productos</div>
            <div class="plan-feature">💾 {{ plan.max_storage_mb }} MB almacenamiento</div>
            <div class="plan-feature">🔌 {{ plan.max_api_calls }} llamadas API/mes</div>
          </div>
          <div class="plan-footer">
            <span class="badge" :class="plan.is_active ? 'badge-success' : 'badge-warning'">{{ plan.is_active ? 'Activo' : 'Inactivo' }}</span>
            <button class="btn btn-sm btn-outline" @click="editPlan(plan)">✏️</button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state"><p>No hay planes definidos</p></div>
    </div>

    <!-- AUDIT LOGS -->
    <div v-if="tab === 'audit'">
      <div class="section-header"><h2>Registro de Auditoría</h2></div>
      <div v-if="auditLogs.length" class="table-container">
        <table class="data-table">
          <thead><tr><th>Fecha</th><th>Acción</th><th>Usuario</th><th>Detalles</th></tr></thead>
          <tbody>
            <tr v-for="log in auditLogs" :key="log.id">
              <td>{{ formatDate(log.created_at) }}</td>
              <td><span class="tag">{{ log.action }}</span></td>
              <td>{{ log.users?.name || log.user_id }}</td>
              <td class="text-muted">{{ log.details || log.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty-state"><p>No hay registros de auditoría</p></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { rbacAPI, platformAdminAPI } from '@/api'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const tab = ref('roles')
const companyId = ref(localStorage.getItem('companyId') || '00000000-0000-0000-0000-000000000001')

// Roles
const roles = ref([])
const permissions = ref([])
const showCreateRole = ref(false)
const editingRole = ref(null)
const roleForm = ref({ name: '', description: '', color: '#6366f1', permission_ids: [] })

// Feature Flags
const featureFlags = ref([])
const showCreateFlag = ref(false)
const editingFlag = ref(null)
const flagForm = ref({ name: '', slug: '', description: '', category: 'general', rollout_percentage: 100 })

// Plans
const plans = ref([])
const showCreatePlan = ref(false)
const editingPlan = ref(null)

// Audit
const auditLogs = ref([])

const permissionsByModule = computed(() => {
  const grouped = {}
  permissions.value.forEach(p => {
    if (!grouped[p.module]) grouped[p.module] = []
    grouped[p.module].push(p)
  })
  return grouped
})

async function loadAll() {
  try {
    const [rolesRes, permsRes, flagsRes, plansRes, auditRes] = await Promise.all([
      rbacAPI.getCompanyRoles(companyId.value).catch(() => ({ data: { data: [] } })),
      rbacAPI.getPermissions().catch(() => ({ data: { data: [] } })),
      rbacAPI.getFeatureFlags().catch(() => ({ data: { data: [] } })),
      platformAdminAPI.getPlans().catch(() => ({ data: { data: [] } })),
      rbacAPI.getCompanyAuditLogs(companyId.value).catch(() => ({ data: { data: [] } })),
    ])
    roles.value = rolesRes.data?.data || rolesRes.data || []
    permissions.value = permsRes.data?.data || permsRes.data || []
    featureFlags.value = flagsRes.data?.data || flagsRes.data || []
    plans.value = plansRes.data?.data || plansRes.data || []
    auditLogs.value = auditRes.data?.data || auditRes.data || []
  } catch (err) { console.error(err) }
}

function editRole(role) {
  editingRole.value = role
  roleForm.value = {
    name: role.name, description: role.description || '', color: role.color || '#6366f1',
    permission_ids: (role.permissions || []).map(p => p.permission_id)
  }
}

function closeRoleModal() { showCreateRole.value = false; editingRole.value = null; roleForm.value = { name: '', description: '', color: '#6366f1', permission_ids: [] } }

async function saveRole() {
  const isEdit = !!editingRole.value
  try {
    if (editingRole.value) { await rbacAPI.updateRole(companyId.value, editingRole.value.id, roleForm.value) }
    else { await rbacAPI.createRole(companyId.value, roleForm.value) }
    closeRoleModal(); await loadAll()
    toast.success(isEdit ? 'Rol actualizado' : 'Rol creado')
  } catch (err) { toast.error(err.message) }
}

async function deleteRoleById(role) {
  if (!confirm(`¿Eliminar rol "${role.name}"?`)) return
  try { await rbacAPI.deleteRole(companyId.value, role.id); await loadAll(); toast.success('Rol eliminado') }
  catch (err) { toast.error(err.message) }
}

function editFlag(flag) {
  editingFlag.value = flag
  flagForm.value = { name: flag.name, slug: flag.slug, description: flag.description || '', category: flag.category || 'general', rollout_percentage: flag.rollout_percentage || 100 }
}

function closeFlagModal() { showCreateFlag.value = false; editingFlag.value = null; flagForm.value = { name: '', slug: '', description: '', category: 'general', rollout_percentage: 100 } }

async function saveFlag() {
  const isEdit = !!editingFlag.value
  try {
    if (editingFlag.value) { await rbacAPI.updateFeatureFlag(editingFlag.value.id, flagForm.value) }
    else { await rbacAPI.createFeatureFlag(flagForm.value) }
    closeFlagModal(); await loadAll()
    toast.success(isEdit ? 'Feature flag actualizado' : 'Feature flag creado')
  } catch (err) { toast.error(err.message) }
}

async function toggleFlag(flag) {
  try { await rbacAPI.toggleFeatureFlag(flag.id); await loadAll() }
  catch (err) { toast.error(err.message) }
}

function editPlan(plan) { toast.info('Plan editor — ' + plan.name) }

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

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.card { background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; }
.card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
.card-header { padding: 16px 18px 8px; }
.card-title-row { display: flex; justify-content: space-between; align-items: center; }
.card-title { font-weight: 700; font-size: 1rem; margin: 0; color: #1e293b; display: flex; align-items: center; gap: 8px; }
.role-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
.card-body { padding: 4px 18px 12px; }
.card-desc { font-size: 0.85rem; color: #64748b; margin: 0 0 8px; }
.card-footer { display: flex; gap: 8px; padding: 12px 18px; border-top: 1px solid #f1f5f9; }

.perm-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.perm-tag { padding: 2px 8px; background: #f1f5f9; border-radius: 6px; font-size: 0.7rem; color: #475569; font-family: 'Fira Code', monospace; }
.perm-tag.more { background: #dbeafe; color: #1e40af; }

.plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.plan-card { background: #fff; border-radius: 14px; border: 2px solid #e2e8f0; overflow: hidden; }
.plan-header { padding: 20px; text-align: center; background: #f8fafc; }
.plan-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0 0 8px; }
.plan-price { display: flex; align-items: baseline; justify-content: center; gap: 2px; }
.price-amount { font-size: 2rem; font-weight: 800; color: #1e293b; }
.price-period { font-size: 0.85rem; color: #64748b; }
.plan-body { padding: 16px 20px; }
.plan-feature { padding: 6px 0; font-size: 0.85rem; color: #475569; border-bottom: 1px solid #f1f5f9; }
.plan-footer { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-top: 1px solid #f1f5f9; }

.table-container { overflow-x: auto; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { text-align: left; padding: 10px 12px; background: #f8fafc; font-weight: 600; color: #475569; }
.data-table td { padding: 10px 12px; border-top: 1px solid #f1f5f9; }
.data-table code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.78rem; }

.toggle-btn { padding: 4px 14px; border-radius: 20px; border: none; font-weight: 700; font-size: 0.75rem; cursor: pointer; }
.toggle-on { background: #d1fae5; color: #065f46; }
.toggle-off { background: #f1f5f9; color: #64748b; }

.tag { display: inline-block; padding: 2px 8px; background: #f1f5f9; border-radius: 6px; font-size: 0.72rem; color: #475569; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; }
.badge-success { background: #d1fae5; color: #065f46; }
.badge-warning { background: #fef3c7; color: #92400e; }
.text-muted { color: #94a3b8; font-size: 0.78rem; }

.btn { padding: 8px 16px; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.82rem; cursor: pointer; border: none; transition: all 0.2s; }
.btn-primary { background: #3b82f6; color: #fff; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-outline { background: #fff; border: 1px solid #e2e8f0; color: #475569; }
.btn-sm { padding: 5px 10px; font-size: 0.75rem; }

.empty-state { text-align: center; padding: 40px 20px; color: #64748b; }

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
.color-input { display: flex; align-items: center; gap: 8px; }
.color-input input[type="color"] { width: 36px; height: 36px; border: none; border-radius: 8px; cursor: pointer; }

.perm-group { margin-bottom: 14px; padding: 10px; background: #f8fafc; border-radius: 8px; }
.perm-module { font-size: 0.85rem; font-weight: 700; color: #334155; margin: 0 0 8px; text-transform: capitalize; }
.perm-checkboxes { display: flex; flex-wrap: wrap; gap: 8px; }
.perm-check { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; cursor: pointer; color: #475569; }
</style>
