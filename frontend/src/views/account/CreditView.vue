<template>
  <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6 md:p-8">
    <h2 class="text-[2.5rem] font-bold mb-2 tracking-tight" style="color: rgb(126, 63, 238); font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;">Cuenta de Crédito</h2>
    <p class="text-sm font-medium mb-6" style="color: #64748b; font-family: 'Inter', sans-serif;">Administra tu cuenta de crédito</p>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16">
      <span class="material-symbols-outlined text-5xl text-red-400 mb-3">error</span>
      <p class="text-red-500">{{ error }}</p>
      <button @click="fetchCreditAccount" class="mt-4 text-primary hover:underline text-sm">Reintentar</button>
    </div>

    <!-- Sin cuenta -->
    <div v-else-if="!creditAccount" class="text-center py-16">
      <span class="material-symbols-outlined text-6xl text-gray-300 mb-4">credit_card</span>
      <h3 class="text-lg font-semibold text-gray-600 mb-1">No tienes cuenta de crédito</h3>
      <p class="text-gray-400 text-sm mb-4">Solicita una cuenta de crédito para comprar a plazos</p>
      <button
        @click="showForm = true"
        class="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-md"
      >
        <span class="material-symbols-outlined text-lg">add_card</span>
        Solicitar Cuenta
      </button>
    </div>

    <!-- Detalle de cuenta -->
    <div v-else class="space-y-6">
      <div class="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 text-white shadow-lg">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="text-white/70 text-xs uppercase tracking-wide">Saldo Disponible</p>
            <p class="text-3xl font-bold mt-1">${{ formatPrice(creditLimit - currentBalance) }}</p>
          </div>
          <span class="material-symbols-outlined text-3xl text-white/50">credit_card</span>
        </div>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-white/70">Límite de Crédito</p>
            <p class="font-semibold">${{ formatPrice(creditLimit) }}</p>
          </div>
          <div>
            <p class="text-white/70">Saldo Actual</p>
            <p class="font-semibold">${{ formatPrice(currentBalance) }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Número de Cuenta</label>
          <p class="text-gray-900 font-medium mt-1 font-mono">{{ maskedAccountNumber }}</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Tipo</label>
          <p class="text-gray-900 font-medium mt-1 capitalize">{{ creditAccount.account_type || 'Crédito' }}</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Tasa de Interés</label>
          <p class="text-gray-900 font-medium mt-1">{{ creditAccount.interest_rate || 0 }}%</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-xl">
          <label class="text-xs text-gray-500 uppercase tracking-wide">Estado</label>
          <p class="mt-1">
            <span class="px-3 py-1 rounded-full text-xs font-medium" :class="creditAccount.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
              {{ creditAccount.is_active ? 'Activa' : 'Inactiva' }}
            </span>
          </p>
        </div>
      </div>

      <div class="pt-4">
        <button
          @click="showForm = true"
          class="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-md"
        >
          <span class="material-symbols-outlined text-lg">edit</span>
          Configurar Cuenta
        </button>
      </div>
    </div>

    <!-- Formulario de cuenta de crédito -->
    <transition name="fade">
      <div v-if="showForm" class="border-t pt-6 mt-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          {{ creditAccount ? 'Actualizar Cuenta de Crédito' : 'Nueva Cuenta de Crédito' }}
        </h3>
        <form @submit.prevent="saveCreditAccount" class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Número de Cuenta</label>
            <input
              v-model="form.account_number"
              type="text"
              placeholder="Ingresa el número de cuenta"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
            <p class="text-xs text-gray-400 mt-1">Este número se almacenará de forma segura</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Cuenta</label>
            <select v-model="form.account_type" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
              <option value="credito">Crédito</option>
              <option value="ahorros">Ahorros</option>
              <option value="corriente">Corriente</option>
            </select>
          </div>
          <!-- Límite de crédito: solo lo fija admin/supervisor. El cliente nunca puede auto-aumentárselo. -->
          <div v-if="isStaff">
            <label class="block text-sm font-medium text-gray-700 mb-1">Límite de Crédito</label>
            <input v-model.number="form.credit_limit" type="number" min="0" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
          </div>
          <p v-else class="text-sm text-gray-500">
            Límite de crédito actual: <span class="font-medium text-gray-800">${{ formatPrice(creditLimit) }}</span>
          </p>
          <div class="flex items-end gap-3">
            <button type="submit" :disabled="saving" class="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-md disabled:opacity-50">
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
            <button type="button" @click="showForm = false" class="px-4 py-2.5 text-gray-600 hover:text-gray-800 transition-colors">
              Cancelar
            </button>
          </div>
        </form>
        <p v-if="successMsg" class="mt-4 text-green-600 text-sm flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">check_circle</span>
          {{ successMsg }}
        </p>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { clientsAPI } from '../../api';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../composables/useToast';

const authStore = useAuthStore();
const toast = useToast();

// Solo admin/supervisor pueden editar el límite de crédito
const isStaff = computed(() => ['admin', 'supervisor'].includes(authStore.user?.role));

const loading = ref(true);
const error = ref(null);
const saving = ref(false);
const successMsg = ref('');
const creditAccount = ref(null);
const showForm = ref(false);

const form = reactive({
  account_number: '',
  account_type: 'credito',
  credit_limit: 0,
});

const creditLimit = computed(() => creditAccount.value?.credit_limit || 0);
const currentBalance = computed(() => creditAccount.value?.current_balance || 0);

function formatPrice(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}

const maskedAccountNumber = computed(() => {
  const num = creditAccount.value?.account_number || '';
  if (num.length <= 4) return num;
  return '•••• ' + num.slice(-4);
});

async function fetchCreditAccount() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await clientsAPI.getCreditAccount();
    if (data) {
      creditAccount.value = data;
      form.account_number = data.account_number || '';
      form.account_type = data.account_type || 'credito';
      form.credit_limit = data.credit_limit || 0;
    }
  } catch (e) {
    if (e.response?.status !== 404) {
      error.value = 'Error al cargar la cuenta de crédito';
    }
  } finally {
    loading.value = false;
  }
}

async function saveCreditAccount() {
  saving.value = true;
  successMsg.value = '';
  try {
    const payload = {
      account_number: form.account_number,
      account_type: form.account_type,
      // El cliente no envía credit_limit: el backend fuerza 0 para no-staff
      ...(isStaff.value ? { credit_limit: form.credit_limit } : {}),
    };

    if (creditAccount.value?.id) {
      const { data } = await clientsAPI.updateCreditAccount(creditAccount.value.id, payload);
      creditAccount.value = data;
      toast.success('Cuenta de crédito actualizada');
    } else {
      const { data } = await clientsAPI.createCreditAccount(payload);
      creditAccount.value = data;
      toast.success('Cuenta de crédito creada');
    }

    successMsg.value = 'Cuenta de crédito guardada correctamente';
    showForm.value = false;
    setTimeout(() => { successMsg.value = ''; }, 3000);
  } catch (e) {
    error.value = 'Error al guardar la cuenta de crédito';
    toast.error('Error al guardar la cuenta de crédito');
  } finally {
    saving.value = false;
  }
}

onMounted(fetchCreditAccount);
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
