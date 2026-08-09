<template>
  <div class="glass-card rounded-[24px] p-6 md:p-8">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-8">
      <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
        <span class="material-symbols-outlined text-primary text-xl">credit_card</span>
      </div>
      <div>
        <h2 class="font-headline-sm text-headline-sm text-on-surface">Mis Tarjetas</h2>
        <p class="text-sm text-on-surface-variant/60">Gestiona tus métodos de pago</p>
      </div>
    </div>

    <Alert v-if="successMsg" type="success" :message="successMsg" :show="!!successMsg" dismissible :duration="500" @close="successMsg = ''" class="mb-4" />
    <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
    </div>

    <div v-else>
      <!-- Lista de tarjetas guardadas -->
      <div v-if="cards.length > 0" class="space-y-4 mb-8">
        <h3 class="font-label-md text-label-md text-on-surface">Tarjetas Registradas</h3>
        <div
          v-for="card in cards"
          :key="card.id"
          class="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
        >
          <div class="flex items-center gap-4">
            <div class="w-12 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
              <span class="material-symbols-outlined text-white text-lg">
                {{ card.brand === 'visa' ? 'credit_score' : 'credit_card' }}
              </span>
            </div>
            <div>
              <p class="font-medium text-on-surface">
                {{ card.brand_name || card.brand }} •••• {{ card.last_four }}
              </p>
              <p class="text-xs text-on-surface-variant/60">
                Expira {{ card.exp_month }}/{{ card.exp_year }}
                <span v-if="card.is_default" class="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full">Principal</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="!card.is_default"
              @click="setDefaultCard(card)"
              class="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Establecer como principal"
            >
              <span class="material-symbols-outlined text-sm text-on-surface-variant/60">star</span>
            </button>
            <button
              @click="deleteCard(card)"
              class="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
              title="Eliminar tarjeta"
            >
              <span class="material-symbols-outlined text-sm text-red-400">delete</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Formulario de nueva tarjeta -->
      <div class="border-t border-white/10 pt-6">
        <h3 class="font-label-md text-label-md text-on-surface mb-4">Registrar Nueva Tarjeta</h3>

        <form @submit.prevent="saveCard" class="max-w-lg space-y-4">
          <!-- Nombre del titular -->
          <div>
            <label class="block text-xs font-medium text-on-surface-variant/70 mb-1.5">Nombre del Titular <span class="text-red-400">*</span></label>
            <input
              v-model="form.cardholder_name"
              type="text"
              required
              placeholder="Nombre en la tarjeta"
              class="input-field"
            />
          </div>

          <!-- Número de tarjeta (solo se usa para derivar last_four/brand; nunca se persiste) -->
          <div>
            <label class="block text-xs font-medium text-on-surface-variant/70 mb-1.5">Número de Tarjeta <span class="text-red-400">*</span></label>
            <div class="relative">
              <input
                v-model="form.card_number"
                type="text"
                required
                maxlength="19"
                placeholder="0000 0000 0000 0000"
                class="input-field pl-10"
                @input="formatCardNumber"
              />
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant/40">credit_card</span>
            </div>
            <p class="text-xs text-on-surface-variant/50 mt-1">Solo se guardan los últimos 4 dígitos. El número completo nunca se almacena en nuestros servidores.</p>
          </div>

          <!-- Fecha de expiración -->
          <div>
            <label class="block text-xs font-medium text-on-surface-variant/70 mb-1.5">Fecha Expiración <span class="text-red-400">*</span></label>
            <input
              v-model="form.expiry"
              type="text"
              required
              maxlength="5"
              placeholder="MM/AA"
              class="input-field"
              @input="formatExpiry"
            />
          </div>

          <!-- Tipo de tarjeta -->
          <div>
            <label class="block text-xs font-medium text-on-surface-variant/70 mb-1.5">Tipo de Tarjeta <span class="text-red-400">*</span></label>
            <select v-model="form.brand" required class="input-field">
              <option value="" disabled>Seleccionar...</option>
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="amex">American Express</option>
              <option value="dinners">Diners Club</option>
              <option value="other">Otra</option>
            </select>
          </div>

          <!-- Principal -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="form.is_default" class="w-4 h-4 rounded" style="accent-color: var(--primary);" />
            <span class="text-sm text-on-surface-variant/70">Establecer como tarjeta principal</span>
          </label>

          <!-- Botón guardar -->
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              :disabled="saving"
              class="btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-50"
            >
              <span v-if="saving" class="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
              <span class="material-symbols-outlined text-lg">add_card</span>
              {{ saving ? 'Guardando...' : 'Registrar Tarjeta' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { clientsAPI } from '../../api';
import { useAuthStore } from '../../stores/auth';
import Alert from '../../components/shared/Alert.vue';
import Swal from 'sweetalert2';

const authStore = useAuthStore();

const loading = ref(true);
const saving = ref(false);
const successMsg = ref('');
const errorMsg = ref('');
const cards = ref([]);

const form = ref({
  cardholder_name: '',
  card_number: '',
  expiry: '',
  brand: '',
  is_default: false
});

function formatCardNumber(e) {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 16) value = value.slice(0, 16);
  const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
  form.value.card_number = formatted;
}

function formatExpiry(e) {
  let value = e.target.value.replace(/\D/g, '');
  if (value.length > 4) value = value.slice(0, 4);
  if (value.length >= 2) {
    value = value.slice(0, 2) + '/' + value.slice(2);
  }
  form.value.expiry = value;
}

async function fetchCards() {
  try {
    const { data } = await clientsAPI.getCreditAccount();
    if (data?.cards) {
      cards.value = data.cards;
    }
  } catch (e) {
    // Fuente de verdad: backend. Sin fallback a localStorage.
    cards.value = [];
  }
}

async function saveCard() {
  saving.value = true;
  successMsg.value = '';
  errorMsg.value = '';
  try {
    const [exp_month, exp_year] = form.value.expiry.split('/');
    // Seguridad: el CVV nunca se captura ni se envía; el PAN solo se usa en memoria
    // para derivar last_four/brand. El backend solo recibe datos no sensibles.
    const cardData = {
      cardholder_name: form.value.cardholder_name,
      exp_month: parseInt(exp_month),
      exp_year: parseInt(exp_year),
      brand: form.value.brand,
      is_default: form.value.is_default,
      last_four: form.value.card_number.replace(/\s/g, '').slice(-4)
    };

    await clientsAPI.createCreditAccount({
      user_id: authStore.user.id,
      cards: [...cards.value, cardData]
    });

    successMsg.value = 'Tarjeta registrada correctamente';
    // Reset form (sin cvv: ya no se captura)
    form.value = { cardholder_name: '', card_number: '', expiry: '', brand: '', is_default: false };
    await fetchCards();
  } catch (e) {
    errorMsg.value = 'Error al registrar la tarjeta';
  } finally {
    saving.value = false;
  }
}

async function setDefaultCard(card) {
  try {
    cards.value = cards.value.map(c => ({ ...c, is_default: c.id === card.id }));
    const defaultCard = cards.value.find(c => c.id === card.id);
    await clientsAPI.updateCreditAccount(card.id, { is_default: true });
    successMsg.value = 'Tarjeta principal actualizada';
  } catch (e) {
    errorMsg.value = 'Error al actualizar tarjeta principal';
  }
}

async function deleteCard(card) {
  const result = await Swal.fire({
    title: '¿Eliminar tarjeta?',
    text: `Se eliminará la tarjeta •••• ${card.last_four}`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc2626'
  });
  if (!result.isConfirmed) return;
  try {
    await clientsAPI.updateCreditAccount(card.id, { deleted: true });
    cards.value = cards.value.filter(c => c.id !== card.id);
    successMsg.value = 'Tarjeta eliminada';
  } catch (e) {
    errorMsg.value = 'Error al eliminar tarjeta';
  }
}

onMounted(async () => {
  await fetchCards();
  loading.value = false;
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
