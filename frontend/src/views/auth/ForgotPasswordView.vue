<template>
  <div class="min-h-screen bg-[#151215] text-[#e8e0e4] flex items-center justify-center p-4 relative overflow-hidden selection:bg-[#e9b3fc] selection:text-[#481d5b]">
    <!-- WebGL Shader Background -->
    <div class="fixed inset-0 w-full h-full opacity-30 pointer-events-none">
      <canvas id="forgot-shader" style="display:block;width:100%;height:100%"></canvas>
    </div>

    <!-- Back to Home -->
    <router-link to="/" class="fixed top-6 left-6 z-50 flex items-center gap-2 text-[#cfc3cf] hover:text-[#e9b3fc] transition-all duration-300">
      <span class="material-symbols-outlined" data-icon="arrow_back">arrow_back</span>
      <span class="text-sm font-medium">Volver</span>
    </router-link>

    <div class="w-full max-w-md relative z-10">
      <!-- Logo -->
      <div class="text-center !mb-8 entrance-reveal visible">
        <div class="inline-flex items-center gap-3 mb-4">
          <div class="w-14 h-14 rounded-2xl glass-card flex items-center justify-center">
            <span class="material-symbols-outlined text-2xl text-[#e9b3fc]" data-icon="box">box</span>
          </div>
          <span class="font-headline-md text-2xl text-[#e9b3fc] font-bold tracking-tight">Gestion de Inventarios</span>
        </div>
        <p class="text-[#cfc3cf] text-sm">eCommerce de Productos Premium</p>
      </div>

      <!-- Card -->
      <div class="glass-card !space-y-5 rounded-3xl p-8 md:!p-10 entrance-reveal visible" style="transition-delay: 100ms;">
        <h2 class="font-headline-md text-2xl text-[#e8e0e4] mb-2 font-bold">¿Olvidaste tu Contraseña?</h2>
        <p class="text-[#cfc3cf] text-sm mb-8">Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.</p>

        <div v-if="errorMsg"
          class="mb-6 p-4 rounded-xl bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] text-sm flex items-center gap-3">
          <span class="material-symbols-outlined text-lg" data-icon="error">error</span>
          <span>{{ errorMsg }}</span>
          <button @click="errorMsg = ''" class="ml-auto text-[#ffb4ab]/60 hover:text-[#ffb4ab]">
            <span class="material-symbols-outlined text-lg" data-icon="close">close</span>
          </button>
        </div>
        <div v-if="successMsg"
          class="mb-6 p-4 rounded-xl bg-[#005e00]/20 border border-[#a2d6a2]/30 text-[#a2d6a2] text-sm flex items-center gap-3">
          <span class="material-symbols-outlined text-lg" data-icon="check_circle">check_circle</span>
          <span>{{ successMsg }}</span>
          <button @click="successMsg = ''" class="ml-auto text-[#a2d6a2]/60 hover:text-[#a2d6a2]">
            <span class="material-symbols-outlined text-lg" data-icon="close">close</span>
          </button>
        </div>

        <form @submit.prevent="handleForgot" class="!space-y-5">
          <div>
            <label class="block text-sm font-medium text-[#cfc3cf] mb-2">Correo Electrónico</label>
            <input v-model="email" type="email"
              class="w-full bg-black/30 border border-white/10 rounded-xl !px-5 !py-3.5 text-[#e8e0e4] placeholder-[#988d99] focus:border-[#e9b3fc] focus:ring-1 focus:ring-[#e9b3fc] outline-none transition-all"
              placeholder="correo@ejemplo.com" required />
          </div>
          <button type="submit" :disabled="loading"
            class="w-full !py-4 bg-[#ebb5ea] text-[#48214c] rounded-xl font-headline-md text-base font-bold transition-all duration-300 hover:shadow-lg hover:shadow-[#ebb5ea]/30 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2">
            <span v-if="loading" class="material-symbols-outlined animate-spin" data-icon="refresh">refresh</span>
            <span v-else>Enviar Instrucciones</span>
          </button>
        </form>

        <div class="mt-8 pt-6 border-t border-white/5 text-center">
          <p class="text-[#cfc3cf] text-sm">
            <router-link to="/login" class="text-[#e9b3fc] hover:underline font-medium">Volver al inicio de sesión</router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { authAPI } from '../../api';

const email = ref('');
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const handleForgot = async () => {
  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    await authAPI.forgotPassword({ email: email.value });
    successMsg.value = 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña.';
  } catch (err) {
    errorMsg.value = 'Error al procesar la solicitud. Intenta de nuevo.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  initForgotShader();
});

function initForgotShader() {
  const canvas = document.getElementById('forgot-shader');
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

  let animId;
  function render(t) {
    if (typeof ResizeObserver === 'undefined') syncSize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (uTime) gl.uniform1f(uTime, t * 0.001);
    if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    animId = requestAnimationFrame(render);
  }
  render(0);

  window.__forgotShaderCleanup = () => {
    if (animId) cancelAnimationFrame(animId);
  };
}

onUnmounted(() => {
  if (window.__forgotShaderCleanup) window.__forgotShaderCleanup();
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
</style>
