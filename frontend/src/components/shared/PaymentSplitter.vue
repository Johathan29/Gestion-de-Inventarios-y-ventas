<template>
  <div class="space-y-4">
    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Dividir Pago</h4>

    <!-- Payment Methods -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <button
        v-for="method in paymentMethods"
        :key="method.value"
        @click="addSplit(method)"
        class="flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-sm"
        :class="selectedMethods.includes(method.value)
          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700'
          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-600 dark:text-gray-400'"
      >
        <span class="material-icons-outlined">{{ method.icon }}</span>
        <span>{{ method.label }}</span>
      </button>
    </div>

    <!-- Split Entries -->
    <div v-if="splits.length" class="space-y-3">
      <div
        v-for="(split, index) in splits"
        :key="index"
        class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
      >
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ split.label }}</p>
        </div>
        <div class="w-32">
          <input
            v-model.number="split.amount"
            type="number"
            min="0"
            :max="remainingAmount + split.amount"
            step="100"
            class="dt-input w-full text-right text-sm"
            @input="recalculate"
          />
        </div>
        <button @click="removeSplit(index)" class="text-red-400 hover:text-red-600 p-1">
          <span class="material-icons-outlined text-sm">close</span>
        </button>
      </div>

      <!-- Auto-distribute -->
      <div class="flex items-center justify-between text-sm text-gray-500">
        <button @click="distributeEqually" class="text-violet-600 hover:text-violet-800 font-medium">
          Distribuir equitativamente
        </button>
        <span class="font-mono" :class="remainingAmount === 0 ? 'text-green-600 font-bold' : 'text-red-500'">
          Restante: ${{ formatPrice(remainingAmount) }}
        </span>
      </div>
    </div>

    <!-- Hidden input for form submission -->
    <input type="hidden" name="payments" :value="paymentSplitsJSON" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useCurrencyStore } from '../../stores/currency';

const props = defineProps({
  total: { type: Number, required: true },
  modelValue: { type: Array, default: () => [] }
});

const emit = defineEmits(['update:modelValue', 'update:total']);

const currencyStore = useCurrencyStore();

const paymentMethods = [
  { value: 'cash', label: 'Efectivo', icon: 'payments' },
  { value: 'card', label: 'Tarjeta', icon: 'credit_card' },
  { value: 'transfer', label: 'Transferencia', icon: 'account_balance' },
  { value: 'credit', label: 'Crédito', icon: 'credit_score' },
  { value: 'check', label: 'Cheque', icon: 'receipt' },
  { value: 'wallet', label: 'Billetera', icon: 'account_balance_wallet' }
];

const splits = ref(props.modelValue.length ? [...props.modelValue] : []);
const selectedMethods = computed(() => splits.value.map(s => s.method));

const totalSplits = computed(() => splits.value.reduce((sum, s) => sum + (s.amount || 0), 0));
const remainingAmount = computed(() => Math.max(0, props.total - totalSplits.value));

const paymentSplitsJSON = computed(() => JSON.stringify(splits.value.map(s => ({
  payment_method: s.method,
  amount: s.amount,
  reference_number: s.reference || null
}))));

const formatPrice = (v) => currencyStore.format(v);

const addSplit = (method) => {
  if (selectedMethods.value.includes(method.value)) return;
  splits.value.push({
    method: method.value,
    label: method.label,
    amount: 0,
    reference: ''
  });
  recalculate();
};

const removeSplit = (index) => {
  splits.value.splice(index, 1);
  recalculate();
};

const recalculate = () => {
  emit('update:modelValue', splits.value.map(s => ({
    method: s.method,
    amount: s.amount,
    reference: s.reference
  })));
};

const distributeEqually = () => {
  if (!splits.value.length) return;
  const equalAmount = Math.floor(props.total / splits.value.length);
  let remainder = props.total;
  splits.value.forEach((split, i) => {
    if (i === splits.value.length - 1) {
      split.amount = remainder;
    } else {
      split.amount = equalAmount;
      remainder -= equalAmount;
    }
  });
  recalculate();
};

watch(() => props.modelValue, (val) => {
  if (val?.length) splits.value = [...val];
}, { deep: true });
</script>
