<template>
  <div class="dashboard-theme flex h-screen" style="background-color: #fdfbf7;">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden"
         :class="{ 'lg:ml-[280px]': appStore.sidebarOpen, 'lg:ml-[88px]': !appStore.sidebarOpen }">
      <!-- Top Navbar -->
      <Navbar />

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-6" style="background-color: #fdfbf7;">
        <div class="max-w-[1400px] mx-auto w-full">
          <!-- Page Header -->
          <div class="dt-section-header" v-if="appStore.pageTitle">
            <h2 class="dt-headline-md">{{ appStore.pageTitle }}</h2>
            <nav class="flex mt-1" v-if="appStore.pageBreadcrumb?.length">
              <ol class="flex items-center space-x-2 dt-body-sm" style="color: #4f4539;">
                <li>
                  <router-link to="/app/dashboard" style="color: #624200; text-decoration: none;">Inicio</router-link>
                </li>
                <li v-for="(crumb, idx) in appStore.pageBreadcrumb" :key="idx">
                  <span class="mx-1" style="color: #817567;">/</span>
                  <span v-if="idx === appStore.pageBreadcrumb.length - 1" class="font-medium" style="color: #0b1c30;">{{ crumb }}</span>
                  <router-link v-else :to="crumb.path || ''" style="color: #624200; text-decoration: none;">{{ crumb.label || crumb }}</router-link>
                </li>
              </ol>
            </nav>
          </div>

          <!-- Router View with transitions -->
          <div class="page-transition-wrapper">
            <router-view v-slot="{ Component }">
              <transition name="page" mode="out-in">
                <keep-alive :include="cachedViews">
                  <component :is="Component" :key="$route.path" />
                </keep-alive>
              </transition>
            </router-view>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAppStore } from '../../stores/app';
import { useAuthStore } from '../../stores/auth';
import Sidebar from './Sidebar.vue';
import Navbar from './Navbar.vue';

const appStore = useAppStore();
const authStore = useAuthStore();

const cachedViews = ref(['Dashboard']);

onMounted(async () => {
  appStore.initTheme();
  if (sessionStorage.getItem('accessToken')) {
    await authStore.fetchProfile();
  }
});
</script>
