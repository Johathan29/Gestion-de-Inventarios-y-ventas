<template>
  <div class="min-h-screen bg-[#151215] text-[#e8e0e4] selection:bg-primary selection:text-on-primary overflow-x-hidden">
    <!-- Full Screen Background Shader -->
    <div class="fixed inset-0 w-full h-full -z-10 opacity-40 pointer-events-none" style="display:block;">
      <canvas id="shader-canvas" style="display:block;width:100%;height:100%"></canvas>
    </div>

    <!-- TopNavBar -->
    <AppNavBar />

    <!-- Floating Banner (sticky top/bottom) -->
    <FloatingBanner />

    <main class="relative z-10">
      <!-- Partículas -->
<div class="particles">
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
</div>
<div class="mouse-light"></div>
      <!-- Hero Section (dinámico desde Supabase) -->
      <HeroSection />

      <!-- Featured Products (dynamic from product-service) -->
      <section id="products">
      <ProductShowcase
        title="Curated Essentials"
        subtitle="Precision-engineered care products designed for the modern sanctuary."
        :featured="true"
        :limit="3"
        @view-all="handleViewAll"
        @added-to-cart="handleAddedToCart"
        @error="handleProductError"
      />
      </section>

      <!-- Featured Reviews Section (dinámico desde Supabase - aprobados por admin) -->
      <FeaturedReviews />

      <!-- Newsletter / CTA -->
      <section id="newsletter" class="py-8 px-4">
        <div class="max-w-7xl mx-auto">
          <div class="glass-card rounded-[48px] p-20 text-center relative overflow-hidden entrance-reveal">
            <div class="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
            <h2 class="font-headline-lg text-headline-lg text-on-surface mb-6 relative z-10">Join the Inner Circle</h2>
            <p class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-12 relative z-10">
              Receive exclusive invitations to collection reveals and bespoke animal care workshops.
            </p>
            <form class="max-w-md mx-auto flex flex-col md:flex-row gap-4 relative z-10">
              <input class="flex-1 bg-black/30 border border-white/10 rounded-full px-8 py-4 focus:border-primary outline-none text-on-surface transition-all" placeholder="Your email address" type="email"/>
              <button class="magnetic-btn px-8 py-4 bg-primary text-on-primary rounded-full font-label-sm text-label-sm uppercase tracking-widest font-bold">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>

      <!-- Contact Form -->
      <section id="contact" class="py-8 px-4">
        <ContactForm />
      </section>
    </main>

    <!-- Footer -->
    <AppFooter />

    <!-- WhatsApp Widget flotante -->
    <WhatsAppWidget />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import HeroSection from '../components/shared/HeroSection.vue';
import FeaturedReviews from '../components/shared/FeaturedReviews.vue';
import ProductShowcase from '../components/shared/ProductShowcase.vue';
import AppNavBar from '../components/layout/AppNavBar.vue';
import AppFooter from '../components/layout/AppFooter.vue';
import ContactForm from '../components/shared/ContactForm.vue';
import FloatingBanner from '../components/shared/FloatingBanner.vue';
import WhatsAppWidget from '../components/shared/WhatsAppWidget.vue';

const router = useRouter();

onMounted(() => {
  initShader();
  initScrollAnimations();
  initTiltEffects();
  initMagneticButtons();
});

