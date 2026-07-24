<template>
  <Transition name="alert-fade">
    <div
      v-if="show"
      class="flex items-start gap-3 px-5 py-4 rounded-xl border"
      :class="alertClasses"
      role="alert"
    >
      <span class="material-icons-outlined text-lg mt-0.5 flex-shrink-0">{{ iconName }}</span>
      <p class="text-sm flex-1">{{ message }}</p>
      <button
        v-if="dismissible"
        @click="$emit('close')"
        class="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        aria-label="Cerrar"
      >
        <span class="material-icons-outlined text-sm">close</span>
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { computed, watch } from 'vue';

const props = defineProps({
  type: { type: String, default: 'info' },
  message: { type: String, default: '' },
  show: { type: Boolean, default: false },
  dismissible: { type: Boolean, default: false },
  duration: { type: Number, default: 0 }
});

const emit = defineEmits(['close']);

watch(() => props.show, (val) => {
  if (val && props.duration > 0) {
    setTimeout(() => {
      emit('close');
    }, props.duration);
  }
});

const typeConfig = {
  success: { icon: 'check_circle', classes: 'bg-green-500/10 border-green-500/30 text-green-400' },
  error: { icon: 'error', classes: 'bg-red-500/10 border-red-500/30 text-red-400' },
  warning: { icon: 'warning', classes: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' },
  info: { icon: 'info', classes: 'bg-blue-500/10 border-blue-500/30 text-blue-400' }
};

const config = computed(() => typeConfig[props.type] || typeConfig.info);
const iconName = computed(() => config.value.icon);
const alertClasses = computed(() => config.value.classes);
</script>

<style scoped>
.alert-fade-enter-active,
.alert-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.alert-fade-enter-from,
.alert-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
