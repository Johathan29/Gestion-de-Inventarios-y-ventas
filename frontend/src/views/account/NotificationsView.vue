<template>
  <div class="space-y-6">
    <!-- Encabezado -->
    <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6 md:p-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-[2.5rem] font-bold tracking-tight" style="color: rgb(126, 63, 238); font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;">Notificaciones</h2>
          <p class="text-sm font-medium mt-1" style="color: #64748b; font-family: 'Inter', sans-serif;">Mantente al día con tus compras, envíos y más</p>
        </div>
        <button
          @click="markAllRead"
          v-if="hasUnread"
          class="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
        >
          <span class="material-symbols-outlined text-sm">done_all</span>
          Marcar todas leídas
        </button>
      </div>
    </div>

    <!-- Tabs: Notificaciones | Preferencias -->
    <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 overflow-hidden">
      <div class="border-b border-gray-200">
        <div class="flex">
          <button
            @click="tab = 'feed'"
            class="flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors relative"
            :class="tab === 'feed' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'"
          >
            <span class="material-symbols-outlined text-base">notifications</span>
            Actividad Reciente
          </button>
          <button
            @click="tab = 'prefs'"
            class="flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors relative"
            :class="tab === 'prefs' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700'"
          >
            <span class="material-symbols-outlined text-base">settings</span>
            Preferencias
          </button>
        </div>
      </div>

      <!-- Tab: Feed de notificaciones -->
      <div v-if="tab === 'feed'" class="p-4 sm:p-6">
        <NotificationsFeed
          ref="feedRef"
          :limit="15"
          :allow-delete="false"
          :show-unread-dot="true"
          @update:unreadCount="unreadCount = $event"
        />
      </div>

      <!-- Tab: Preferencias -->
      <div v-else class="p-4 sm:p-6">
        <div class="max-w-2xl space-y-6">
          <div class="p-5 bg-gray-50 rounded-xl">
            <h3 class="font-semibold text-gray-900 mb-3">Canales de Notificación</h3>
            <div class="space-y-3">
              <label class="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
                <div>
                  <p class="font-medium text-gray-800">Notificaciones por Email</p>
                  <p class="text-xs text-gray-500">Recibe actualizaciones en tu correo electrónico</p>
                </div>
                <input type="checkbox" v-model="prefs.email_notifications" @change="savePreferences" class="w-5 h-5 text-primary rounded focus:ring-primary" />
              </label>
              <label class="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
                <div>
                  <p class="font-medium text-gray-800">Notificaciones por WhatsApp</p>
                  <p class="text-xs text-gray-500">Recibe notificaciones en tu WhatsApp</p>
                </div>
                <input type="checkbox" v-model="prefs.whatsapp_notifications" @change="savePreferences" class="w-5 h-5 text-primary rounded focus:ring-primary" />
              </label>
            </div>
          </div>

          <div class="p-5 bg-gray-50 rounded-xl">
            <h3 class="font-semibold text-gray-900 mb-3">Confirmación de Compra</h3>
            <div class="space-y-3">
              <label class="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
                <div>
                  <p class="font-medium text-gray-800">Email de confirmación</p>
                  <p class="text-xs text-gray-500">Al realizar una compra</p>
                </div>
                <input type="checkbox" v-model="prefs.purchase_confirmation_email" @change="savePreferences" class="w-5 h-5 text-primary rounded focus:ring-primary" />
              </label>
              <label class="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
                <div>
                  <p class="font-medium text-gray-800">WhatsApp de confirmación</p>
                  <p class="text-xs text-gray-500">Al realizar una compra</p>
                </div>
                <input type="checkbox" v-model="prefs.purchase_confirmation_whatsapp" @change="savePreferences" class="w-5 h-5 text-primary rounded focus:ring-primary" />
              </label>
            </div>
          </div>

          <div class="p-5 bg-gray-50 rounded-xl">
            <h3 class="font-semibold text-gray-900 mb-3">Actualizaciones de Envío</h3>
            <div class="space-y-3">
              <label class="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
                <div>
                  <p class="font-medium text-gray-800">Email de envío</p>
                  <p class="text-xs text-gray-500">Cuando tu pedido sea enviado o actualizado</p>
                </div>
                <input type="checkbox" v-model="prefs.shipping_updates_email" @change="savePreferences" class="w-5 h-5 text-primary rounded focus:ring-primary" />
              </label>
              <label class="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
                <div>
                  <p class="font-medium text-gray-800">WhatsApp de envío</p>
                  <p class="text-xs text-gray-500">Cuando tu pedido sea enviado o actualizado</p>
                </div>
                <input type="checkbox" v-model="prefs.shipping_updates_whatsapp" @change="savePreferences" class="w-5 h-5 text-primary rounded focus:ring-primary" />
              </label>
            </div>
          </div>

          <div class="p-5 bg-gray-50 rounded-xl">
            <h3 class="font-semibold text-gray-900 mb-3">Promociones y Ofertas</h3>
            <div class="space-y-3">
              <label class="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
                <div>
                  <p class="font-medium text-gray-800">Emails promocionales</p>
                  <p class="text-xs text-gray-500">Recibe ofertas y descuentos especiales</p>
                </div>
                <input type="checkbox" v-model="prefs.promo_emails" @change="savePreferences" class="w-5 h-5 text-primary rounded focus:ring-primary" />
              </label>
            </div>
          </div>

          <transition name="fade">
            <div v-if="saved" class="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
              <span class="material-symbols-outlined text-sm">check_circle</span>
              Preferencias guardadas
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { clientsAPI } from '../../api';
import NotificationsFeed from '../../components/notifications/NotificationsFeed.vue';

const tab = ref('feed');
const feedRef = ref(null);
const unreadCount = ref(0);

const hasUnread = computed(() => unreadCount.value > 0);

const loading = ref(true);
const error = ref(null);
const saved = ref(false);

const prefs = reactive({
  email_notifications: true,
  whatsapp_notifications: false,
  purchase_confirmation_email: true,
  purchase_confirmation_whatsapp: false,
  shipping_updates_email: true,
  shipping_updates_whatsapp: false,
  promo_emails: false,
});

async function markAllRead() {
  if (feedRef.value) {
    await feedRef.value.markAllAsRead();
    unreadCount.value = 0;
  }
}

async function fetchPreferences() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await clientsAPI.getNotificationPreferences();
    if (data) {
      Object.assign(prefs, data);
    }
  } catch (e) {
    if (e.response?.status !== 404) {
      error.value = 'Error al cargar preferencias';
    }
  } finally {
    loading.value = false;
  }
}

async function savePreferences() {
  saved.value = false;
  try {
    await clientsAPI.updateNotificationPreferences({ ...prefs });
    saved.value = true;
    setTimeout(() => { saved.value = false; }, 2000);
  } catch (e) {
    // Silencioso
  }
}

onMounted(fetchPreferences);
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
