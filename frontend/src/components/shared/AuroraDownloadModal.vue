<template>
  <Teleport to="body">
    <!-- Overlay -->
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center justify-center"
      style="background: rgba(0, 0, 0, 0.05); backdrop-filter: blur(4px)"
      @click.self="cancel"
    >
      <!-- Modal Container -->
      <div
        ref="modalRef"
        class="w-full max-w-lg rounded-[40px] p-4 flex flex-col items-center text-center relative overflow-hidden transition-all duration-500"
        :class="visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'"
        :style="neumorphicFlatStyle"
      >
        <!-- Icon Section -->
        <div
          class="w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500"
          :class="completed ? 'scale-110' : ''"
          :style="iconContainerStyle"
        >
          <span
            class="material-symbols-outlined !text-5xl transition-all duration-500"
            :style="iconStyle"
          >
            {{ completed ? 'check_circle' : 'pending' }}
          </span>
        </div>

        <!-- Text Content -->
        <div class="mb-8">
          <h2 class="text-[32px] font-semibold leading-10 tracking-[-0.01em] text-on-surface mb-2">
            {{ completed ? 'Report Ready' : title }}
          </h2>

          <p class="text-body-md text-on-surface-variant max-w-xs mx-auto">
            {{ completed ? successMessage : subtitle }}
          </p>
        </div>

        <!-- Progress State -->
        <div v-if="!completed" ref="progressContainer" class="w-full mb-4 space-y-2">
          <!-- Progress Bar -->
          <div class="w-full h-4 rounded-full overflow-hidden relative" :style="insetShadowStyle">
            <!-- Progress -->
            <div
              class="aurora-gradient h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
              :style="{ width: `${progress}%` }"
            >
              <!-- Shimmer -->
              <div
                class="absolute inset-0 w-full h-full"
                style="
                  background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(255, 255, 255, 0.5),
                    transparent
                  );
                  animation: progress-shimmer 2s infinite linear;
                "
              ></div>
            </div>
          </div>

          <!-- Progress Information -->
          <div
            class="flex justify-between text-[14px] font-medium leading-5 tracking-[0.01em] text-on-surface-variant px-1"
          >
            <span>{{ progressText }}</span>
            <span>{{ progress }}%</span>
          </div>
        </div>

        <!-- Success State Actions -->
        <div v-if="completed" class="w-full flex flex-col gap-2">
          <!-- Download -->
          <button
            @click="downloadNow"
            class="aurora-gradient text-on-primary py-4 px-6 rounded-2xl font-label-md text-gray-200 shadow-lg active:scale-95 transition-all duration-300 hover:brightness-110 flex items-center justify-center hover:text-white gap-2 group"
          >
            <span
              class="material-symbols-outlined download-icon"
              style="font-variation-settings: 'FILL' 1"
            >
              download
            </span>

            Download Now
          </button>

          <!-- Close -->
          <button
            @click="close"
            class="text-primary py-4 px-6 rounded-2xl font-label-md text-label-md hover:bg-surface-container-low transition-colors active:scale-95"
            :style="neumorphicFlatStyle"
          >
            Return to Dashboard
          </button>
        </div>

        <!-- Decoration Elements -->
        <div
          class="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl pointer-events-none"
          style="background: var(--aurora-primary); opacity: 0.05"
        ></div>

        <div
          class="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl pointer-events-none"
          style="background: var(--aurora-primary-container); opacity: 0.1"
        ></div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
  import { ref, watch, computed, onBeforeUnmount, nextTick } from 'vue';

  /*
|--------------------------------------------------------------------------
| Props
|--------------------------------------------------------------------------
*/

  const props = defineProps({
    visible: {
      type: Boolean,
      default: false
    },

    title: {
      type: String,
      default: 'Generating PDF Report...'
    },

    subtitle: {
      type: String,
      default: 'Please wait while Aurora ERP compiles your data and performance metrics.'
    },

    successMessage: {
      type: String,
      default: 'Your report is ready for download.'
    },

    fileName: {
      type: String,
      default: 'report.pdf'
    },

    downloadFn: {
      type: Function,
      default: null
    }
  });

  /*
|--------------------------------------------------------------------------
| Emits
|--------------------------------------------------------------------------
*/

  const emit = defineEmits(['close', 'downloaded']);

  /*
|--------------------------------------------------------------------------
| State
|--------------------------------------------------------------------------
*/

  const modalRef = ref(null);
  const progressContainer = ref(null);

  const progress = ref(0);
  const completed = ref(false);

  const progressText = ref('Processing data units...');

  let progressInterval = null;
  let completionTimeout = null;

  /*
|--------------------------------------------------------------------------
| Styles
|--------------------------------------------------------------------------
*/

  const neumorphicFlatStyle = computed(() => ({
    background: '#fff7ff',

    boxShadow: '8px 8px 16px #d1cad1, -8px -8px 16px #ffffff'
  }));

  const insetShadowStyle = computed(() => ({
    background: '#fff7ff',

    boxShadow: 'inset 4px 4px 8px #d1cad1, inset -4px -4px 8px #ffffff'
  }));

  const iconContainerStyle = computed(() => ({
    background: '#fff7ff',

    boxShadow: 'inset 4px 4px 8px #d1cad1, inset -4px -4px 8px #ffffff',

    color: completed.value
      ? 'var(--aurora-primary-container, #9154dc)'
      : 'var(--aurora-primary, #7738c1)'
  }));

  const iconStyle = computed(() => ({
    fontVariationSettings: completed.value ? "'FILL' 1" : "'FILL' 0"
  }));

  /*
|--------------------------------------------------------------------------
| Start Progress
|--------------------------------------------------------------------------
*/

  const startProgress = () => {
    clearProgress();

    completed.value = false;
    progress.value = 0;

    progressText.value = 'Processing data units...';

    progressInterval = setInterval(() => {
      /*
       * Incremento aleatorio para simular
       * el procesamiento real.
       */
      const increment = Math.floor(Math.random() * 10) + 5;

      progress.value = Math.min(progress.value + increment, 100);

      /*
       * Actualización de mensajes
       */
      if (progress.value >= 30 && progress.value < 60) {
        progressText.value = 'Formatting tables...';
      }

      if (progress.value >= 60 && progress.value < 85) {
        progressText.value = 'Embedding visual charts...';
      }

      if (progress.value >= 85 && progress.value < 100) {
        progressText.value = 'Finalizing security signatures...';
      }

      /*
       * Proceso completado
       */
      if (progress.value >= 100) {
        clearInterval(progressInterval);

        progressText.value = 'Report generated successfully.';

        completeProcess();
      }
    }, 600);
  };

  /*
|--------------------------------------------------------------------------
| Complete Process
|--------------------------------------------------------------------------
*/

  const completeProcess = () => {
    clearTimeout(completionTimeout);

    completionTimeout = setTimeout(() => {
      completed.value = true;

      emit('downloaded');
    }, 700);
  };

  /*
|--------------------------------------------------------------------------
| Download
|--------------------------------------------------------------------------
*/

  const downloadNow = async () => {
    if (props.downloadFn) {
      await props.downloadFn();
    }

    close();
  };

  /*
|--------------------------------------------------------------------------
| Cancel
|--------------------------------------------------------------------------
*/

  const cancel = () => {
    if (completed.value) {
      return;
    }

    close();
  };

  /*
|--------------------------------------------------------------------------
| Close
|--------------------------------------------------------------------------
*/

  const close = () => {
    clearProgress();

    completed.value = false;
    progress.value = 0;

    emit('close');
  };

  /*
|--------------------------------------------------------------------------
| Clear Timers
|--------------------------------------------------------------------------
*/

  const clearProgress = () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    if (completionTimeout) {
      clearTimeout(completionTimeout);
      completionTimeout = null;
    }
  };

  /*
|--------------------------------------------------------------------------
| Watch Visibility
|--------------------------------------------------------------------------
*/

  watch(
    () => props.visible,
    async (visible) => {
      if (visible) {
        await nextTick();

        startProgress();
      } else {
        clearProgress();

        completed.value = false;
        progress.value = 0;
      }
    }
  );

  /*
|--------------------------------------------------------------------------
| Cleanup
|--------------------------------------------------------------------------
*/

  onBeforeUnmount(() => {
    clearProgress();
  });
</script>

<style scoped>
  .aurora-gradient {
    background: linear-gradient(90deg, #7738c1, #9154dc, #c084fc);
  }

  @keyframes progress-shimmer {
    0% {
      transform: translateX(-100%);
    }

    100% {
      transform: translateX(100%);
    }
  }
  @keyframes download-bounce {
    0% {
      transform: translateY(0);
    }

    30% {
      transform: translateY(5px);
    }

    60% {
      transform: translateY(-2px);
    }

    100% {
      transform: translateY(0);
    }
  }
  .download-icon {
    transition: transform 0.3s ease;
  }

  .group:hover .download-icon {
    animation: download-bounce 0.8s ease-in-out infinite;
  }

  @keyframes download-bounce {
    0%,
    100% {
      transform: translateY(0);
    }

    50% {
      transform: translateY(5px);
    }
  }
</style>
