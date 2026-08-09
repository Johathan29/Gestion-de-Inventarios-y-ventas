<template>
  <div class="min-h-screen bg-gradient-to-b from-[#151215] via-[#1a1225] to-[#0f0a15] text-[#e8e0e4] selection:bg-primary selection:text-on-primary overflow-x-hidden">
    <!-- TopNavBar -->
    <AppNavBar />

    <main class="relative z-10">
      <!-- ═══ LOADING ═══ -->
      <div v-if="loading" class="min-h-[70vh] flex flex-col items-center justify-center pt-28 gap-4">
        <div class="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        <p class="text-white/50 text-sm">Cargando página…</p>
      </div>

      <!-- ═══ NOT FOUND ═══ -->
      <div v-else-if="notFound" class="min-h-[70vh] flex flex-col items-center justify-center pt-28 px-6 text-center">
        <span class="material-symbols-outlined text-6xl text-white/20 mb-6">description</span>
        <h1 class="text-3xl md:text-4xl font-bold mb-3">Página no encontrada</h1>
        <p class="text-white/50 mb-8 max-w-md">
          La página que buscas no existe o no ha sido publicada todavía.
        </p>
        <router-link
          to="/"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-medium hover:opacity-90 transition-opacity"
        >
          <span class="material-symbols-outlined text-lg">arrow_back</span>
          Volver al inicio
        </router-link>
      </div>

      <!-- ═══ PAGE CONTENT ═══ -->
      <template v-else>
        <article class="pt-32 pb-20">
          <!-- Page header -->
          <header v-if="pageTitle" class="max-w-5xl mx-auto px-6 text-center mb-16">
            <h1 class="font-headline-md text-4xl md:text-5xl font-bold tracking-tight">{{ pageTitle }}</h1>
            <p v-if="pageMetaDescription" class="mt-5 text-white/60 text-lg max-w-2xl mx-auto">{{ pageMetaDescription }}</p>
          </header>

          <!-- Sections -->
          <div class="max-w-7xl mx-auto px-6 space-y-16">
            <template v-for="(section, idx) in pageSections" :key="section.id || idx">
              <RenderSection :section="section" />
            </template>
          </div>
        </article>
      </template>
    </main>

    <!-- Footer -->
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { cmsAPI } from '../../api';
import AppNavBar from '../../components/layout/AppNavBar.vue';
import AppFooter from '../../components/layout/AppFooter.vue';
import RenderSection from '../../components/cms/RenderSection.vue';

const route = useRoute();
const loading = ref(true);
const notFound = ref(false);
const page = ref(null);

const pageTitle = computed(() => page.value?.title || '');
const pageMetaDescription = computed(() => page.value?.meta_description || '');
const pageSections = computed(() => page.value?.sections || []);

onMounted(async () => {
  const slug = route.params.slug;
  try {
    const res = await cmsAPI.getPreview(slug);
    const data = res?.data || res;
    page.value = data;
    if (data?.title) {
      document.title = `${data.title} | ${data.meta_title || 'Animal Store'}`;
    }
  } catch (err) {
    if (err.response?.status === 404) {
      notFound.value = true;
    } else {
      notFound.value = true;
      console.error('[CmsPublicPage]', err.message);
    }
  } finally {
    loading.value = false;
  }
});
</script>
