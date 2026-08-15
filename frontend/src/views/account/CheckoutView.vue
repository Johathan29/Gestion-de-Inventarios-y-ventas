<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-white">
    <!-- Navbar -->
    <nav class="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/30 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <router-link to="/" class="font-headline-md text-headline-md font-bold text-primary">
          Animal Store
        </router-link>
        <div class="flex items-center gap-4">
          <button @click="$router.back()" class="text-gray-600 hover:text-primary transition-colors flex items-center gap-1 text-sm">
            <span class="material-symbols-outlined">arrow_back</span>
            Volver
          </button>
        </div>
      </div>
    </nav>

    <div class="max-w-7xl mx-auto px-4 pt-24 pb-10">
      <h1 class="text-[2.5rem] font-bold tracking-tight mb-8" style="color: rgb(126, 63, 238); font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;">
        Finalizar Compra
      </h1>

      <Alert v-if="errorMsg" type="error" :message="errorMsg" :show="!!errorMsg" dismissible @close="errorMsg = ''" class="mb-4" />

      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Formulario de checkout -->
        <div class="flex-1 space-y-6">
          <!-- Información de envío -->
          <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6 md:p-8">
            <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">local_shipping</span>
              Dirección de Envío
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre Completo <span class="text-red-500">*</span></label>
                <input v-model="form.full_name" type="text" required
                  class="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Nombre del destinatario" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Dirección <span class="text-red-500">*</span></label>
                <input v-model="form.address" type="text" required
                  class="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Calle, número, apartamento" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Ciudad <span class="text-red-500">*</span></label>
                <input v-model="form.city" type="text" required
                  class="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ciudad" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Departamento / Estado</label>
                <input v-model="form.state" type="text"
                  class="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Departamento" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
                <input v-model="form.postal_code" type="text"
                  class="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="000000" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono <span class="text-red-500">*</span></label>
                <input v-model="form.phone" type="tel" required
                  class="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="+57 300 000 0000" />
              </div>
            </div>
          </div>

          <!-- Método de pago -->
          <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6 md:p-8">
            <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">credit_card</span>
              Método de Pago
            </h3>

            <!-- Selector de método de pago -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-3">Método de pago</label>
              <div class="grid grid-cols-3 gap-2">
                <button type="button" @click="paymentMethod = 'card'"
                  class="py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-1"
                  :class="paymentMethod === 'card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'">
                  <span class="material-symbols-outlined text-base">credit_card</span> Tarjeta
                </button>
                <button type="button" @click="paymentMethod = 'cash'"
                  class="py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-1"
                  :class="paymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'">
                  <span class="material-symbols-outlined text-base">payments</span> Efectivo
                </button>
                <button type="button" @click="paymentMethod = 'transfer'"
                  class="py-2.5 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-1"
                  :class="paymentMethod === 'transfer' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'">
                  <span class="material-symbols-outlined text-base">account_balance</span> Transferencia
                </button>
              </div>
            </div>

            <!-- Tarjetas guardadas -->
            <div v-if="paymentMethod === 'card' && savedCards.length > 0" class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-3">Selecciona una tarjeta guardada</label>
              <div class="space-y-2">
                <div
                  v-for="card in savedCards"
                  :key="card.id"
                  @click="selectedCard = card.id"
                  class="flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer"
                  :class="selectedCard === card.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'"
                >
                  <input type="radio" :checked="selectedCard === card.id" class="w-4 h-4 text-primary" />
                  <div class="w-10 h-7 rounded bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <span class="material-symbols-outlined text-sm text-primary">credit_card</span>
                  </div>
                  <div class="flex-1">
                    <p class="font-medium text-gray-900 text-sm">{{ card.brand_name || card.brand }} •••• {{ card.last_four }}</p>
                    <p class="text-xs text-gray-500">Expira {{ card.exp_month }}/{{ card.exp_year }}</p>
                  </div>
                  <span v-if="card.is_default" class="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">Principal</span>
                </div>
              </div>
              <router-link
                to="/account/cards"
                class="mt-3 text-sm text-primary hover:underline flex items-center gap-1"
              >
                <span class="material-symbols-outlined text-sm">add</span>
                Registrar nueva tarjeta
              </router-link>
            </div>

            <!-- Aviso de seguridad: sin captura de datos de tarjeta en el checkout -->
            <div v-if="savedCards.length === 0" class="flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
              <span class="material-symbols-outlined text-base mt-0.5">lock</span>
              <p>
                Guarda tu tarjeta en <router-link to="/account/cards" class="underline font-medium">Mis Tarjetas</router-link> para pagar.
                Los datos se procesan de forma segura por la pasarela de pago — el CVV nunca se almacena ni viaja por nuestro servidor.
              </p>
            </div>
          </div>

          <!-- Notas -->
          <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6 md:p-8">
            <h3 class="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">notes</span>
              Notas del Pedido
            </h3>
            <textarea v-model="form.notes" rows="3"
              class="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
              placeholder="Instrucciones especiales, información adicional..."></textarea>
          </div>
        </div>

        <!-- Resumen del pedido -->
        <div class="lg:w-96 w-full">
          <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6 md:p-8 lg:sticky lg:top-24">
            <h3 class="text-xl font-bold text-gray-900 mb-4">Resumen del Pedido</h3>

            <!-- Loading -->
            <div v-if="loadingCart" class="flex justify-center py-8">
              <div class="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>

            <div v-else>
              <!-- Items -->
              <div class="space-y-3 mb-4 max-h-60 overflow-y-auto">
                <div v-for="item in cartItems" :key="item.id" class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    <img v-if="item.product?.images?.[0]" :src="item.product.images[0]" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center">
                      <span class="material-symbols-outlined text-gray-300 text-sm">inventory</span>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ item.product?.name || 'Producto' }}</p>
                    <p class="text-xs text-gray-500">x{{ item.quantity }}</p>
                  </div>
                  <p class="text-sm font-medium text-gray-900">${{ formatPrice(item.unitPrice * item.quantity) }}</p>
                </div>
              </div>

              <!-- Totales -->
              <div class="space-y-2 text-sm border-t pt-4">
                <div class="flex justify-between text-gray-600">
                  <span>Subtotal ({{ itemCount }} productos)</span>
                  <span>${{ formatPrice(subtotal) }}</span>
                </div>
                <div class="flex justify-between text-gray-600">
                  <span>Envío</span>
                  <span class="text-green-600">Gratis</span>
                </div>
                <div class="flex justify-between text-gray-600">
                  <span>Impuestos ({{ taxRate }}%)</span>
                  <span>${{ formatPrice(tax) }}</span>
                </div>
                <div class="flex justify-between text-lg font-bold text-gray-900 border-t pt-2">
                  <span>Total</span>
                  <span class="text-primary">${{ formatPrice(total) }}</span>
                </div>
              </div>

              <!-- Botón pagar -->
              <button
                @click="placeOrder"
                :disabled="processing || cartItems.length === 0"
                class="w-full mt-6 py-3.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-lg font-semibold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span v-if="processing" class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
                {{ processing ? 'Procesando...' : `Pagar $${formatPrice(total)}` }}
              </button>

              <p class="text-xs text-gray-400 text-center mt-3">
                Al realizar el pedido aceptas nuestros <router-link to="/" class="text-primary hover:underline">términos y condiciones</router-link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de éxito -->
    <transition name="fade">
      <div v-if="success" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div class="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl text-center">
          <span v-if="!paymentPending" class="material-symbols-outlined text-6xl text-green-500 mb-4">check_circle</span>
          <span v-else class="material-symbols-outlined text-6xl text-amber-500 mb-4">hourglass_top</span>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">
            {{ paymentPending ? 'Pedido creado — Pago pendiente' : '¡Pedido Exitoso!' }}
          </h3>
          <p v-if="!paymentPending" class="text-gray-500 mb-6">Tu pedido ha sido registrado correctamente. Recibirás una confirmación por correo.</p>
          <p v-else class="text-gray-500 mb-6">
            Tu pedido fue registrado, pero el pago está <strong>pendiente de confirmación</strong>.
            Te notificaremos en cuanto se confirme. No se te cobrará hasta entonces.
          </p>
          <div class="flex flex-col gap-3">
            <router-link to="/account/purchases" class="w-full py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium">
              Ver Mis Compras
            </router-link>
            <router-link to="/products" class="w-full py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium">
              Seguir Comprando
            </router-link>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { cartAPI, checkoutAPI, clientsAPI } from '../../api';
