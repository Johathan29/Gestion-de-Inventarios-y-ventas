<template>
  <DetailSkeleton v-if="loading" />
  <div v-else class="max-w-4xl mx-auto" style="display: flex; flex-direction: column; gap: var(--aurora-gutter);">
    <!-- Action buttons -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <router-link to="/app/clients"
        class="aurora-btn-secondary">
        <span class="material-symbols-outlined" style="font-size: 1.125rem;">arrow_back</span> Volver
      </router-link>
      <div class="flex gap-2">
        <button @click="openEdit"
          class="aurora-btn-primary">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">edit</span> Editar
        </button>
        <button @click="sendPasswordReset"
          class="aurora-btn-secondary">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">lock_reset</span> Reset Password
        </button>
        <button @click="confirmDelete"
          class="aurora-btn-icon danger">
          <span class="material-symbols-outlined" style="font-size: 1.125rem;">delete</span> Eliminar
        </button>
      </div>
    </div>

    <!-- Client Info Card -->
    <div class="aurora-raised-card">
      <div class="flex items-start justify-between" style="margin-bottom: var(--aurora-md);">
        <div>
          <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.5rem; font-weight: 700; color: var(--aurora-on-surface); letter-spacing: -0.02em; margin: 0;">{{ client.name }}</h2>
          <p style="font-family: 'Inter', sans-serif; font-size: 0.875rem; color: var(--aurora-on-surface-variant); margin-top: 0.25rem;">{{ client.document_type || 'CC' }}: {{ client.document_id }}</p>
        </div>
        <span :class="client.is_active !== false ? 'aurora-badge aurora-badge-success' : 'aurora-badge aurora-badge-secondary'">
          {{ client.is_active !== false ? 'Activo' : 'Inactivo' }}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-4" style="font-size: 0.875rem;">
        <div><span style="color: var(--aurora-on-surface-variant); font-weight: 500;">Email:</span> <span style="color: var(--aurora-on-surface);">{{ client.email || '-' }}</span></div>
        <div><span style="color: var(--aurora-on-surface-variant); font-weight: 500;">Teléfono:</span> <span style="color: var(--aurora-on-surface);">{{ client.phone || '-' }}</span></div>
        <div><span style="color: var(--aurora-on-surface-variant); font-weight: 500;">Dirección:</span> <span style="color: var(--aurora-on-surface);">{{ client.address || '-' }}</span></div>
        <div><span style="color: var(--aurora-on-surface-variant); font-weight: 500;">Miembro desde:</span> <span style="color: var(--aurora-on-surface);">{{ formatDate(client.created_at) }}</span></div>
        <div v-if="client.auth_provider">
          <span style="color: var(--aurora-on-surface-variant); font-weight: 500;">Auth:</span>
          <span class="inline-flex items-center gap-1 text-xs font-medium ml-1" style="color: #059669;">
            <span class="material-symbols-outlined" style="font-size: 0.875rem;">verified</span>
            {{ client.auth_provider === 'supabase' ? 'Supabase Auth' : client.auth_provider }}
          </span>
        </div>
      </div>
    </div>

    <!-- Purchase History -->
    <div class="aurora-raised-card">
      <h3 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.125rem; font-weight: 600; color: var(--aurora-on-surface); margin-bottom: var(--aurora-md);">Historial de Compras</h3>
      <DataTable :columns="saleColumns" :data="client.sales || []" empty-message="No hay compras registradas" />
    </div>

    <!-- Client Form Modal -->
    <ClientFormModal :visible="showFormModal" :client="editingClient" @close="closeFormModal" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import { clientsAPI } from '../../api';
import DetailSkeleton from '../../components/skeletons/DetailSkeleton.vue';
import Loading from '../../components/shared/Loading.vue';
import DataTable from '../../components/shared/DataTable.vue';
import ClientFormModal from '../../components/clients/ClientFormModal.vue';
import { formatDate } from '../../utils';

const route = useRoute();
const router = useRouter();
const client = ref({});
const loading = ref(true);
const showFormModal = ref(false);
const editingClient = ref(null);
const saleColumns = [
  { key: 'invoice_number', label: 'Factura' },
  { key: 'total', label: 'Total', type: 'currency' },
  { key: 'status', label: 'Estado' },
  { key: 'created_at', label: 'Fecha', type: 'date' }
];

const openEdit = () => {
  editingClient.value = { ...client.value };
  showFormModal.value = true;
};

const closeFormModal = () => {
  showFormModal.value = false;
  editingClient.value = null;
};

const onSaved = () => {
  fetchClientDetail();
};

const sendPasswordReset = async () => {
  if (!client.value.email) {
    Swal.fire('Sin email', 'El cliente no tiene email registrado', 'info');
    return;
  }
  const result = await Swal.fire({
    title: '¿Restablecer contraseña?',
    text: `Se enviará un enlace de restablecimiento a ${client.value.email}`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, enviar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#624200'
  });
  if (!result.isConfirmed) return;
  try {
    await clientsAPI.sendPasswordReset(client.value.email);
    Swal.fire('Enviado', `Enlace de restablecimiento enviado a ${client.value.email}`, 'success');
  } catch (e) {
    Swal.fire('Error', 'No se pudo enviar el enlace', 'error');
  }
};

const confirmDelete = async () => {
  const result = await Swal.fire({
    title: '¿Eliminar cliente?',
    text: `Se eliminará ${client.value.name}. Esta acción no se puede deshacer.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc2626'
  });
  if (!result.isConfirmed) return;
  try {
    await clientsAPI.delete(client.value.id);
    Swal.fire('Eliminado', 'Cliente eliminado correctamente', 'success');
    router.push('/app/clients');
  } catch (e) {
    Swal.fire('Error', 'No se pudo eliminar el cliente', 'error');
  }
};

const fetchClientDetail = async () => {
  loading.value = true;
  try {
    const res = await clientsAPI.getById(route.params.id);
    client.value = res.data || {};
  } catch (e) {
    /* ignore */
  } finally {
    loading.value = false;
  }
};

onMounted(fetchClientDetail);
</script>
