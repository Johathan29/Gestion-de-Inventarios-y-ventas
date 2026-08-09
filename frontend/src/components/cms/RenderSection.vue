<template>
  <section
    class="relative rounded-3xl overflow-hidden"
    :style="sectionStyle"
  >
    <!-- ═══ HERO ═══ -->
    <div
      v-if="key === 'hero'"
      class="relative min-h-[420px] flex flex-col items-center justify-center text-center px-6 py-20"
      :style="bgStyle"
    >
      <div v-if="section.settings?.overlay !== false" class="absolute inset-0 bg-black/40"></div>
      <div class="relative z-10 max-w-3xl mx-auto">
        <p v-if="section.settings?.eyebrow" class="text-primary text-sm font-semibold uppercase tracking-widest mb-4">{{ section.settings.eyebrow }}</p>
        <h2 class="text-4xl md:text-5xl font-bold tracking-tight mb-5">{{ title }}</h2>
        <p v-if="bodyText" class="text-white/70 text-lg md:text-xl mb-8">{{ bodyText }}</p>
        <div v-if="ctaLabel" class="flex flex-wrap justify-center gap-4">
          <router-link
            :to="ctaUrl"
            class="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-on-primary font-medium hover:opacity-90 transition-opacity"
          >
            {{ ctaLabel }}
            <span class="material-symbols-outlined text-lg">arrow_forward</span>
          </router-link>
          <a
            v-if="ctaSecondaryLabel"
            :href="ctaSecondaryUrl"
            class="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/20 text-white/80 hover:border-primary hover:text-primary transition-colors"
          >
            {{ ctaSecondaryLabel }}
          </a>
        </div>
      </div>
    </div>

    <!-- ═══ TEXT / RICH TEXT ═══ -->
    <div
      v-else-if="isText"
      class="px-6 py-14 max-w-4xl mx-auto"
      :style="{ textAlign: section.settings?.align || 'left' }"
    >
      <h2 v-if="title" class="text-3xl md:text-4xl font-bold mb-6">{{ title }}</h2>
      <div
        v-if="htmlContent"
        class="prose prose-invert max-w-none text-white/75 text-lg leading-relaxed space-y-4"
        v-html="htmlContent"
      ></div>
      <div v-else-if="bodyText" class="text-white/75 text-lg leading-relaxed whitespace-pre-line">{{ bodyText }}</div>
    </div>

    <!-- ═══ PRODUCTS ═══ -->
    <div v-else-if="key === 'products' || key === 'product-grid'" class="px-6 py-14">
      <div class="text-center mb-10">
        <h2 v-if="title" class="text-3xl md:text-4xl font-bold mb-3">{{ title }}</h2>
        <p v-if="bodyText" class="text-white/60 text-lg">{{ bodyText }}</p>
      </div>
      <ProductShowcase
        title=""
        :featured="true"
        :limit="Number(section.settings?.limit) || 3"
        @error="() => {}"
      />
      <div class="text-center mt-10">
        <router-link
          to="/products"
          class="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-white/20 text-white/80 hover:border-primary hover:text-primary transition-colors"
        >
          Ver todo el catálogo
          <span class="material-symbols-outlined text-lg">arrow_forward</span>
        </router-link>
      </div>
    </div>

    <!-- ═══ IMAGE / BANNER ═══ -->
    <div
      v-else-if="key === 'image' || key === 'banner' || key === 'hero-image'"
      class="relative min-h-[320px] flex items-center justify-center px-6 py-20"
      :style="bgStyle"
    >
      <div v-if="section.settings?.overlay !== false" class="absolute inset-0 bg-black/40"></div>
      <div class="relative z-10 max-w-3xl mx-auto text-center">
        <h2 v-if="title" class="text-3xl md:text-4xl font-bold mb-4">{{ title }}</h2>
        <p v-if="bodyText" class="text-white/70 text-lg">{{ bodyText }}</p>
      </div>
    </div>

    <!-- ═══ GALLERY ═══ -->
    <div v-else-if="key === 'gallery' || key === 'images'" class="px-6 py-14">
      <div v-if="title" class="text-center mb-10">
        <h2 class="text-3xl md:text-4xl font-bold mb-3">{{ title }}</h2>
        <p v-if="bodyText" class="text-white/60 text-lg">{{ bodyText }}</p>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-5">
        <div
          v-for="(item, i) in items"
          :key="'gal-' + i"
          class="aspect-square rounded-2xl overflow-hidden bg-white/5"
        >
          <img
            v-if="item.image || item.url"
            :src="item.image || item.url"
            :alt="item.title || title || 'Imagen'"
            class="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-white/30 text-sm p-4 text-center">
            {{ item.title || `Imagen ${i + 1}` }}
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ CTA ═══ -->
    <div
      v-else-if="key === 'cta' || key === 'call-to-action'"
      class="px-6 py-16 rounded-3xl text-center"
      :style="bgStyle"
    >
      <h2 v-if="title" class="text-3xl md:text-4xl font-bold mb-4">{{ title }}</h2>
      <p v-if="bodyText" class="text-white/70 text-lg mb-8 max-w-2xl mx-auto">{{ bodyText }}</p>
      <router-link
        v-if="ctaLabel"
        :to="ctaUrl"
        class="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-on-primary font-medium text-lg hover:opacity-90 transition-opacity"
      >
        {{ ctaLabel }}
        <span class="material-symbols-outlined text-lg">arrow_forward</span>
      </router-link>
    </div>

    <!-- ═══ FEATURES / CARDS ═══ -->
    <div v-else-if="key === 'features' || key === 'cards' || key === 'services'" class="px-6 py-14">
      <div v-if="title" class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold mb-3">{{ title }}</h2>
        <p v-if="bodyText" class="text-white/60 text-lg">{{ bodyText }}</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="(item, i) in items"
          :key="'feat-' + i"
          class="glass-card rounded-2xl p-7 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
        >
          <span
            v-if="item.icon"
            class="material-symbols-outlined text-3xl text-primary mb-4"
          >{{ item.icon }}</span>
          <h3 v-if="item.title" class="text-xl font-semibold mb-2">{{ item.title }}</h3>
          <p v-if="item.text || item.description" class="text-white/60 leading-relaxed">{{ item.text || item.description }}</p>
        </div>
      </div>
    </div>

    <!-- ═══ FAQ ═══ -->
    <div v-else-if="key === 'faq' || key === 'accordion'" class="px-6 py-14 max-w-3xl mx-auto">
      <h2 v-if="title" class="text-3xl md:text-4xl font-bold text-center mb-10">{{ title }}</h2>
      <div
        v-for="(item, i) in items"
        :key="'faq-' + i"
        class="border-b border-white/10 py-5"
      >
        <details class="group">
          <summary class="flex items-center justify-between cursor-pointer list-none text-lg font-medium py-1">
            {{ item.title || item.question || `Pregunta ${i + 1}` }}
            <span class="material-symbols-outlined text-white/40 group-open:rotate-180 transition-transform">expand_more</span>
          </summary>
          <p class="mt-3 text-white/60 leading-relaxed">{{ item.text || item.answer }}</p>
        </details>
      </div>
    </div>

    <!-- ═══ CONTACT ═══ -->
    <div v-else-if="key === 'contact'" class="px-6 py-14">
      <div v-if="title" class="text-center mb-10">
        <h2 class="text-3xl md:text-4xl font-bold mb-3">{{ title }}</h2>
        <p v-if="bodyText" class="text-white/60 text-lg">{{ bodyText }}</p>
      </div>
      <div class="max-w-2xl mx-auto">
        <ContactForm />
      </div>
    </div>

    <!-- ═══ STATS / COUNTERS ═══ -->
    <div v-else-if="key === 'stats'" class="px-6 py-14">
      <div v-if="title" class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold mb-3">{{ title }}</h2>
        <p v-if="bodyText" class="text-white/60 text-lg">{{ bodyText }}</p>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div v-for="(item, i) in items" :key="'stat-' + i" class="text-center">
          <div class="text-4xl md:text-5xl font-extrabold text-primary">{{ item.value }}</div>
          <div class="mt-2 text-white/60">{{ item.label }}</div>
        </div>
      </div>
    </div>

    <!-- ═══ VIDEO ═══ -->
    <div v-else-if="key === 'video'" class="px-6 py-14">
      <div v-if="title" class="text-center mb-8">
        <h2 class="text-3xl md:text-4xl font-bold mb-3">{{ title }}</h2>
        <p v-if="bodyText" class="text-white/60 text-lg">{{ bodyText }}</p>
      </div>
      <div class="max-w-4xl mx-auto">
        <div class="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40">
          <iframe
            v-if="videoEmbedUrl"
            :src="videoEmbedUrl"
            class="absolute inset-0 w-full h-full"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
          <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/40">
            <span class="material-symbols-outlined text-5xl">play_circle</span>
            <p class="text-sm">Añade la URL de un video de YouTube o Vimeo</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ CUSTOM HTML ═══ -->
    <div v-else-if="key === 'html'" class="px-6 py-14" v-html="htmlContent"></div>

    <!-- ═══ TESTIMONIALS ═══ -->
    <div v-else-if="key === 'testimonials'" class="px-6 py-14">
      <div v-if="title" class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold mb-3">{{ title }}</h2>
        <p v-if="bodyText" class="text-white/60 text-lg">{{ bodyText }}</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="(item, i) in items"
          :key="'ts-' + i"
          class="glass-card rounded-2xl p-7 border border-white/10 bg-white/5"
        >
          <span class="material-symbols-outlined text-primary mb-4 text-3xl">format_quote</span>
          <p class="text-white/70 italic leading-relaxed mb-6">“{{ item.text || item.quote }}”</p>
          <div class="flex items-center gap-3">
            <img
              v-if="item.image || item.avatar"
              :src="item.image || item.avatar"
              :alt="item.title || item.name"
              class="w-10 h-10 rounded-full object-cover"
            />
            <div v-else class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined">person</span>
            </div>
            <div>
              <div class="font-semibold">{{ item.title || item.name }}</div>
              <div v-if="item.role" class="text-white/50 text-sm">{{ item.role }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ LOGOS / TRUSTED BY ═══ -->
    <div v-else-if="key === 'logos'" class="px-6 py-14">
      <div v-if="title" class="text-center mb-10">
        <h2 class="text-2xl md:text-3xl font-bold">{{ title }}</h2>
      </div>
      <div class="flex flex-wrap justify-center items-center gap-10">
        <div v-for="(item, i) in items" :key="'logo-' + i" class="h-12 flex items-center">
          <img
            v-if="item.image || item.url"
            :src="item.image || item.url"
            :alt="item.title || 'Logo'"
            class="max-h-12 max-w-36 object-contain opacity-60 hover:opacity-100 transition-opacity"
          />
          <span v-else class="text-white/40 font-semibold text-xl">{{ item.title }}</span>
        </div>
      </div>
    </div>

    <!-- ═══ DIVIDER ═══ -->
    <div v-else-if="key === 'divider'" class="px-6" :style="sectionStyle">
      <hr class="border-t border-white/10 mx-auto" :style="dividerStyle" />
    </div>

    <!-- ═══ DEFAULT / GENERIC ═══ -->
    <div v-else class="px-6 py-14 max-w-4xl mx-auto">
      <div v-if="title" class="flex items-center gap-3 mb-6">
        <span class="w-2 h-2 rounded-full bg-primary"></span>
        <h2 class="text-2xl md:text-3xl font-bold">{{ title }}</h2>
      </div>
      <p v-if="bodyText" class="text-white/70 text-lg leading-relaxed whitespace-pre-line">{{ bodyText }}</p>
      <span v-if="key" class="inline-block mt-4 text-xs uppercase tracking-widest text-white/30">Componente: {{ key }}</span>
    </div>

    <!-- ═══ NESTED INSTANCES ═══ -->
    <div
      v-if="section.instances?.length"
      class="space-y-10"
      :class="{ 'mt-10': key !== 'hero' }"
    >
      <RenderSection
        v-for="(inst, i) in section.instances"
        :key="inst.id || 'inst-' + i"
        :section="instanceToSection(inst)"
      />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import ProductShowcase from '../shared/ProductShowcase.vue';
import ContactForm from '../shared/ContactForm.vue';

const props = defineProps({
  section: { type: Object, required: true }
});

const key = computed(() => props.section?.component_key || props.section?.component?.key || 'default');
const title = computed(() => props.section?.title || props.section?.settings?.title || '');
const bodyText = computed(() => {
  const c = props.section?.content;
  if (typeof c === 'string') return c;
  if (!c || typeof c !== 'object') return '';
  return c.text || c.subtitle || c.description || c.lead || '';
});
const htmlContent = computed(() => {
  const c = props.section?.content;
  if (c && typeof c === 'object' && c.html) return c.html;
  return '';
});
const items = computed(() => {
  const c = props.section?.content;
  if (c && typeof c === 'object' && Array.isArray(c.items)) return c.items;
  return [];
});
const ctaLabel = computed(() => props.section?.settings?.cta_label || props.section?.content?.cta_label || '');
const ctaUrl = computed(() => props.section?.settings?.cta_url || props.section?.content?.cta_url || '/');
const ctaSecondaryLabel = computed(() => props.section?.settings?.cta_secondary_label || '');
const ctaSecondaryUrl = computed(() => props.section?.settings?.cta_secondary_url || '#');
const sectionStyle = computed(() => {
  const s = props.section?.settings || {};
  const style = {};
  if (s.padding) style.padding = typeof s.padding === 'number' ? `${s.padding}px` : s.padding;
  if (s.text_color) style.color = s.text_color;
  return style;
});
const bgStyle = computed(() => {
  const s = props.section?.settings || {};
  const style = {};
  if (s.background_image) {
    style.backgroundImage = `url('${s.background_image}')`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
  } else if (s.background) {
    style.background = s.background;
  }
  return style;
});

const videoEmbedUrl = computed(() => {
  const url = props.section?.content?.video_url || props.section?.settings?.video_url || '';
  if (!url) return '';
  if (url.includes('youtube.com/watch')) {
    const m = url.match(/[?&]v=([^&]+)/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
  }
  if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
  if (url.includes('vimeo.com/')) {
    const id = url.split('/').pop().split('?')[0];
    return id ? `https://player.vimeo.com/video/${id}` : url;
  }
  return url;
});

const dividerStyle = computed(() => {
  const s = props.section?.settings || {};
  const style = {};
  if (s.style === 'dashed') style.borderTopStyle = 'dashed';
  if (s.style === 'dotted') style.borderTopStyle = 'dotted';
  if (s.style === 'solid') style.borderTopStyle = 'solid';
  if (s.max_width) style.maxWidth = /^\d+$/.test(String(s.max_width)) ? `${s.max_width}px` : s.max_width;
  return style;
});

const isText = computed(() => ['text', 'text-block', 'rich-text', 'about', 'paragraph'].includes(key.value));

function instanceToSection(inst) {
  return {
    id: inst.id,
    component_key: inst.component?.key || inst.component_key || 'custom',
    title: inst.title || inst.settings?.title || inst.component?.name,
    settings: inst.settings || {},
    content: inst.content || inst.settings || {},
    instances: []
  };
}
</script>
