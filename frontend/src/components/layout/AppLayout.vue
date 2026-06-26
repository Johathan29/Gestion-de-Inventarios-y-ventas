<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden"
         :class="{ 'lg:ml-64': appStore.sidebarOpen, 'lg:ml-20': !appStore.sidebarOpen }">
      <!-- Top Navbar -->
      <Navbar />

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
        <div class="container">
          <!-- Page Header -->
          <div class="mb-6" v-if="appStore.pageTitle">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ appStore.pageTitle }}
            </h1>
            <nav class="flex mt-1" v-if="appStore.pageBreadcrumb?.length">
              <ol class="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <li>
                  <router-link to="/app/dashboard" class="hover:text-primary-600">Inicio</router-link>
                </li>
                <li v-for="(crumb, idx) in appStore.pageBreadcrumb" :key="idx">
                  <span class="mx-1">/</span>
                  <span v-if="idx === appStore.pageBreadcrumb.length - 1" class="text-gray-900 dark:text-white font-medium">{{ crumb }}</span>
                  <router-link v-else :to="crumb.path || ''" class="hover:text-primary-600">{{ crumb.label || crumb }}</router-link>
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
