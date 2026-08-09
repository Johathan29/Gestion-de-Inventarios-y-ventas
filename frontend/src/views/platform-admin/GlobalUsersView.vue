<template>
  <div class="pa-users">
    <div class="pa-header">
      <h1 class="pa-title">Usuarios Globales</h1>
      <p class="pa-subtitle">Buscar y gestionar usuarios de todas las empresas</p>
    </div>

    <!-- Filters -->
    <div class="pa-filters">
      <div class="pa-search-box">
        <svg class="pa-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input v-model="search" @input="debouncedSearch" placeholder="Buscar por nombre o email..." class="pa-search-input"/>
      </div>
      <select v-model="roleFilter" @change="fetchUsers" class="pa-select">
        <option value="">Todos los roles</option>
        <option value="admin">Admin</option>
        <option value="supervisor">Supervisor</option>
        <option value="cajero">Cajero</option>
        <option value="inventario">Inventario</option>
        <option value="cliente">Cliente</option>
      </select>
    </div>

    <!-- Users Table -->
    <div class="pa-table-card">
      <div class="pa-table-wrapper">
        <table class="pa-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Empresa</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Último Login</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>
                <div class="pa-user-cell">
                  <div class="pa-user-avatar" :style="{ background: getAvatarColor(user.name) }">
                    {{ getInitials(user.name) }}
                  </div>
                  <div>
                    <span class="pa-user-name">{{ user.name }}</span>
                    <span class="pa-user-email">{{ user.email }}</span>
                  </div>
                </div>
              </td>
              <td><span class="pa-company-tag">{{ user.companies?.name || '—' }}</span></td>
              <td><span class="pa-badge pa-badge-info">{{ user.roles?.name || '—' }}</span></td>
              <td>
                <span class="pa-badge" :class="user.is_active ? 'pa-badge-success' : 'pa-badge-danger'">
                  {{ user.is_active ? 'Activo' : 'Bloqueado' }}
                </span>
              </td>
              <td class="pa-date">{{ formatDate(user.last_login) }}</td>
              <td>
                <button class="pa-action-btn" :class="user.is_active ? 'pa-action-block' : 'pa-action-unblock'"
                  @click="toggleActive(user)" :title="user.is_active ? 'Bloquear' : 'Activar'">
                  {{ user.is_active ? '🚫' : '✅' }}
                </button>
              </td>
            </tr>
            <tr v-if="!users.length && !loading">
              <td colspan="6" class="pa-empty">No se encontraron usuarios</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pa-pagination" v-if="pagination.total > pagination.limit">
        <span class="pa-page-info">
          Mostrando {{ pagination.offset + 1 }}-{{ Math.min(pagination.offset + pagination.limit, pagination.total) }} de {{ pagination.total }}
        </span>
        <div class="pa-page-btns">
          <button class="pa-page-btn" :disabled="pagination.offset === 0" @click="prevPage">← Anterior</button>
          <button class="pa-page-btn" :disabled="pagination.offset + pagination.limit >= pagination.total" @click="nextPage">Siguiente →</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { platformAdminAPI } from '../../api';
import Swal from 'sweetalert2';

const users = ref([]);
const loading = ref(false);
const search = ref('');
const roleFilter = ref('');
const limit = 25;
const pagination = ref({ offset: 0, total: 0, limit });

let searchTimeout = null;
const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { pagination.value.offset = 0; fetchUsers(); }, 400);
};

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res = await platformAdminAPI.getUsers({
      search: search.value || undefined,
      role: roleFilter.value || undefined,
      limit,
      offset: pagination.value.offset,
    });
    users.value = res.data || [];
    pagination.value.total = res.pagination?.total || 0;
  } catch (e) {
    console.error('Failed to load users:', e);
  } finally {
    loading.value = false;
  }
};

const toggleActive = async (user) => {
  const action = user.is_active ? 'bloquear' : 'activar';
  const r = await Swal.fire({ title: `¿${action} usuario?`, text: `${user.name} (${user.email})`, icon: 'warning', showCancelButton: true });
  if (r.isConfirmed) {
    try {
      await platformAdminAPI.toggleUserActive(user.id);
      user.is_active = !user.is_active;
    } catch (e) {
      Swal.fire('Error', 'No se pudo realizar la acción', 'error');
    }
  }
};

const nextPage = () => { pagination.value.offset += limit; fetchUsers(); };
const prevPage = () => { pagination.value.offset = Math.max(0, pagination.value.offset - limit); fetchUsers(); };

const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Nunca';
const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '??';
const getAvatarColor = (name) => {
  if (!name) return '#6366f1';
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

onMounted(fetchUsers);
</script>

<style scoped>
.pa-users { padding: 24px; max-width: 1400px; margin: 0 auto; }
.pa-header { margin-bottom: 24px; }
.pa-title { font-family: 'Inter', sans-serif; font-size: 1.75rem; font-weight: 800; color: #1e293b; margin: 0; }
.pa-subtitle { font-size: 0.9rem; color: #94a3b8; margin: 4px 0 0; }
.pa-filters { display: flex; gap: 12px; margin-bottom: 20px; }
.pa-search-box { position: relative; flex: 1; min-width: 280px; }
.pa-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: #94a3b8; }
.pa-search-input { width: 100%; padding: 10px 14px 10px 42px; border: 2px solid #e2e8f0; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 0.9rem; outline: none; background: #fff; }
.pa-search-input:focus { border-color: #3b82f6; }
.pa-select { padding: 10px 14px; border: 2px solid #e2e8f0; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 0.9rem; background: #fff; outline: none; }
.pa-table-card { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
.pa-table-wrapper { overflow-x: auto; }
.pa-table { width: 100%; border-collapse: collapse; }
.pa-table th { text-align: left; padding: 14px 16px; font-weight: 600; font-size: 0.78rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #f1f5f9; }
.pa-table td { padding: 14px 16px; font-size: 0.9rem; color: #1e293b; border-bottom: 1px solid #f8fafc; }
.pa-empty { text-align: center; color: #94a3b8; padding: 40px !important; }
.pa-user-cell { display: flex; align-items: center; gap: 12px; }
.pa-user-avatar { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.75rem; color: #fff; flex-shrink: 0; }
.pa-user-name { display: block; font-weight: 600; }
.pa-user-email { display: block; font-size: 0.78rem; color: #94a3b8; }
.pa-company-tag { font-size: 0.85rem; color: #64748b; }
.pa-date { font-size: 0.85rem; color: #64748b; }
.pa-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.pa-badge-success { background: #ecfdf5; color: #059669; }
.pa-badge-danger { background: #fef2f2; color: #dc2626; }
.pa-badge-info { background: #eff6ff; color: #2563eb; }
.pa-action-btn { width: 32px; height: 32px; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; transition: transform 0.2s; background: transparent; }
.pa-action-btn:hover { transform: scale(1.2); }
.pa-pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-top: 1px solid #f1f5f9; }
.pa-page-info { font-size: 0.85rem; color: #64748b; }
.pa-page-btns { display: flex; gap: 8px; }
.pa-page-btn { padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; background: #fff; color: #475569; }
.pa-page-btn:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; }
.pa-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
