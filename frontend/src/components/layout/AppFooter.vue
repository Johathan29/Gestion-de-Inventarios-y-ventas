<template>
  <footer class="w-full relative bottom-0 bg-surface-container-lowest/50 backdrop-blur-md border-t border-white/5">
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-gutter px-margin-desktop py-20 max-w-7xl mx-auto">
      <div class="flex flex-col gap-6">
        <a href="#hero" class="font-headline-md text-headline-md text-primary font-bold flex items-center gap-2">
          <img v-if="settings?.logo_url" :src="settings.logo_url" :alt="storeName" class="h-8 w-auto object-contain" />
          {{ storeName }}
        </a>
        <p class="font-body-md text-body-md text-on-surface-variant">{{ storeDescription }}</p>
      </div>
      <div class="flex flex-col gap-4">
        <h5 class="font-label-sm text-label-sm text-on-surface uppercase tracking-widest mb-2">Explorar</h5>
        <a href="#hero" class="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-all">Inicio</a>
        <a href="#products" class="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-all">Colección</a>
        <a href="#reviews" class="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-all">Reseñas</a>
      </div>
      <div class="flex flex-col gap-4">
        <h5 class="font-label-sm text-label-sm text-on-surface uppercase tracking-widest mb-2">Páginas</h5>
        <template v-if="cmsPages.length">
          <router-link
            v-for="p in cmsPages"
            :key="p.id"
            :to="`/p/${p.slug}`"
            class="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-all"
          >{{ p.title }}</router-link>
        </template>
        <span v-else class="font-body-md text-body-md text-on-surface-variant/50">—</span>
      </div>
      <div class="flex flex-col gap-4">
        <h5 class="font-label-sm text-label-sm text-on-surface uppercase tracking-widest mb-2">Soporte</h5>
        <a href="#offers" class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-all">Ofertas</a>
        <a href="#contact" class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-all">Contacto</a>
        <a href="#" class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-all">Envíos</a>
        <a href="#" class="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-all">Devoluciones</a>
      </div>
      <div class="flex flex-col gap-4">
        <h5 class="font-label-sm text-label-sm text-on-surface uppercase tracking-widest mb-2">Conectar</h5>
        <div class="flex gap-4">
          <a class="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 hover:border-primary transition-all" href="#">
            <span class="material-symbols-outlined text-[20px]" data-icon="public">public</span>
          </a>
          <a class="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 hover:border-primary transition-all" href="#">
            <span class="material-symbols-outlined text-[20px]" data-icon="mail">mail</span>
          </a>
        </div>
      </div>
    </div>
    <div class="px-margin-desktop py-8 border-t border-white/5 text-center">
      <p class="font-body-md text-body-md text-on-surface-variant opacity-60">© {{ new Date().getFullYear() }} {{ storeName }}. All rights reserved.</p>
    </div>
  </footer>
</template>

<script setup>
// Footer component for LandingView — uses anchor (#) links for same-page navigation
import { ref, computed, onMounted } from 'vue';
import { useEcommerceSettings } from '../../composables/useEcommerceSettings';
import { cmsAPI } from '../../api';

const { settings, fetchSettings } = useEcommerceSettings();

const storeName = computed(() => settings.value?.store_name || 'Animal Store');
const storeDescription = computed(() => settings.value?.description || 'Defining the future of the human-animal connection through design and wellness.');

// Páginas publicadas en el Gestor de Páginas (CMS)
const cmsPages = ref([]);
onMounted(async () => {
  fetchSettings();
  try {
    const res = await cmsAPI.getPublicPages();
    cmsPages.value = res?.data || res || [];
  } catch (e) {
    cmsPages.value = [];
  }
});
</script>
