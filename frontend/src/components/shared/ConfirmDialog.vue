<template>
  <Transition name="confirm-fade">
    <div
      v-if="show"
      class="fixed inset-0 z-[110] flex items-center justify-center p-4"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="handleCancel" />

      <!-- Dialog Card -->
      <div class="relative bg-surface-container-lowest border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in">
        <!-- Icon -->
        <div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <span class="material-icons-outlined text-2xl text-red-400">delete_outline</span>
        </div>

        <!-- Title -->
        <h3 v-if="title" class="text-lg font-semibold text-on-surface text-center mb-2">{{ title }}</h3>

        <!-- Message -->
        <p class="text-sm text-on-surface-variant text-center mb-6">{{ message }}</p>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            @click="handleCancel"
            :disabled="loading"
            class="flex-1 py-2.5 px-4 border border-white/20 text-on-surface rounded-full font-medium hover:bg-white/5 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            @click="$emit('confirm')"
            :disabled="loading"
            class="flex-1 py-2.5 px-4 bg-red-500 text-white rounded-full font-medium hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span v-else class="material-icons-outlined text-lg">check</span>
            {{ loading ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Confirmar Eliminación' },
  message: { type: String, default: '¿Estás seguro de realizar esta acción? Esta operación no se puede deshacer.' },
  loading: { type: Boolean, default: false }
});

const emit = defineEmits(['confirm', 'cancel']);

function handleCancel() {
  if (!props.loading) emit('cancel');
}
</script>

<style scoped>
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s ease;
}
.confirm-fade-enter-active .animate-in,
.confirm-fade-leave-active .animate-in {
  transition: transform 0.2s ease;
}
.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}
.confirm-fade-enter-from .animate-in {
  transform: scale(0.95);
}
.confirm-fade-leave-to .animate-in {
  transform: scale(0.95);
}
</style>
