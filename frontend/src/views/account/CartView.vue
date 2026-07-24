<template>
  <div class="min-h-screen bg-gradient-to-br from-purple-50 to-white">
    <!-- Navbar -->
    <nav class="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-white/30 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <router-link to="/" class="font-headline-md text-headline-md font-bold text-primary">
          Animal Store
        </router-link>
        <div class="flex items-center gap-4">
          <button @click="goBack" class="text-gray-600 hover:text-primary transition-colors flex items-center gap-1 text-sm">
            <span class="material-symbols-outlined">arrow_back</span>
            Volver
          </button>
          <router-link v-if="isClient" to="/account/profile" class="text-gray-600 hover:text-primary transition-colors">
            <span class="material-symbols-outlined">account_circle</span>
          </router-link>
          <router-link v-else to="/login" class="text-gray-600 hover:text-primary transition-colors">
            <span class="material-symbols-outlined">person</span>
          </router-link>
        </div>
      </div>
    </nav>

    <!-- Contenido -->
    <div class="max-w-7xl mx-auto px-4 pt-20 pb-10">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-[2.5rem] font-bold tracking-tight" style="color: rgb(126, 63, 238); font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;">Carrito de Compras</h1>
        <button @click="goBackToSession" class="flex items-center gap-2 px-4 py-2 bg-white/80 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all text-sm shadow-sm">
          <span class="material-symbols-outlined text-lg">history</span>
          Volver a sesión anterior
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-20">
        <span class="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
        <p class="text-red-500 text-lg mb-4">{{ error }}</p>
        <button @click="fetchCart" class="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-md">
          Reintentar
        </button>
      </div>

      <!-- Carrito vacío -->
      <div v-else-if="items.length === 0" class="text-center py-20">
        <span class="material-symbols-outlined text-7xl text-gray-300 mb-4">shopping_cart</span>
        <h2 class="text-2xl font-semibold text-gray-600 mb-2">Tu carrito está vacío</h2>
        <p class="text-gray-400 mb-6">Explora nuestros productos y agrega los que más te gusten</p>
        <router-link to="/products" class="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-lg text-lg">
          <span class="material-symbols-outlined">store</span>
          Ver Productos
        </router-link>
      </div>

      <!-- Items del carrito -->
      <div v-else class="flex flex-col lg:flex-row gap-6">
        <!-- Lista de items -->
        <div class="flex-1 space-y-4">
          <div
            v-for="item in items"
            :key="item.id"
            class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-4 md:p-6"
          >
            <div class="flex md:items-center md:flex-row flex-col gap-4">
              <!-- Imagen del producto (variante si existe) -->
              <div class="w-full md:w-28 h-28 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                <img
                  v-if="item.variantImage"
                  :src="item.variantImage"
                  :alt="item.variantName || item.product?.name"
                  class="w-full h-full object-cover"
                />
                <img
                  v-else-if="item.product?.images?.[0]"
                  :src="item.product.images[0]"
                  :alt="item.product.name"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <span class="material-symbols-outlined text-3xl text-gray-300">inventory</span>
                </div>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900 truncate">{{ item.product?.name || 'Producto' }}</h3>
                <p class="text-sm text-gray-500 mt-0.5">SKU: {{ item.product?.sku || '—' }}</p>
                <div v-if="item.variantName || item.variantAttributes" class="mt-1.5">
                  <p v-if="item.variantName" class="text-xs font-medium text-primary">{{ item.variantName }}</p>
                  <div v-if="item.variantAttributes" class="flex flex-wrap gap-1.5 mt-1">
                    <span
                      v-for="(value, key) in item.variantAttributes"
                      :key="key"
                      class="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 rounded-md text-xs text-gray-600"
                    >
                      <span class="font-medium capitalize">{{ key }}:</span>
                      <span>{{ value }}</span>
                    </span>
                  </div>
                </div>
                <p class="text-sm md:hidden mt-1 font-bold text-primary">${{ formatPrice(item.unitPrice) }}</p>
              </div>

              <!-- Precio unitario (desktop) -->
              <div class="hidden md:block text-right">
                <p class="text-sm text-gray-500">Precio</p>
                <p class="font-semibold text-gray-900">${{ formatPrice(item.unitPrice) }}</p>
              </div>

              <!-- Cantidad +/- -->
              <div class="flex items-center gap-1">
                <button
                  @click="decrementQuantity(item)"
                  class="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
                  :disabled="item.quantity <= 1"
                >
                  <span class="material-symbols-outlined text-sm md:text-base">remove</span>
                </button>
                <span class="w-8 md:w-12 text-center font-medium text-gray-900">{{ item.quantity }}</span>
                <button
                  @click="incrementQuantity(item)"
                  class="w-8 h-8 md:w-10 md:h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <span class="material-symbols-outlined text-sm md:text-base">add</span>
                </button>
              </div>

              <!-- Subtotal -->
              <div class="text-right min-w-[80px]">
                <p class="text-sm text-gray-500">Subtotal</p>
                <p class="font-bold text-primary text-lg">${{ formatPrice(item.unitPrice * item.quantity) }}</p>
              </div>

              <!-- Eliminar -->
              <button
                @click="removeItem(item)"
                class="text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Eliminar"
              >
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Resumen y checkout -->
        <div class="lg:w-96 w-full">
          <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6 md:p-8 lg:sticky lg:top-24">
          <h3 class="text-xl font-bold text-gray-900 mb-4">Resumen de Compra</h3>

          <div class="space-y-2 text-sm md:text-base">
            <div class="flex justify-between text-gray-600">
              <span>Subtotal ({{ itemCount }} productos)</span>
              <span>${{ formatPrice(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Descuentos</span>
              <span class="text-green-600">-${{ formatPrice(discount) }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
              <span>Impuestos ({{ taxRate }}%)</span>
              <span>${{ formatPrice(tax) }}</span>
            </div>
            <div class="border-t pt-2 mt-2 flex justify-between text-lg font-bold text-gray-900">
              <span>Total</span>
              <span class="text-primary">${{ formatPrice(total) }}</span>
            </div>
          </div>

          <!-- Cupón / input -->
          <div class="mt-4 flex gap-2">
            <input
              v-model="couponCode"
              type="text"
              placeholder="Código de cupón"
              class="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
            <button
              @click="applyCoupon"
              class="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Aplicar
            </button>
          </div>

          <!-- Checkout form -->
          <div v-if="isClient" class="mt-6 space-y-4">
            <router-link
              to="/account/checkout"
              class="block w-full py-3.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-lg font-semibold text-lg text-center"
            >
              Ir a Pago Completo
            </router-link>

            <div class="relative my-4">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-200"></div>
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-white px-2 text-gray-400">o pago rápido</span>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de Compra</label>
                <input v-model="checkoutDate" type="date" class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de Entrega</label>
                <input v-model="deliveryDate" type="date" class="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
            </div>

            <button
              @click="proceedCheckout"
              :disabled="checkingOut"
              class="w-full py-3.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-lg font-semibold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span v-if="checkingOut" class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
              {{ checkingOut ? 'Procesando...' : `Pagar $${formatPrice(total)}` }}
            </button>
          </div>

          <div v-else class="mt-6">
            <router-link
              to="/login"
              class="block w-full py-3.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors shadow-lg font-semibold text-lg text-center"
            >
              Inicia sesión para pagar
            </router-link>
          </div>
        </div>

          </div><!-- /sticky resumen -->
        </div><!-- /lg:w-96 -->

        <!-- Mensaje de éxito -->
        <transition name="fade">
          <div v-if="checkoutSuccess" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div class="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl text-center">
              <span class="material-symbols-outlined text-6xl text-green-500 mb-4">check_circle</span>
              <h3 class="text-2xl font-bold text-gray-900 mb-2">¡Compra Exitosa!</h3>
              <p class="text-gray-500 mb-6">Tu compra ha sido registrada correctamente. Recibirás un correo con los detalles.</p>
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

        <!-- Mensaje de error checkout -->
        <transition name="fade">
          <div v-if="checkoutError" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div class="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl text-center">
              <span class="material-symbols-outlined text-6xl text-red-400 mb-4">cancel</span>
              <h3 class="text-2xl font-bold text-gray-900 mb-2">Error al procesar</h3>
              <p class="text-gray-500 mb-6">{{ checkoutErrorMessage }}</p>
              <button @click="checkoutError = false" class="w-full py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium">
                Cerrar
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>

</template>

<script setup>
import { ref, computed, onMounted, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { cartAPI, checkoutAPI } from '../../api';
import { useCurrency } from '../../composables/useCurrency';
import { useEcommerceConfig } from '../../composables/useEcommerceConfig';

const router = useRouter();
const authStore = useAuthStore();
const { formatTable } = useCurrency();
const { taxRate, taxIncluded, loadConfig } = useEcommerceConfig();

const loading = ref(true);
const error = ref(null);
const items = ref([]);
const checkingOut = ref(false);
const checkoutSuccess = ref(false);
const checkoutError = ref(false);
const checkoutErrorMessage = ref('');
const couponCode = ref('');

// Fechas para checkout
const today = new Date().toISOString().split('T')[0];
const checkoutDate = ref(today);
const deliveryDate = ref('');

// Calcular totales
const subtotal = computed(() => items.value.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0));
const discount = computed(() => items.value.reduce((sum, item) => sum + (item.discount || 0), 0));
const tax = computed(() => {
  const rate = taxRate.value / 100;
  const taxable = subtotal.value - discount.value;
  if (taxIncluded.value) {
    // Precio ya incluye IVA → extraer la porción de impuesto
    return taxable - (taxable / (1 + rate));
  }
  return taxable * rate;
});
const total = computed(() => {
  if (taxIncluded.value) {
    return subtotal.value - discount.value;
  }
  return subtotal.value - discount.value + tax.value;
});
const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));

const isClient = computed(() => authStore.isAuthenticated && authStore.user?.role === 'cliente');

function goBack() {
  router.back();
}

function goBackToSession() {
  // Intentar recuperar la última sesión de compras
  const lastSession = sessionStorage.getItem('lastCheckoutSession');
  if (lastSession) {
    try {
      const session = JSON.parse(lastSession);
      router.push({ name: 'ProductPublicDetail', params: { id: session.productId } });
      return;
    } catch (e) { /* ignore */ }
  }
  router.push({ name: 'ProductsCatalog' });
}

async function fetchCart() {
  loading.value = true;
  error.value = null;
  try {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      items.value = [];
      return;
    }
    const { data } = await cartAPI.getCart();
    items.value = data?.items || [];
    if (!deliveryDate.value) {
      const d = new Date();
      d.setDate(d.getDate() + 5);
      deliveryDate.value = d.toISOString().split('T')[0];
    }
  } catch (e) {
    if (e.response?.status === 404 || e.response?.status === 401) {
      items.value = [];
    } else {
      error.value = 'Error al cargar el carrito';
    }
  } finally {
    loading.value = false;
  }
}
onMounted(() => {
  loadConfig();
});
async function incrementQuantity(item) {
  try {
    const newQty = item.quantity + 1;
    await cartAPI.updateItem(item.id, { quantity: newQty });
    item.quantity = newQty;
  } catch (e) {
    alert(e.response?.data?.error?.message || 'Error al actualizar cantidad');
  }
}

async function decrementQuantity(item) {
  if (item.quantity <= 1) return;
  try {
    const newQty = item.quantity - 1;
    await cartAPI.updateItem(item.id, { quantity: newQty });
    item.quantity = newQty;
  } catch (e) {
    alert(e.response?.data?.error?.message || 'Error al actualizar cantidad');
  }
}

async function removeItem(item) {
  try {
    await cartAPI.removeItem(item.id);
    items.value = items.value.filter(i => i.id !== item.id);
  } catch (e) {
    alert('Error al eliminar producto del carrito');
  }
}

function applyCoupon() {
  if (!couponCode.value.trim()) return;
  // Placeholder - integrar con backend de cupones
  alert('Funcionalidad de cupones próximamente');
}

async function proceedCheckout() {
  if (!isClient.value) {
    router.push('/login');
    return;
  }

  checkingOut.value = true;
  checkoutError.value = false;

  try {
    const payload = {
      paymentMethod: 'card',
      source: 'ecommerce',
      notes: '',
    };

    await checkoutAPI.checkout(payload);
    checkoutSuccess.value = true;
    items.value = [];
  } catch (e) {
    checkoutError.value = true;
    checkoutErrorMessage.value = e.response?.data?.error?.message || 'Error al procesar el pago. Intenta de nuevo.';
  } finally {
    checkingOut.value = false;
  }
}

function formatPrice(value) {
  return formatTable(value);
}

onBeforeMount(() => {
  if (authStore.isAuthenticated) {
    fetchCart();
  } else {
    loading.value = false;
  }
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
