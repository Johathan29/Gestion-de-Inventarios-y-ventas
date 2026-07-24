<template>
  <div class="space-y-8">
    <!-- Page Header with glass panel -->
    <div class="glass-panel rounded-[28px] p-6 md:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6 notif-reveal">
      <div>
        <h2 class="text-2xl font-bold tracking-tight" style="color: rgb(126, 63, 238); font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;">
          Centro de Notificaciones
          <span class="text-[0.688rem] font-medium bg-[rgba(124,58,237,0.1)] text-[#7c3aed] px-3 py-1 rounded-full ml-3 align-middle">v2.4.0</span>
        </h2>
        <p class="font-body-md mt-1" style="color: #64748b; font-family: 'Inter', sans-serif;">Gestiona las alertas y registros operativos de tu ecosistema ERP.</p>
      </div>
      <div v-show="unreadCount > 0" class="flex items-center gap-3 shrink-0">
        <button
          @click="filter = filter === 'unread' ? '' : 'unread'"
          class="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all duration-200"
          :class="filter === 'unread'
            ? 'bg-[rgba(124,58,237,0.08)] border-[#7c3aed] text-[#7c3aed]'
            : 'bg-white/60 border-gray-200 text-gray-600 hover:bg-white'"
        >
          <span class="material-symbols-outlined text-sm">mark_email_unread</span>
          No leídas
          <span class="ml-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
        </button>
        <button
          @click="handleMarkAllRead"
          class="accent-gradient accent-gradient-hover text-white px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 theme-shadow transition-all active:scale-95 border-0 cursor-pointer"
        >
          <span class="material-symbols-outlined text-sm">done_all</span>
          Marcar todas leídas
        </button>
      </div>
    </div>

    <!-- Bento Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <!-- Stat: No leídas -->
      <div class="stat-card-bento group hover:shadow-xl transition-all duration-300 notif-reveal cursor-default">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 rounded-2xl bg-[rgba(124,58,237,0.1)] text-[#7c3aed] group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">mark_email_unread</span>
          </div>
          <span v-if="stats.todayLogs > 0" class="text-[10px] font-bold text-[#7c3aed] bg-[rgba(124,58,237,0.06)] px-2 py-1 rounded-md">+{{ stats.todayLogs }} hoy</span>
        </div>
        <p class="text-xs font-medium uppercase tracking-wider" style="color: #64748b; font-family: 'Inter', sans-serif;">Mensajes No Leídos</p>
        <p class="text-[32px] font-extrabold mt-1 leading-tight counter-animate" style="color: #1e293b; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;">{{ unreadCount }}</p>
      </div>

      <!-- Stat: Eventos hoy -->
      <div class="stat-card-bento group hover:shadow-xl transition-all duration-300 notif-reveal cursor-default">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 rounded-2xl bg-[rgba(99,102,241,0.1)] text-[#6366f1] group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">today</span>
          </div>
        </div>
        <p class="text-xs font-medium uppercase tracking-wider" style="color: #64748b; font-family: 'Inter', sans-serif;">Eventos de Hoy</p>
        <p class="text-[32px] font-extrabold mt-1 leading-tight counter-animate" style="color: #1e293b; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;">{{ stats.todayLogs }}</p>
      </div>

      <!-- Stat: Eventos del mes -->
      <div class="stat-card-bento group hover:shadow-xl transition-all duration-300 notif-reveal cursor-default">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 rounded-2xl bg-[rgba(245,158,11,0.12)] text-[#d97706] group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">calendar_month</span>
          </div>
        </div>
        <p class="text-xs font-medium uppercase tracking-wider" style="color: #64748b; font-family: 'Inter', sans-serif;">Eventos del Mes</p>
        <p class="text-[32px] font-extrabold mt-1 leading-tight counter-animate" style="color: #1e293b; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;">{{ stats.monthLogs }}</p>
      </div>

      <!-- Stat: Total registros -->
      <div class="stat-card-bento group hover:shadow-xl transition-all duration-300 notif-reveal cursor-default">
        <div class="flex justify-between items-start mb-4">
          <div class="p-3 rounded-2xl bg-[rgba(100,116,139,0.12)] text-[#64748b] group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">list_alt</span>
          </div>
        </div>
        <p class="text-xs font-medium uppercase tracking-wider" style="color: #64748b; font-family: 'Inter', sans-serif;">Total de Registros</p>
        <p class="text-[32px] font-extrabold mt-1 leading-tight counter-animate" style="color: #1e293b; font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;">{{ stats.totalLogs }}</p>
      </div>
    </div>

    <!-- Main Notifications List -->
    <div class="glass-panel rounded-[28px] overflow-hidden notif-reveal">
      <!-- Toolbar: tabs + actions -->
      <div class="px-8 py-5 border-b border-[rgba(226,232,240,0.5)] dark:border-[rgba(74,68,85,0.2)] bg-[rgba(255,255,255,0.3)] dark:bg-[rgba(23,31,51,0.3)]">
        <!-- Row 1: Tabs + Actions -->
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex gap-5">
            <button
              @click="filterTab = 'recent'; filter = ''"
              class="notif-tab"
              :class="filterTab === 'recent' ? 'active' : ''"
            >
              Recientes
              <span
                class="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full"
                :class="filterTab === 'recent' ? 'bg-[rgba(124,58,237,0.15)] text-[#7c3aed]' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
              >{{ totalAll }}</span>
            </button>
            <button
              @click="filterTab = 'unread'; filter = 'unread'"
              class="notif-tab"
              :class="filterTab === 'unread' ? 'active' : ''"
            >
              No leídas
              <span
                v-if="unreadCount > 0"
                class="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full"
                :class="filterTab === 'unread' ? 'bg-[rgba(239,68,68,0.15)] text-red-500' : 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'"
              >{{ unreadCount }}</span>
            </button>
          </div>
          <div class="flex items-center gap-2">
            <!-- Filter toggle -->
            <button
              @click="showFilters = !showFilters"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border cursor-pointer"
              :class="(showFilters || hasActiveFilters)
                ? 'bg-[rgba(124,58,237,0.08)] border-[#7c3aed] text-[#7c3aed]'
                : 'bg-white/60 dark:bg-[rgba(23,31,51,0.4)] border-gray-200 dark:border-[rgba(74,68,85,0.25)] text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-[rgba(23,31,51,0.6)]'"
              title="Mostrar filtros"
            >
              <span class="material-symbols-outlined text-[18px]">filter_list</span>
              <span class="hidden sm:inline">Filtrar</span>
              <span
                v-if="hasActiveFilters"
                class="w-1.5 h-1.5 rounded-full bg-[#7c3aed] ml-0.5"
              ></span>
            </button>
            <!-- Reload -->
            <button
              @click="refreshFeed"
              class="p-2 hover:bg-[rgba(124,58,237,0.06)] dark:hover:bg-[rgba(211,187,255,0.08)] rounded-lg transition-colors border border-[rgba(226,232,240,0.4)] dark:border-[rgba(74,68,85,0.25)] material-symbols-outlined cursor-pointer"
              style="color: #64748b;"
              title="Recargar"
            >refresh</button>
          </div>
        </div>
      </div>

      <!-- Collapsible Filters Panel -->
      <Transition name="filter-slide">
        <div
          v-if="showFilters"
          class="px-8 py-4 border-b border-[rgba(226,232,240,0.5)] dark:border-[rgba(74,68,85,0.2)] bg-[rgba(255,255,255,0.15)] dark:bg-[rgba(23,31,51,0.15)]"
        >
          <div class="flex flex-wrap items-center gap-3">
            <!-- Search -->
            <div class="relative flex-1 min-w-[200px]">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar por título o mensaje…"
                class="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[rgba(226,232,240,0.6)] dark:border-[rgba(74,68,85,0.3)] bg-white/70 dark:bg-[rgba(23,31,51,0.5)] text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(124,58,237,0.3)] focus:border-[#7c3aed] transition-all"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 material-symbols-outlined text-[16px] cursor-pointer"
              >close</button>
            </div>

            <!-- Date From -->
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px] pointer-events-none">event</span>
              <input
                v-model="dateFrom"
                type="date"
                class="pl-10 pr-3 py-2.5 rounded-xl border border-[rgba(226,232,240,0.6)] dark:border-[rgba(74,68,85,0.3)] bg-white/70 dark:bg-[rgba(23,31,51,0.5)] text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[rgba(124,58,237,0.3)] focus:border-[#7c3aed] transition-all"
                title="Fecha desde"
              />
            </div>

            <!-- Date To -->
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px] pointer-events-none">event</span>
              <input
                v-model="dateTo"
                type="date"
                class="pl-10 pr-3 py-2.5 rounded-xl border border-[rgba(226,232,240,0.6)] dark:border-[rgba(74,68,85,0.3)] bg-white/70 dark:bg-[rgba(23,31,51,0.5)] text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[rgba(124,58,237,0.3)] focus:border-[#7c3aed] transition-all"
                title="Fecha hasta"
              />
            </div>

            <!-- Sort -->
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px] pointer-events-none">sort</span>
              <select
                v-model="sortBy"
                class="pl-10 pr-8 py-2.5 rounded-xl border border-[rgba(226,232,240,0.6)] dark:border-[rgba(74,68,85,0.3)] bg-white/70 dark:bg-[rgba(23,31,51,0.5)] text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[rgba(124,58,237,0.3)] focus:border-[#7c3aed] transition-all appearance-none cursor-pointer"
              >
                <option value="recent">Más recientes</option>
                <option value="oldest">Más antiguas</option>
                <option value="unread_first">No leídas primero</option>
              </select>
              <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[16px] pointer-events-none">expand_more</span>
            </div>

            <!-- Clear all filters -->
            <button
              v-if="hasActiveFilters"
              @click="clearFilters"
              class="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-[#7c3aed] bg-[rgba(124,58,237,0.06)] hover:bg-[rgba(124,58,237,0.12)] transition-colors border border-[rgba(124,58,237,0.2)] cursor-pointer"
            >
              <span class="material-symbols-outlined text-[16px]">filter_alt_off</span>
              Limpiar
            </button>
          </div>
        </div>
      </Transition>

      <!-- Feed Content -->
      <NotificationsFeed
        ref="feedRef"
        :limit="30"
        :allow-delete="true"
        :show-unread-dot="true"
        :filter="filter"
        :search-query="searchQuery"
        :date-from="dateFrom"
        :date-to="dateTo"
        :sort-by="sortBy"
        @update:unreadCount="unreadCount = $event"
        @update:total="totalAll = $event"
      />
    </div>

    <!-- Contextual Banner -->
    <div class="notif-cta-banner rounded-[28px] overflow-hidden notif-reveal">
      <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 p-8 md:p-10">
        <div class="max-w-lg">
          <h3 class="text-2xl font-bold mb-3" style="font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;">¿Necesitas reportes automáticos?</h3>
          <p class="opacity-80 mb-5" style="font-family: 'Inter', sans-serif;">Activa la inteligencia predictiva en tu panel de notificaciones y recibe alertas críticas sobre proyecciones de ventas y stock antes de que sucedan.</p>
          <a
            href="/app/reports"
            class="accent-gradient text-white px-7 py-3 rounded-full font-bold hover:scale-105 transition-transform inline-flex items-center gap-2 theme-shadow"
          >
            <span class="material-symbols-outlined">bolt</span>
            Configurar Reportes
          </a>
        </div>
        <div class="w-44 h-44 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/15 shrink-0">
          <span class="material-symbols-outlined text-[80px]" style="color: #c4b5fd;">auto_awesome</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="flex flex-col md:flex-row justify-between items-center py-6 px-2 notif-reveal" style="color: #94a3b8; font-size: 0.813rem;">
      <p>© 2026 Animal Store ERP. Todos los derechos reservados.</p>
      <div class="flex gap-6 mt-3 md:mt-0">
        <a href="#" class="hover:text-primary transition-colors">Términos</a>
        <a href="#" class="hover:text-primary transition-colors">Privacidad</a>
        <a href="#" class="hover:text-primary transition-colors">Soporte</a>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { auditAPI } from '../../api';