import { useAuthStore } from '../../stores/auth';
import { useCurrency } from '../../composables/useCurrency';
import { useEcommerceConfig } from '../../composables/useEcommerceConfig';
import Alert from '../../components/shared/Alert.vue';

const router = useRouter();
const authStore = useAuthStore();
const { formatTable } = useCurrency();
const { taxRate, taxIncluded, loadConfig } = useEcommerceConfig();

const loadingCart = ref(true);
const processing = ref(false);
const success = ref(false);
const paymentPending = ref(false); // Fase 6: pedido creado con pago pendiente
const errorMsg = ref('');
const cartItems = ref([]);
const savedCards = ref([]);
const selectedCard = ref(null);
const paymentMethod = ref('card');

const form = reactive({
  full_name: authStore.user?.name || '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  phone: '',
  notes: ''
});

const subtotal = computed(() => cartItems.value.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0));
const tax = computed(() => {
  const rate = taxRate.value / 100;
  const taxable = subtotal.value;
  if (taxIncluded.value) return taxable - (taxable / (1 + rate));
  return taxable * rate;
});
const total = computed(() => taxIncluded.value ? subtotal.value : subtotal.value + tax.value);
const itemCount = computed(() => cartItems.value.reduce((sum, item) => sum + item.quantity, 0));

