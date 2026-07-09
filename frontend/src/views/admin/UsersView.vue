<template>
  <DataTable :columns="columns" :data="users" title="Usuarios del Sistema" searchable @rowClick="goToDetail">
    <template #cell-status="{ row }">
      <span class="dt-badge" :class="row.is_active ? 'dt-badge-success' : 'dt-badge-danger'">{{ row.is_active ? 'Activo' : 'Bloqueado' }}</span>
    </template>
    <template #cell-role_name="{ row }">
      <span class="dt-badge dt-badge-info">{{ row.role_name }}</span>
    </template>
    <template #actions="{ row }">
      <button @click.stop="$router.push(`/app/admin/users/${row.id}`)"
        class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
        style="border-color: #d2c4b4; color: #624200; font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
        @mouseenter="e => { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; }"
        @mouseleave="e => { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; }">Ver</button>
      <button v-if="can('admin', 'access')" @click.stop="toggleBlock(row)"
        class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 border-2"
        :style="{ borderColor: row.is_active ? '#ef4444' : '#d2c4b4', color: row.is_active ? '#ef4444' : '#624200', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', lineHeight: '1.5' }"
        @mouseenter="e => { if(!row.is_active) { e.currentTarget.style.borderColor = '#624200'; e.currentTarget.style.background = 'rgba(98,66,0,0.02)'; } }"
        @mouseleave="e => { if(!row.is_active) { e.currentTarget.style.borderColor = '#d2c4b4'; e.currentTarget.style.background = ''; } }">
        {{ row.is_active ? 'Bloquear' : 'Activar' }}
      </button>
    </template>
  </DataTable>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usersAPI } from '../../api';
import { useAuth } from '../../composables/useAuth';
import DataTable from '../../components/shared/DataTable.vue';
import Swal from 'sweetalert2';

const router = useRouter();
const { can } = useAuth();
const users = ref([]);
const columns = [
  { key: 'name', label: 'Nombre', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'role_name', label: 'Rol', type: 'custom' },
  { key: 'status', label: 'Estado', type: 'custom' }
];

const goToDetail = (row) => router.push(`/app/admin/users/${row.id}`);

const toggleBlock = async (row) => {
  const action = row.is_active ? 'bloquear' : 'activar';
  const r = await Swal.fire({ title: `¿${action} usuario?`, text: row.name, icon: 'warning', showCancelButton: true });
  if (r.isConfirmed) {
    try { row.is_active ? await usersAPI.block(row.id) : await usersAPI.unblock(row.id); await fetchUsers(); }
    catch (e) { Swal.fire('Error', 'No se pudo realizar la acción', 'error'); }
  }
};

const fetchUsers = async () => { try { const res = await usersAPI.getAll(); users.value = res.data || []; } catch (e) { /* ignore */ } };

onMounted(fetchUsers);
</script>
