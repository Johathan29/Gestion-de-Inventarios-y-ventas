<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Cupón de Descuento</h4>

    <!-- Coupon Input -->
    <div v-if="!appliedCoupon" class="flex gap-2">
      <input
        v-model="code"
        @keyup.enter="applyCoupon"
        placeholder="Ingresa código de cupón"
        class="dt-input flex-1 text-sm"
        :disabled="loading"
      />
      <button
        @click="applyCoupon"
        class="btn btn-primary text-sm px-4"
        :disabled="loading || !code.trim()"
      >
        {{ loading ? 'Validando...' : 'Aplicar' }}
      </button>
    </div>

    <!-- Applied Coupon -->
    <div v-else class="space-y-2">
      <div class="flex items-center justify-between p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
        <div class="flex items-center gap-2">
          <span class="material-icons-outlined text-violet-600 text-sm">local_offer</span>
          <div>
            <p class="text-sm font-medium text-violet-700 dark:text-violet-300">{{ appliedCoupon.code }}</p>
            <p class="text-xs text-violet-500">
              {{ appliedCoupon.discount_type === 'percentage'
                ? `${appliedCoupon.discount_value}% de descuento`
                : appliedCoupon.discount_type === 'free_shipping'
                  ? 'Envío gratis'
                  : `$${formatPrice(appliedCoupon.discount_value)} de descuento`
              }}
            </p>
          </div>
        </div>
        <button @click="removeCoupon" class="text-gray-400 hover:text-red-500 p-1" title="Quitar cupón">
          <span class="material-icons-outlined text-sm">close</span>
        </button>
      </div>

      <div v-if="discountAmount > 0" class="flex items-center justify-between text-sm">
        <span class="text-gray-500">Descuento aplicado</span>
        <span class="font-semibold text-green-600">- ${{ formatPrice(discountAmount) }}</span>
      </div>
    </div>

    <!-- Error -->
    <p v-if="error" class="mt-2 text-xs text-red-500">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useCouponStore } from '../../stores/coupons';
import { useCurrencyStore } from '../../stores/currency';

const props = defineProps({
  subtotal: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 }
});

const emit = defineEmits(['apply', 'remove']);

const couponStore = useCouponStore();
const currencyStore = useCurrencyStore();

const code = ref('');
const loading = ref(false);
const error = ref('');
const appliedCoupon = ref(null);
const discountAmount = ref(0);

const formatPrice = (v) => currencyStore.format(v);

const applyCoupon = async () => {
  if (!code.value.trim()) return;
  loading.value = true;
  error.value = '';

  try {
    const result = await couponStore.validateCoupon(code.value.trim());

    if (result.valid) {
      appliedCoupon.value = result.coupon || { code: code.value, discount_type: result.discount_type, discount_value: result.discount_value };

      // Calcular descuento
      if (result.discount_type === 'percentage') {
        discountAmount.value = Math.round(props.subtotal * (result.discount_value / 100) * 100) / 100;
      } else if (result.discount_type === 'fixed_amount') {
        discountAmount.value = result.discount_value;
      } else if (result.discount_type === 'free_shipping') {
        discountAmount.value = props.shipping;
      } else {
        discountAmount.value = 0;
      }

      emit('apply', {
        code: code.value,
        discount_type: result.discount_type,
        discount_value: result.discount_value,
        amount: discountAmount.value,
        coupon_id: result.coupon?.id
      });
    } else {
      error.value = result.message || 'Cupón inválido o expirado';
    }
  } catch (err) {
    error.value = 'Error al validar cupón';
  } finally {
    loading.value = false;
  }
};

const removeCoupon = () => {
  appliedCoupon.value = null;
  discountAmount.value = 0;
  code.value = '';
  error.value = '';
  emit('remove');
};
</script>
