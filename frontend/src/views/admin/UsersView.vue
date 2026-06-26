<template>
  <DataTable :columns="columns" :data="users" title="Usuarios del Sistema" searchable @rowClick="goToDetail">
    <template #cell-status="{ row }">
      <span class="badge" :class="row.is_active ? 'badge-green' : 'badge-red'">{{ row.is_active ? 'Activo' : 'Bloqueado' }}</span>
    </template>
    <template #cell-role_name="{ row }">
      <span class="badge badge-primary">{{ row.role_name }}</span>
    </template>
    <template #actions="{ row }">
      <button @click.stop="$router.push(`/app/admin/users/${row.id}`)" class="btn btn-sm btn-secondary">Ver</button>
      <button v-if="can('admin', 'access')" @click.stop="toggleBlock(row)" class="btn btn-sm" :class="row.is_active ? 'btn-danger' : 'btn-secondary'">
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
