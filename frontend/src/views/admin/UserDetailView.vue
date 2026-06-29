<template>
  <Loading v-if="loading" />
  <div v-else class="max-w-4xl mx-auto">
    <div class="dt-card p-6 mb-6">
      <div class="flex items-start justify-between mb-4">
        <div>
          <h2 class="dt-headline" style="margin-bottom: 0;">{{ user.name }}</h2>
          <p class="dt-body-sm" style="color: #4f4539;">{{ user.email }}</p>
        </div>
        <span class="dt-badge" :class="user.is_active ? 'dt-badge-success' : 'dt-badge-danger'">{{ user.is_active ? 'Activo' : 'Bloqueado' }}</span>
      </div>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div><span style="color: #4f4539; font-weight: 500;">Rol:</span> <span class="dt-badge dt-badge-info">{{ user.role_name }}</span></div>
        <div><span style="color: #4f4539; font-weight: 500;">Teléfono:</span> {{ user.phone || '-' }}</div>
        <div><span style="color: #4f4539; font-weight: 500;">Último acceso:</span> {{ user.last_login ? formatRelativeTime(user.last_login) : 'Nunca' }}</div>
        <div><span style="color: #4f4539; font-weight: 500;">Miembro desde:</span> {{ formatDate(user.created_at) }}</div>
      </div>
    </div>

    <div class="dt-card p-6">
      <h3 class="dt-headline-sm" style="margin-bottom: 1rem;">Historial de Acceso</h3>
      <DataTable :columns="histColumns" :data="user.access_history || []" empty-message="Sin historial" />
    </div>

    <div class="flex gap-3 mt-4">
      <router-link to="/app/admin" class="dt-btn-secondary">Volver</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { usersAPI } from '../../api';
import Loading from '../../components/shared/Loading.vue';
import DataTable from '../../components/shared/DataTable.vue';
import { formatDate, formatRelativeTime } from '../../utils';

const route = useRoute();
const user = ref({});
const loading = ref(true);
const histColumns = [
  { key: 'ip_address', label: 'IP' },
  { key: 'user_agent', label: 'Dispositivo' },
  { key: 'created_at', label: 'Fecha', type: 'datetime' }
];

onMounted(async () => {
  try { const res = await usersAPI.getById(route.params.id); user.value = res.data || {}; }
  catch (e) { /* ignore */ }
  finally { loading.value = false; }
});
</script>
