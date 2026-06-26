<template>
  <Modal :show="show" title="Confirmar Acción" size="sm" @close="$emit('cancel')">
    <div class="text-center py-4">
      <span class="material-icons-outlined text-5xl text-yellow-500 mb-3 block">warning</span>
      <p class="text-gray-700 dark:text-gray-300">{{ message }}</p>
    </div>
    <template #footer>
      <button @click="$emit('cancel')"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
        Cancelar
      </button>
      <button :disabled="loading" @click="$emit('confirm')"
              :class="confirmClass"
              class="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50">
        <span v-if="loading" class="material-icons-outlined animate-spin text-lg inline-block">refresh</span>
        <span v-else>{{ confirmText }}</span>
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed } from 'vue';
import Modal from './Modal.vue';

const props = defineProps({
  show: { type: Boolean, default: false },
  message: { type: String, default: '¿Estás seguro de realizar esta acción?' },
  confirmText: { type: String, default: 'Confirmar' },
  confirmClass: { type: String, default: 'bg-primary-600' },
  loading: { type: Boolean, default: false }
});

defineEmits(['confirm', 'cancel']);
</script>
