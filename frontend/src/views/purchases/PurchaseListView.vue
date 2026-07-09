<template>
  <div class="space-y-8">
    <div>
      <h2
        class="font-headline-lg-mobile md:font-headline-lg"
        style="
          font-size: clamp(1.5rem, 4vw, 2rem);
          line-height: 1.25;
          font-weight: 700;
          color: #0b1c30;
          letter-spacing: -0.02em;
          font-family: &quot;Plus Jakarta Sans&quot;, sans-serif;
        "
      >
        Compras
      </h2>
      <p
        style="
          color: #4f4539;
          font-family: &quot;Inter&quot;, sans-serif;
          font-size: 1rem;
          line-height: 1.5;
          margin-top: 0.25rem;
        "
      >
        Lista de compras registradas en el sistema
      </p>
    </div>
    <DataTable
      :columns="columns"
      :data="purchases"
      title="Lista de Compras"
      searchable
      @rowClick="goToDetail"
    >
      <template #toolbar>
        <button
          v-if="can('purchases', 'create')"
          @click="$router.push('/app/purchases/create')"
          class="shrink-0 flex items-center gap-2 font-semibold py-2.5 px-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border"
          style="background: rgb(98, 66, 0); color: white; border-color: rgba(139, 94, 0, 0.2); font-family: Inter, sans-serif; font-size: 0.875rem; line-height: 1.5;"
        >
          <span class="material-icons-outlined" style="font-size: 1.125rem;">add</span>
          Nueva Compra
        </button>
      </template>
      <template #cell-status="{ row }">
        <span
          class="dt-badge"
          :class="
            row.status === 'received'
              ? 'dt-badge-success'
              : row.status === 'cancelled'
                ? 'dt-badge-danger'
                : 'dt-badge-warning'
          "
        >
          {{
            row.status === "received"
              ? "Recibida"
              : row.status === "cancelled"
                ? "Cancelada"
                : "Pendiente"
          }}
        </span>
      </template>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { purchasesAPI } from "../../api";
import { useAuth } from "../../composables/useAuth";
import DataTable from "../../components/shared/DataTable.vue";

const router = useRouter();
const { can } = useAuth();
const purchases = ref([]);

const columns = [
  { key: "order_number", label: "Orden", sortable: true },
  { key: "supplier_name", label: "Proveedor" },
  { key: "total", label: "Total", type: "currency", sortable: true },
  { key: "status", label: "Estado", type: "custom" },
  { key: "created_at", label: "Fecha", type: "datetime", sortable: true },
];

const goToDetail = (row) => router.push(`/app/purchases/${row.id}`);

onMounted(async () => {
  try {
    const res = await purchasesAPI.getAll();
    purchases.value = res.data || [];
  } catch (e) {
    /* ignore */
  }
});
</script>
