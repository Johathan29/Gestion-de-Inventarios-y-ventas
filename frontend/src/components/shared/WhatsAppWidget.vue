<template>
  <div class="whatsapp-widget fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
    <!-- Tooltip / Mensaje -->
    <Transition
  appear
  enter-active-class="bubble-enter-active"
  enter-from-class="bubble-enter-from"
  enter-to-class="bubble-enter-to"
  leave-active-class="bubble-leave-active"
  leave-from-class="bubble-leave-from"
  leave-to-class="bubble-leave-to"
>
      <div
  v-if="showBubble"
  class="
    max-w-[260px]
    rounded-2xl
    rounded-br-md
    bg-[#25D366]
    px-4
    py-3
    text-sm
    font-body-md
    text-white
    shadow-[0_18px_40px_rgba(37,211,102,.28)]
    backdrop-blur-xl
    origin-bottom-right
    will-change-transform
    select-none
  "
>
  {{ bubbleMessage }}
</div>
        
    </Transition>

    <!-- Botón flotante WhatsApp -->
    <button
  @click="openWhatsApp"
  @mouseenter="showBubble = true"
  @mouseleave="showBubble = false"
  class="
    group
    relative
    flex
    h-8
    w-8
    items-center
    justify-center
    rounded-full
    bg-[#25D366]
    shadow-[0_18px_45px_rgba(37,211,102,.35)]
    transition-all
    duration-500
    ease-[cubic-bezier(.22,1,.36,1)]
    hover:scale-110
    hover:shadow-[0_25px_55px_rgba(37,211,102,.45)]
    active:scale-95
    cursor-pointer
    will-change-transform
  "
  aria-label="Chat por WhatsApp"
>
      <svg
        viewBox="0 0 24 24"
        class="w-8 h-8 fill-white"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ecommerceAPI } from '../../api';

const phoneNumber = ref('');
const bubbleMessage = ref('¡Hola! ¿En qué podemos ayudarte?');
const showBubble = ref(true);

let bubbleTimeout = null;

onMounted(async () => {
  try {
    const res = await ecommerceAPI.getWhatsappConfig();

    if (res.data) {
      phoneNumber.value = res.data.phone_number || '';
      bubbleMessage.value =
        res.data.welcome_message || bubbleMessage.value;
    }
  } catch {}

  bubbleTimeout = setTimeout(() => {
    showBubble.value = false;
  }, 5000);
});

onUnmounted(() => {
  if (bubbleTimeout) clearTimeout(bubbleTimeout);
});

function openWhatsApp() {
  const number = phoneNumber.value.replace(/\D/g, '');

  if (!number) return;

  window.open(
    `https://wa.me/${number}?text=${encodeURIComponent(bubbleMessage.value)}`,
    '_blank',
    'noopener,noreferrer'
  );
}
</script>
<style scoped>
.bubble-enter-active,
.bubble-leave-active{
    transition:
        opacity .55s cubic-bezier(.22,1,.36,1),
        transform .55s cubic-bezier(.22,1,.36,1),
        filter .55s cubic-bezier(.22,1,.36,1);
    transform-origin: bottom right;
    will-change: transform, opacity, filter;
}

.bubble-enter-from{
    opacity:0;
    transform:
        translate3d(12px,18px,0)
        scale(.65)
        rotate(3deg);
    filter:blur(10px);
}

.bubble-enter-to{
    opacity:1;
    transform:
        translate3d(0,0,0)
        scale(1)
        rotate(0deg);
    filter:blur(0);
}

.bubble-leave-from{
    opacity:1;
    transform:
        translate3d(0,0,0)
        scale(1);
    filter:blur(0);
}

.bubble-leave-to{
    opacity:0;
    transform:
        translate3d(12px,18px,0)
        scale(.70)
        rotate(3deg);
    filter:blur(8px);
}

</style>