import NotificationsFeed from '../../components/notifications/NotificationsFeed.vue';

const feedRef = ref(null);
const unreadCount = ref(0);
const totalAll = ref(0);
const filter = ref('');
const filterTab = ref('recent');
const showFilters = ref(false);
const searchQuery = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const sortBy = ref('recent');

const hasActiveFilters = computed(() => {
  return searchQuery.value || dateFrom.value || dateTo.value || sortBy.value !== 'recent';
});

const clearFilters = () => {
  searchQuery.value = '';
  dateFrom.value = '';
  dateTo.value = '';
  sortBy.value = 'recent';
};

const stats = reactive({
  todayLogs: 0,
  monthLogs: 0,
  totalLogs: 0,
});

const handleMarkAllRead = async () => {
  if (feedRef.value) {
    await feedRef.value.markAllAsRead();
    unreadCount.value = 0;
  }
};

const refreshFeed = () => {
  if (feedRef.value) {
    feedRef.value.fetchAll();
  }
};

const fetchStats = async () => {
  try {
    const { data } = await auditAPI.getStats();
    if (data) {
      stats.todayLogs = data.todayLogs || 0;
      stats.monthLogs = data.monthLogs || 0;
      stats.totalLogs = data.totalLogs || 0;
    }
  } catch (e) { /* silent */ }
};

onMounted(async () => {
  fetchStats();
  // Trigger reveal animations after mount
  await nextTick();
  document.querySelectorAll('.notif-reveal').forEach((el, i) => {
    setTimeout(() => el.classList.add('active'), i * 100);
  });
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.filter-slide-enter-active,
.filter-slide-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.filter-slide-enter-from,
.filter-slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.filter-slide-enter-to,
.filter-slide-leave-from {
  opacity: 1;
  max-height: 120px;
}
</style>