function formatPrice(value) {
  return formatTable(value);
}

async function fetchCart() {
  try {
    const { data } = await cartAPI.getCart();
    cartItems.value = data?.items || [];
    if (cartItems.value.length === 0) {
      router.push('/cart');
    }
  } catch (e) {
    cartItems.value = [];
  } finally {
    loadingCart.value = false;
  }
}

async function fetchSavedCards() {
  try {
    const { data } = await clientsAPI.getCreditAccount();
    if (data?.cards) {
      savedCards.value = data.cards.filter(c => !c.deleted);
      const defaultCard = savedCards.value.find(c => c.is_default);
      if (defaultCard) selectedCard.value = defaultCard.id;
    }
  } catch (e) {
    // Sin fallback a localStorage: la fuente de verdad es el backend.
    savedCards.value = [];
  }
}

async function placeOrder() {
  if (!form.full_name || !form.address || !form.city || !form.phone) {
    errorMsg.value = 'Por favor completa todos los campos obligatorios de envío';
    return;
  }
  if (paymentMethod.value === 'card' && !selectedCard.value) {
    errorMsg.value = 'Selecciona una tarjeta guardada o regístrala en "Mis Tarjetas"';
    return;
  }

  processing.value = true;
  errorMsg.value = '';

  try {
    // Seguridad: nunca se envían datos sensibles de tarjeta (cvv, card_number).
    // El backend solo acepta método + savedCardId (token de pasarela si aplica).
    const payload = {
      shipping: {
        full_name: form.full_name,
        address: form.address,
        city: form.city,
        state: form.state,
        postal_code: form.postal_code,
        phone: form.phone
      },
      payment: paymentMethod.value === 'card'
        ? { method: 'card', savedCardId: selectedCard.value || undefined }
        : { method: paymentMethod.value },
      notes: form.notes,
      source: 'ecommerce'
    };

    await checkoutAPI.checkout(payload).then(({ data }) => {
      // Fase 6: distinguir "Compra confirmada" de "Pedido creado, pago pendiente"
      paymentPending.value = data?.paymentStatus === 'pending' || data?.status === 'pending';
    });
    success.value = true;
    cartItems.value = [];
  } catch (e) {
    errorMsg.value = e.response?.data?.error?.message || 'Error al procesar el pago. Intenta de nuevo.';
  } finally {
    processing.value = false;
  }
}

onMounted(async () => {
  await loadConfig();
  await Promise.all([fetchCart(), fetchSavedCards()]);

  // Cargar datos del perfil si están disponibles
  try {
    const { data } = await clientsAPI.getByUserId(authStore.user.id);
    if (data) {
      if (!form.address && data.address) form.address = data.address;
      if (!form.city && data.city) form.city = data.city;
      if (!form.state && data.state) form.state = data.state;
      if (!form.phone && data.phone) form.phone = data.phone;
    }
  } catch { /* ignore */ }
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