function initShader() {
  const canvas = document.getElementById('shader-canvas');
  if (!canvas) return;

  function syncSize() {
    const w = canvas.clientWidth || 1280;
    const h = canvas.clientHeight || 720;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(syncSize).observe(canvas);
  }
  syncSize();

  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return;

  const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

  const fs = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
uniform vec2 u_resolution;

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = v_texCoord;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= u_resolution.x / u_resolution.y;

    float t1 = u_time * 0.15;
    float t2 = u_time * 0.1;
    
    float wave1 = sin(p.x * 0.5 + t1) * 0.5 + cos(p.y * 0.8 + t1) * 0.5;
    float wave2 = sin(p.y * 0.3 - t2) * 0.4 + cos(p.x * 0.6 + t2) * 0.6;
    
    vec3 primary = vec3(0.216, 0.039, 0.29);
    vec3 secondary = vec3(0.482, 0.31, 0.49);
    vec3 accent = vec3(0.31, 0.137, 0.38);
    vec3 light = vec3(1.0, 0.969, 0.984);
    
    vec3 color = mix(primary, secondary, wave1 * 0.5 + 0.5);
    color = mix(color, accent, wave2 * 0.5 + 0.5);
    
    float glow = 0.05 / length(p - vec2(sin(t1), cos(t2)) * 0.5);
    color += accent * glow;
    
    vec3 finalColor = mix(color, primary, 0.4);
    
    gl_FragColor = vec4(finalColor * 0.7, 1.0);
}`;

  function createShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, createShader(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, createShader(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_resolution');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
  const handleMouseMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width && rect.height) {
      const nx = (event.clientX - rect.left) / rect.width;
      const ny = 1.0 - (event.clientY - rect.top) / rect.height;
      mouse.x = nx * canvas.width;
      mouse.y = ny * canvas.height;
    }
  };
  window.addEventListener('mousemove', handleMouseMove);

  let animId;
  function render(t) {
    if (typeof ResizeObserver === 'undefined') syncSize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (uTime) gl.uniform1f(uTime, t * 0.001);
    if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
    if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    animId = requestAnimationFrame(render);
  }
  render(0);

  // Store cleanup
  window.__shaderCleanup = () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('mousemove', handleMouseMove);
  };
}

function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.entrance-reveal').forEach(el => {
    revealObserver.observe(el);
  });
}

function initTiltEffects() {
  document.querySelectorAll('.tilt-container').forEach(container => {
    const card = container.querySelector('.glass-card');
    if (!card) return;

    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      card.style.backgroundImage = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.1) 0%, transparent 80%)`;
    });

    container.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
      card.style.backgroundImage = 'none';
    });
  });
}

function initMagneticButtons() {
  document.querySelectorAll('.magnetic-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });
}

function handleViewAll() {
  router.push({ name: 'ProductsCatalog' });
}

function handleAddedToCart(product) {
  // Show feedback could be integrated with a toast/notification system
  console.log('Added to cart:', product.name);
}

function handleProductError(message) {
  console.warn('Product showcase error:', message);
}

onUnmounted(() => {
  if (window.__shaderCleanup) {
    window.__shaderCleanup();
  }
});
document.querySelectorAll(".contact-aurora").forEach(card=>{

const light=card.querySelector(".mouse-light");

card.addEventListener("mousemove",e=>{

const rect=card.getBoundingClientRect();

const x=e.clientX-rect.left;
const y=e.clientY-rect.top;

card.style.setProperty("--x",x+"px");
card.style.setProperty("--y",y+"px");

const rotateY=((x-rect.width/2)/rect.width)*12;
const rotateX=((y-rect.height/2)/rect.height)*-12;

card.style.transform=`
perspective(1200px)
rotateX(${rotateX}deg)
rotateY(${rotateY}deg)
translateY(-8px)
scale(1.015)
`;

});

card.addEventListener("mouseleave",()=>{

card.style.transform=`
perspective(1200px)
rotateX(0)
rotateY(0)
translateY(0)
scale(1)
`;

});

});  
</script>

<style scoped>
.glass-card {
  backdrop-filter: blur(20px);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), border 0.3s ease;
}

.glass-card:hover {
  border-color: rgba(233, 179, 252, 0.4);
  transform: translateY(-8px) scale(1.02);
}

.magnetic-btn {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
  box-shadow: 0 0 0 rgba(233, 179, 252, 0);
}

.magnetic-btn:hover {
  box-shadow: 0 0 20px rgba(233, 179, 252, 0.3);
}

.entrance-reveal {
  opacity: 0;
  transform: translateY(30px);
  filter: blur(10px);
  transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

.entrance-reveal.visible {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

.parallax-wrap {
  perspective: 1000px;
}

.tilt-container {
  transform-style: preserve-3d;
  will-change: transform;
}
</style>
